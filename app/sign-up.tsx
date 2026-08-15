import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Controller,
  FormProvider,
  useForm,
} from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
import { ChevronDownIcon } from '../components/icons/ChevronDownIcon';
import { colors, typography } from '../constants/theme';
import {
  showKakaoVerificationCheckPendingAlert,
  showKakaoVerificationRequestPendingAlert,
  showOrganizationPendingAlert,
  showPhoneVerificationRequiredAlert,
  showSignUpServerPendingAlert,
} from '../utils/alerts';
import { formatName } from '../utils/inputFormat';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/validation';

type SignUpFormValues = {
  email: string;
  password: string;
  passwordConfirmation: string;
  name: string;
  phone: string;
  verificationCode: string;
  verificationProof: string;
  serviceTerms: boolean;
  privacyTerms: boolean;
  marketingTerms: boolean;
};

type AgreementRowProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

function AgreementRow({ checked, label, onPress }: AgreementRowProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.agreementRow,
        pressed && styles.pressed,
      ]}
    >
      <CheckSquareIcon checked={checked} />
      <Text style={styles.agreementText}>{label}</Text>
    </Pressable>
  );
}

export default function SignUpRoute() {
  const form = useForm<SignUpFormValues>({
    defaultValues: {
      email: '',
      password: '',
      passwordConfirmation: '',
      name: '',
      phone: '',
      verificationCode: '',
      verificationProof: '',
      serviceTerms: false,
      privacyTerms: false,
      marketingTerms: false,
    },
    mode: 'onChange',
  });
  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    setFocus,
    watch,
  } = form;
  const verificationProof = watch('verificationProof');
  const submitForm = handleSubmit(() => {
    if (!verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    showSignUpServerPendingAlert();
  });

  return (
    <AppScreen
      contentStyle={styles.authContent}
      title="회원가입"
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
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => setFocus('password')}
                placeholder="이메일을 입력해주세요."
                textContentType="emailAddress"
                value={value}
              />
            )}
            rules={{ validate: validateEmail }}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="비밀번호"
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
                accessibilityLabel="비밀번호 확인"
                autoComplete="new-password"
                error={errors.passwordConfirmation?.message}
                inputRef={ref}
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => setFocus('name')}
                placeholder="비밀번호를 다시 한 번 입력해주세요."
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

          <Pressable
            accessibilityLabel="소속 선택"
            accessibilityRole="button"
            onPress={showOrganizationPendingAlert}
            style={({ pressed }) => [
              styles.select,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.selectText}>소속을 선택해주세요.</Text>
            <ChevronDownIcon />
          </Pressable>

          <Controller
            control={control}
            name="name"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="성함"
                autoCapitalize="words"
                error={errors.name?.message}
                inputRef={ref}
                onBlur={onBlur}
                onChangeText={(nextValue) => onChange(formatName(nextValue))}
                onSubmitEditing={() => setFocus('phone')}
                placeholder="성함을 입력해주세요."
                textContentType="name"
                value={value}
              />
            )}
            rules={{
              validate: (value) => {
                const normalizedName = value.trim();

                if (!normalizedName) {
                  return '성함을 입력해주세요.';
                }

                return true;
              },
            }}
          />

          <FormProvider {...form}>
            <PhoneVerificationSection
              onRequestCode={showKakaoVerificationRequestPendingAlert}
              onVerifyCode={showKakaoVerificationCheckPendingAlert}
            />
          </FormProvider>
        </View>

        <View style={styles.agreements}>
          <Controller
            control={control}
            name="serviceTerms"
            render={({ field: { onChange, value } }) => (
              <AgreementRow
                checked={value}
                label="(필수)서비스 이용약관에 동의합니다."
                onPress={() => onChange(!value)}
              />
            )}
            rules={{
              validate: (value) => value || '필수 약관에 동의해주세요.',
            }}
          />
          <Controller
            control={control}
            name="privacyTerms"
            render={({ field: { onChange, value } }) => (
              <AgreementRow
                checked={value}
                label="(필수) 개인정보 수집 및 이용에 동의합니다."
                onPress={() => onChange(!value)}
              />
            )}
            rules={{
              validate: (value) => value || '필수 약관에 동의해주세요.',
            }}
          />
          <Controller
            control={control}
            name="marketingTerms"
            render={({ field: { onChange, value } }) => (
              <AgreementRow
                checked={value}
                label="(선택) 마케팅 수신에 동의합니다."
                onPress={() => onChange(!value)}
              />
            )}
          />
          {errors.serviceTerms || errors.privacyTerms ? (
            <Text
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={styles.errorText}
            >
              필수 약관에 동의해주세요.
            </Text>
          ) : null}
        </View>

        <PrimaryButton
          disabled={!isValid}
          label="회원가입"
          onPress={submitForm}
        />
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
  fields: {
    gap: 8,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  select: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray100,
    paddingHorizontal: 16,
  },
  selectText: {
    ...typography.body,
    color: colors.gray800,
  },
  agreements: {
    alignItems: 'flex-start',
    gap: 8,
  },
  agreementRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agreementText: {
    ...typography.body,
    color: colors.black,
  },
  pressed: {
    opacity: 0.9,
  },
});
