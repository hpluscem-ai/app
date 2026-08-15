import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
import { colors, typography } from '../constants/theme';
import {
  showKakaoVerificationCheckPendingAlert,
  showPhoneChangePendingAlert,
  showProfileServerPendingAlert,
} from '../utils/alerts';
import {
  formatName,
  formatPhoneNumber,
  formatVerificationCode,
} from '../utils/inputFormat';
import {
  validatePhoneNumber,
  validateVerificationCode,
} from '../utils/validation';

type MyPageFormValues = {
  name: string;
  phone: string;
  verificationCode: string;
  marketingConsent: boolean;
};

const PROFILE_EMAIL = 'nocoders@nocoders.kr';

export default function MyPageRoute() {
  const router = useRouter();
  const [isPhoneChangeActive, setIsPhoneChangeActive] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
    setFocus,
    setValue,
  } = useForm<MyPageFormValues>({
    defaultValues: {
      marketingConsent: true,
      name: '홍길동',
      phone: '010-1234-5678',
      verificationCode: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const startPhoneChange = () => {
    setIsPhoneChangeActive(true);
    setValue('verificationCode', '');
    showPhoneChangePendingAlert();
  };

  const submitForm = handleSubmit(() => {
    if (isPhoneChangeActive) {
      showKakaoVerificationCheckPendingAlert();
      return;
    }

    showProfileServerPendingAlert();
  });

  return (
    <AppScreen activeTab="profile" variant="main">
      <View style={styles.profileContent}>
        <View style={styles.profileDetails}>
          <View style={styles.fields}>
            <View style={styles.emailGroup}>
              <View
                accessibilityLabel={`이메일 ${PROFILE_EMAIL}, 변경할 수 없음`}
                style={styles.readonlyField}
              >
                <Text style={styles.fieldText}>{PROFILE_EMAIL}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => router.push('/reset-password')}
                style={({ pressed }) => [
                  styles.passwordResetLink,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.passwordResetText}>비밀번호 재설정</Text>
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
                  onBlur={onBlur}
                  onChangeText={(nextValue) =>
                    onChange(formatName(nextValue))
                  }
                  onSubmitEditing={() => {
                    if (isPhoneChangeActive) {
                      setFocus('phone');
                      return;
                    }

                    submitForm();
                  }}
                  placeholder="성함을 입력해주세요."
                  returnKeyType={isPhoneChangeActive ? 'next' : 'done'}
                  textContentType="name"
                  value={value}
                />
              )}
              rules={{
                validate: (value) =>
                  value.trim().length > 0 || '성함을 입력해주세요.',
              }}
            />

            <View style={styles.phoneRow}>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onBlur, onChange, ref, value } }) => (
                  <FormTextField
                    accessibilityLabel="연락처"
                    accessibilityState={{ disabled: !isPhoneChangeActive }}
                    autoComplete="tel"
                    containerStyle={styles.phoneField}
                    editable={isPhoneChangeActive}
                    error={errors.phone?.message}
                    inputRef={ref}
                    keyboardType="phone-pad"
                    maxLength={13}
                    onBlur={onBlur}
                    onChangeText={(nextValue) =>
                      onChange(formatPhoneNumber(nextValue))
                    }
                    onSubmitEditing={() => setFocus('verificationCode')}
                    placeholder="연락처를 입력해주세요."
                    textContentType="telephoneNumber"
                    value={value}
                  />
                )}
                rules={{
                  validate: (value) =>
                    !isPhoneChangeActive || validatePhoneNumber(value),
                }}
              />
              <PrimaryButton
                label="변경"
                onPress={startPhoneChange}
                width={58}
              />
            </View>

            <Controller
              control={control}
              name="verificationCode"
              render={({ field: { onBlur, onChange, ref, value } }) => (
                <FormTextField
                  accessibilityLabel="인증번호"
                  accessibilityState={{ disabled: !isPhoneChangeActive }}
                  autoComplete="one-time-code"
                  editable={isPhoneChangeActive}
                  error={errors.verificationCode?.message}
                  inputRef={ref}
                  keyboardType="number-pad"
                  maxLength={6}
                  onBlur={onBlur}
                  onChangeText={(nextValue) =>
                    onChange(formatVerificationCode(nextValue))
                  }
                  onSubmitEditing={submitForm}
                  placeholder="인증번호를 입력해주세요."
                  returnKeyType="done"
                  textContentType="oneTimeCode"
                  value={value}
                />
              )}
              rules={{
                validate: (value) =>
                  !isPhoneChangeActive || validateVerificationCode(value),
              }}
            />
          </View>

          <Controller
            control={control}
            name="marketingConsent"
            render={({ field: { onChange, value } }) => (
              <Pressable
                accessibilityLabel="마케팅 수신에 동의합니다."
                accessibilityRole="checkbox"
                accessibilityState={{ checked: value }}
                hitSlop={8}
                onPress={() => onChange(!value)}
                style={({ pressed }) => [
                  styles.marketingRow,
                  pressed && styles.pressed,
                ]}
              >
                <CheckSquareIcon checked={value} />
                <Text style={styles.marketingText}>
                  마케팅 수신에 동의합니다.
                </Text>
              </Pressable>
            )}
          />
        </View>

        <PrimaryButton label="정보 변경하기" onPress={submitForm} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileContent: {
    width: '100%',
    alignItems: 'center',
    gap: 40,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 52,
  },
  profileDetails: {
    width: '100%',
    gap: 16,
  },
  fields: {
    width: '100%',
    gap: 8,
  },
  emailGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  readonlyField: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    backgroundColor: colors.gray200,
    paddingHorizontal: 16,
  },
  fieldText: {
    ...typography.body,
    color: colors.gray800,
  },
  passwordResetLink: {
    minHeight: 20,
    justifyContent: 'center',
  },
  passwordResetText: {
    ...typography.body,
    color: colors.black,
  },
  phoneRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  phoneField: {
    flex: 1,
  },
  marketingRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  marketingText: {
    ...typography.body,
    color: colors.gray800,
  },
  pressed: {
    opacity: 0.9,
  },
});
