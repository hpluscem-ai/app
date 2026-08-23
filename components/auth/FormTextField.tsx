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
  label?: string;
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
  label,
  onChangeText,
  returnKeyType = 'next',
  secureTextEntry = false,
  value,
  ...inputProps
}: FormTextFieldProps) {
  return (
    <View style={[styles.fieldContainer, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputFeedback}>
        <TextInput
          {...inputProps}
          accessibilityLabel={accessibilityLabel}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholderTextColor={colors.gray400}
          ref={inputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          selectionColor={colors.gray800}
          style={[
            styles.input,
            error && styles.inputError,
          ]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    width: '100%',
  },
  label: {
    ...typography.authBody,
    color: colors.black,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  inputFeedback: {
    width: '100%',
    gap: 4,
  },
  input: {
    ...typography.authBody,
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 26,
    backgroundColor: colors.gray100,
    color: colors.gray800,
    paddingHorizontal: 16,
    paddingVertical: 15,
    textAlignVertical: 'center',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.authCaption,
    color: colors.error,
  },
});
