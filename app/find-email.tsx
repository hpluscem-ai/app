import { StyleSheet, View } from 'react-native';
import { FormProvider, useForm } from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
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

export default function FindEmailRoute() {
  const form = useForm<FindEmailFormValues>({
    defaultValues: {
      phone: '',
      verificationCode: '',
      verificationProof: '',
    },
    mode: 'onChange',
  });
  const { handleSubmit, watch } = form;
  const verificationProof = watch('verificationProof');
  const submitForm = handleSubmit(() => {
    if (!verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    showFindEmailServerPendingAlert();
  });

  return (
    <AppScreen
      contentStyle={styles.authContent}
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

        <PrimaryButton label="이메일 찾기" onPress={submitForm} />
      </View>
    </AppScreen>
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
});
