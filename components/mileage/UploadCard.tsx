import type { ImagePickerAsset } from 'expo-image-picker';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../constants/theme';
import { CloseIcon } from '../icons/CloseIcon';
import { DashboardIcon } from '../icons/DashboardIcon';
import { ReceiptIcon } from '../icons/ReceiptIcon';

export type UploadKind = 'receipt' | 'dashboard';

type UploadCardProps = {
  error: boolean;
  emptyLabel?: string;
  image: ImagePickerAsset | null;
  kind: UploadKind;
  onChoose?: () => void;
  onRemove?: () => void;
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
  emptyLabel,
  image,
  kind,
  onChoose,
  onRemove,
}: UploadCardProps) {
  const copy = uploadCopy[kind];
  const label = emptyLabel ?? copy.placeholder;

  if (image) {
    return (
      <View style={styles.cardShadow}>
        <View style={[styles.uploadCard, styles.selectedUploadCard]}>
          <Image
            accessible
            accessibilityIgnoresInvertColors
            accessibilityLabel={`${copy.selected} 미리보기`}
            resizeMode="cover"
            source={{ uri: image.uri }}
            style={StyleSheet.absoluteFill}
          />
          {onRemove ? (
            <Pressable
              accessibilityLabel={`${copy.selected} 사진 삭제`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onRemove}
              style={({ pressed }) => [
                styles.previewLabel,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.previewLabelText}>{copy.selected}</Text>
              <CloseIcon />
            </Pressable>
          ) : (
            <View style={styles.previewLabel}>
              <Text style={styles.previewLabelText}>{copy.selected}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (!onChoose) {
    return (
      <View style={styles.cardShadow}>
        <View
          accessibilityLabel={
            error ? `${label}. 필수 사진이 없습니다.` : label
          }
          accessible
          style={[
            styles.uploadCard,
            styles.emptyUploadCard,
            error && styles.uploadCardError,
          ]}
        >
          <View style={styles.iconSurface}>
            {kind === 'receipt' ? <ReceiptIcon /> : <DashboardIcon />}
          </View>
          <Text style={styles.placeholderText}>{label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cardShadow}>
      <Pressable
        accessibilityHint={
          Platform.OS === 'web'
            ? '파일 선택창을 엽니다.'
            : '카메라 촬영 또는 갤러리 선택 메뉴를 엽니다.'
        }
        accessibilityLabel={
          error ? `${label}. 필수 사진이 없습니다.` : label
        }
        accessibilityRole="button"
        onPress={onChoose}
        style={({ pressed }) => [
          styles.uploadCard,
          styles.emptyUploadCard,
          error && styles.uploadCardError,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.iconSurface}>
          {kind === 'receipt' ? <ReceiptIcon /> : <DashboardIcon />}
        </View>
        <Text style={styles.placeholderText}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    minWidth: 0,
    flex: 1,
    aspectRatio: 1,
    borderRadius: 32,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  uploadCard: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 32,
    backgroundColor: colors.white,
  },
  emptyUploadCard: {
    borderStyle: 'dashed',
    borderColor: colors.gray200,
  },
  selectedUploadCard: {
    borderStyle: 'solid',
    borderColor: colors.gray100,
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
    ...typography.suitSemiBold14,
    width: '100%',
    color: colors.gray800,
    textAlign: 'center',
  },
  previewLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    minWidth: 122,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ translateX: -61 }, { translateY: -14 }],
  },
  previewLabelText: {
    ...typography.suitMedium14,
    color: colors.gray800,
  },
  pressed: {
    opacity: 0.9,
  },
});
