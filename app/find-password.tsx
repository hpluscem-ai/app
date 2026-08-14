import { Controller, FormProvider, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AuthScreen } from '../components/auth/AuthScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
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

export default function FindPasswordRoute() {
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
    formState: { errors },
    handleSubmit,
    setFocus,
    watch,
  } = form;
  const [email, verificationProof] = watch(['email', 'verificationProof']);
  const isEmailValid = validateEmail(email) === true;
  const submitForm = handleSubmit(() => {
    if (!verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    showFindPasswordServerPendingAlert();
  });

  return (
    <AuthScreen
      contentStyle={styles.authContent}
      title="비밀번호 찾기"
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

        <PrimaryButton label="비밀번호 찾기" onPress={submitForm} />
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
