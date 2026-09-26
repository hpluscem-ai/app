import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import { AuthApiError } from './authApi';
import type { MileagePhotoMode, MileageResubmission, MileageSubmission, MileageUpload } from './mileageApi';

const MAX_BYTES = 50 * 1024 * 1024;

export function validateMileagePhoto(asset: ImagePickerAsset): string {
  const extension = (asset.fileName ?? asset.uri.split(/[?#]/)[0]).split('.').pop()?.toLowerCase();
  const type = asset.mimeType?.toLowerCase() || (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : '');
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'].includes(type)) {
    throw new AuthApiError('JPG, PNG, HEIC, HEIF 또는 WebP 이미지를 선택해주세요.', 'UNSUPPORTED_PHOTO_TYPE');
  }
  const size = asset.file?.size ?? asset.fileSize;
  if (!size || !Number.isSafeInteger(size) || size < 0) throw new AuthApiError('파일 용량을 확인할 수 없는 이미지는 등록할 수 없습니다.', 'PHOTO_SIZE_UNAVAILABLE');
  if (size > MAX_BYTES) throw new AuthApiError('50MB 이하의 이미지만 등록할 수 있습니다.', 'PHOTO_TOO_LARGE');
  if (![asset.width, asset.height].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new AuthApiError('사진 크기를 확인하지 못했습니다. 사진을 다시 선택해주세요.', 'INVALID_PHOTO');
  }
  return type === 'image/jpg' ? 'image/jpeg' : type;
}

function removeTemporary(uri: string) {
  if (Platform.OS === 'web') URL.revokeObjectURL(uri);
  else {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}

type PhotoSelection = { photoMode: MileagePhotoMode; receipt: ImagePickerAsset | null; dashboard: ImagePickerAsset | null };

export async function prepareMileageSubmission(selection: PhotoSelection): Promise<MileageSubmission & { dispose: () => void }> {
  if (!selection.receipt || (selection.photoMode === 'separate' && !selection.dashboard)) throw new AuthApiError(selection.photoMode === 'single' ? '영수증과 계기판이 함께 찍힌 사진을 등록해주세요.' : '영수증과 계기판 사진을 모두 등록해주세요.', 'PHOTO_REQUIRED');
  const result = await prepareMileagePhotos(selection);
  return { ...result, receipt: result.receipt! };
}

export async function prepareMileageResubmission(selection: PhotoSelection, submissionVersion: string): Promise<MileageResubmission & { dispose: () => void }> {
  if (!selection.receipt && (selection.photoMode === 'single' || !selection.dashboard)) throw new AuthApiError('교체할 사진을 한 장 이상 선택해주세요.', 'PHOTO_REQUIRED');
  return { ...await prepareMileagePhotos(selection), submissionVersion };
}

async function prepareMileagePhotos(selection: PhotoSelection) {
  const owned: string[] = [];
  const dispose = () => {
    for (const uri of owned.splice(0)) {
      // These are exclusively this submission's cache files, never picker originals.
      try { removeTemporary(uri); } catch { /* The OS may already have evicted its cache. */ }
    }
  };
  const prepare = async (asset: ImagePickerAsset | null, kind: string): Promise<MileageUpload> => {
    if (!asset) throw new AuthApiError('영수증과 계기판 사진을 모두 등록해주세요.', 'PHOTO_REQUIRED');
    let type = validateMileagePhoto(asset);
    let uri = asset.uri;
    const convert = (asset.file?.size ?? asset.fileSize!) > 10 * 1024 * 1024 || Math.max(asset.width, asset.height) > 4096;
    if (convert) {
      const context = ImageManipulator.manipulate(uri);
      let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
      try {
        if (Math.max(asset.width, asset.height) > 4096) {
          context.resize(asset.width >= asset.height ? { width: 4096 } : { height: 4096 });
        }
        rendered = await context.renderAsync();
        const output = await rendered.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
        uri = output.uri;
        owned.push(uri);
        type = 'image/jpeg';
        if (Math.max(output.width, output.height) > 4096) throw new Error('Invalid converted dimensions');
      } finally {
        if (Platform.OS === 'web' && rendered && 'uri' in rendered && typeof rendered.uri === 'string') URL.revokeObjectURL(rendered.uri);
        rendered?.release();
        context.release();
      }
    }
    const name = `${kind}.${type.split('/')[1]}`;
    if (Platform.OS === 'web') {
      const file = !convert && asset.file ? asset.file : await (await fetch(uri)).blob();
      if (!file.size || file.size > MAX_BYTES) throw new AuthApiError('50MB 이하의 이미지만 등록할 수 있습니다.', 'PHOTO_TOO_LARGE');
      return { uri, name, type, file };
    }
    if (!convert) {
      const copy = new File(Paths.cache, `mileage-${randomUUID()}-${name}`);
      owned.push(copy.uri);
      new File(uri).copy(copy);
      uri = copy.uri;
    }
    const size = new File(uri).size;
    if (!size || size > MAX_BYTES) throw new AuthApiError('50MB 이하의 이미지만 등록할 수 있습니다.', 'PHOTO_TOO_LARGE');
    return { uri, name, type };
  };
  try {
    const receipt = selection.receipt ? await prepare(selection.receipt, 'receipt') : undefined;
    const meter = selection.photoMode === 'separate' && selection.dashboard ? await prepare(selection.dashboard, 'meter') : undefined;
    return { key: randomUUID(), photoMode: selection.photoMode, receipt, meter, dispose };
  } catch (error) {
    dispose();
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError('사진을 준비하지 못했습니다. 지원되는 사진으로 다시 시도해주세요.', 'PHOTO_PREPARATION_FAILED');
  }
}

export async function mileagePhotoPreview(blob: Blob): Promise<{ uri: string; dispose: () => void }> {
  if (Platform.OS === 'web') {
    const uri = URL.createObjectURL(blob);
    return { uri, dispose: () => URL.revokeObjectURL(uri) };
  }
  // Keep protected native photos in memory; no public URL or disk download is needed.
  const uri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid image'));
    reader.onerror = () => reject(new Error('Unreadable image'));
    reader.readAsDataURL(blob);
  });
  return { uri, dispose: () => {} };
}
