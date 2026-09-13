import {
  AuthApiError,
  getCurrentUserWithCookie,
  loginWithCookie,
  logout,
  withdraw,
  type CurrentUser,
  type LoginInput,
  type SessionOptions,
} from './authApi';

export async function restoreSession(): Promise<CurrentUser | null> {
  try {
    return await getCurrentUserWithCookie();
  } catch (error) {
    if (
      error instanceof AuthApiError &&
      error.status === 401 &&
      error.code === 'INVALID_SESSION'
    ) {
      return null;
    }
    throw error;
  }
}

export async function signInSession(input: LoginInput): Promise<CurrentUser> {
  await loginWithCookie(input);
  return getCurrentUserWithCookie();
}

export function requestWithSession<T>(
  action: (session: SessionOptions) => Promise<T>,
): Promise<T> {
  return action({ credentials: 'include' });
}

export const signOutSession = () => logout(undefined, 'include');
export const withdrawSession = () => withdraw(undefined, 'include');
