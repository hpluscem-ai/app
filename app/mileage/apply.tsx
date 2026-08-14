import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { MainScreen } from '../../components/MainScreen';
import { PrimaryButton } from '../../components/auth/PrimaryButton';
import { iconPaths } from '../../constants/assets';
import { colors, typography } from '../../constants/theme';
import {
  showCameraPermissionAlert,
  showImagePickerErrorAlert,
  showImageSizeLimitAlert,
  showImageSizeUnavailableAlert,
  showImageSourceActions,
  showMileageImagesRequiredAlert,
  showMileageServerPendingAlert,
} from '../../utils/alerts';

type UploadKind = 'receipt' | 'dashboard';
type ImageSource = 'camera' | 'library';

type UploadCardProps = {
  error: boolean;
  image: ImagePicker.ImagePickerAsset | null;
  kind: UploadKind;
  onChoose: () => void;
  onRemove: () => void;
};

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const uploadCopy = {
  receipt: {
    placeholder: '영수증 사진 업로드',
    selected: '요소수 영수증',
  },
  dashboard: {
    placeholder: '계기판 사진 업로드',
    selected: '요소수 계기판',
  },
} as const;

function ReceiptIcon() {
  return (
    <Svg fill="none" height={20} viewBox="0 0 17.6 20" width={17.6}>
      <Path
        d={iconPaths.receipt}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function DashboardIcon() {
  return (
    <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
      <Path d={iconPaths.dashboard} fill={colors.gray800} />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg fill="none" height={10} viewBox="0 0 10 10" width={10}>
      <Path
        d={iconPaths.close}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

function UploadCard({
  error,
  image,
  kind,
  onChoose,
  onRemove,
}: UploadCardProps) {
  const copy = uploadCopy[kind];

  if (image) {
    return (
      <View style={styles.uploadCard}>
        <Image
          accessible
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${copy.selected} 미리보기`}
          resizeMode="cover"
          source={{ uri: image.uri }}
          style={styles.previewImage}
        />
        <View style={styles.previewLabel}>
          <Text style={styles.previewLabelText}>{copy.selected}</Text>
          <Pressable
            accessibilityLabel={`${copy.selected} 사진 삭제`}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onRemove}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <CloseIcon />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint="카메라 촬영 또는 갤러리 선택 메뉴를 엽니다."
      accessibilityLabel={copy.placeholder}
      accessibilityRole="button"
      onPress={onChoose}
      style={({ pressed }) => [
        styles.uploadCard,
        error && styles.uploadCardError,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconSurface}>
        {kind === 'receipt' ? <ReceiptIcon /> : <DashboardIcon />}
      </View>
      <Text style={styles.placeholderText}>{copy.placeholder}</Text>
    </Pressable>
  );
}

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

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 1,
            });

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
    <MainScreen activeTab="apply">
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
    </MainScreen>
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
  uploadCard: {
    minWidth: 0,
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray100,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadCardError: {
    borderColor: colors.red500,
  },
  iconSurface: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.gray100,
  },
  placeholderText: {
    ...typography.body,
    width: '100%',
    color: colors.black,
    textAlign: 'center',
  },
  previewImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  previewLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    minWidth: 122,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    transform: [{ translateX: -61 }, { translateY: -16 }],
  },
  previewLabelText: {
    ...typography.body,
    color: colors.black,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
