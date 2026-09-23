import { useCallback, useRef, useState } from 'react';
import { Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { NoticeModal } from '../../components/NoticeModal';
import { MileagePhotoForm, type MileagePhotoSelection } from '../../components/mileage/MileagePhotoForm';
import { UploadCard } from '../../components/mileage/UploadCard';
import { colors, typography } from '../../constants/theme';
import { AuthApiError, getAuthErrorMessage } from '../../utils/authApi';
import { formatMileageDate, getMileageApplication, getMileagePhoto, resubmitMileageApplication, type MileageDetail } from '../../utils/mileageApi';
import { mileagePhotoPreview, prepareMileageResubmission } from '../../utils/mileagePhotos';

export default function MileageStatusRoute() {
  const { status, id } = useLocalSearchParams<{ status?: string; id?: string }>();
  const router = useRouter();
  const { state, request } = useAuth();
  const scope = `${state.user?.id}:${id}:${status}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const [loaded, setDetail] = useState<(MileageDetail & { scope: string }) | null>(null);
  const detail = loaded?.scope === scope ? loaded : null;
  const [images, setImages] = useState<{ receipt: { uri: string } | null; dashboard: { uri: string } | null }>({ receipt: null, dashboard: null });
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState<{ message: string; action: 'reload' | 'leave' | 'close' | 'success'; controller: AbortController; scope: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submitted = useRef(false);
  const prepared = useRef<Awaited<ReturnType<typeof prepareMileageResubmission>> | null>(null);
  const resetSubmission = () => { prepared.current?.dispose(); prepared.current = null; };
  const active = useRef<AbortController | null>(null);
  const valid = typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id) && (status === 'pending' || status === 'rejected');

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    active.current = controller;
    inFlight.current = false;
    submitted.current = false;
    setBusy(false);
    const owned: Awaited<ReturnType<typeof mileagePhotoPreview>>[] = [];
    const current = () => scopeRef.current === scope && active.current === controller && !controller.signal.aborted;
    setDetail(null);
    setImages({ receipt: null, dashboard: null });
    setNotice(null);
    if (valid && id) void (async () => {
      try {
        const data = await request(session => getMileageApplication(id, session, controller.signal));
        if (!current()) return;
        if (data.status === 'approved') {
          setNotice({ message: '신청 상태가 변경되었습니다. 적립 내역에서 확인해주세요.', action: 'leave', controller, scope });
          return;
        }
        setDetail({ ...data, scope });
        for (const kind of ['receipt', 'meter'] as const) {
          if (!data.photos[kind]) throw new AuthApiError('제출 사진을 확인할 수 없습니다.', 'PHOTO_UNAVAILABLE');
          const blob = await request(session => getMileagePhoto(id, kind, session, controller.signal));
          if (!current()) return;
          const preview = await mileagePhotoPreview(blob);
          if (!current()) { preview.dispose(); return; }
          owned.push(preview);
        }
        setImages({ receipt: { uri: owned[0].uri }, dashboard: { uri: owned[1].uri } });
      } catch (error) {
        if (current()) setNotice({ message: getAuthErrorMessage(error), action: error instanceof AuthApiError && error.status === 404 ? 'leave' : 'reload', controller, scope });
      }
    })();
    return () => {
      controller.abort();
      active.current = null;
      resetSubmission();
      owned.forEach(photo => photo.dispose());
      setImages({ receipt: null, dashboard: null });
      setNotice(null);
    };
  }, [id, valid, scope, request, retry]));

  const submit = async (selection: MileagePhotoSelection) => {
    const controller = active.current;
    if (!controller || controller.signal.aborted || scopeRef.current !== scope || !detail || detail.status !== 'rejected' ||
      !images.receipt || !images.dashboard || inFlight.current || submitted.current) return;
    const current = () => scopeRef.current === scope && active.current === controller && !controller.signal.aborted;
    inFlight.current = true;
    setBusy(true);
    try {
      if (!prepared.current) {
        const result = await prepareMileageResubmission(selection, detail.submissionVersion);
        if (!current()) { result.dispose(); return; }
        prepared.current = result;
      }
      const input = prepared.current;
      await request(session => resubmitMileageApplication(detail.id, input, session, controller.signal));
      if (!current()) return;
      submitted.current = true;
      resetSubmission();
      setNotice({ message: '마일리지 적립 신청이 접수되었습니다.', action: 'success', controller, scope });
    } catch (error) {
      if (current()) setNotice({ message: getAuthErrorMessage(error), controller, scope,
        action: error instanceof AuthApiError && error.status === 404 ? 'leave'
          : error instanceof AuthApiError && error.status === 409 ? 'reload' : 'close' });
    } finally {
      if (current()) { inFlight.current = false; setBusy(false); }
    }
  };

  if (!valid) return <Redirect href="/mileage" />;
  const rejected = detail?.status === 'rejected';
  const title = detail ? `${formatMileageDate(new Date(detail.submittedAt))}. ${rejected ? '반려' : '대기'}` : '';
  const imageError = () => {
    const controller = active.current;
    if (controller && !controller.signal.aborted && scopeRef.current === scope && !inFlight.current && !submitted.current) setNotice({ message: '사진을 표시하지 못했습니다. 다시 시도해주세요.', action: 'reload', controller, scope });
  };

  const visibleNotice = notice?.scope === scope && notice.controller === active.current && !notice.controller.signal.aborted ? notice : null;
  const displayedImages = detail ? images : { receipt: null, dashboard: null };

  return (
    <>
      <Stack.Screen options={{ headerTitleStyle: typography.suitMedium16, title }} />
      <AppScreen showFooter={false} variant="plain">
        {rejected ? (
          <MileagePhotoForm key={`${scope}:${retry}`} fillAvailableSpace
            intro={detail.rejectionReason ?? ''} existingImages={images}
            onValidSubmit={submit} onSelectionChange={resetSubmission}
            requirement="atLeastOne" submitLabel="재등록" onImageError={imageError}
            locked={busy || submitted.current || Boolean(visibleNotice) || !images.receipt || !images.dashboard} />
        ) : (
          <View style={styles.pageContent}>
            <View style={styles.uploadSection}>
              <Text style={styles.description}>심사 완료 전에는 사진을 수정할 수 없습니다.</Text>
              <View style={styles.uploadRow}>
                <UploadCard emptyLabel="영수증 사진" error={false} image={displayedImages.receipt} kind="receipt" onImageError={imageError} />
                <UploadCard emptyLabel="계기판 사진" error={false} image={displayedImages.dashboard} kind="dashboard" onImageError={imageError} />
              </View>
            </View>
          </View>
        )}
      </AppScreen>
      <NoticeModal accessibilityLabel={visibleNotice?.action === 'success' ? '신청 접수 완료' : '신청 조회 안내'}
        confirmLabel={visibleNotice?.action === 'reload' ? '다시 시도' : '확인'}
        message={visibleNotice?.message ?? ''} visible={visibleNotice !== null}
        onRequestClose={() => { if (visibleNotice?.action !== 'success' && visibleNotice?.controller === active.current && scopeRef.current === scope) setNotice(null); }}
        onConfirm={() => {
          if (!visibleNotice || visibleNotice.controller !== active.current || visibleNotice.controller.signal.aborted || scopeRef.current !== scope) return;
          setNotice(null);
          if (visibleNotice.action === 'success' || visibleNotice.action === 'leave') {
            visibleNotice.controller.abort();
            router.replace('/mileage');
          } else if (visibleNotice.action === 'reload') setRetry(value => value + 1);
        }} />
    </>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    width: '100%',
    minHeight: 543,
    gap: 40,
    paddingVertical: 104,
  },
  uploadSection: {
    width: '100%',
    gap: 20,
    paddingHorizontal: 20,
  },
  description: {
    ...typography.sectionTitle,
    color: colors.black,
  },
  uploadRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
