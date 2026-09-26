import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/theme';
import { useAlerts } from '../../utils/alerts';
import { AuthApiError, getAuthErrorMessage } from '../../utils/authApi';
import type { MileagePhotoMode } from '../../utils/mileageApi';
import { validateMileagePhoto } from '../../utils/mileagePhotos';
import { PrimaryButton } from '../auth/PrimaryButton';
import { UploadCard, type UploadKind } from './UploadCard';

type ImageSource = 'camera' | 'library';
type MileagePhotoRequirement = 'both' | 'atLeastOne';

export type MileagePhotoSelection = {
  photoMode: MileagePhotoMode;
  dashboard: ImagePicker.ImagePickerAsset | null;
  receipt: ImagePicker.ImagePickerAsset | null;
};

type MileagePhotoFormProps = {
  fillAvailableSpace?: boolean;
  intro: string;
  onValidSubmit: (selection: MileagePhotoSelection) => void | Promise<void>;
  onSelectionChange?: () => void;
  locked?: boolean;
  existingPhotoMode?: MileagePhotoMode;
  existingImages?: { receipt: { uri: string } | null; dashboard: { uri: string } | null };
  onImageError?: () => void;
  onPreview?: (uri: string, title: string) => void;
  requirement: MileagePhotoRequirement;
  submitLabel: string;
};

