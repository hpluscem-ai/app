import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { NoticeModal } from '../components/NoticeModal';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { useAlerts } from '../utils/alerts';
import {
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/validation';

type ResetPasswordFormValues = {
  password: string;
  passwordConfirmation: string;
};

type PasswordChangedModalProps = {
  onLogin: () => void;
  visible: boolean;
};

function PasswordChangedModal({ onLogin, visible }: PasswordChangedModalProps) {
  return (
    <NoticeModal
      accessibilityLabel="비밀번호 변경 완료"
      confirmLabel="로그인"
      message={
        '비밀번호 변경이 완료되었습니다.\n변경된 비밀번호로 로그인을 해주세요.'
      }
      onConfirm={onLogin}
      onRequestClose={() => undefined}
      visible={visible}
    />
  );
}

export default function ResetPasswordRoute() {
  const { showResetPasswordServerPendingAlert } = useAlerts();
  async function requestPasswordReset(): Promise<boolean> {
    showResetPasswordServerPendingAlert();
    return false;
  }

  const router = useRouter();
  const [isComplete, setIsComplete] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setFocus,
    watch,
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onChange',
  });
  const passwordConfirmation = watch('passwordConfirmation');

  const submitForm = handleSubmit(async () => {
    const changed = await requestPasswordReset();

    if (changed) {
      setIsComplete(true);
    }
  });
  // 서버의 재설정 Token 정책이 확정되면 이 route의 접근 제어를 연결한다.

  return (
    <>
      <AppScreen
        contentStyle={styles.authContent}
        showFooter={false}
        title="비밀번호 재설정"
        variant="auth"
      >
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
                  label="비밀번호"
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
                deps: passwordConfirmation ? ['passwordConfirmation'] : undefined,
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
                  label="비밀번호 확인"
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
            disabled={isSubmitting}
            label="비밀번호 변경"
            onPress={submitForm}
          />
        </View>
      </AppScreen>

      <PasswordChangedModal
        onLogin={() => {
          setIsComplete(false);
          router.replace('/login');
        }}
        visible={isComplete}
      />
    </>
  );
}

const styles = StyleSheet.create({
  authContent: {
    paddingVertical: 104,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fields: {
    gap: 16,
  },
});
