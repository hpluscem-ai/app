import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, typography } from '../constants/theme';

type NoticeModalProps = {
  accessibilityLabel: string;
  busy?: boolean;
  cancelLabel?: string;
  confirmLabel: string;
  message: string;
  title?: string;
  image?: { source: ImageSourcePropType; aspectRatio: number; accessibilityLabel: string };
  onConfirm: () => void;
  onCancel?: () => void;
  onRequestClose?: () => void;
  visible: boolean;
};

export function NoticeModal(props: NoticeModalProps) {
  const [displayedProps, setDisplayedProps] = useState(props);
  const { visible } = props;
  // Modal keeps its children mounted during the closing animation.
  if (visible && displayedProps !== props) setDisplayedProps(props);
  const {
    accessibilityLabel,
    busy = false,
    cancelLabel = '취소',
    confirmLabel,
    message,
    title,
    image,
    onConfirm,
    onCancel,
    onRequestClose = onCancel ?? onConfirm,
  } = visible ? props : displayedProps;
  const disabled = busy || !visible;

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => !disabled && onRequestClose()}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={[styles.overlay, image && styles.illustratedOverlay]}>
        <View
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="alert"
          accessibilityViewIsModal
          onAccessibilityEscape={() => !disabled && onRequestClose()}
          style={[styles.card, image && styles.illustratedCard]}
        >
          {image ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              <View style={{ width: '100%', aspectRatio: image.aspectRatio, flexShrink: 0 }}>
                <Image source={image.source} accessibilityLabel={image.accessibilityLabel}
                  resizeMode="contain" style={styles.image} />
              </View>
              <Text style={styles.message}>{message}</Text>
            </ScrollView>
          ) : <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy, disabled }}
              disabled={disabled}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                onCancel && styles.outlinedButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.confirmLabel, onCancel && styles.outlinedLabel]}>
                {confirmLabel}
              </Text>
            </Pressable>
            {onCancel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.confirmButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmLabel}>{cancelLabel}</Text>
              </Pressable>
            ) : null}
          </View>
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
  illustratedOverlay: { paddingVertical: 20 },
  illustratedCard: { maxHeight: '100%' },
  body: { width: '100%', flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: 18 },
  image: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  title: { ...typography.suitSemiBold18, color: colors.gray800 },
  message: {
    ...typography.authBody,
    width: '100%',
    color: colors.gray800,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
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
  outlinedButton: {
    borderWidth: 1,
    borderColor: colors.brand500,
    backgroundColor: colors.white,
  },
  outlinedLabel: {
    color: colors.brand500,
  },
  pressed: {
    opacity: 0.9,
  },
});