export function MileagePhotoForm({
  fillAvailableSpace = false,
  intro,
  onValidSubmit,
  requirement,
  submitLabel,
  locked = false,
  onSelectionChange,
  existingImages,
  existingPhotoMode = 'separate',
  onImageError,
  onPreview,
}: MileagePhotoFormProps) {
  const {
    showImageSourceActions,
    showCameraPermissionAlert,
    showImagePickerErrorAlert,
    showImageSizeLimitAlert,
    showImageSizeUnavailableAlert,
    showMileageAtLeastOneImageRequiredAlert,
    showMileageImagesRequiredAlert,
    showUnsupportedImageFormatAlert,
    showAuthErrorAlert,
  } = useAlerts();

  const [photoMode, setPhotoMode] = useState<MileagePhotoMode>('single');
  const [combinedImage, setCombinedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [receiptImage, setReceiptImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dashboardImage, setDashboardImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [hidden, setHidden] = useState({ receipt: false, dashboard: false, combined: false });
  const pickerRevision = useRef(0);
  const focused = useRef(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; pickerRevision.current += 1; };
  }, []));

  const pickImage = async (kind: UploadKind, source: ImageSource) => {
    if (lockedRef.current || !focused.current) return;
    const revision = ++pickerRevision.current;
    const current = () => focused.current && revision === pickerRevision.current && !lockedRef.current;
    try {
      if (source === 'camera' && Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!current()) return;

        if (!permission.granted) {
          showCameraPermissionAlert();
          return;
        }
      }

      const launchImage =
        source === 'camera'
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync;
      const result = await launchImage({ mediaTypes: ['images'], quality: 1 });
      if (!current()) return;

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset || (asset.type && asset.type !== 'image')) {
        showImagePickerErrorAlert();
        return;
      }

      validateMileagePhoto(asset);
      onSelectionChange?.();
      if (kind === 'combined') {
        setCombinedImage(asset);
      } else if (kind === 'receipt') {
        setReceiptImage(asset);
      } else {
        setDashboardImage(asset);
      }
    } catch (error) {
      if (!current()) return;
      if (!(error instanceof AuthApiError)) showImagePickerErrorAlert();
      else if (error.code === 'UNSUPPORTED_PHOTO_TYPE') showUnsupportedImageFormatAlert();
      else if (error.code === 'PHOTO_TOO_LARGE') showImageSizeLimitAlert();
      else if (error.code === 'PHOTO_SIZE_UNAVAILABLE') showImageSizeUnavailableAlert();
      else showAuthErrorAlert(getAuthErrorMessage(error));
    }
  };

  const chooseImage = (kind: UploadKind) => {
    showImageSourceActions({
      onCamera: () => void pickImage(kind, 'camera'),
      onLibrary: () => void pickImage(kind, 'library'),
    });
  };

  const submitImages = () => {
    if (lockedRef.current || !focused.current) return;
    const needsBoth = requirement === 'both' || existingPhotoMode !== photoMode;
    const hasRequiredImages = photoMode === 'single' ? Boolean(combinedImage) :
      needsBoth
        ? Boolean(receiptImage && dashboardImage)
        : Boolean(receiptImage || dashboardImage);

    if (!hasRequiredImages) {
      setShowErrors(true);

      if (photoMode === 'single') {
        showAuthErrorAlert('영수증과 계기판이 함께 찍힌 사진을 등록해주세요.');
      } else if (needsBoth) {
        showMileageImagesRequiredAlert();
      } else {
        showMileageAtLeastOneImageRequiredAlert();
      }

      return;
    }

    setShowErrors(false);
    pickerRevision.current += 1;
    void onValidSubmit({ photoMode, dashboard: photoMode === 'single' ? null : dashboardImage, receipt: photoMode === 'single' ? combinedImage : receiptImage });
  };

  const needsBoth = requirement === 'both' || existingPhotoMode !== photoMode;
  const changeMode = (next: MileagePhotoMode) => {
    if (lockedRef.current || next === photoMode) return;
    pickerRevision.current += 1;
    onSelectionChange?.();
    setShowErrors(false);
    setPhotoMode(next);
  };
  const atLeastOneImageMissing = !receiptImage && !dashboardImage;

  return (
    <View
      style={[
        styles.pageContent,
        fillAvailableSpace && styles.pageContentFilled,
      ]}
    >
      <View style={styles.uploadSection}>
        <View style={styles.introRow}>
          <Text style={styles.intro}>{intro}</Text>
          <View style={styles.modeToggle} accessibilityRole="radiogroup" accessibilityLabel="등록 사진 장수">
            {(['single', 'separate'] as const).map(mode => (
              <Pressable key={mode} accessibilityRole="radio"
                accessibilityLabel={mode === 'single' ? '1장' : '2장'}
                aria-checked={photoMode === mode}
                accessibilityState={{ checked: photoMode === mode, disabled: locked }}
                disabled={locked} onPress={() => changeMode(mode)} hitSlop={8}
                style={[styles.modeOption, photoMode === mode && styles.modeSelected]}>
                <Text style={styles.modeLabel}>{mode === 'single' ? '1장' : '2장'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.uploadRow}>
          {photoMode === 'single' ? (
            <UploadCard kind="combined" error={showErrors && !combinedImage}
              image={combinedImage ?? (existingPhotoMode === 'single' && !hidden.combined ? existingImages?.receipt ?? null : null)}
              onChoose={() => chooseImage('combined')}
              onRemove={() => { if (lockedRef.current) return; onSelectionChange?.(); setCombinedImage(null); setHidden(value => ({ ...value, combined: true })); }}
              disabled={locked} onImageError={onImageError} onPreview={onPreview} />
          ) : (<>
          <UploadCard
            error={
              showErrors &&
              (needsBoth ? !receiptImage : atLeastOneImageMissing)
            }
            image={receiptImage ?? (existingPhotoMode === 'separate' && !hidden.receipt ? existingImages?.receipt ?? null : null)}
            kind="receipt"
            onChoose={() => chooseImage('receipt')}
            onRemove={() => { if (lockedRef.current) return; onSelectionChange?.(); setReceiptImage(null); setHidden(value => ({ ...value, receipt: true })); }}
            disabled={locked}
            onImageError={onImageError}
            onPreview={onPreview}
          />
          <UploadCard
            error={
              showErrors &&
              (needsBoth
                ? !dashboardImage
                : atLeastOneImageMissing)
            }
            image={dashboardImage ?? (existingPhotoMode === 'separate' && !hidden.dashboard ? existingImages?.dashboard ?? null : null)}
            kind="dashboard"
            onChoose={() => chooseImage('dashboard')}
            onRemove={() => { if (lockedRef.current) return; onSelectionChange?.(); setDashboardImage(null); setHidden(value => ({ ...value, dashboard: true })); }}
            disabled={locked}
            onImageError={onImageError}
            onPreview={onPreview}
          />
          </>)}
        </View>
      </View>

      <View style={fillAvailableSpace ? styles.submitSection : undefined}>
        <PrimaryButton label={submitLabel} onPress={submitImages} disabled={locked} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    width: '100%',
    gap: 40,
    paddingVertical: 104,
  },
  pageContentFilled: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 0,
    paddingTop: 32,
    paddingBottom: 8,
  },
  uploadSection: {
    width: '100%',
    gap: 20,
    paddingHorizontal: 20,
  },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  modeToggle: { flexDirection: 'row', flexShrink: 0, borderWidth: 1, borderColor: colors.gray200, borderRadius: 8, overflow: 'hidden' },
  modeOption: { paddingHorizontal: 10, paddingVertical: 6 },
  modeSelected: { backgroundColor: colors.gray100 },
  modeLabel: { ...typography.suitMedium12, color: colors.gray800 },
  intro: {
    flex: 1,
    ...typography.suitSemiBold18,
    color: colors.black,
  },
  uploadRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitSection: {
    width: '100%',
    paddingHorizontal: 20,
  },
});
