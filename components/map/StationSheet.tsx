import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MapStation } from '../../data/mapStations';
import { colors, typography } from '../../constants/theme';
import { CloseIcon } from '../icons/CloseIcon';
import { DirectionsIcon } from '../icons/DirectionsIcon';

const COLLAPSED_HEIGHT = 136;
const EXPANDED_TOP_GAP = 24;
const DRAG_THRESHOLD = 72;

type SheetSnap = 'closed' | 'collapsed' | 'expanded';

export type StationSheetContent =
  | { kind: 'cluster'; stations: ReadonlyArray<MapStation> }
  | { kind: 'station'; station: MapStation };

type StationSheetProps = {
  content: StationSheetContent;
  height: number;
  onDirections: (station: MapStation) => void;
  onHidden: () => void;
  onRequestClose: () => void;
  onSelectStation: (station: MapStation) => void;
  visible: boolean;
};

export function StationSheet({
  content,
  height,
  onDirections,
  onHidden,
  onRequestClose,
  onSelectStation,
  visible,
}: StationSheetProps) {
  const collapsedY = Math.max(EXPANDED_TOP_GAP, height - COLLAPSED_HEIGHT);
  const translateY = useRef(new Animated.Value(height)).current;
  const currentYRef = useRef(height);
  const contentScrollYRef = useRef(0);
  const gestureStartYRef = useRef(height);
  const onHiddenRef = useRef(onHidden);
  const onRequestCloseRef = useRef(onRequestClose);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [snap, setSnap] = useState<SheetSnap>('closed');
  const snapRef = useRef<SheetSnap>('closed');

  useEffect(() => {
    onHiddenRef.current = onHidden;
  }, [onHidden]);

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    contentScrollYRef.current = 0;
  }, [content]);

  useEffect(() => {
    const subscription = translateY.addListener(({ value }) => {
      currentYRef.current = value;
    });

    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    return () => translateY.removeListener(subscription);
  }, [translateY]);

  const snapTo = useCallback(
    (next: SheetSnap, onComplete?: () => void) => {
      const target =
        next === 'expanded'
          ? EXPANDED_TOP_GAP
          : next === 'collapsed'
            ? collapsedY
            : height;

      snapRef.current = next;
      setSnap(next);
      Animated.timing(translateY, {
        duration: reduceMotion ? 0 : 220,
        toValue: target,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onComplete?.();
        }
      });
    },
    [collapsedY, height, reduceMotion, translateY],
  );

  useEffect(() => {
    if (visible) {
      snapTo('collapsed');
      return;
    }

    snapTo('closed', () => onHiddenRef.current());
  }, [snapTo, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          const isVerticalDrag =
            Math.abs(gesture.dy) > 4 &&
            Math.abs(gesture.dy) > Math.abs(gesture.dx);

          if (!isVerticalDrag) {
            return false;
          }

          return (
            snapRef.current !== 'expanded' ||
            (gesture.dy > 0 && contentScrollYRef.current <= 0)
          );
        },
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          const isVerticalDrag =
            Math.abs(gesture.dy) > 4 &&
            Math.abs(gesture.dy) > Math.abs(gesture.dx);

          if (!isVerticalDrag) {
            return false;
          }

          return (
            snapRef.current !== 'expanded' ||
            (gesture.dy > 0 && contentScrollYRef.current <= 0)
          );
        },
        onPanResponderGrant: () => {
          translateY.stopAnimation((value) => {
            currentYRef.current = value;
            gestureStartYRef.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const nextY = Math.min(
            height,
            Math.max(EXPANDED_TOP_GAP, gestureStartYRef.current + gesture.dy),
          );
          translateY.setValue(nextY);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -DRAG_THRESHOLD || gesture.vy < -0.8) {
            snapTo('expanded');
            return;
          }

          if (gesture.dy > DRAG_THRESHOLD || gesture.vy > 0.8) {
            if (snapRef.current === 'expanded') {
              snapTo('collapsed');
            } else {
              onRequestCloseRef.current();
            }
            return;
          }

          const midpoint = (EXPANDED_TOP_GAP + collapsedY) / 2;
          snapTo(currentYRef.current < midpoint ? 'expanded' : 'collapsed');
        },
        onPanResponderTerminate: () => {
          snapTo(snapRef.current === 'expanded' ? 'expanded' : 'collapsed');
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [collapsedY, height, snapTo, translateY],
  );

  const expanded = snap === 'expanded';

  return (
    <Animated.View
      accessibilityViewIsModal={expanded}
      style={[styles.sheet, { height, transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <Pressable
        accessibilityLabel={
          expanded ? '주유소 정보 접기' : '주유소 정보 펼치기'
        }
        accessibilityRole="button"
        onPress={() => snapTo(expanded ? 'collapsed' : 'expanded')}
        style={styles.handleArea}
      >
        <View style={styles.handle} />
      </Pressable>

      <Pressable
        accessibilityLabel="주유소 정보 닫기"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onRequestClose}
        style={({ pressed }) => [
          styles.closeButton,
          pressed && styles.pressed,
        ]}
      >
        <CloseIcon />
      </Pressable>

      {content.kind === 'station' ? (
        <StationDetail
          expanded={expanded}
          onContentScroll={(offsetY) => {
            contentScrollYRef.current = offsetY;
          }}
          onDirections={onDirections}
          station={content.station}
        />
      ) : (
        <ClusterList
          expanded={expanded}
          onContentScroll={(offsetY) => {
            contentScrollYRef.current = offsetY;
          }}
          onSelectStation={onSelectStation}
          stations={content.stations}
        />
      )}
    </Animated.View>
  );
}

function StationDetail({
  expanded,
  onContentScroll,
  onDirections,
  station,
}: {
  expanded: boolean;
  onContentScroll: (offsetY: number) => void;
  onDirections: (station: MapStation) => void;
  station: MapStation;
}) {
  const directionsDisabled = !station.coordinateVerified;

  return (
    <View style={styles.stationLayout}>
      <ScrollView
        contentContainerStyle={styles.stationText}
        nestedScrollEnabled
        onScroll={(event) =>
          onContentScroll(event.nativeEvent.contentOffset.y)
        }
        scrollEnabled={expanded}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.stationScroll}
      >
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.stationTitle}>
            {station.pole} {station.businessName}
          </Text>
          {station.note ? (
            <View style={styles.badge}>
              <Text style={styles.badgeLabel}>{station.note}</Text>
            </View>
          ) : null}
        </View>

        {station.devices.map((device, index) => (
          <Text key={`${device.model}-${index}`} style={styles.device}>
            {device.model} / {device.capacity}
          </Text>
        ))}

        <Text numberOfLines={1} style={styles.address}>
          {station.roadAddress}
        </Text>
        {directionsDisabled ? (
          <Text accessibilityLiveRegion="polite" style={styles.previewNotice}>
            임시 좌표 · 실제 좌표 확인 후 길안내 가능
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.directionsArea}>
        <Pressable
          accessibilityHint={
            directionsDisabled
              ? '실제 좌표가 등록되면 사용할 수 있습니다.'
              : '티맵으로 목적지 안내를 시작합니다.'
          }
          accessibilityLabel="길안내"
          accessibilityRole="button"
          accessibilityState={{ disabled: directionsDisabled }}
          disabled={directionsDisabled}
          onPress={() => onDirections(station)}
          style={({ pressed }) => [
            styles.directionsButton,
            directionsDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <DirectionsIcon />
        </Pressable>
        <Text style={styles.directionsLabel}>길안내</Text>
      </View>
    </View>
  );
}

function ClusterList({
  expanded,
  onContentScroll,
  onSelectStation,
  stations,
}: {
  expanded: boolean;
  onContentScroll: (offsetY: number) => void;
  onSelectStation: (station: MapStation) => void;
  stations: ReadonlyArray<MapStation>;
}) {
  return (
    <View style={styles.clusterContent}>
      <Text accessibilityRole="header" style={styles.clusterTitle}>
        이 지역의 설치 주유소 {stations.length}곳
      </Text>
      <ScrollView
        nestedScrollEnabled
        onScroll={(event) =>
          onContentScroll(event.nativeEvent.contentOffset.y)
        }
        scrollEnabled={expanded}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.clusterScroll}
      >
        {stations.map((station) => (
          <Pressable
            accessibilityLabel={`${station.pole} ${station.businessName}, ${station.roadAddress}`}
            accessibilityRole="button"
            key={station.id}
            onPress={() => onSelectStation(station)}
            style={({ pressed }) => [
              styles.stationRow,
              pressed && styles.pressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.rowTitle}>
              {station.pole} {station.businessName}
            </Text>
            <Text numberOfLines={1} style={styles.rowAddress}>
              {station.roadAddress}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: colors.white,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  handleArea: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  handle: {
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 8,
    zIndex: 1,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 20,
  },
  stationText: {
    flexGrow: 1,
    gap: 2,
    paddingBottom: 12,
  },
  stationScroll: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationTitle: {
    ...typography.body,
    flexShrink: 1,
    color: colors.gray800,
  },
  badge: {
    borderRadius: 8,
    backgroundColor: colors.mileageTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeLabel: {
    ...typography.caption,
    color: colors.mileageAction,
  },
  device: {
    ...typography.sectionTitle,
    color: colors.gray800,
  },
  address: {
    ...typography.caption,
    color: colors.gray800,
  },
  previewNotice: {
    ...typography.caption,
    color: colors.gray400,
  },
  directionsArea: {
    width: 48,
    alignItems: 'center',
    gap: 4,
  },
  directionsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.gray50,
  },
  directionsLabel: {
    ...typography.caption,
    color: colors.gray800,
  },
  clusterContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clusterTitle: {
    ...typography.sectionTitle,
    marginBottom: 8,
    color: colors.gray800,
  },
  clusterScroll: {
    flex: 1,
  },
  stationRow: {
    minHeight: 64,
    justifyContent: 'center',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  rowTitle: {
    ...typography.body,
    color: colors.gray800,
  },
  rowAddress: {
    ...typography.caption,
    color: colors.gray400,
  },
  disabled: {
    opacity: 0.36,
  },
  pressed: {
    opacity: 0.72,
  },
});
