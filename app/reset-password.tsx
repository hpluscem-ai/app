import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { useAuth } from '../components/AuthProvider';
import { NoticeModal } from '../components/NoticeModal';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import {
  AuthApiError,
  getAuthErrorMessage,
  resetPassword,
  validatePasswordReset,
} from '../utils/authApi';
import {
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/validation';

type ResetPasswordFormValues = {
  password: string;
  passwordConfirmation: string;
};

type ResetErrorNotice = {
  message: string;
  token: string;
  revision: number;
  action?: 'retry' | 'reject';
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
  const { restore, state } = useAuth();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const router = useRouter();
  const [validatedToken, setValidatedToken] = useState<string | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorNotice, setErrorNotice] = useState<ResetErrorNotice | null>(null);
  const requestRevision = useRef(0);
  const requestInFlight = useRef(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
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

  const rejectLink = useCallback((message: string, revision: number) => {
    setValidatedToken(null);
    setErrorNotice({ message, token, revision, action: 'reject' });
  }, [token]);

  useFocusEffect(useCallback(() => {
    const revision = ++requestRevision.current;
    requestInFlight.current = false;
    setValidatedToken(null);
    setIsComplete(false);
    setErrorNotice(null);
    reset();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      rejectLink('비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.', revision);
    } else {
      void validatePasswordReset(token).then(() => {
        if (requestRevision.current === revision) setValidatedToken(token);
      }).catch((error: unknown) => {
        if (requestRevision.current !== revision) return;
        const message = getAuthErrorMessage(error);
        if (error instanceof AuthApiError && error.status === 400) {
          rejectLink(message, revision);
        } else {
          setErrorNotice({ message, token, revision, action: 'retry' });
        }
      });
    }
    return () => {
      requestRevision.current += 1;
      setErrorNotice(null);
    };
  }, [rejectLink, reset, token, validationAttempt]));

  const submitForm = () => {
    const revision = requestRevision.current;
    return handleSubmit(async ({ password }) => {
      if (requestRevision.current !== revision) return;
      if (requestInFlight.current || validatedToken !== token || isComplete) return;
      requestInFlight.current = true;
      try {
        await resetPassword({ token, newPassword: password });
        if (requestRevision.current === revision) setIsComplete(true);
      } catch (error) {
        if (requestRevision.current !== revision) return;
        if (error instanceof AuthApiError && error.code === 'PASSWORD_RESET_INVALID') {
          rejectLink(getAuthErrorMessage(error), revision);
        } else {
          setErrorNotice({ message: getAuthErrorMessage(error), token, revision });
        }
      } finally {
        if (requestRevision.current === revision) requestInFlight.current = false;
      }
    })();
  };

  const currentError = errorNotice?.token === token &&
    errorNotice.revision === requestRevision.current ? errorNotice : null;
  const closeError = (confirmed: boolean) => {
    if (!currentError || requestRevision.current !== currentError.revision ||
      (!confirmed && currentError.action)) return;
    requestRevision.current += 1;
    setErrorNotice(null);
    if (currentError.action === 'retry') setValidationAttempt((attempt) => attempt + 1);
    if (currentError.action === 'reject') {
      router.replace(state.status === 'signedIn' ? '/mypage' : '/find-password');
    }
  };
  const errorModal = (
    <NoticeModal
      accessibilityLabel="요청을 확인해주세요."
      confirmLabel="확인"
      message={currentError ? `요청을 확인해주세요.\n${currentError.message}` : ''}
      onConfirm={() => closeError(true)}
      onRequestClose={() => closeError(false)}
      visible={currentError !== null}
    />
  );

  if (validatedToken !== token) return errorModal;

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
                  editable={!isSubmitting && !isComplete}
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
                  editable={!isSubmitting && !isComplete}
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
            disabled={isSubmitting || isComplete}
            label="비밀번호 변경"
            onPress={submitForm}
          />
        </View>
      </AppScreen>

      <PasswordChangedModal
        onLogin={() => {
          setIsComplete(false);
          router.replace('/');
          void restore();
        }}
        visible={isComplete}
      />
      {errorModal}
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
