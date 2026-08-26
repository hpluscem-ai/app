import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../constants/theme';

type NoticeModalProps = {
  accessibilityLabel: string;
  confirmLabel: string;
  message: string;
  onConfirm: () => void;
  onRequestClose?: () => void;
  visible: boolean;
};

export function NoticeModal({
  accessibilityLabel,
  confirmLabel,
  message,
  onConfirm,
  onRequestClose = onConfirm,
  visible,
}: NoticeModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <View
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="alert"
          accessibilityViewIsModal
          onAccessibilityEscape={onRequestClose}
          style={styles.card}
        >
          <Text style={styles.message}>{message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.confirmLabel}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayScrim,
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 18,
    borderRadius: 32,
    backgroundColor: colors.white,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 4,
  },
  message: {
    ...typography.authBody,
    width: '100%',
    color: colors.gray800,
  },
  confirmButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.brand500,
    paddingHorizontal: 16,
  },
  confirmLabel: {
    ...typography.authBody,
    color: colors.white,
  },
  pressed: {
    opacity: 0.9,
  },
});
