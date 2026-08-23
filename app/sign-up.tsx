import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
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
  emphasized?: boolean;
  label: string;
  onPress: () => void;
  showDetails?: boolean;
};

function AgreementRow({
  checked,
  emphasized = false,
  label,
  onPress,
  showDetails = false,
}: AgreementRowProps) {
  return (
    <View style={styles.agreementRow}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [
          styles.agreementToggle,
          pressed && styles.pressed,
        ]}
      >
        <CheckSquareIcon checked={checked} />
        <Text
          style={[
            styles.agreementText,
            emphasized && styles.agreementTextEmphasized,
          ]}
        >
          {label}
        </Text>
      </Pressable>
      {showDetails ? <Text style={styles.detailsText}>보기</Text> : null}
    </View>
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
    formState: { errors },
    handleSubmit,
    setFocus,
    setValue,
    watch,
  } = form;
  const verificationProof = watch('verificationProof');
  const serviceTerms = watch('serviceTerms');
  const privacyTerms = watch('privacyTerms');
  const marketingTerms = watch('marketingTerms');
  const allTermsChecked = serviceTerms && privacyTerms && marketingTerms;
  const submitForm = handleSubmit(() => {
    if (!verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    showSignUpServerPendingAlert();
  });

  const toggleAllTerms = () => {
    const nextValue = !allTermsChecked;

    setValue('serviceTerms', nextValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('privacyTerms', nextValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('marketingTerms', nextValue, { shouldDirty: true });
  };

  return (
    <FormProvider {...form}>
      <AppScreen showFooter={false} variant="plain">
        <View style={styles.screenContent}>
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
                    accessibilityLabel="비밀번호 확인"
                    autoComplete="new-password"
                    error={errors.passwordConfirmation?.message}
                    inputRef={ref}
                    label="비밀번호 확인"
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

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>소속</Text>
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
                </Pressable>
              </View>

              <Controller
                control={control}
                name="name"
                render={({ field: { onBlur, onChange, ref, value } }) => (
                  <FormTextField
                    accessibilityLabel="성함"
                    autoCapitalize="words"
                    error={errors.name?.message}
                    inputRef={ref}
                    label="성함"
                    onBlur={onBlur}
                    onChangeText={(nextValue) =>
                      onChange(formatName(nextValue))
                    }
                    onSubmitEditing={() => setFocus('phone')}
                    placeholder="성함을 입력해주세요."
                    textContentType="name"
                    value={value}
                  />
                )}
                rules={{
                  validate: (value) =>
                    value.trim().length > 0 || '성함을 입력해주세요.',
                }}
              />

              <PhoneVerificationSection
                onRequestCode={showKakaoVerificationRequestPendingAlert}
                onVerifyCode={showKakaoVerificationCheckPendingAlert}
              />
            </View>

            <View style={styles.agreementsSection}>
              <Text style={styles.fieldLabel}>약관 동의</Text>
              <View style={styles.agreementCard}>
                <AgreementRow
                  checked={allTermsChecked}
                  emphasized
                  label="전체 동의"
                  onPress={toggleAllTerms}
                />
                <View style={styles.divider} />
                <Controller
                  control={control}
                  name="serviceTerms"
                  render={({ field: { onChange, value } }) => (
                    <AgreementRow
                      checked={value}
                      label="(필수)서비스 이용약관에 동의합니다."
                      onPress={() => onChange(!value)}
                      showDetails
                    />
                  )}
                  rules={{
                    validate: (value) =>
                      value || '필수 약관에 동의해주세요.',
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
                      showDetails
                    />
                  )}
                  rules={{
                    validate: (value) =>
                      value || '필수 약관에 동의해주세요.',
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
                      showDetails
                    />
                  )}
                />
              </View>
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

            <PrimaryButton label="회원가입" onPress={submitForm} />
          </View>
        </View>
      </AppScreen>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fields: {
    gap: 16,
  },
  fieldGroup: {
    width: '100%',
    gap: 8,
  },
  fieldLabel: {
    ...typography.authBody,
    color: colors.black,
    paddingHorizontal: 8,
  },
  select: {
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  selectText: {
    ...typography.authBody,
    color: colors.gray400,
  },
  agreementsSection: {
    width: '100%',
    gap: 8,
  },
  agreementCard: {
    width: '100%',
    gap: 16,
    borderRadius: 24,
    backgroundColor: colors.gray100,
    padding: 16,
  },
  agreementRow: {
    width: '100%',
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  agreementToggle: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agreementText: {
    ...typography.authBody,
    flexShrink: 1,
    color: colors.gray800,
  },
  agreementTextEmphasized: {
    ...typography.authAction,
  },
  detailsText: {
    ...typography.authCaption,
    color: colors.gray600,
  },
  divider: {
    width: '100%',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dotted',
    borderTopColor: colors.gray200,
  },
  errorText: {
    ...typography.authCaption,
    color: colors.error,
  },
  pressed: {
    opacity: 0.9,
  },
});
