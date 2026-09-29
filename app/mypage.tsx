import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../components/AppScreen';
import { useAuth } from '../components/AuthProvider';
import { NoticeModal } from '../components/NoticeModal';
import { FormTextField } from '../components/auth/FormTextField';
import { LegalDocumentLink } from '../components/auth/LegalDocumentLink';
import { PhoneVerificationSection } from '../components/auth/PhoneVerificationSection';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { CheckSquareIcon } from '../components/icons/CheckSquareIcon';
import { colors, typography } from '../constants/theme';
import { usePhoneVerification } from '../hooks/usePhoneVerification';
import { useAlerts } from '../utils/alerts';
import {
  changePhone,
  getAuthErrorMessage,
  getProfile,
  requestMyPasswordResetEmail,
  updateProfile,
  type DriverProfile,
} from '../utils/authApi';
import { formatName } from '../utils/inputFormat';

type MyPageFormValues = {
  name: string;
  phone: string;
  verificationCode: string;
  verificationProof: string;
  marketingConsent: boolean;
};

type ProfileNotice =
  { email: string; type: 'password-reset-sent' } | { type: 'profile-updated' };

type ProfileNoticeModalProps = {
  notice: ProfileNotice | null;
  onConfirm: () => void;
};

function ProfileNoticeModal({ notice, onConfirm }: ProfileNoticeModalProps) {
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
        isPasswordReset ? '비밀번호 재설정 링크 발송 완료' : '정보 변경 완료'
      }
      confirmLabel="확인"
      message={message}
      onConfirm={onConfirm}
      visible
    />
  );
}

