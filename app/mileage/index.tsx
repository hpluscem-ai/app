import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '../../components/AppScreen';
import { CalendarIcon } from '../../components/icons/CalendarIcon';
import { imageSources } from '../../constants/assets';
import { colors, typography } from '../../constants/theme';

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

function getOneMonthAgo(date: Date) {
  const result = new Date(date);
  const day = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() - 1);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(day, lastDay));

  return result;
}

export default function MileageRoute() {
  const router = useRouter();
  const today = new Date();
  const oneMonthAgo = getOneMonthAgo(today);

  return (
    <AppScreen activeTab="mileage" variant="main">
      <View style={styles.hero}>
        <View style={styles.heroTopLine}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayLabel}>TODAY</Text>
          </View>
          <Text
            accessibilityLabel={`오늘 ${formatLocalDate(today)}`}
            style={styles.heroDate}
          >
            {formatLocalDate(today)}
          </Text>
          <Pressable
            accessibilityLabel="마일리지 적립 신청"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/mileage/apply')}
            style={({ pressed }) => [
              styles.applyButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.applyButtonText}>적립신청</Text>
          </Pressable>
        </View>
        <Text style={styles.greeting}>
          안녕하세요 기사님!{`\n`}오늘도 안전운전 하세요!
        </Text>
      </View>

      <View style={styles.content}>
        <View
          accessible
          accessibilityLabel="누적 마일리지. 서버 연동 전이라 현재 잔액을 확인할 수 없습니다."
          style={styles.balanceCard}
        >
          <View style={styles.balanceContent}>
            <View style={styles.settlementBadge}>
              <Text style={styles.settlementText}>
                다음달 10일 제휴사를 통해 정산돼요
              </Text>
            </View>
            <Text style={styles.balanceLabel}>누적 마일리지</Text>
            <View style={styles.balanceValueLine}>
              <Text style={styles.balanceValue}>—</Text>
              <Text style={styles.balanceUnit}>마일</Text>
            </View>
          </View>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="마일리지 물통 일러스트"
            resizeMode="contain"
            source={imageSources.mileageWaterJug}
            style={styles.waterJug}
          />
        </View>

        <View style={styles.historySection}>
          <Text accessibilityRole="header" style={styles.historyTitle}>
            마일리지 적립 내역
          </Text>
          <View
            accessibilityLabel="조회 기간"
            accessible
            style={styles.periodRow}
          >
            <CalendarIcon />
            <Text style={styles.periodDate}>{formatLocalDate(oneMonthAgo)}</Text>
            <Text style={styles.periodSeparator}>~</Text>
            <CalendarIcon />
            <Text style={styles.periodDate}>{formatLocalDate(today)}</Text>
          </View>
          <View accessibilityLiveRegion="polite" style={styles.historyPending}>
            <Text style={styles.historyPendingText}>
              마일리지 적립 내역은 서버 연동 후 확인할 수 있습니다.
            </Text>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    minHeight: 196,
    gap: 8,
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 72,
  },
  heroTopLine: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBadge: {
    height: 24,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
  },
  todayLabel: {
    ...typography.caption,
    color: colors.white,
  },
  heroDate: {
    ...typography.body,
    color: colors.white,
  },
  applyButton: {
    minWidth: 60,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    borderRadius: 12,
    backgroundColor: colors.mileageAction,
    paddingHorizontal: 10,
  },
  applyButtonText: {
    ...typography.captionMedium,
    color: colors.white,
  },
  greeting: {
    ...typography.heading,
    color: colors.white,
  },
  content: {
    width: '100%',
    paddingHorizontal: 20,
  },
  balanceCard: {
    width: '100%',
    minHeight: 150,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -40,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 21,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  balanceContent: {
    flex: 1,
    gap: 8,
  },
  settlementBadge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: colors.mileageTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  settlementText: {
    ...typography.caption,
    color: colors.mileageAction,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.gray800,
  },
  balanceValueLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  balanceValue: {
    ...typography.mileageBalance,
    color: colors.gray800,
  },
  balanceUnit: {
    ...typography.body,
    color: colors.gray800,
  },
  waterJug: {
    width: 64,
    height: 98,
    marginTop: 11,
  },
  historySection: {
    width: '100%',
    gap: 12,
    paddingTop: 40,
    paddingBottom: 40,
  },
  historyTitle: {
    ...typography.sectionTitle,
    color: colors.black,
  },
  periodRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodDate: {
    ...typography.body,
    color: colors.gray800,
  },
  periodSeparator: {
    ...typography.body,
    color: colors.gray800,
    marginHorizontal: 2,
  },
  historyPending: {
    width: '100%',
    minHeight: 142,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  historyPendingText: {
    ...typography.body,
    color: colors.gray800,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
