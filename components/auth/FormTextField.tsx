import type { Ref } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
  View,
} from 'react-native';

import { colors, typography } from '../../constants/theme';

type FormTextFieldProps = Omit<
  TextInputProps,
  'accessibilityLabel' | 'autoCorrect' | 'ref' | 'style'
> & {
  accessibilityLabel: string;
  containerStyle?: StyleProp<ViewStyle>;
  error?: string;
  inputRef: Ref<TextInput>;
  onChangeText: NonNullable<TextInputProps['onChangeText']>;
  value: string;
};

export function FormTextField({
  accessibilityLabel,
  autoCapitalize = 'none',
  containerStyle,
  error,
  inputRef,
  keyboardType = 'default',
  onChangeText,
  returnKeyType = 'next',
  secureTextEntry = false,
  value,
  ...inputProps
}: FormTextFieldProps) {
  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholderTextColor={colors.gray800}
        ref={inputRef}
        returnKeyType={returnKeyType}
        secureTextEntry={secureTextEntry}
        selectionColor={colors.gray800}
        style={[styles.input, error && styles.inputError]}
        value={value}
      />
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.errorText}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    width: '100%',
    gap: 4,
  },
  input: {
    ...typography.body,
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.gray100,
    color: colors.gray800,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
});
