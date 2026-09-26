import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { NoticeModal } from '../../components/NoticeModal';
import { MileagePhotoForm, type MileagePhotoSelection } from '../../components/mileage';
import { imageSources } from '../../constants/assets';
import { getAuthErrorMessage } from '../../utils/authApi';
import { createMileageApplication } from '../../utils/mileageApi';
import { prepareMileageSubmission } from '../../utils/mileagePhotos';
import { confirmMileagePhotoGuide, hasConfirmedMileagePhotoGuide } from '../../utils/mileagePhotoGuide';

const guideImage = { source: imageSources.mileagePhotoGuide, aspectRatio: 4 / 3, accessibilityLabel: '계기판과 영수증이 함께 보이는 촬영 예시' };
const guideMessage = '영수증과 계기판을 한 장에 담아주세요.\n금액과 주유량(L)이 선명하게 보여야 해요.\n따로 찍었다면 2장을 선택해주세요.';

export default function MileageApplyRoute() {
  const { request, state } = useAuth();
  const router = useRouter();
  const active = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const submitted = useRef(false);
  const prepared = useRef<Awaited<ReturnType<typeof prepareMileageSubmission>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);
  const [notice, setNotice] = useState<{ success: boolean; message: string } | null>(null);
  const resetSubmission = () => { prepared.current?.dispose(); prepared.current = null; };

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    active.current = controller;
    inFlight.current = false;
    submitted.current = false;
    setBusy(false);
    setNotice(null);
    setGuideVisible(!hasConfirmedMileagePhotoGuide());
    return () => {
      controller.abort();
      active.current = null;
      resetSubmission();
      setNotice(null);
      setGuideVisible(false);
    };
  }, [state.user?.id]));

  const submit = async (selection: MileagePhotoSelection) => {
    const controller = active.current;
    if (!controller || controller.signal.aborted || inFlight.current || submitted.current || guideVisible) return;
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
          onSelectionChange={resetSubmission} locked={busy || submitted.current || guideVisible}
          requirement="both" submitLabel="사진등록"
        />
      </AppScreen>
      <NoticeModal accessibilityLabel={guideVisible ? '사진 등록 방법' : notice?.success ? '신청 접수 완료' : '요청을 확인해주세요.'}
        title={guideVisible ? '사진 등록 방법' : undefined} image={guideVisible ? guideImage : undefined}
        confirmLabel="확인" message={guideVisible ? guideMessage : notice?.message ?? ''} visible={guideVisible || notice !== null}
        onRequestClose={() => { if (guideVisible) setGuideVisible(false); else if (!notice?.success) setNotice(null); }}
        onConfirm={() => {
          if (guideVisible) {
            if (!active.current) return;
            confirmMileagePhotoGuide();
            setGuideVisible(false);
            return;
          }
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
