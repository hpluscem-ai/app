import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { colors, typography } from '../constants/theme';
import {
  showFindPasswordServerPendingAlert,
  showKakaoVerificationCheckPendingAlert,
  showKakaoVerificationRequestPendingAlert,
  showPhoneVerificationRequiredAlert,
} from '../utils/alerts';
import { validateEmail } from '../utils/validation';

type FindPasswordFormValues = {
  email: string;
  phone: string;
  verificationCode: string;
  verificationProof: string;
};

async function requestPasswordResetLink(): Promise<boolean> {
  showFindPasswordServerPendingAlert();
  return false;
}

export default function FindPasswordRoute() {
  const router = useRouter();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const form = useForm<FindPasswordFormValues>({
    defaultValues: {
      email: '',
      phone: '',
      verificationCode: '',
      verificationProof: '',
    },
    mode: 'onChange',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setFocus,
    watch,
  } = form;
  const [email, verificationProof] = watch(['email', 'verificationProof']);
  const isEmailValid = validateEmail(email) === true;
  const submitForm = handleSubmit(async ({ email: submittedValue }) => {
    if (!verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    const sent = await requestPasswordResetLink();

    if (sent) {
      setSubmittedEmail(submittedValue);
    }
  });

  if (submittedEmail) {
    return (
      <AppScreen
        contentStyle={styles.authContent}
        showFooter={false}
        title="비밀번호 찾기"
        variant="auth"
      >
        <View style={styles.resultContent}>
          <View style={styles.resultSummary}>
            <Text style={styles.resultMessage}>
              아래 이메일로 비밀번호 재설정 링크를 발송했습니다.
            </Text>
            <View style={styles.resultPill}>
              <Text style={styles.resultValue}>{submittedEmail}</Text>
            </View>
          </View>

          <PrimaryButton
            label="로그인"
            onPress={() => router.replace('/login')}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      contentStyle={styles.authContent}
      showFooter={false}
      title="비밀번호 찾기"
      variant="auth"
    >
      <View style={styles.form}>
        <View style={styles.fields}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="이메일"
                autoComplete="email"
                error={errors.email?.message}
                inputRef={ref}
                keyboardType="email-address"
                label="이메일"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => setFocus('phone')}
                placeholder="이메일을 입력해주세요."
                returnKeyType="next"
                textContentType="emailAddress"
                value={value}
              />
            )}
            rules={{ validate: validateEmail }}
          />

          <FormProvider {...form}>
            <PhoneVerificationSection
              onRequestCode={showKakaoVerificationRequestPendingAlert}
              onVerifyCode={showKakaoVerificationCheckPendingAlert}
              requestPrerequisiteMet={isEmailValid}
              verificationScope={email}
            />
          </FormProvider>
        </View>

        <PrimaryButton
          disabled={isSubmitting}
          label="비밀번호 찾기"
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
  fields: {
    gap: 16,
  },
  resultContent: {
    width: '100%',
    alignItems: 'center',
    gap: 40,
  },
  resultSummary: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  resultMessage: {
    ...typography.authBody,
    color: colors.black,
    textAlign: 'center',
  },
  resultPill: {
    width: '100%',
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
});
