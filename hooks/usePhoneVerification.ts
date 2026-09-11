import { useRef, useState } from 'react';

import {
  confirmPhoneVerification,
  getAuthErrorMessage,
  sendPhoneVerification,
  type PhoneVerificationInput,
} from '../utils/authApi';

export function usePhoneVerification(
  purpose: PhoneVerificationInput['purpose'],
  email = '',
) {
  const [revision, setRevision] = useState(0);
  const sent = useRef<{
    phone: string;
    email: string;
    verificationId: string;
    expiresAt: string;
    verificationProof?: string;
  } | null>(null);

  const resetVerification = () => {
    sent.current = null;
    setRevision((value) => value + 1);
  };

  const requestCode = async (phone: string) => {
    sent.current = null;
    try {
      const result = await sendPhoneVerification(
        purpose === 'reset_password'
          ? { purpose, phone, email }
          : { purpose, phone },
      );
      sent.current = { ...result, phone, email };
      return { status: 'sent', expiresAt: result.expiresAt } as const;
    } catch (error) {
      return {
        status: 'unavailable',
        message: getAuthErrorMessage(error),
      } as const;
    }
  };

  const verifyCode = async ({
    phone,
    verificationCode,
  }: {
    phone: string;
    verificationCode: string;
  }) => {
    const request = sent.current;
    if (
      !request ||
      request.phone !== phone ||
      request.email !== email ||
      Date.parse(request.expiresAt) <= Date.now()
    ) {
      return {
        status: 'unavailable',
        message: '인증번호를 다시 발송해주세요.',
      } as const;
    }
    try {
      const result = await confirmPhoneVerification(
        request.verificationId,
        verificationCode,
        purpose,
      );
      if (
        sent.current !== request ||
        Date.parse(result.expiresAt) <= Date.now()
      ) {
        return {
          status: 'unavailable',
          message: '인증번호를 다시 발송해주세요.',
        } as const;
      }
      sent.current = { ...request, ...result };
      return {
        status: 'verified',
        verificationProof: result.verificationProof,
      } as const;
    } catch (error) {
      return {
        status: 'unavailable',
        message: getAuthErrorMessage(error),
      } as const;
    }
  };

  const isProofValid = (values: { phone: string; verificationProof: string }) =>
    Boolean(
      values.verificationProof &&
      sent.current &&
      sent.current.phone === values.phone &&
      sent.current.email === email &&
      sent.current.verificationProof === values.verificationProof &&
      Date.parse(sent.current.expiresAt) > Date.now(),
    );

  return { requestCode, verifyCode, isProofValid, resetVerification, revision };
}
