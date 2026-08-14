import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '../components/auth/AuthScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { showResetPasswordServerPendingAlert } from '../utils/alerts';
import {
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/validation';

type ResetPasswordFormValues = {
  password: string;
  passwordConfirmation: string;
};

export default function ResetPasswordRoute() {
  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setFocus,
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onChange',
  });

  const submitForm = handleSubmit(showResetPasswordServerPendingAlert);
  // 서버의 재설정 Token 정책이 확정되면 이 route의 접근 제어를 연결한다.

  return (
    <AuthScreen contentStyle={styles.authContent} title="비밀번호 변경">
      <View style={styles.form}>
        <View style={styles.fields}>
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="새 비밀번호"
                autoComplete="new-password"
                error={errors.password?.message}
                inputRef={ref}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => setFocus('passwordConfirmation')}
                placeholder="영문, 특수문자, 숫자를 포함한 비밀번호 8자리 이상"
                secureTextEntry
                textContentType="newPassword"
                value={value}
              />
            )}
            rules={{
              deps: ['passwordConfirmation'],
              validate: validatePassword,
            }}
          />

          <Controller
            control={control}
            name="passwordConfirmation"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="새 비밀번호 확인"
                autoComplete="new-password"
                error={errors.passwordConfirmation?.message}
                inputRef={ref}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={submitForm}
                placeholder="비밀번호를 다시 한 번 입력해주세요."
                returnKeyType="done"
                secureTextEntry
                textContentType="newPassword"
                value={value}
              />
            )}
            rules={{
              validate: (value, formValues) =>
                validatePasswordConfirmation(value, formValues.password),
            }}
          />
        </View>

        <PrimaryButton
          disabled={!isValid}
          label="비밀번호 변경"
          onPress={submitForm}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  authContent: {
    paddingTop: 32,
    paddingBottom: 52,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fields: {
    gap: 8,
  },
});
