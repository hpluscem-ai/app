import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import { colors, typography } from '../../constants/theme';
import {
  formatPhoneNumber,
  formatVerificationCode,
} from '../../utils/inputFormat';
import {
  validatePhoneNumber,
  validateVerificationCode,
} from '../../utils/validation';
import { FormTextField } from './FormTextField';
import { PrimaryButton } from './PrimaryButton';

type PhoneVerificationFormValues = {
  phone: string;
  verificationCode: string;
  verificationProof: string;
};

type UnavailableResult = { status: 'unavailable'; message?: string };
type RequestCodeResult =
  | { status: 'sent'; expiresAt: string }
  | UnavailableResult;
type VerificationResult =
  | { status: 'verified'; verificationProof: string }
  | UnavailableResult;
type VerificationValues = Pick<
  PhoneVerificationFormValues,
  'phone' | 'verificationCode'
>;

type PhoneVerificationSectionProps = {
  disabled?: boolean;
  required?: boolean;
  requestPrerequisiteMet?: boolean;
  verificationScope?: string;
  onRequestCode: (
    phone: string,
  ) => RequestCodeResult | Promise<RequestCodeResult>;
  onVerifyCode: (
    values: VerificationValues,
  ) => VerificationResult | Promise<VerificationResult>;
};

export function PhoneVerificationSection({
  disabled = false,
  required = true,
  requestPrerequisiteMet = true,
  verificationScope = '',
  onRequestCode,
  onVerifyCode,
}: PhoneVerificationSectionProps) {
  const actionInFlightRef = useRef(false);
  const inputRevisionRef = useRef(0);
  const pendingVerificationRef = useRef<{ code: string; revision: number } | null>(null);
  const previousVerificationScopeRef = useRef(verificationScope);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const {
    control,
    formState: { errors },
    clearErrors,
    getValues,
    setError,
    setFocus,
    setValue,
  } = useFormContext<PhoneVerificationFormValues>();

  useEffect(
    () => () => {
      inputRevisionRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    if (hasRequestedCode && !isRequesting) setFocus('verificationCode');
  }, [hasRequestedCode, isRequesting, setFocus]);

  useEffect(() => {
    if (expiresAt === null) return;
    const updateRemainingTime = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        inputRevisionRef.current += 1;
        setHasRequestedCode(false);
        setExpiresAt(null);
        setValue('verificationProof', '', { shouldDirty: true });
        setError('verificationCode', {
          type: 'validate',
          message: '인증 시간이 만료되었습니다. 인증번호를 다시 발송해주세요.',
        });
      }
    };
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, setError, setValue]);

  useEffect(() => {
    if (previousVerificationScopeRef.current === verificationScope) {
      return;
    }

    previousVerificationScopeRef.current = verificationScope;
    inputRevisionRef.current += 1;
    setHasRequestedCode(false);
    setExpiresAt(null);
    setValue('verificationCode', '', {
      shouldDirty: true,
    });
    setValue('verificationProof', '', { shouldDirty: true });
    clearErrors('verificationCode');
  }, [clearErrors, setValue, verificationScope]);

  const requestCode = async () => {
    if (disabled || actionInFlightRef.current) {
      return;
    }

    const phone = getValues('phone');
    const phoneValidation = validatePhoneNumber(phone);

    if (phoneValidation !== true) {
      setError('phone', {
        message: phoneValidation,
        type: 'validate',
      });
      return;
    }

    if (!requestPrerequisiteMet) {
      return;
    }

    actionInFlightRef.current = true;
    const requestRevision = ++inputRevisionRef.current;
    setIsRequesting(true);
    setHasRequestedCode(false);
    setExpiresAt(null);
    setValue('verificationCode', '', {
      shouldDirty: true,
    });
    setValue('verificationProof', '', { shouldDirty: true });
    clearErrors('verificationCode');

    try {
      const result = await onRequestCode(phone);
      const inputsAreUnchanged =
        inputRevisionRef.current === requestRevision &&
        getValues('phone') === phone;

      if (result.status === 'sent' && inputsAreUnchanged) {
        const deadline = Date.parse(result.expiresAt);
        if (!Number.isFinite(deadline) || deadline <= Date.now()) {
          throw new Error('Invalid verification deadline');
        }
        setExpiresAt(deadline);
        setRemainingSeconds(Math.ceil((deadline - Date.now()) / 1000));
        setHasRequestedCode(true);
        clearErrors('phone');
      } else if (
        result.status === 'unavailable' &&
        result.message &&
        inputsAreUnchanged
      ) {
        setError('phone', { type: 'server', message: result.message });
      }
    } catch {
      if (
        inputRevisionRef.current === requestRevision &&
        getValues('phone') === phone
      ) {
        setError('phone', {
          message: '인증번호 발송에 실패했습니다. 다시 시도해주세요.',
          type: 'server',
        });
      }
    } finally {
      actionInFlightRef.current = false;
      setIsRequesting(false);
    }
  };

  const verifyCode = async (verificationCode: string) => {
    const phone = getValues('phone');
    const canVerifyCode =
      hasRequestedCode &&
      expiresAt !== null &&
      expiresAt > Date.now() &&
      validatePhoneNumber(phone) === true &&
      validateVerificationCode(verificationCode) === true;

    if (
      disabled ||
      !canVerifyCode ||
      actionInFlightRef.current ||
      getValues('verificationProof')
    ) {
      return;
    }

    actionInFlightRef.current = true;
    pendingVerificationRef.current = null;
    const verificationRevision = inputRevisionRef.current;
    setIsVerifying(true);
    setValue('verificationProof', '', { shouldDirty: true });

    try {
      const result = await onVerifyCode({ phone, verificationCode });
      const inputsAreUnchanged =
        inputRevisionRef.current === verificationRevision &&
        getValues('phone') === phone;

      if (
        result.status === 'verified' &&
        result.verificationProof.trim() &&
        inputsAreUnchanged
      ) {
        clearErrors('verificationCode');
        setValue('verificationProof', result.verificationProof, {
          shouldDirty: true,
          shouldValidate: true,
        });
      } else if (
        result.status === 'verified' &&
        !result.verificationProof.trim() &&
        inputsAreUnchanged
      ) {
        setError('verificationCode', {
          message: '인증번호 확인에 실패했습니다. 다시 시도해주세요.',
          type: 'server',
        });
      } else if (
        result.status === 'unavailable' &&
        result.message &&
        inputsAreUnchanged
      ) {
        setError('verificationCode', {
          type: 'server',
          message: result.message,
        });
      }
    } catch {
      if (
        inputRevisionRef.current === verificationRevision &&
        getValues('phone') === phone
      ) {
        setError('verificationCode', {
          message: '인증번호 확인에 실패했습니다. 다시 시도해주세요.',
          type: 'server',
        });
      }
    } finally {
      actionInFlightRef.current = false;
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const pending = pendingVerificationRef.current;
    if (actionInFlightRef.current || !pending) return;
    pendingVerificationRef.current = null;
    // Only retry an edited code, using the current scope and disabled state.
    if (pending.revision === inputRevisionRef.current &&
      getValues('verificationCode') === pending.code) {
      void verifyCode(pending.code);
    }
  });

  return (
    <View style={styles.fields}>
      <Text style={styles.label}>연락처</Text>
      <View style={styles.row}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <FormTextField
              accessibilityLabel="연락처"
              autoComplete="tel"
              editable={!disabled && !isRequesting && !isVerifying}
              containerStyle={styles.phoneField}
              error={errors.phone?.message}
              inputRef={ref}
              keyboardType="phone-pad"
              maxLength={13}
              onBlur={onBlur}
              onChangeText={(nextValue) => {
                inputRevisionRef.current += 1;
                setHasRequestedCode(false);
                setExpiresAt(null);
                setValue('verificationCode', '', { shouldDirty: true });
                setValue('verificationProof', '', { shouldDirty: true });
                clearErrors('verificationCode');
                onChange(formatPhoneNumber(nextValue));
              }}
              onSubmitEditing={() => void requestCode()}
              placeholder="연락처를 입력해주세요."
              textContentType="telephoneNumber"
              value={value}
            />
          )}
          rules={{
            validate: (value) =>
              !required &&
              !value &&
              !getValues('verificationCode')
                ? true
                : validatePhoneNumber(value),
          }}
        />
        <PrimaryButton
          disabled={disabled || isRequesting || isVerifying}
          label={hasRequestedCode ? '재발송' : '인증번호 발송'}
          onPress={() => void requestCode()}
          width={107}
        />
      </View>

      <Controller
        control={control}
        name="verificationCode"
        render={({ field: { onBlur, onChange, ref, value } }) => (
          <FormTextField
            accessibilityLabel="인증번호"
            autoComplete="one-time-code"
            editable={!disabled && !isRequesting && !isVerifying}
            error={errors.verificationCode?.message}
            inputRef={ref}
            keyboardType="number-pad"
            maxLength={6}
            onBlur={onBlur}
            onChangeText={(nextValue) => {
              const formattedCode = formatVerificationCode(nextValue);

              inputRevisionRef.current += 1;
              pendingVerificationRef.current = null;
              setValue('verificationProof', '', { shouldDirty: true });
              if (expiresAt !== null && expiresAt > Date.now()) {
                clearErrors('verificationCode');
              }
              onChange(formattedCode);

              if (
                hasRequestedCode &&
                validateVerificationCode(formattedCode) === true
              ) {
                pendingVerificationRef.current = {
                  code: formattedCode,
                  revision: inputRevisionRef.current,
                };
                void verifyCode(formattedCode);
              }
            }}
            onSubmitEditing={() => void verifyCode(value)}
            placeholder="인증번호를 입력해주세요."
            returnKeyType="done"
            textContentType="oneTimeCode"
            value={value}
          />
        )}
        rules={{
          validate: (value) =>
            !required ? true : validateVerificationCode(value),
        }}
      />
      {expiresAt !== null ? (
        <Text style={styles.timer}>
          남은 시간 {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}
          :{String(remainingSeconds % 60).padStart(2, '0')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    width: '100%',
    gap: 8,
  },
  label: {
    ...typography.authBody,
    color: colors.black,
    paddingHorizontal: 8,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  phoneField: {
    flex: 1,
  },
  timer: {
    ...typography.authCaption,
    color: colors.gray600,
  },
});
