import { useCallback, useEffect, useRef, useState } from 'react';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../components/AuthProvider';
import { NoticeModal } from '../../components/NoticeModal';
import { AuthApiError, getAuthErrorMessage } from '../../utils/authApi';
import { getMileageApplications, getMileageSummary, mileageQuery, type MileageFilter, type MileageQuery } from '../../utils/mileageApi';
import { MileageWaterJugIcon } from '../../components/icons/MileageWaterJugIcon';
import { colors, typography, webAppFrame } from '../../constants/theme';

type MileageHistoryStatus = 'credited' | 'pending' | 'rejected' | 'settled';
type MileageHistoryPeriod = 'oneMonth' | 'threeMonths' | 'custom';
type MileageHistorySort = 'latest' | 'oldest';

type MileageHistoryItem = {
  dateLabel: string;
  id: string;
  mileage: number | null;
  status: MileageHistoryStatus;
};

const historyStatus = {
  credited: {
    backgroundColor: colors.blueTint,
    color: colors.blue500,
    label: '적립',
  },
  pending: {
    backgroundColor: 'rgba(132, 141, 160, 0.1)',
    color: colors.gray500,
    label: '대기 · 사진보기',
  },
  rejected: {
    backgroundColor: 'rgba(254, 76, 76, 0.1)',
    color: colors.red500,
    label: '반려 · 사유보기',
  },
  settled: {
    backgroundColor: colors.blueTint,
    color: colors.blue500,
    label: '정산',
  },
} as const;

const historyPeriodOptions = [
  { label: '최근 1개월', value: 'oneMonth' },
  { label: '최근 3개월', value: 'threeMonths' },
  { label: '직접 지정', value: 'custom' },
] as const;

