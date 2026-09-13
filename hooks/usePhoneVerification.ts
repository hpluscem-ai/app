import { useRef, useState } from 'react';

import { useAuth } from '../components/AuthProvider';
import {
  confirmPhoneChangeVerification,
  confirmPhoneVerification,
  getAuthErrorMessage,
  sendPhoneVerification,
  sendPhoneChangeVerification,
  type PhoneVerificationInput,
} from '../utils/authApi';

export function usePhoneVerification(
  purpose: PhoneVerificationInput['purpose'] | 'change_phone',
  email = '',
) {
  const { request } = useAuth();
  const [revision, setRevision] = useState(0);
  const sent = useRef<{
    phone: string;
    email: string;
    purpose: typeof purpose;
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
      const result = purpose === 'change_phone'
        ? await request((session) => sendPhoneChangeVerification(phone, session))
        : await sendPhoneVerification(
          purpose === 'reset_password'
            ? { purpose, phone, email }
            : { purpose, phone },
        );
      sent.current = { ...result, phone, email, purpose };
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
    const verification = sent.current;
    if (
      !verification ||
      verification.phone !== phone ||
      verification.email !== email ||
      verification.purpose !== purpose ||
      Date.parse(verification.expiresAt) <= Date.now()
    ) {
      return {
        status: 'unavailable',
        message: '인증번호를 다시 발송해주세요.',
      } as const;
    }
    try {
      const result = purpose === 'change_phone'
        ? await request((session) => confirmPhoneChangeVerification(
          verification.verificationId, verificationCode, session,
        ))
        : await confirmPhoneVerification(
          verification.verificationId, verificationCode, purpose,
        );
      if (
        sent.current !== verification ||
        Date.parse(result.expiresAt) <= Date.now()
      ) {
        return {
          status: 'unavailable',
          message: '인증번호를 다시 발송해주세요.',
        } as const;
      }
      sent.current = { ...verification, ...result };
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
      sent.current.purpose === purpose &&
      sent.current.verificationProof === values.verificationProof &&
      Date.parse(sent.current.expiresAt) > Date.now(),
    );

  return { requestCode, verifyCode, isProofValid, resetVerification, revision };
}
