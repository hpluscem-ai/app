import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { NoticeModal } from '../../components/NoticeModal';
import { MileagePhotoForm, type MileagePhotoSelection } from '../../components/mileage';
import { getAuthErrorMessage } from '../../utils/authApi';
import { createMileageApplication } from '../../utils/mileageApi';
import { prepareMileageSubmission } from '../../utils/mileagePhotos';

export default function MileageApplyRoute() {
  const { request, state } = useAuth();
  const router = useRouter();
  const active = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const submitted = useRef(false);
  const prepared = useRef<Awaited<ReturnType<typeof prepareMileageSubmission>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; message: string } | null>(null);
  const resetSubmission = () => { prepared.current?.dispose(); prepared.current = null; };

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    active.current = controller;
    inFlight.current = false;
    submitted.current = false;
    setBusy(false);
    setNotice(null);
    return () => {
      controller.abort();
      active.current = null;
      resetSubmission();
      setNotice(null);
    };
  }, [state.user?.id]));

  const submit = async (selection: MileagePhotoSelection) => {
    const controller = active.current;
    if (!controller || controller.signal.aborted || inFlight.current || submitted.current) return;
    const current = () => active.current === controller && !controller.signal.aborted;
    inFlight.current = true;
    setBusy(true);
    try {
      if (!prepared.current) {
        const result = await prepareMileageSubmission(selection);
        if (!current()) { result.dispose(); return; }
        prepared.current = result;
      }
      const input = prepared.current;
      await request(session => createMileageApplication(input, session, controller.signal));
      if (!current()) return;
      submitted.current = true;
      resetSubmission();
      setNotice({ success: true, message: '마일리지 적립 신청이 접수되었습니다.' });
    } catch (error) {
      if (current()) setNotice({ success: false, message: getAuthErrorMessage(error) });
    } finally {
      if (current()) { inFlight.current = false; setBusy(false); }
    }
  };

  return (
    <>
      <AppScreen activeTab="apply" showFooter={false} variant="main">
        <MileagePhotoForm
          fillAvailableSpace intro="적립 이미지 업로드" onValidSubmit={submit}
          onSelectionChange={resetSubmission} locked={busy || submitted.current}
          requirement="both" submitLabel="사진등록"
        />
      </AppScreen>
      <NoticeModal accessibilityLabel={notice?.success ? '신청 접수 완료' : '요청을 확인해주세요.'}
        confirmLabel="확인" message={notice?.message ?? ''} visible={notice !== null}
        onRequestClose={() => { if (!notice?.success) setNotice(null); }}
        onConfirm={() => {
          setNotice(null);
          if (notice?.success && submitted.current && active.current) {
            submitted.current = false;
            active.current.abort();
            router.replace('/mileage');
          }
        }} />
    </>
  );
}
