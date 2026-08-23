import type { DimensionValue, PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '../../constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: NonNullable<PressableProps['onPress']>;
  disabled?: boolean;
  width?: DimensionValue;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  width = '100%',
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.brand500,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    ...typography.authAction,
    color: colors.white,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
});
