import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { colors, typography } from '../constants/theme';
import {
  showFindEmailServerPendingAlert,
  showKakaoVerificationCheckPendingAlert,
  showKakaoVerificationRequestPendingAlert,
  showPhoneVerificationRequiredAlert,
} from '../utils/alerts';

type FindEmailFormValues = {
  phone: string;
  verificationCode: string;
  verificationProof: string;
};

type FindEmailResult = {
  maskedEmail: string;
  phoneLastFour: string;
};

async function requestFindEmailResult(): Promise<FindEmailResult | null> {
  showFindEmailServerPendingAlert();
  return null;
}

export default function FindEmailRoute() {
  const router = useRouter();
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
    formState: { isSubmitting },
    handleSubmit,
    watch,
  } = form;
  const verificationProof = watch('verificationProof');
  const submitForm = handleSubmit(async () => {
    if (!verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    const nextResult = await requestFindEmailResult();

    if (nextResult) {
      setResult(nextResult);
    }
  });

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
            onRequestCode={showKakaoVerificationRequestPendingAlert}
            onVerifyCode={showKakaoVerificationCheckPendingAlert}
          />
        </FormProvider>

        <PrimaryButton
          disabled={isSubmitting}
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
