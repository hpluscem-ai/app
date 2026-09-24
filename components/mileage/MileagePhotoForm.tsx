import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/theme';
import { useAlerts } from '../../utils/alerts';
import { AuthApiError, getAuthErrorMessage } from '../../utils/authApi';
import { validateMileagePhoto } from '../../utils/mileagePhotos';
import { PrimaryButton } from '../auth/PrimaryButton';
import { UploadCard, type UploadKind } from './UploadCard';

type ImageSource = 'camera' | 'library';
type MileagePhotoRequirement = 'both' | 'atLeastOne';

export type MileagePhotoSelection = {
  dashboard: ImagePicker.ImagePickerAsset | null;
  receipt: ImagePicker.ImagePickerAsset | null;
};

type MileagePhotoFormProps = {
  fillAvailableSpace?: boolean;
  intro: string;
  onValidSubmit: (selection: MileagePhotoSelection) => void | Promise<void>;
  onSelectionChange?: () => void;
  locked?: boolean;
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

  const [receiptImage, setReceiptImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dashboardImage, setDashboardImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [hidden, setHidden] = useState({ receipt: false, dashboard: false });
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
      if (kind === 'receipt') {
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
    const hasRequiredImages =
      requirement === 'both'
        ? Boolean(receiptImage && dashboardImage)
        : Boolean(receiptImage || dashboardImage);

    if (!hasRequiredImages) {
      setShowErrors(true);

      if (requirement === 'both') {
        showMileageImagesRequiredAlert();
      } else {
        showMileageAtLeastOneImageRequiredAlert();
      }

      return;
    }

    setShowErrors(false);
    pickerRevision.current += 1;
    void onValidSubmit({ dashboard: dashboardImage, receipt: receiptImage });
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
        <Text style={styles.intro}>{intro}</Text>
        <View style={styles.uploadRow}>
          <UploadCard
            error={
              showErrors &&
              (requirement === 'both' ? !receiptImage : atLeastOneImageMissing)
            }
            image={receiptImage ?? (!hidden.receipt ? existingImages?.receipt ?? null : null)}
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
              (requirement === 'both'
                ? !dashboardImage
                : atLeastOneImageMissing)
            }
            image={dashboardImage ?? (!hidden.dashboard ? existingImages?.dashboard ?? null : null)}
            kind="dashboard"
            onChoose={() => chooseImage('dashboard')}
            onRemove={() => { if (lockedRef.current) return; onSelectionChange?.(); setDashboardImage(null); setHidden(value => ({ ...value, dashboard: true })); }}
            disabled={locked}
            onImageError={onImageError}
            onPreview={onPreview}
          />
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
  intro: {
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
