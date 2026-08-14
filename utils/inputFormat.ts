/**
 * 숫자가 아닌 문자를 제거하고 휴대폰 번호를 3-4-4 형식으로 표시합니다.
 * 완성된 번호의 형식은 검증 유틸에서 별도로 확인합니다.
 */
export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 인증번호 입력에서는 숫자만 유지하고 6자리로 제한합니다. */
export function formatVerificationCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

/** 이름 입력에서는 문자와 공백만 유지합니다. */
export function formatName(value: string) {
  return value.replace(/[^\p{L}\s]/gu, '');
}
