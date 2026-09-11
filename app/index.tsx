import { Redirect } from 'expo-router';

import { useAuth } from '../components/AuthProvider';
import { NoticeModal } from '../components/NoticeModal';

export default function IndexRoute() {
  const { state, restore } = useAuth();
  if (state.status === 'restoring') return null;
  if (state.status === 'error') {
    return (
      <NoticeModal
        accessibilityLabel="로그인 상태 확인 실패"
        confirmLabel="다시 시도"
        message={state.message}
        onConfirm={() => void restore()}
        visible
      />
    );
  }
  return (
    <Redirect href={state.status === 'signedIn' ? '/mileage' : '/login'} />
  );
}