export default function MyPageRoute() {
  const { request, signOut, updateName, withdraw } = useAuth();
  const {
    showAuthErrorAlert,
    showPhoneVerificationRequiredAlert,
  } = useAlerts();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const [accountAction, setAccountAction] = useState<'logout' | 'withdraw' | null>(null);
  const [isProcessingAccount, setIsProcessingAccount] = useState(false);
  const accountRequestInFlight = useRef(false);
  const formRequestInFlight = useRef(false);
  const activeFocus = useRef<object | null>(null);
  const isWithdrawal = accountAction === 'withdraw';
  const confirmAccountAction = async () => {
    const focus = activeFocus.current;
    if (!focus || !accountAction || accountRequestInFlight.current || formRequestInFlight.current) return;
    accountRequestInFlight.current = true;
    setIsProcessingAccount(true);
    try {
      await (isWithdrawal ? withdraw() : signOut());
      if (activeFocus.current !== focus) return;
      setAccountAction(null);
    } catch (error) {
      if (activeFocus.current === focus) {
        setAccountAction(null);
        showAuthErrorAlert(getAuthErrorMessage(error));
      }
    } finally {
      if (activeFocus.current === focus) {
        accountRequestInFlight.current = false;
        setIsProcessingAccount(false);
      }
    }
  };
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
    formState: { errors },
    handleSubmit,
    reset,
    setFocus,
    setValue,
    watch,
  } = form;
  const [name, phone, marketingConsent, verificationProof] =
    watch(['name', 'phone', 'marketingConsent', 'verificationProof']);
  const phoneChanged = Boolean(profile && phone !== profile.phone);
  const hasChanges = Boolean(profile && (
    name.trim() !== profile.name || marketingConsent !== profile.marketingConsent || phoneChanged
  ));
  const purpose = phoneChanged ? 'change_phone' : 'reset_password';
  const { requestCode, verifyCode, isProofValid, resetVerification, revision } =
    usePhoneVerification(purpose, profile?.email ?? '');
  const canSave = hasChanges || isProofValid({ phone, verificationProof });
  const busy = isSavingProfile || isSendingResetLink || isProcessingAccount;
  const formDisabled = !profile || busy;

  useFocusEffect(useCallback(() => {
    const focus = {};
    activeFocus.current = focus;
    formRequestInFlight.current = false;
    accountRequestInFlight.current = false;
    setIsSavingProfile(false);
    setIsSendingResetLink(false);
    setIsProcessingAccount(false);
    setNotice(null);
    setAccountAction(null);
    setProfile(null);
    setLoadError(null);
    void request(getProfile).then((loaded) => {
      if (activeFocus.current !== focus) return;
      setProfile(loaded);
      reset({ ...loaded, verificationCode: '', verificationProof: '' });
      updateName(loaded.name);
    }).catch((error: unknown) => {
      if (activeFocus.current === focus) setLoadError(getAuthErrorMessage(error));
    });
    return () => { activeFocus.current = null; };
  }, [loadAttempt, request, reset, updateName]));

  const requestPasswordResetLink = async () => {
    const focus = activeFocus.current;
    if (!focus || !profile || formRequestInFlight.current || accountRequestInFlight.current) return;
    formRequestInFlight.current = true;
    setIsSendingResetLink(true);
    try {
      const { email } = await request(requestMyPasswordResetEmail);
      if (activeFocus.current !== focus) return;
      setNotice({ email, type: 'password-reset-sent' });
    } catch (error) {
      if (activeFocus.current === focus) showAuthErrorAlert(getAuthErrorMessage(error));
    } finally {
      if (activeFocus.current === focus) {
        formRequestInFlight.current = false;
        setIsSendingResetLink(false);
      }
    }
  };
  const submitValidForm = (focus: object) => handleSubmit(async (values) => {
    if (activeFocus.current !== focus || !profile) return;
    const changingPhone = values.phone !== profile.phone;
    const changes = {
      ...(values.name.trim() === profile.name ? {} : { name: values.name }),
      ...(values.marketingConsent === profile.marketingConsent ? {} : { marketingConsent: values.marketingConsent }),
    };
    if ((changingPhone || !Object.keys(changes).length) && !isProofValid(values)) {
      setValue('verificationProof', '');
      showPhoneVerificationRequiredAlert();
      return;
    }
    if (!changingPhone && !Object.keys(changes).length) changes.name = values.name;
    try {
      const updated = Object.keys(changes).length
        ? await request((session) => updateProfile(changes, session))
        : profile;
      if (activeFocus.current !== focus) return;
      setProfile(updated);
      updateName(updated.name);
      if (changingPhone) {
        await request((session) => changePhone(values, session));
        if (activeFocus.current !== focus) return;
      }
      const saved = changingPhone ? { ...updated, phone: values.phone } : updated;
      setProfile(saved);
      reset({ ...saved, verificationCode: '', verificationProof: '' });
      if (!changingPhone) resetVerification();
      setNotice({ type: 'profile-updated' });
    } catch (error) {
      if (activeFocus.current === focus) showAuthErrorAlert(getAuthErrorMessage(error));
    } finally {
      if (activeFocus.current === focus && changingPhone) {
        setValue('verificationProof', '');
        resetVerification();
      }
    }
  })();
  const submitForm = async () => {
    const focus = activeFocus.current;
    if (!focus || formRequestInFlight.current || accountRequestInFlight.current || !profile || !canSave) return;
    formRequestInFlight.current = true;
    setIsSavingProfile(true);
    try {
      await submitValidForm(focus);
    } finally {
      if (activeFocus.current === focus) {
        formRequestInFlight.current = false;
        setIsSavingProfile(false);
      }
    }
  };

  return (
    <FormProvider {...form}>
      <AppScreen
        activeTab="profile"
        dockMode="fixed"
        showFooter={false}
        variant="main"
      >
        <View style={styles.profileContent}>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>이메일</Text>
              <View
                accessibilityLabel={profile ? `이메일 ${profile.email}` : '이메일 정보, 조회 후 표시'}
                style={styles.readonlyField}
              >
                <Text style={styles.readonlyPlaceholder}>
                  {profile?.email ?? '정보 조회 후 표시됩니다.'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: formDisabled }}
                disabled={formDisabled}
                onPress={() => void requestPasswordResetLink()}
                style={({ pressed }) => [
                  styles.passwordResetButton,
                  formDisabled && styles.disabled,
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
                  editable={!formDisabled}
                  error={errors.name?.message}
                  inputRef={ref}
                  label="성함"
                  onBlur={onBlur}
                  onChangeText={(nextValue) => onChange(formatName(nextValue))}
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
              disabled={formDisabled}
              onRequestCode={requestCode}
              onVerifyCode={verifyCode}
              required={phoneChanged}
              verificationScope={`${profile?.email ?? ''}:${purpose}:${revision}`}
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
                        accessibilityState={{ checked: value, disabled: formDisabled }}
                        disabled={formDisabled}
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
                      <LegalDocumentLink
                        document="marketing"
                        style={styles.detailsText}
                      >
                        보기
                      </LegalDocumentLink>
                    </View>
                  )}
                />
              </View>
            </View>

            <PrimaryButton
              disabled={formDisabled || !canSave}
              label="정보 변경하기"
              onPress={submitForm}
            />
            <View style={styles.accountActions}>
              {(['logout', 'withdraw'] as const).map((action) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  hitSlop={8}
                  key={action}
                  onPress={() => setAccountAction(action)}
                >
                  <Text style={styles.accountActionText}>
                    {action === 'logout' ? '로그아웃' : '회원탈퇴'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </AppScreen>

      <ProfileNoticeModal notice={notice} onConfirm={() => setNotice(null)} />
      <NoticeModal
        accessibilityLabel="내 정보 조회 실패"
        confirmLabel="다시 시도"
        message={loadError ?? ''}
        onConfirm={() => setLoadAttempt((attempt) => attempt + 1)}
        visible={loadError !== null}
      />
      <NoticeModal
        accessibilityLabel={isWithdrawal ? '회원탈퇴 확인' : '로그아웃 확인'}
        busy={isProcessingAccount}
        confirmLabel={isWithdrawal ? '회원탈퇴' : '로그아웃'}
        message={
          isWithdrawal
            ? '적립된 마일리지를 포함한 데이터가 삭제되며 복구하실 수 없습니다. 회원탈퇴 하시겠습니까?'
            : '로그아웃 하시겠습니까?'
        }
        onCancel={() => setAccountAction(null)}
        onConfirm={() => void confirmAccountAction()}
        visible={accountAction !== null}
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
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  accountActionText: {
    ...typography.suitMedium14,
    color: colors.gray400,
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
