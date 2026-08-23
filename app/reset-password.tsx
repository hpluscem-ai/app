import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { colors, typography } from '../constants/theme';
import { showResetPasswordServerPendingAlert } from '../utils/alerts';
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

async function requestPasswordReset(): Promise<boolean> {
  showResetPasswordServerPendingAlert();
  return false;
}

function PasswordChangedModal({
  onLogin,
  visible,
}: PasswordChangedModalProps) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View
          accessibilityLabel="비밀번호 변경 완료"
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={styles.modalCard}
        >
          <Text style={styles.modalMessage}>
            비밀번호 변경이 완료되었습니다.{`\n`}변경된 비밀번호로 로그인을 해주세요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onLogin}
            style={({ pressed }) => [
              styles.modalButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.modalButtonLabel}>로그인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function ResetPasswordRoute() {
  const router = useRouter();
  const [isComplete, setIsComplete] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setFocus,
  } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onChange',
  });

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
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    minHeight: 146,
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
  modalMessage: {
    ...typography.authBody,
    width: '100%',
    color: colors.gray800,
  },
  modalButton: {
    minWidth: 69,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.brand500,
    paddingHorizontal: 16,
  },
  modalButtonLabel: {
    ...typography.authBody,
    color: colors.white,
  },
  pressed: {
    opacity: 0.9,
  },
});
