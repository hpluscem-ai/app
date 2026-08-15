import type { ImagePickerAsset } from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/theme';
import { CloseIcon } from '../icons/CloseIcon';
import { DashboardIcon } from '../icons/DashboardIcon';
import { ReceiptIcon } from '../icons/ReceiptIcon';

export type UploadKind = 'receipt' | 'dashboard';

type UploadCardProps = {
  error: boolean;
  image: ImagePickerAsset | null;
  kind: UploadKind;
  onChoose: () => void;
  onRemove: () => void;
};

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

export function UploadCard({
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
          style={StyleSheet.absoluteFill}
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

const styles = StyleSheet.create({
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
