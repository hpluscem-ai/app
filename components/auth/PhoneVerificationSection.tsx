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

type RequestCodeResult = { status: 'sent' } | { status: 'unavailable' };
type VerificationResult =
  | { status: 'verified'; verificationProof: string }
  | { status: 'unavailable' };
type VerificationValues = Pick<
  PhoneVerificationFormValues,
  'phone' | 'verificationCode'
>;

type PhoneVerificationSectionProps = {
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
  required = true,
  requestPrerequisiteMet = true,
  verificationScope = '',
  onRequestCode,
  onVerifyCode,
}: PhoneVerificationSectionProps) {
  const actionInFlightRef = useRef(false);
  const inputRevisionRef = useRef(0);
  const previousVerificationScopeRef = useRef(verificationScope);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
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
  } = useFormContext<PhoneVerificationFormValues>();

  useEffect(() => {
    if (previousVerificationScopeRef.current === verificationScope) {
      return;
    }

    previousVerificationScopeRef.current = verificationScope;
    inputRevisionRef.current += 1;
    setHasRequestedCode(false);
    setValue('verificationCode', '', {
      shouldDirty: true,
    });
    setValue('verificationProof', '', { shouldDirty: true });
    clearErrors('verificationCode');
  }, [clearErrors, setValue, verificationScope]);

  const requestCode = async () => {
    if (actionInFlightRef.current) {
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

    await trigger('phone');
    actionInFlightRef.current = true;
    const requestRevision = ++inputRevisionRef.current;
    setIsRequesting(true);
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
        setHasRequestedCode(true);
        clearErrors('phone');
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

  const verifyCode = async (verificationCode: string) => {
    const phone = getValues('phone');
    const canVerifyCode =
      hasRequestedCode &&
      validatePhoneNumber(phone) === true &&
      validateVerificationCode(verificationCode) === true;

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
        getValues('phone') === phone;

      if (
        result.status === 'verified' &&
        result.verificationProof.trim() &&
        inputsAreUnchanged
      ) {
        clearErrors('verificationCode');
        setValue('verificationProof', result.verificationProof, {
          shouldDirty: true,
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
              containerStyle={styles.phoneField}
              error={errors.phone?.message}
              inputRef={ref}
              keyboardType="phone-pad"
              maxLength={13}
              onBlur={onBlur}
              onChangeText={(nextValue) => {
                inputRevisionRef.current += 1;
                setHasRequestedCode(false);
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
          disabled={isRequesting || isVerifying}
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
            error={errors.verificationCode?.message}
            inputRef={ref}
            keyboardType="number-pad"
            maxLength={6}
            onBlur={onBlur}
            onChangeText={(nextValue) => {
              const formattedCode = formatVerificationCode(nextValue);

              inputRevisionRef.current += 1;
              setValue('verificationProof', '', { shouldDirty: true });
              onChange(formattedCode);

              if (
                hasRequestedCode &&
                validateVerificationCode(formattedCode) === true
              ) {
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
            !required && !value && !getValues('phone')
              ? true
              : validateVerificationCode(value),
        }}
      />
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
});
