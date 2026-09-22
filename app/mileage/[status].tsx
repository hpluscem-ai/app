import { useCallback, useRef, useState } from 'react';
import { Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { NoticeModal } from '../../components/NoticeModal';
import { MileagePhotoForm } from '../../components/mileage/MileagePhotoForm';
import { UploadCard } from '../../components/mileage/UploadCard';
import { colors, typography } from '../../constants/theme';
import { useAlerts } from '../../utils/alerts';
import { AuthApiError, getAuthErrorMessage } from '../../utils/authApi';
import { formatMileageDate, getMileageApplication, getMileagePhoto, type MileageDetail } from '../../utils/mileageApi';
import { mileagePhotoPreview } from '../../utils/mileagePhotos';

export default function MileageStatusRoute() {
  const { status, id } = useLocalSearchParams<{ status?: string; id?: string }>();
  const router = useRouter();
  const { state, request } = useAuth();
  const { showMileageReRegistrationServerPendingAlert } = useAlerts();
  const [detail, setDetail] = useState<MileageDetail | null>(null);
  const [images, setImages] = useState<{ receipt: { uri: string } | null; dashboard: { uri: string } | null }>({ receipt: null, dashboard: null });
  const [retry, setRetry] = useState(0);
  const [failure, setFailure] = useState<{ message: string; returnToList: boolean } | null>(null);
  const active = useRef<AbortController | null>(null);
  const valid = typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(id) && (status === 'pending' || status === 'rejected');

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    active.current = controller;
    const owned: Awaited<ReturnType<typeof mileagePhotoPreview>>[] = [];
    const current = () => active.current === controller && !controller.signal.aborted;
    setDetail(null);
    setImages({ receipt: null, dashboard: null });
    setFailure(null);
    if (valid && id) void (async () => {
      try {
        const data = await request(session => getMileageApplication(id, session, controller.signal));
        if (!current()) return;
        if (data.status === 'approved') {
          setFailure({ message: '신청 상태가 변경되었습니다. 적립 내역에서 확인해주세요.', returnToList: true });
          return;
        }
        setDetail(data);
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
        if (current()) setFailure({ message: getAuthErrorMessage(error), returnToList: error instanceof AuthApiError && error.status === 404 });
      }
    })();
    return () => {
      controller.abort();
      active.current = null;
      owned.forEach(photo => photo.dispose());
      setImages({ receipt: null, dashboard: null });
      setFailure(null);
    };
  }, [id, valid, state.user?.id, request, retry]));

  if (!valid) return <Redirect href="/mileage" />;
  const rejected = detail?.status === 'rejected';
  const title = detail ? `${formatMileageDate(new Date(detail.submittedAt))}. ${rejected ? '반려' : '대기'}` : '';
  const imageError = () => {
    if (active.current) setFailure({ message: '사진을 표시하지 못했습니다. 다시 시도해주세요.', returnToList: false });
  };

  return (
    <>
      <Stack.Screen options={{ headerTitleStyle: typography.suitMedium16, title }} />
      <AppScreen showFooter={false} variant="plain">
        {rejected ? (
          <MileagePhotoForm key={`${id}:${retry}`} fillAvailableSpace
            intro={detail.rejectionReason ?? ''} existingImages={images}
            onValidSubmit={showMileageReRegistrationServerPendingAlert}
            requirement="atLeastOne" submitLabel="재등록" onImageError={imageError}
            locked={!images.receipt || !images.dashboard} />
        ) : (
          <View style={styles.pageContent}>
            <View style={styles.uploadSection}>
              <Text style={styles.description}>심사 완료 전에는 사진을 수정할 수 없습니다.</Text>
              <View style={styles.uploadRow}>
                <UploadCard emptyLabel="영수증 사진" error={false} image={images.receipt} kind="receipt" onImageError={imageError} />
                <UploadCard emptyLabel="계기판 사진" error={false} image={images.dashboard} kind="dashboard" onImageError={imageError} />
              </View>
            </View>
          </View>
        )}
      </AppScreen>
      <NoticeModal accessibilityLabel="신청 조회 안내" confirmLabel={failure?.returnToList ? '확인' : '다시 시도'}
        message={failure?.message ?? ''} visible={failure !== null}
        onRequestClose={() => setFailure(null)}
        onConfirm={() => { const leave = failure?.returnToList; setFailure(null); if (leave) router.replace('/mileage'); else setRetry(value => value + 1); }} />
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