const historySortOptions = [
  { label: '최신순', value: 'latest' },
  { label: '과거순', value: 'oldest' },
] as const;

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}. ${month}. ${day}`;
}

function getInitialCustomRange() {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  return {
    endDate: formatLocalDate(endDate),
    startDate: formatLocalDate(startDate),
  };
}

export default function MileageRoute() {
  const router = useRouter();
  const { state, request } = useAuth();
  const userId = state.user?.id;
  const [filter, setFilter] = useState<MileageFilter>(() => ({ period: 'threeMonths', sort: 'latest', ...getInitialCustomRange() }));
  const { createdFrom, createdBefore, order } = mileageQuery(filter);
  const [items, setItems] = useState<MileageHistoryItem[] | undefined>();
  type Notice = { message: string; retry?: () => void };
  const [notice, setNotice] = useState<Notice | null>(null);
  const [summary, setSummary] = useState<{ userId: string; createdFrom?: string; createdBefore?: string; balance?: number; notice?: Notice } | null>(null);
  type Listing = { controller: AbortController; query: MileageQuery; cursor: string | null; busy: boolean; failed: boolean };
  const listing = useRef<Listing | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    let busy = false;
    setSummary(null);
    const load = async () => {
      if (!active || busy || !userId) return;
      busy = true;
      setSummary(null);
      try {
        const data = await request(session => getMileageSummary({ createdFrom, createdBefore }, session));
        if (active) setSummary({ userId, createdFrom, createdBefore, balance: data.accumulatedMileage });
      } catch (error) {
        if (active) setSummary({ userId, createdFrom, createdBefore, notice: { message: getAuthErrorMessage(error), retry: () => { void load(); } } });
      } finally {
        busy = false;
      }
    };
    void load();
    return () => { active = false; setSummary(null); };
  }, [request, userId, createdFrom, createdBefore]));

  const loadPage = useCallback(async (scope: Listing, append: boolean) => {
    if (listing.current !== scope || scope.controller.signal.aborted || scope.busy || (append && !scope.cursor)) return;
    scope.busy = true;
    scope.failed = false;
    const cursor = append ? scope.cursor! : undefined;
    try {
      const data = await request(session => getMileageApplications({ ...scope.query, ...(cursor ? { cursor } : {}) }, session, scope.controller.signal));
      if (listing.current !== scope || scope.controller.signal.aborted) return;
      if (data.nextCursor && data.nextCursor === cursor) throw new AuthApiError('다음 내역을 확인하지 못했습니다.', 'INVALID_RESPONSE');
      const rows = data.items.map(item => ({
        id: item.id, dateLabel: formatLocalDate(new Date(item.submittedAt)), mileage: item.mileageAmount,
        status: item.status === 'approved' ? 'credited' as const : item.status,
      }));
      scope.cursor = data.nextCursor;
      setItems(previous => append ? [...(previous ?? []).filter(item => !rows.some(row => row.id === item.id)), ...rows] : rows);
    } catch (error) {
      if (listing.current !== scope || scope.controller.signal.aborted) return;
      scope.failed = true;
      setNotice({ message: getAuthErrorMessage(error), retry: () => { void loadPage(scope, append); } });
    } finally {
      scope.busy = false;
    }
  }, [request]);

  useFocusEffect(useCallback(() => {
    const scope: Listing = { controller: new AbortController(), query: { createdFrom, createdBefore, order }, cursor: null, busy: false, failed: false };
    listing.current = scope;
    setItems(undefined);
    setNotice(null);
    void loadPage(scope, false);
    return () => { scope.controller.abort(); listing.current = null; setNotice(null); setItems(undefined); };
  }, [createdFrom, createdBefore, order, state.user?.id, loadPage]));

  const currentSummary = summary && summary.userId === userId && summary.createdFrom === createdFrom && summary.createdBefore === createdBefore ? summary : null;
  // Keep both retries when history and summary fail at the same time.
  const visibleNotice = notice ?? currentSummary?.notice;
  const closeNotice = () => {
    if (notice) setNotice(current => current === notice ? null : current);
    else setSummary(current => current === currentSummary ? null : current);
  };

  return (
    <>
      <AppScreen activeTab="mileage" showFooter={false} variant="main" onEndReached={() => {
        const scope = listing.current;
        if (scope && !scope.failed) void loadPage(scope, true);
      }}>
        <MileageHero userName={state.user?.name} onApply={() => router.push('/mileage/apply')} />
        <View style={styles.content}>
          <MileageBalanceCard balance={currentSummary?.balance} />
          <MileageHistory items={items} appliedFilter={filter}
            onQueryChange={next => {
              try { mileageQuery(next); setFilter(next); return true; }
              catch (error) { setNotice({ message: getAuthErrorMessage(error) }); return false; }
            }}
            onOpenStatus={(status, id) => router.push({ pathname: '/mileage/[status]', params: { status, id } })} />
        </View>
      </AppScreen>
      <NoticeModal accessibilityLabel="마일리지 조회 안내" confirmLabel={visibleNotice?.retry ? '다시 시도' : '확인'}
        message={visibleNotice?.message ?? ''} visible={visibleNotice != null}
        onRequestClose={closeNotice}
        onConfirm={() => { closeNotice(); visibleNotice?.retry?.(); }} />
    </>
  );
}

function MileageHero({
  onApply,
  userName,
}: {
  onApply: () => void;
  userName?: string;
}) {
  const todayLabel = formatLocalDate(new Date());
  const greeting = userName
    ? `안녕하세요, ${userName} 기사님!`
    : '안녕하세요 기사님!';

  return (
    <LinearGradient
      colors={[colors.brand500, colors.brandGradientEnd]}
      end={{ x: 0.5, y: 1 }}
      start={{ x: 0.5, y: 0 }}
      style={styles.hero}
    >
      <View style={styles.heroCopy}>
        <View style={styles.todayRow}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayLabel}>TODAY</Text>
          </View>
          <Text
            accessibilityLabel={`오늘 ${todayLabel}`}
            style={styles.heroDate}
          >
            {todayLabel}
          </Text>
        </View>
        <Text style={styles.greeting}>
          {greeting}{`\n`}오늘도 안전운전 하세요!
        </Text>
      </View>
      <Pressable
        accessibilityLabel="마일리지 적립 신청"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onApply}
        style={({ pressed }) => [
          styles.applyButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.applyButtonText}>적립신청</Text>
      </Pressable>
    </LinearGradient>
  );
}

function MileageBalanceCard({ balance }: { balance?: number }) {
  const balanceLabel = balance === undefined ? '-' : balance.toLocaleString('ko-KR');

  return (
    <View
      accessibilityLabel={balance === undefined ? '누적 마일리지 미조회' : `누적 마일리지 ${balanceLabel}마일`}
      accessible
      style={styles.balanceCard}
    >
      <View style={styles.balanceContent}>
        <View style={styles.settlementBadge}>
          <Text style={styles.settlementText}>
            다음달 10일 제휴사를 통해 정산돼요
          </Text>
        </View>
        <View style={styles.balanceBlock}>
          <Text style={styles.balanceTitle}>누적 마일리지</Text>
          <View style={styles.balanceValueRow}>
            <Text style={styles.balanceValue}>{balanceLabel}</Text>
            <Text style={styles.balanceUnit}>마일</Text>
          </View>
        </View>
      </View>
      <MileageWaterJugIcon
        accessibilityLabel="마일리지 물통 일러스트"
      />
    </View>
  );
}

function MileageHistory({
  items,
  onOpenStatus,
  onQueryChange,
  appliedFilter,
}: {
  items?: readonly MileageHistoryItem[];
  onQueryChange: (filter: MileageFilter) => boolean;
  appliedFilter: MileageFilter;
  onOpenStatus: (status: 'pending' | 'rejected', id: string) => void;
}) {
  const [filterVisible, setFilterVisible] = useState(false);
  const [period, setPeriod] =
    useState<MileageHistoryPeriod>('threeMonths');
  const [sort, setSort] = useState<MileageHistorySort>('latest');
  const [{ endDate: initialEndDate, startDate: initialStartDate }] =
    useState(getInitialCustomRange);
  const [customStartDate, setCustomStartDate] = useState(initialStartDate);
  const [customEndDate, setCustomEndDate] = useState(initialEndDate);
  const periodLabel =
    historyPeriodOptions.find((option) => option.value === appliedFilter.period)?.label ??
    '최근 3개월';
  const sortLabel =
    historySortOptions.find((option) => option.value === appliedFilter.sort)?.label ??
    '최신순';

  return (
    <>
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text accessibilityRole="header" style={styles.historyTitle}>
            마일리지 적립 내역
          </Text>
          <Pressable
            accessibilityHint="조회 기간과 정렬 순서를 변경합니다."
            accessibilityLabel={`${periodLabel}, ${sortLabel}`}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              setFilterVisible(true);
            }}
            style={({ pressed }) => [
              styles.historyFilter,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.historyFilterText}>{periodLabel}</Text>
            <View style={styles.historyFilterDot} />
            <Text style={styles.historyFilterText}>{sortLabel}</Text>
          </Pressable>
        </View>

        {items === undefined ? (
          <View style={styles.historyMessage} />
        ) : items.length === 0 ? (
          <MileageHistoryMessage loaded />
        ) : (
          <View style={styles.historyList}>
            {items.map((item, index) => (
              <View key={item.id}>
                <MileageHistoryRow item={item} onOpenStatus={onOpenStatus} />
                {index < items.length - 1 ? (
                  <View style={styles.historyDivider} />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      <MileageFilterSheet
        customEndDate={customEndDate}
        customStartDate={customStartDate}
        onChangeCustomEndDate={setCustomEndDate}
        onChangeCustomStartDate={setCustomStartDate}
        onClose={() => {
          onQueryChange({ period, sort, startDate: customStartDate, endDate: customEndDate });
          Keyboard.dismiss();
          setFilterVisible(false);
        }}
        onSelectPeriod={(nextPeriod) => {
          Keyboard.dismiss();
          setPeriod(nextPeriod);
        }}
        onSelectSort={setSort}
        period={period}
        sort={sort}
        visible={filterVisible}
      />
    </>
  );
}

function MileageFilterSheet({
  customEndDate,
  customStartDate,
  onChangeCustomEndDate,
  onChangeCustomStartDate,
  onClose,
  onSelectPeriod,
  onSelectSort,
  period,
  sort,
  visible,
}: {
  customEndDate: string;
  customStartDate: string;
  onChangeCustomEndDate: (value: string) => void;
  onChangeCustomStartDate: (value: string) => void;
  onClose: () => void;
  onSelectPeriod: (period: MileageHistoryPeriod) => void;
  onSelectSort: (sort: MileageHistorySort) => void;
  period: MileageHistoryPeriod;
  sort: MileageHistorySort;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduceMotion(enabled);
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const animation = Animated.timing(progress, {
      duration: reduceMotion ? 0 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });

    return () => {
      animation.stop();
    };
  }, [mounted, progress, reduceMotion, visible]);

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={mounted}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.filterModal}
      >
        <Animated.View style={[styles.filterBackdrop, { opacity: progress }]}>
          <Pressable
            accessibilityLabel="조회 조건 닫기"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.filterBackdropPressable}
          />
        </Animated.View>
        <Animated.View
          accessibilityLabel="마일리지 조회 조건"
          accessibilityViewIsModal
          style={[
            styles.filterSheet,
            Platform.OS === 'web' && webAppFrame,
            { paddingBottom: Math.max(8, insets.bottom) },
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <Pressable
            accessibilityLabel="조회 조건 닫기"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onClose}
            style={styles.filterHandleButton}
          >
            <View style={styles.filterHandle} />
          </Pressable>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>정렬</Text>
            <View style={styles.filterOptionRow}>
              {historySortOptions.map((option) => (
                <FilterOption
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    onSelectSort(option.value);
                  }}
                  selected={sort === option.value}
                />
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionLabel}>기간</Text>
            <View style={styles.filterOptionRow}>
              {historyPeriodOptions.map((option) => (
                <FilterOption
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    onSelectPeriod(option.value);
                  }}
                  selected={period === option.value}
                />
              ))}
            </View>
            {period === 'custom' ? (
              <View style={styles.customDateRow}>
                <MileageDateField label="조회 시작일" onChange={onChangeCustomStartDate} value={customStartDate} />
                <Text style={styles.customDateDivider}>~</Text>
                <MileageDateField label="조회 종료일" onChange={onChangeCustomEndDate} value={customEndDate} />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MileageDateField({ label, onChange, value }: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, month, day] = value.split('. ').map(Number);
  const date = new Date(year, month - 1, day);
  const selectDate = (_event: unknown, nextDate: Date) => {
    onChange(formatLocalDate(nextDate));
    setOpen(false);
  };

  if (Platform.OS === 'web') {
    return (
      <input
        aria-label={label}
        onChange={(event) => onChange(event.currentTarget.value.replaceAll('-', '. '))}
        onClick={(event) => event.currentTarget.showPicker?.()}
        style={{
          backgroundColor: colors.gray100,
          border: 0,
          borderRadius: 32,
          boxSizing: 'border-box',
          color: colors.gray800,
          flex: 1,
          fontFamily: typography.suitMedium14.fontFamily,
          fontSize: typography.suitMedium14.fontSize,
          height: 52,
          minWidth: 0,
          outline: 'none',
          padding: '0 12px',
          textAlign: 'center',
        }}
        type="date"
        value={value.replaceAll('. ', '-')}
      />
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.customDateInput}>
        <DateTimePicker display="compact" mode="date" onValueChange={selectDate} value={date} />
      </View>
    );
  }

  return (
    <>
      <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={() => setOpen(true)} style={styles.customDateInput}>
        <Text style={styles.customDateText}>{value}</Text>
      </Pressable>
      {open ? <DateTimePicker mode="date" onDismiss={() => setOpen(false)} onValueChange={selectDate} style={styles.dateDialog} value={date} /> : null}
    </>
  );
}

function FilterOption({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterOption,
        selected && styles.filterOptionSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterOptionLabel,
          selected && styles.filterOptionLabelSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function MileageHistoryMessage({ loaded }: { loaded: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.historyMessage}>
      <MileageWaterJugIcon
        accessibilityLabel="빈 마일리지 물통 일러스트"
        variant="empty"
      />
      <View style={styles.historyMessageBadge}>
        <Text style={styles.historyMessageText}>
          {loaded
            ? '마일리지 적립 내역이 없습니다.'
            : '적립 내역은 서버 연동 후 확인됩니다.'}
        </Text>
      </View>
    </View>
  );
}

function MileageHistoryRow({
  item,
  onOpenStatus,
}: {
  item: MileageHistoryItem;
  onOpenStatus: (status: 'pending' | 'rejected', id: string) => void;
}) {
  const config = historyStatus[item.status];
  const actionableStatus =
    item.status === 'pending' || item.status === 'rejected'
      ? item.status
      : null;
  const amountPrefix =
    item.status === 'credited' ? '+' : item.status === 'settled' ? '-' : '';
  const amountLabel = actionableStatus ? '0마일' : item.mileage === null ? '-' : `${amountPrefix}${item.mileage.toLocaleString('ko-KR')}마일`;
  const badge = (
    <View
      style={[
        styles.historyStatus,
        { backgroundColor: config.backgroundColor },
      ]}
    >
      <Text style={[styles.historyStatusText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );

  return (
    <View style={styles.historyRow}>
      <View style={styles.historyRowCopy}>
        <Text style={styles.historyAmount}>{amountLabel}</Text>
        <Text style={styles.historyDate}>{item.dateLabel}</Text>
      </View>
      {actionableStatus ? (
        <Pressable
          accessibilityLabel={config.label}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            onOpenStatus(actionableStatus, item.id);
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {badge}
        </Pressable>
      ) : (
        badge
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    minHeight: 196,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 72,
  },
  heroCopy: {
    flexShrink: 1,
    gap: 8,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayBadge: {
    minWidth: 62,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayLabel: {
    ...typography.suitMedium14,
    color: colors.gray50,
  },
  heroDate: {
    ...typography.suitMedium14,
    color: colors.gray50,
  },
  greeting: {
    ...typography.suitSemiBold20,
    color: colors.gray50,
  },
  applyButton: {
    width: 64,
    minHeight: 28,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  applyButtonText: {
    ...typography.suitMedium14,
    color: colors.brand500,
  },
  content: {
    width: '100%',
    paddingHorizontal: 20,
  },
  balanceCard: {
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(5px)' } : {}),
    width: '100%',
    minHeight: 146,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    marginTop: -40,
    borderWidth: 1,
    borderColor: colors.gray100,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  balanceContent: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 16,
  },
  settlementBadge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 71, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  settlementText: {
    ...typography.suitMedium12,
    color: colors.brand500,
  },
  balanceBlock: {
    width: '100%',
  },
  balanceTitle: {
    ...typography.suitMedium14,
    color: colors.gray800,
  },
  balanceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  balanceValue: {
    ...typography.mileageBalance,
    color: colors.gray800,
  },
  balanceUnit: {
    ...typography.suitMedium16,
    color: colors.gray800,
  },
  historySection: {
    width: '100%',
    gap: 20,
    paddingTop: 40,
    paddingBottom: 52,
  },
  historyHeader: {
    width: '100%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyTitle: {
    ...typography.suitSemiBold20,
    flexShrink: 1,
    color: colors.black,
  },
  historyFilter: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyFilterText: {
    ...typography.suitMedium14,
    color: colors.gray600,
  },
  historyFilterDot: {
    width: 2,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.gray600,
  },
  filterModal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlayScrim,
  },
  filterBackdropPressable: {
    flex: 1,
  },
  filterSheet: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  filterHandleButton: {
    width: 108,
    height: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterHandle: {
    width: 108,
    height: 5,
    borderRadius: 80,
    backgroundColor: colors.gray200,
  },
  filterSection: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
  },
  filterSectionLabel: {
    ...typography.suitMedium14,
    color: colors.gray800,
    paddingHorizontal: 8,
  },
  filterOptionRow: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterOption: {
    height: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 32,
    backgroundColor: colors.gray100,
  },
  filterOptionSelected: {
    borderColor: colors.blue500,
    backgroundColor: 'rgba(76, 150, 254, 0.1)',
  },
  filterOptionLabel: {
    ...typography.suitMedium14,
    color: colors.gray800,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  filterOptionLabelSelected: {
    color: colors.blue500,
  },
  customDateRow: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customDateInput: {
    height: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.gray100,
  },
  customDateText: {
    ...typography.suitMedium14,
    color: colors.gray800,
    textAlign: 'center',
  },
  dateDialog: {
    position: 'absolute',
  },
  customDateDivider: {
    ...typography.suitMedium14,
    color: colors.gray800,
  },
  historyMessage: {
    width: '100%',
    minHeight: 238,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 52,
  },
  historyMessageBadge: {
    maxWidth: '100%',
    borderRadius: 16,
    backgroundColor: colors.gray50,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  historyMessageText: {
    ...typography.suitMedium14,
    color: colors.gray400,
    textAlign: 'center',
  },
  historyList: {
    width: '100%',
  },
  historyRow: {
    width: '100%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyRowCopy: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 2,
  },
  historyAmount: {
    ...typography.suitSemiBold16,
    color: colors.black,
  },
  historyDate: {
    ...typography.suitMedium12,
    color: colors.gray600,
  },
  historyStatus: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyStatusText: {
    ...typography.caption,
  },
  historyDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
    backgroundColor: colors.gray200,
  },
  pressed: {
    opacity: 0.82,
  },
});
