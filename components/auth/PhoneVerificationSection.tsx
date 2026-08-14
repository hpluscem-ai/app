import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

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

type RequestCodeResult = { status: 'sent' } | { status: 'unavailable' };
type VerificationResult =
  | { status: 'verified'; verificationProof: string }
  | { status: 'unavailable' };
type VerificationValues = Pick<
  PhoneVerificationFormValues,
  'phone' | 'verificationCode'
>;

type PhoneVerificationSectionProps = {
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
  requestPrerequisiteMet = true,
  verificationScope = '',
  onRequestCode,
  onVerifyCode,
}: PhoneVerificationSectionProps) {
  const actionInFlightRef = useRef(false);
  const inputRevisionRef = useRef(0);
  const previousVerificationScopeRef = useRef(verificationScope);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const {
    control,
    formState: { errors },
    clearErrors,
    getValues,
    setError,
    setFocus,
    setValue,
    trigger,
    watch,
  } = useFormContext<PhoneVerificationFormValues>();
  const phone = watch('phone');
  const verificationCode = watch('verificationCode');
  const canRequestCode =
    requestPrerequisiteMet &&
    validatePhoneNumber(phone) === true &&
    !isRequesting &&
    !isVerifying;
  const canVerifyCode =
    canRequestCode && validateVerificationCode(verificationCode) === true;

  useEffect(() => {
    if (previousVerificationScopeRef.current === verificationScope) {
      return;
    }

    previousVerificationScopeRef.current = verificationScope;
    inputRevisionRef.current += 1;
    setValue('verificationCode', '', {
      shouldDirty: true,
    });
    setValue('verificationProof', '', { shouldDirty: true });
    clearErrors('verificationCode');
  }, [clearErrors, setValue, verificationScope]);

  const requestCode = async () => {
    if (!canRequestCode || actionInFlightRef.current) {
      return;
    }

    actionInFlightRef.current = true;
    const requestRevision = ++inputRevisionRef.current;
    setIsRequesting(true);
    setValue('verificationCode', '', {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('verificationProof', '', { shouldDirty: true });

    try {
      const result = await onRequestCode(phone);
      const inputsAreUnchanged =
        inputRevisionRef.current === requestRevision &&
        getValues('phone') === phone;

      if (result.status === 'sent' && inputsAreUnchanged) {
        clearErrors('phone');
        await trigger('phone');
        setFocus('verificationCode');
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

  const verifyCode = async () => {
    if (!canVerifyCode || actionInFlightRef.current) {
      return;
    }

    actionInFlightRef.current = true;
    const verificationRevision = inputRevisionRef.current;
    setIsVerifying(true);
    setValue('verificationProof', '', { shouldDirty: true });

    try {
      const result = await onVerifyCode({ phone, verificationCode });
      const inputsAreUnchanged =
        inputRevisionRef.current === verificationRevision &&
        getValues('phone') === phone &&
        getValues('verificationCode') === verificationCode;

      if (
        result.status === 'verified' &&
        result.verificationProof.trim() &&
        inputsAreUnchanged
      ) {
        clearErrors('verificationCode');
        setValue('verificationProof', result.verificationProof, {
          shouldDirty: true,
        });
        await trigger('verificationCode');
      } else if (
        result.status === 'verified' &&
        !result.verificationProof.trim() &&
        inputsAreUnchanged
      ) {
        setError('verificationCode', {
          message: '인증번호 확인에 실패했습니다. 다시 시도해주세요.',
          type: 'server',
        });
      }
    } catch {
      if (
        inputRevisionRef.current === verificationRevision &&
        getValues('phone') === phone &&
        getValues('verificationCode') === verificationCode
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

  return (
    <View style={styles.fields}>
      <View style={styles.row}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <FormTextField
              accessibilityLabel="연락처"
              autoComplete="tel"
              containerStyle={styles.field}
              error={errors.phone?.message}
              inputRef={ref}
              keyboardType="phone-pad"
              maxLength={13}
              onBlur={onBlur}
              onChangeText={(nextValue) => {
                inputRevisionRef.current += 1;
                setValue('verificationProof', '', { shouldDirty: true });
                onChange(formatPhoneNumber(nextValue));
              }}
              onSubmitEditing={() => setFocus('verificationCode')}
              placeholder="연락처를 입력해주세요."
              textContentType="telephoneNumber"
              value={value}
            />
          )}
          rules={{ validate: validatePhoneNumber }}
        />
        <PrimaryButton
          disabled={!canRequestCode}
          label="인증번호 발송"
          onPress={() => void requestCode()}
          width={114}
        />
      </View>

      <View style={styles.row}>
        <Controller
          control={control}
          name="verificationCode"
          render={({ field: { onBlur, onChange, ref, value } }) => (
            <FormTextField
              accessibilityLabel="인증번호"
              autoComplete="one-time-code"
              containerStyle={styles.field}
              error={errors.verificationCode?.message}
              inputRef={ref}
              keyboardType="number-pad"
              maxLength={6}
              onBlur={onBlur}
              onChangeText={(nextValue) => {
                inputRevisionRef.current += 1;
                setValue('verificationProof', '', { shouldDirty: true });
                onChange(formatVerificationCode(nextValue));
              }}
              onSubmitEditing={() => void verifyCode()}
              placeholder="인증번호를 입력해주세요."
              returnKeyType="done"
              textContentType="oneTimeCode"
              value={value}
            />
          )}
          rules={{ validate: validateVerificationCode }}
        />
        <PrimaryButton
          disabled={!canVerifyCode}
          label="인증번호 확인"
          onPress={() => void verifyCode()}
          width={114}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: 8,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  field: {
    flex: 1,
  },
});
