import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { MileagePhotoForm } from '../../components/mileage/MileagePhotoForm';
import { UploadCard } from '../../components/mileage/UploadCard';
import { colors, typography } from '../../constants/theme';
import { showMileageReRegistrationServerPendingAlert } from '../../utils/alerts';

type MileageStatus = 'pending' | 'rejected';

function isMileageStatus(
  value: string | string[] | undefined,
): value is MileageStatus {
  return value === 'pending' || value === 'rejected';
}

export default function MileageStatusRoute() {
  const { status } = useLocalSearchParams<{ status?: string | string[] }>();

  if (!isMileageStatus(status)) {
    return <Redirect href="/mileage" />;
  }

  const rejected = status === 'rejected';
  const title = rejected ? '반려 상세' : '대기 사진보기';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <AppScreen variant="plain">
        {rejected ? (
          <MileagePhotoForm
            intro="반려 사유는 서버 연동 후 표시됩니다. 새 사진을 등록해 주세요."
            onValidSubmit={showMileageReRegistrationServerPendingAlert}
            requirement="atLeastOne"
            submitLabel="재등록"
          />
        ) : (
          <PendingMileagePhotos />
        )}
      </AppScreen>
    </>
  );
}

function PendingMileagePhotos() {
  return (
    <View style={styles.pageContent}>
      <View style={styles.uploadSection}>
        <Text style={styles.description}>
          제출한 사진은 서버 연동 후 확인할 수 있습니다. 심사 완료 전에는 사진을 수정할 수 없습니다.
        </Text>
        <View style={styles.uploadRow}>
          <UploadCard
            emptyLabel="영수증 사진"
            error={false}
            image={null}
            kind="receipt"
          />
          <UploadCard
            emptyLabel="계기판 사진"
            error={false}
            image={null}
            kind="dashboard"
          />
        </View>
      </View>
    </View>
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
