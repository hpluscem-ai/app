export type LoginInput = { email: string; password: string };

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  logisticsCompanyId: string;
};
export type SignupCompany = { id: string; businessName: string };

export type SessionOptions = {
  token?: string;
  credentials?: RequestCredentials;
};

export type DriverProfile = {
  email: string;
  name: string;
  phone: string;
  marketingConsent: boolean;
};

export type SignupInput = LoginInput & {
  logisticsCompanyId: string;
  name: string;
  phone: string;
  verificationProof: string;
  serviceTerms: boolean;
  privacyTerms: boolean;
  marketingTerms: boolean;
};

export type PhoneVerificationInput =
  | { purpose: 'sign_up' | 'find_email'; phone: string }
  | { purpose: 'reset_password'; phone: string; email: string };

export class AuthApiError extends Error {
  code: string;
  status: number;
  fields: string[];

  constructor(message: string, code = '', status = 0, fields: string[] = []) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function getAuthErrorMessage(error: unknown): string {
  return error instanceof AuthApiError
    ? error.message
    : '요청을 완료하지 못했습니다. 다시 시도해주세요.';
}

export function getApiUrl(): string {
  const configured =
    (process.env.EXPO_OS === 'web' &&
      process.env.EXPO_PUBLIC_WEB_API_URL?.trim()) ||
    process.env.EXPO_PUBLIC_API_URL;
  const value = configured?.trim().replace(/\/+$/, '') ?? '';
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }
  } catch {
    throw new AuthApiError(
      '서버 연결 주소를 확인해주세요.',
      'API_NOT_CONFIGURED',
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResponse(): never {
  throw new AuthApiError(
    '서버 응답을 확인하지 못했습니다. 다시 시도해주세요.',
    'INVALID_RESPONSE',
  );
}

function stringField(value: unknown, field: string): string {
  if (
    !isRecord(value) ||
    typeof value[field] !== 'string' ||
    !value[field].trim()
  ) {
    return invalidResponse();
  }
  return value[field];
}

function expiration(value: unknown): string {
  const expiresAt = stringField(value, 'expiresAt');
  if (!Number.isFinite(Date.parse(expiresAt))) invalidResponse();
  return expiresAt;
}

export async function request(
  path: string,
  options: {
    body?: unknown;
    token?: string;
    credentials?: RequestCredentials;
    expectedStatus?: number;
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  } = {},
): Promise<unknown> {
  const {
    body,
    token,
    credentials = 'omit',
    expectedStatus,
    method = body === undefined ? 'GET' : 'POST',
  } = options;
  const url = getApiUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${url}/api/v1${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials,
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new AuthApiError(
        isRecord(data) && typeof data.message === 'string'
          ? data.message
          : '서버 요청에 실패했습니다. 다시 시도해주세요.',
        isRecord(data) && typeof data.code === 'string' ? data.code : '',
        response.status,
        isRecord(data) && isRecord(data.fieldErrors)
          ? Object.keys(data.fieldErrors)
          : [],
      );
    }
    if (expectedStatus !== undefined && response.status !== expectedStatus) {
      invalidResponse();
    }
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) throw error;
    throw new AuthApiError(
      '서버 요청 결과를 확인하지 못했습니다. 네트워크와 서버 실행 상태를 확인해주세요.',
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(input: LoginInput) {
  const data = await request('/auth/login', {
    body: {
      email: input.email.trim(),
      password: input.password,
    },
  });
  return { token: stringField(data, 'token'), expiresAt: expiration(data) };
}

function currentUser(data: unknown): CurrentUser {
  return {
    id: stringField(data, 'id'),
    email: stringField(data, 'email'),
    name: stringField(data, 'name'),
    logisticsCompanyId: stringField(data, 'logisticsCompanyId'),
  };
}

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  return currentUser(await request('/auth/me', { token }));
}

export async function loginWithCookie(input: LoginInput) {
  const data = await request('/auth/web/login', {
    body: {
      email: input.email.trim(),
      password: input.password,
    },
    credentials: 'include',
  });
  return { expiresAt: expiration(data) };
}

export async function getCurrentUserWithCookie(): Promise<CurrentUser> {
  return currentUser(await request('/auth/me', { credentials: 'include' }));
}

export async function logout(
  token?: string,
  credentials: RequestCredentials = 'omit',
): Promise<void> {
  await request('/auth/logout', {
    method: 'POST',
    token,
    credentials,
    expectedStatus: 204,
  });
}

export async function withdraw(
  token?: string,
  credentials: RequestCredentials = 'omit',
): Promise<void> {
  await request('/users/me', {
    method: 'DELETE',
    token,
    credentials,
    expectedStatus: 204,
  });
}

function driverProfile(data: unknown): DriverProfile {
  if (!isRecord(data) || typeof data.marketingConsent !== 'boolean') {
    return invalidResponse();
  }
  return {
    email: stringField(data, 'email'),
    name: stringField(data, 'name'),
    phone: stringField(data, 'phone'),
    marketingConsent: data.marketingConsent,
  };
}

export async function getProfile(session: SessionOptions): Promise<DriverProfile> {
  return driverProfile(await request('/users/me', session));
}

export async function updateProfile(
  input: Partial<Pick<DriverProfile, 'name' | 'marketingConsent'>>,
  session: SessionOptions,
): Promise<DriverProfile> {
  return driverProfile(await request('/users/me', {
    ...session,
    method: 'PATCH',
    body: {
      ...(input.name === undefined ? {} : { name: input.name.trim() }),
      ...(input.marketingConsent === undefined ? {} : { marketingConsent: input.marketingConsent }),
    },
  }));
}

export async function sendPhoneChangeVerification(
  phone: string,
  session: SessionOptions,
) {
  const data = await request('/auth/phone-change/verifications', {
    ...session,
    body: { phone },
  });
  return {
    verificationId: stringField(data, 'verificationId'),
    expiresAt: expiration(data),
  };
}

export async function confirmPhoneChangeVerification(
  verificationId: string,
  code: string,
  session: SessionOptions,
) {
  const data = await request(
    `/auth/phone-change/verifications/${encodeURIComponent(verificationId)}/confirm`,
    { ...session, body: { code } },
  );
  return {
    verificationProof: stringField(data, 'verificationProof'),
    expiresAt: expiration(data),
  };
}

export async function changePhone(
  input: { phone: string; verificationProof: string },
  session: SessionOptions,
): Promise<void> {
  await request('/auth/change-phone', {
    ...session,
    body: { phone: input.phone, verificationProof: input.verificationProof },
    expectedStatus: 204,
  });
}

export async function requestMyPasswordResetEmail(
  input: { phone: string; verificationProof: string },
  session: SessionOptions,
) {
  const data = await request('/auth/me/password-reset-emails', {
    ...session,
    body: { phone: input.phone, verificationProof: input.verificationProof },
    expectedStatus: 200,
  });
  return { email: stringField(data, 'email') };
}

export async function getSignupCompanies(): Promise<SignupCompany[]> {
  const data = await request('/logistics-companies');
  if (!Array.isArray(data)) return invalidResponse();
  return data.map((item: unknown) => ({
    id: stringField(item, 'id'),
    businessName: stringField(item, 'businessName'),
  }));
}

export async function sendPhoneVerification(input: PhoneVerificationInput) {
  const data = await request('/auth/phone-verifications', {
    body: {
      phone: input.phone,
      purpose: input.purpose,
      ...(input.purpose === 'reset_password' ? { email: input.email.trim() } : {}),
    },
  });
  return {
    verificationId: stringField(data, 'verificationId'),
    expiresAt: expiration(data),
  };
}

export async function confirmPhoneVerification(
  verificationId: string,
  code: string,
  purpose: PhoneVerificationInput['purpose'],
) {
  const data = await request(
    `/auth/phone-verifications/${encodeURIComponent(verificationId)}/confirm`,
    {
      body: { code, purpose },
    },
  );
  return {
    verificationProof: stringField(data, 'verificationProof'),
    expiresAt: expiration(data),
  };
}

export async function signup(input: SignupInput): Promise<void> {
  const data = await request('/auth/signup', {
    body: {
      email: input.email.trim(),
      password: input.password,
      logisticsCompanyId: input.logisticsCompanyId,
      name: input.name.trim(),
      phone: input.phone,
      verificationProof: input.verificationProof,
      serviceTerms: input.serviceTerms,
      privacyTerms: input.privacyTerms,
      marketingTerms: input.marketingTerms,
    },
  });
  stringField(data, 'id');
}

export async function findEmail(input: {
  phone: string;
  verificationProof: string;
}) {
  const data = await request('/auth/find-email', {
    body: {
      phone: input.phone,
      verificationProof: input.verificationProof,
    },
  });
  const maskedEmail = stringField(data, 'maskedEmail');
  const phoneLastFour = stringField(data, 'phoneLastFour');
  if (!maskedEmail.includes('@') || !/^\d{4}$/.test(phoneLastFour)) {
    invalidResponse();
  }
  return { maskedEmail, phoneLastFour };
}

export async function requestPasswordResetEmail(input: {
  email: string;
  phone: string;
  verificationProof: string;
}) {
  const data = await request('/auth/password-reset-emails', {
    body: {
      email: input.email.trim(),
      phone: input.phone,
      verificationProof: input.verificationProof,
    },
    expectedStatus: 202,
  });
  return { message: stringField(data, 'message') };
}

export async function validatePasswordReset(token: string): Promise<void> {
  await request('/auth/reset-password/validate', {
    body: { token },
    expectedStatus: 204,
  });
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  await request('/auth/reset-password', {
    body: { token: input.token, newPassword: input.newPassword },
    expectedStatus: 204,
  });
}
