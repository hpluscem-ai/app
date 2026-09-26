import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, FormProvider, useForm } from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { CompanySelect } from '../components/auth/CompanySelect';
import { FormTextField } from '../components/auth/FormTextField';
import { LegalDocumentLink } from '../components/auth/LegalDocumentLink';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
import { colors, typography } from '../constants/theme';
import { usePhoneVerification } from '../hooks/usePhoneVerification';
import { useAlerts } from '../utils/alerts';
import {
  AuthApiError,
  getAuthErrorMessage,
  getSignupCompanies,
  signup,
  type SignupCompany,
} from '../utils/authApi';
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
  logisticsCompanyId: string;
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
  disabled: boolean;
  emphasized?: boolean;
  label: string;
  onPress: () => void;
  document?: 'terms' | 'collection' | 'marketing';
};

function AgreementRow({
  checked,
  disabled,
  emphasized = false,
  label,
  onPress,
  document,
}: AgreementRowProps) {
  return (
    <View style={styles.agreementRow}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
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
      {document ? (
        <LegalDocumentLink document={document} style={styles.detailsText}>
          보기
        </LegalDocumentLink>
      ) : null}
    </View>
  );
}

export default function SignUpRoute() {
  const {
    showAuthErrorAlert,
    showPhoneVerificationRequiredAlert,
    showSignupSuccessAlert,
  } = useAlerts();

  const router = useRouter();
  const submissionInFlight = useRef(false);
  const [companies, setCompanies] = useState<SignupCompany[]>([]);
  const [companyReload, setCompanyReload] = useState(0);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const { requestCode, verifyCode, isProofValid, resetVerification } =
    usePhoneVerification('sign_up');
  const form = useForm<SignUpFormValues>({
    defaultValues: {
      email: '',
      password: '',
      passwordConfirmation: '',
      logisticsCompanyId: '',
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
    formState: { errors, isSubmitting, isValid },
    clearErrors,
    getValues,
    handleSubmit,
    setError,
    setFocus,
    setValue,
    watch,
  } = form;
  const serviceTerms = watch('serviceTerms');
  const privacyTerms = watch('privacyTerms');
  const marketingTerms = watch('marketingTerms');
  const verificationProof = watch('verificationProof');
  const passwordConfirmation = watch('passwordConfirmation');
  const allTermsChecked = serviceTerms && privacyTerms && marketingTerms;

  useEffect(() => {
    let current = true;
    setIsLoadingCompanies(true);
    clearErrors('logisticsCompanyId');
    void getSignupCompanies()
      .then((result) => {
        if (!current) return;
        setCompanies(result);
        const selected = getValues('logisticsCompanyId');
        if (selected && !result.some((company) => company.id === selected)) {
          setValue('logisticsCompanyId', '', { shouldValidate: true });
        }
        if (!result.length) {
          setError('logisticsCompanyId', {
            type: 'server',
            message: '선택 가능한 소속이 없습니다.',
          });
        }
      })
      .catch((error: unknown) => {
        if (!current) return;
        setCompanies([]);
        setError('logisticsCompanyId', {
          type: 'server',
          message: getAuthErrorMessage(error),
        });
      })
      .finally(() => {
        if (current) setIsLoadingCompanies(false);
      });
    return () => {
      current = false;
    };
  }, [clearErrors, companyReload, getValues, setError, setValue]);

  const submitValidForm = handleSubmit(async (values) => {
    if (!isProofValid(values)) {
      setValue('verificationProof', '');
      showPhoneVerificationRequiredAlert();
      return;
    }
    try {
      await signup(values);
      resetVerification();
      form.reset();
      showSignupSuccessAlert(() => router.replace('/login'));
    } catch (error) {
      const fields = {
        EMAIL_ALREADY_EXISTS: 'email',
        PHONE_ALREADY_EXISTS: 'phone',
        PHONE_VERIFICATION_INVALID: 'verificationCode',
        LOGISTICS_COMPANY_UNAVAILABLE: 'logisticsCompanyId',
      } as const;
      if (error instanceof AuthApiError && Object.hasOwn(fields, error.code)) {
        const field = fields[error.code as keyof typeof fields];
        if (error.code === 'PHONE_VERIFICATION_INVALID')
          setValue('verificationProof', '');
        if (error.code === 'LOGISTICS_COMPANY_UNAVAILABLE') {
          setValue('logisticsCompanyId', '', { shouldValidate: true });
          setCompanyReload((previous) => previous + 1);
        }
        setError(
          field,
          { type: 'server', message: error.message },
          { shouldFocus: true },
        );
      } else if (
        error instanceof AuthApiError &&
        error.code === 'VALIDATION_ERROR'
      ) {
        const field = error.fields.find((key) => Object.hasOwn(values, key));
        if (field) {
          setError(
            field as keyof SignUpFormValues,
            { type: 'server', message: error.message },
            { shouldFocus: true },
          );
        } else {
          showAuthErrorAlert(getAuthErrorMessage(error));
        }
      } else {
        showAuthErrorAlert(getAuthErrorMessage(error));
      }
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
                    editable={!isSubmitting}
                    error={errors.email?.message}
                    inputRef={ref}
                    keyboardType="email-address"
                    label="이메일"
                    onBlur={onBlur}
                    onChangeText={(nextValue) => onChange(nextValue.replace(/\s/g, ''))}
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
                    editable={!isSubmitting}
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
                    accessibilityLabel="비밀번호 확인"
                    autoComplete="new-password"
                    editable={!isSubmitting}
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

              <Controller
                control={control}
                name="logisticsCompanyId"
                render={({ field: { onBlur, onChange, value } }) => (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>소속</Text>
                    <CompanySelect
                      companies={companies}
                      disabled={isSubmitting || isLoadingCompanies}
                      error={errors.logisticsCompanyId?.message}
                      loading={isLoadingCompanies}
                      onBlur={onBlur}
                      onChange={onChange}
                      onRetry={() => {
                        if (!isLoadingCompanies && !isSubmitting) {
                          setCompanyReload((previous) => previous + 1);
                        }
                      }}
                      value={value}
                    />
                    {errors.logisticsCompanyId ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        accessibilityRole="alert"
                        nativeID="signup-company-error"
                        style={styles.errorText}
                      >
                        {errors.logisticsCompanyId.message}
                      </Text>
                    ) : null}
                  </View>
                )}
                rules={{ required: '소속을 선택해주세요.' }}
              />

              <Controller
                control={control}
                name="name"
                render={({ field: { onBlur, onChange, ref, value } }) => (
                  <FormTextField
                    accessibilityLabel="성함"
                    autoCapitalize="words"
                    editable={!isSubmitting}
                    error={errors.name?.message}
                    inputRef={ref}
                    label="성함"
                    onBlur={onBlur}
                    onChangeText={(nextValue) =>
                      onChange(formatName(nextValue).replace(/\s/g, ''))
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
                disabled={isSubmitting}
                onRequestCode={requestCode}
                onVerifyCode={verifyCode}
              />
            </View>

            <View style={styles.agreementsSection}>
              <Text style={styles.fieldLabel}>약관 동의</Text>
              <View style={styles.agreementCard}>
                <AgreementRow
                  checked={allTermsChecked}
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      label="(필수)서비스 이용약관에 동의합니다."
                      onPress={() => onChange(!value)}
                      document="terms"
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
                      disabled={isSubmitting}
                      label="(필수) 개인정보 수집 및 이용에 동의합니다."
                      onPress={() => onChange(!value)}
                      document="collection"
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
                      disabled={isSubmitting}
                      label="(선택) 마케팅 수신에 동의합니다."
                      onPress={() => onChange(!value)}
                      document="marketing"
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

            <PrimaryButton
              disabled={
                isSubmitting ||
                isLoadingCompanies ||
                !isValid ||
                !verificationProof
              }
              label="회원가입"
              onPress={submitForm}
            />
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
