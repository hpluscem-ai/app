import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/theme';
import {
  showCameraPermissionAlert,
  showImagePickerErrorAlert,
  showImageSizeLimitAlert,
  showImageSizeUnavailableAlert,
  showImageSourceActions,
  showMileageAtLeastOneImageRequiredAlert,
  showMileageImagesRequiredAlert,
} from '../../utils/alerts';
import { PrimaryButton } from '../auth/PrimaryButton';
import { UploadCard, type UploadKind } from './UploadCard';

type ImageSource = 'camera' | 'library';
type MileagePhotoRequirement = 'both' | 'atLeastOne';

export type MileagePhotoSelection = {
  dashboard: ImagePicker.ImagePickerAsset | null;
  receipt: ImagePicker.ImagePickerAsset | null;
};

type MileagePhotoFormProps = {
  intro: string;
  onValidSubmit: (selection: MileagePhotoSelection) => void;
  requirement: MileagePhotoRequirement;
  submitLabel: string;
};

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

export function MileagePhotoForm({
  intro,
  onValidSubmit,
  requirement,
  submitLabel,
}: MileagePhotoFormProps) {
  const [receiptImage, setReceiptImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [dashboardImage, setDashboardImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const pickImage = async (kind: UploadKind, source: ImageSource) => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

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

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset || (asset.type && asset.type !== 'image')) {
        showImagePickerErrorAlert();
        return;
      }

      if (asset.fileSize == null) {
        showImageSizeUnavailableAlert();
        return;
      }

      if (asset.fileSize > MAX_IMAGE_BYTES) {
        showImageSizeLimitAlert();
        return;
      }

      if (kind === 'receipt') {
        setReceiptImage(asset);
      } else {
        setDashboardImage(asset);
      }
    } catch {
      showImagePickerErrorAlert();
    }
  };

  const chooseImage = (kind: UploadKind) => {
    showImageSourceActions({
      onCamera: () => void pickImage(kind, 'camera'),
      onLibrary: () => void pickImage(kind, 'library'),
    });
  };

  const submitImages = () => {
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
    onValidSubmit({ dashboard: dashboardImage, receipt: receiptImage });
  };

  const atLeastOneImageMissing = !receiptImage && !dashboardImage;

  return (
    <View style={styles.pageContent}>
      <View style={styles.uploadSection}>
        <Text style={styles.intro}>{intro}</Text>
        <View style={styles.uploadRow}>
          <UploadCard
            error={
              showErrors &&
              (requirement === 'both' ? !receiptImage : atLeastOneImageMissing)
            }
            image={receiptImage}
            kind="receipt"
            onChoose={() => chooseImage('receipt')}
            onRemove={() => setReceiptImage(null)}
          />
          <UploadCard
            error={
              showErrors &&
              (requirement === 'both'
                ? !dashboardImage
                : atLeastOneImageMissing)
            }
            image={dashboardImage}
            kind="dashboard"
            onChoose={() => chooseImage('dashboard')}
            onRemove={() => setDashboardImage(null)}
          />
        </View>
      </View>

      <PrimaryButton label={submitLabel} onPress={submitImages} />
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    width: '100%',
    gap: 40,
    paddingVertical: 104,
  },
  uploadSection: {
    width: '100%',
    gap: 20,
    paddingHorizontal: 20,
  },
  intro: {
    ...typography.sectionTitle,
    color: colors.black,
  },
  uploadRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
