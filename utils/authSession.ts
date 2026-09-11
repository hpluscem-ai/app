import * as SecureStore from 'expo-secure-store';

import {
  AuthApiError,
  getApiUrl,
  getCurrentUser,
  login,
  logout,
  withdraw,
  type CurrentUser,
  type LoginInput,
} from './authApi';

const SESSION_KEY = 'hpluseco.auth.session';

async function readSessionToken(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  let session: unknown;
  try {
    session = JSON.parse(stored);
  } catch {
    session = null;
  }
  if (
    typeof session !== 'object' ||
    session === null ||
    !('token' in session) ||
    typeof session.token !== 'string' ||
    !session.token.trim() ||
    !('server' in session) ||
    typeof session.server !== 'string'
  ) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
  // Never send a stored token to a different server.
  if (session.server !== getApiUrl()) return null;
  return session.token;
}

export async function restoreSession(): Promise<CurrentUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  try {
    return await getCurrentUser(token);
  } catch (error) {
    if (
      !(error instanceof AuthApiError) ||
      error.status !== 401 ||
      error.code !== 'INVALID_SESSION'
    ) {
      throw error;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function signInSession(input: LoginInput): Promise<CurrentUser> {
  const server = getApiUrl();
  const { token } = await login(input);
  const user = await getCurrentUser(token);
  try {
    await SecureStore.setItemAsync(
      SESSION_KEY,
      JSON.stringify({ server, token }),
    );
  } catch {
    throw new AuthApiError(
      '로그인 정보를 기기에 저장하지 못했습니다. 다시 시도해주세요.',
      'SESSION_STORAGE_ERROR',
    );
  }
  return user;
}

async function endSession(action: (token: string) => Promise<void>): Promise<void> {
  const token = await readSessionToken();
  if (!token) {
    throw new AuthApiError(
      '로그인이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.',
      'INVALID_SESSION',
      401,
    );
  }
  let sessionError: unknown;
  try {
    await action(token);
  } catch (error) {
    if (
      !(error instanceof AuthApiError) ||
      error.status !== 401 ||
      error.code !== 'INVALID_SESSION'
    ) {
      throw error;
    }
    sessionError = error;
  }
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    throw new AuthApiError(
      '로그인은 종료됐지만 기기에 저장된 로그인 정보를 지우지 못했습니다. 다시 로그인해주세요.',
      'SESSION_CLEAR_FAILED',
    );
  }
  if (sessionError) throw sessionError;
}

export const signOutSession = () => endSession(logout);
export const withdrawSession = () => endSession(withdraw);
