const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d\s]).{8,}$/;
export const PHONE_PATTERN = /^010-\d{4}-\d{4}$/;

export function validateEmail(value: string): true | string {
  if (!value.trim()) {
    return '이메일을 입력해주세요.';
  }

  return EMAIL_PATTERN.test(value) || '올바른 이메일 형식을 입력해주세요.';
}

export function validatePassword(value: string): true | string {
  if (!value) {
    return '비밀번호를 입력해주세요.';
  }

  return (
    PASSWORD_PATTERN.test(value) ||
    '영문, 숫자, 특수문자를 포함하여 8자 이상 입력해주세요.'
  );
}

export function validatePasswordConfirmation(
  value: string,
  password: string,
): true | string {
  if (!value) {
    return '비밀번호를 다시 입력해주세요.';
  }

  return value === password || '비밀번호가 일치하지 않습니다.';
}

export function validatePhoneNumber(value: string): true | string {
  if (!value) {
    return '연락처를 입력해주세요.';
  }

  return PHONE_PATTERN.test(value) || '010-0000-0000 형식으로 입력해주세요.';
}

export function validateVerificationCode(value: string): true | string {
  if (!value) {
    return '인증번호를 입력해주세요.';
  }

  return /^\d{6}$/.test(value) || '인증번호 6자리를 입력해주세요.';
}
