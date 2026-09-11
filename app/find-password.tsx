import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { colors, typography } from '../constants/theme';
import { usePhoneVerification } from '../hooks/usePhoneVerification';
import { useAlerts } from '../utils/alerts';
import {
  getAuthErrorMessage,
  requestPasswordResetEmail,
} from '../utils/authApi';
import { validateEmail } from '../utils/validation';

type FindPasswordFormValues = {
  email: string;
  phone: string;
  verificationCode: string;
  verificationProof: string;
};

export default function FindPasswordRoute() {
  const {
    showAuthErrorAlert,
    showPhoneVerificationRequiredAlert,
  } = useAlerts();
  const router = useRouter();
  const submissionInFlight = useRef(false);
  const [result, setResult] = useState<{
    email: string;
    message: string;
  } | null>(null);
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
    formState: { errors, isSubmitting, isValid },
    handleSubmit,
    setFocus,
    setValue,
    watch,
  } = form;
  const [email, verificationProof] = watch(['email', 'verificationProof']);
  const { requestCode, verifyCode, isProofValid, resetVerification, revision } =
    usePhoneVerification('reset_password', email);
  const isEmailValid = validateEmail(email) === true;
  const submitValidForm = handleSubmit(async (values) => {
    if (!isProofValid(values)) {
      setValue('verificationProof', '');
      showPhoneVerificationRequiredAlert();
      return;
    }
    try {
      const accepted = await requestPasswordResetEmail(values);
      setResult({ ...accepted, email: values.email.trim() });
    } catch (error) {
      showAuthErrorAlert(getAuthErrorMessage(error));
    } finally {
      // A new mail request needs fresh SMS verification, including after an uncertain response.
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
        title="비밀번호 찾기"
        variant="auth"
      >
        <View style={styles.resultContent}>
          <View style={styles.resultSummary}>
            <Text style={styles.resultMessage}>
              {result.message}
            </Text>
            <View style={styles.resultPill}>
              <Text style={styles.resultValue}>{result.email}</Text>
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
                editable={!isSubmitting}
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
              disabled={isSubmitting}
              onRequestCode={requestCode}
              onVerifyCode={verifyCode}
              requestPrerequisiteMet={isEmailValid}
              verificationScope={`${email}:${revision}`}
            />
          </FormProvider>
        </View>

        <PrimaryButton
          disabled={isSubmitting || !isValid || !verificationProof}
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
