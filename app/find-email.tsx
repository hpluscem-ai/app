import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { colors, typography } from '../constants/theme';
import { usePhoneVerification } from '../hooks/usePhoneVerification';
import { useAlerts } from '../utils/alerts';
import { findEmail, getAuthErrorMessage } from '../utils/authApi';

type FindEmailFormValues = {
  phone: string;
  verificationCode: string;
  verificationProof: string;
};

type FindEmailResult = {
  maskedEmail: string;
  phoneLastFour: string;
};

export default function FindEmailRoute() {
  const {
    showAuthErrorAlert,
    showPhoneVerificationRequiredAlert,
  } = useAlerts();
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const { requestCode, verifyCode, isProofValid, resetVerification, revision } =
    usePhoneVerification('find_email');
  const [result, setResult] = useState<FindEmailResult | null>(null);
  const form = useForm<FindEmailFormValues>({
    defaultValues: {
      phone: '',
      verificationCode: '',
      verificationProof: '',
    },
    mode: 'onChange',
  });
  const {
    formState: { isSubmitting, isValid },
    handleSubmit,
    setValue,
    watch,
  } = form;
  const verificationProof = watch('verificationProof');
  const submitValidForm = handleSubmit(async (values) => {
    if (!isProofValid(values)) {
      setValue('verificationProof', '');
      showPhoneVerificationRequiredAlert();
      return;
    }
    try {
      setResult(await findEmail(values));
    } catch (error) {
      showAuthErrorAlert(getAuthErrorMessage(error));
    } finally {
      // A lookup consumes the proof even when no account matches.
      setValue('verificationProof', '');
      resetVerification();
    }
  });
  const submitForm = async () => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    try {
      await submitValidForm();
    } finally {
      submissionInFlight.current = false;
    }
  };

  if (result) {
    return (
      <AppScreen
        contentStyle={styles.authContent}
        showFooter={false}
        title="이메일 찾기"
        variant="auth"
      >
        <View style={styles.resultContent}>
          <View style={styles.resultSummary}>
            <Text style={styles.resultMessage}>
              핸드폰번호 끝자리 {result.phoneLastFour}으로 가입한 이메일 정보입니다.
            </Text>
            <View style={styles.resultPill}>
              <Text style={styles.resultValue}>{result.maskedEmail}</Text>
            </View>
          </View>

          <View style={styles.resultActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/find-password')}
              style={({ pressed }) => [
                styles.outlineButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.outlineButtonLabel}>비밀번호 찾기</Text>
            </Pressable>
            <PrimaryButton
              label="로그인"
              onPress={() => router.replace('/login')}
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      contentStyle={styles.authContent}
      showFooter={false}
      title="이메일 찾기"
      variant="auth"
    >
      <View style={styles.form}>
        <FormProvider {...form}>
          <PhoneVerificationSection
            disabled={isSubmitting}
            onRequestCode={requestCode}
            onVerifyCode={verifyCode}
            verificationScope={String(revision)}
          />
        </FormProvider>

        <PrimaryButton
          disabled={isSubmitting || !isValid || !verificationProof}
          label="이메일 찾기"
          onPress={submitForm}
        />
      </View>
    </AppScreen>
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
  resultContent: {
    width: '100%',
    alignItems: 'center',
    gap: 40,
  },
  resultSummary: {
    alignItems: 'center',
    gap: 8,
  },
  resultMessage: {
    ...typography.authBody,
    color: colors.black,
    textAlign: 'center',
  },
  resultPill: {
    maxWidth: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.gray100,
    paddingHorizontal: 32,
  },
  resultValue: {
    ...typography.authResult,
    flexShrink: 1,
    color: colors.black,
  },
  resultActions: {
    width: '100%',
    gap: 8,
  },
  outlineButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand500,
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  outlineButtonLabel: {
    ...typography.authAction,
    color: colors.brand500,
  },
  pressed: {
    opacity: 0.9,
  },
});
