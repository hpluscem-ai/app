import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { NoticeModal } from '../components/NoticeModal';
import { FormTextField } from '../components/auth/FormTextField';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
import { colors, typography } from '../constants/theme';
import {
  showKakaoVerificationCheckPendingAlert,
  showKakaoVerificationRequestPendingAlert,
  showPhoneVerificationRequiredAlert,
  showProfilePasswordResetServerPendingAlert,
  showProfileServerPendingAlert,
} from '../utils/alerts';
import { formatName } from '../utils/inputFormat';

type MyPageFormValues = {
  name: string;
  phone: string;
  verificationCode: string;
  verificationProof: string;
  marketingConsent: boolean;
};

type ProfileNotice =
  | { email: string; type: 'password-reset-sent' }
  | { type: 'profile-updated' };

type ProfileNoticeModalProps = {
  notice: ProfileNotice | null;
  onConfirm: () => void;
};

async function requestProfilePasswordResetLink(): Promise<string | null> {
  showProfilePasswordResetServerPendingAlert();
  return null;
}

async function requestProfileUpdate(
  _values: MyPageFormValues,
): Promise<boolean> {
  showProfileServerPendingAlert();
  return false;
}

function ProfileNoticeModal({
  notice,
  onConfirm,
}: ProfileNoticeModalProps) {
  if (!notice) {
    return null;
  }

  const isPasswordReset = notice.type === 'password-reset-sent';
  const message = isPasswordReset
    ? `비밀번호 재설정 링크가 발송되었습니다.\n${notice.email} 이메일의 메일함을 확인해주세요.`
    : '정보가 변경되었습니다.';

  return (
    <NoticeModal
      accessibilityLabel={
        isPasswordReset
          ? '비밀번호 재설정 링크 발송 완료'
          : '정보 변경 완료'
      }
      confirmLabel="확인"
      message={message}
      onConfirm={onConfirm}
      visible
    />
  );
}

export default function MyPageRoute() {
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const form = useForm<MyPageFormValues>({
    defaultValues: {
      marketingConsent: false,
      name: '',
      phone: '',
      verificationCode: '',
      verificationProof: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setFocus,
    watch,
  } = form;
  const [phone, verificationCode, verificationProof] = watch([
    'phone',
    'verificationCode',
    'verificationProof',
  ]);
  const requestPasswordResetLink = async () => {
    if (isSendingResetLink) {
      return;
    }

    setIsSendingResetLink(true);

    try {
      const email = await requestProfilePasswordResetLink();

      if (email?.trim()) {
        setNotice({ email, type: 'password-reset-sent' });
      }
    } finally {
      setIsSendingResetLink(false);
    }
  };
  const submitForm = handleSubmit(async (values) => {
    if ((phone || verificationCode) && !verificationProof) {
      showPhoneVerificationRequiredAlert();
      return;
    }

    const updated = await requestProfileUpdate(values);

    if (updated) {
      setNotice({ type: 'profile-updated' });
    }
  });

  return (
    <FormProvider {...form}>
      <AppScreen activeTab="profile" dockMode="hidden" variant="main">
        <View style={styles.profileContent}>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>이메일</Text>
              <View
                accessibilityLabel="이메일 정보, 조회 후 표시"
                style={styles.readonlyField}
              >
                <Text style={styles.readonlyPlaceholder}>
                  정보 조회 후 표시됩니다.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isSendingResetLink }}
                disabled={isSendingResetLink}
                onPress={() => void requestPasswordResetLink()}
                style={({ pressed }) => [
                  styles.passwordResetButton,
                  isSendingResetLink && styles.disabled,
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
              required={false}
              verificationScope="profile-phone-change"
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>마케팅 수신 동의</Text>
              <View style={styles.marketingCard}>
                <Controller
                  control={control}
                  name="marketingConsent"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.marketingRow}>
                      <Pressable
                        accessibilityLabel="마케팅 수신에 동의합니다."
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: value }}
                        hitSlop={8}
                        onPress={() => onChange(!value)}
                        style={({ pressed }) => [
                          styles.marketingToggle,
                          pressed && styles.pressed,
                        ]}
                      >
                        <CheckSquareIcon checked={value} />
                        <Text style={styles.marketingText}>
                          마케팅 수신에 동의합니다.
                        </Text>
                      </Pressable>
                      <Text style={styles.detailsText}>보기</Text>
                    </View>
                  )}
                />
              </View>
            </View>

            <PrimaryButton
              disabled={isSubmitting}
              label="정보 변경하기"
              onPress={submitForm}
            />
          </View>
        </View>
      </AppScreen>

      <ProfileNoticeModal
        notice={notice}
        onConfirm={() => setNotice(null)}
      />
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  profileContent: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  form: {
    width: '100%',
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
  readonlyField: {
    width: '100%',
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  readonlyPlaceholder: {
    ...typography.authBody,
    color: colors.gray600,
  },
  passwordResetButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand500,
    borderRadius: 26,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  passwordResetText: {
    ...typography.authAction,
    color: colors.brand500,
  },
  marketingCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: colors.gray100,
    padding: 16,
  },
  marketingRow: {
    width: '100%',
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  marketingToggle: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marketingText: {
    ...typography.authBody,
    flexShrink: 1,
    color: colors.gray800,
  },
  detailsText: {
    ...typography.authCaption,
    color: colors.gray600,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
});
