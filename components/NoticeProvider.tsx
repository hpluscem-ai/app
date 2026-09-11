import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { NoticeModal } from './NoticeModal';

type Notice = {
  title: string;
  message: string;
  onConfirm?: () => void;
  cancelable?: boolean;
};
const NoticeContext = createContext<((notice: Notice) => void) | null>(null);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const active = useRef<Notice | null>(null);
  const showNotice = useCallback((next: Notice) => {
    // A late background error must not replace a pending success confirmation.
    if (active.current?.cancelable === false) return;
    active.current = next;
    setNotice(next);
  }, []);
  const close = useCallback((confirmed: boolean) => {
    const current = active.current;
    if (!current || (!confirmed && current.cancelable === false)) return;
    active.current = null;
    setNotice(null);
    if (confirmed) current.onConfirm?.();
  }, []);

  return (
    <NoticeContext.Provider value={showNotice}>
      {children}
      <NoticeModal
        accessibilityLabel={notice?.title ?? ''}
        confirmLabel="확인"
        message={notice ? `${notice.title}\n${notice.message}` : ''}
        onConfirm={() => close(true)}
        onRequestClose={() => close(false)}
        visible={notice !== null}
      />
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const showNotice = useContext(NoticeContext);
  if (!showNotice) throw new Error('NoticeProvider is required');
  return showNotice;
}
