import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AuthApiError,
  getAuthErrorMessage,
  type CurrentUser,
  type LoginInput,
} from '../utils/authApi';
import {
  restoreSession,
  signInSession,
  signOutSession,
  withdrawSession,
} from '../utils/authSession';

type AuthState =
  | { status: 'restoring' | 'signedOut'; user: null }
  | { status: 'signedIn'; user: CurrentUser }
  | { status: 'error'; user: null; message: string };
type AuthContextValue = {
  state: AuthState;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  withdraw: () => Promise<void>;
  restore: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'restoring',
    user: null,
  });
  const inFlight = useRef(false);

  const restore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ status: 'restoring', user: null });
    try {
      const user = await restoreSession();
      setState(
        user
          ? { status: 'signedIn', user }
          : { status: 'signedOut', user: null },
      );
    } catch (error) {
      setState({
        status: 'error',
        user: null,
        message:
          error instanceof AuthApiError
            ? getAuthErrorMessage(error)
            : '저장된 로그인 정보를 확인하지 못했습니다. 다시 시도해주세요.',
      });
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void restore();
  }, [restore]);

  const signIn = async (input: LoginInput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const user = await signInSession(input);
      setState({ status: 'signedIn', user });
    } finally {
      inFlight.current = false;
    }
  };

  const endSession = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await action();
      setState({ status: 'signedOut', user: null });
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        ((error.status === 401 && error.code === 'INVALID_SESSION') ||
          error.code === 'SESSION_CLEAR_FAILED')
      ) {
        setState({ status: 'signedOut', user: null });
      }
      throw error;
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        state,
        signIn,
        restore,
        signOut: () => endSession(signOutSession),
        withdraw: () => endSession(withdrawSession),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
