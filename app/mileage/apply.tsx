import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import {
  UploadCard,
  type UploadKind,
} from '../../components/mileage/UploadCard';
import { colors } from '../../constants/theme';
import {
  showCameraPermissionAlert,
  showImagePickerErrorAlert,
  showImageSizeLimitAlert,
  showImageSizeUnavailableAlert,
  showImageSourceActions,
  showMileageImagesRequiredAlert,
  showMileageServerPendingAlert,
} from '../../utils/alerts';

type ImageSource = 'camera' | 'library';

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

export default function MileageApplyRoute() {
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
    if (!receiptImage || !dashboardImage) {
      setShowErrors(true);
      showMileageImagesRequiredAlert();
      return;
    }

    setShowErrors(false);
    showMileageServerPendingAlert();
  };

  return (
    <AppScreen activeTab="apply" variant="main">
      <View style={styles.pageContent}>
        <View style={styles.uploadSection}>
          <Text style={styles.title}>적립 이미지 업로드</Text>
          <View style={styles.uploadRow}>
            <UploadCard
              error={showErrors && !receiptImage}
              image={receiptImage}
              kind="receipt"
              onChoose={() => chooseImage('receipt')}
              onRemove={() => setReceiptImage(null)}
            />
            <UploadCard
              error={showErrors && !dashboardImage}
              image={dashboardImage}
              kind="dashboard"
              onChoose={() => chooseImage('dashboard')}
              onRemove={() => setDashboardImage(null)}
            />
          </View>
        </View>

        <PrimaryButton label="사진 등록" onPress={submitImages} />
      </View>
    </AppScreen>
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
  title: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
    color: colors.black,
  },
  uploadRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
