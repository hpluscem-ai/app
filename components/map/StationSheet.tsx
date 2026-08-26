import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import type { MapStation } from '../../data/mapStations';
import { colors, typography } from '../../constants/theme';
import { DirectionsIcon } from '../icons/DirectionsIcon';

export const STATION_SHEET_COLLAPSED_HEIGHT = 136;

const EXPANDED_TOP_GAP = 8;
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
  const collapsedY = Math.max(
    EXPANDED_TOP_GAP,
    height - STATION_SHEET_COLLAPSED_HEIGHT,
  );
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
    let active = true;
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    const translationSubscription = translateY.addListener(({ value }) => {
      currentYRef.current = value;
    });

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) {
        setReduceMotion(enabled);
      }
    });

    return () => {
      active = false;
      motionSubscription.remove();
      translateY.removeListener(translationSubscription);
    };
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
      snapTo(content.kind === 'cluster' ? 'expanded' : 'collapsed');
      return;
    }

    snapTo('closed', () => onHiddenRef.current());
  }, [content, snapTo, visible]);

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
  const stations =
    content.kind === 'station' ? [content.station] : content.stations;

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
        hitSlop={12}
        onPress={() => snapTo(expanded ? 'collapsed' : 'expanded')}
        style={styles.handleButton}
      >
        <View style={styles.handle} />
      </Pressable>

      <StationList
        expanded={expanded}
        onContentScroll={(offsetY) => {
          contentScrollYRef.current = offsetY;
        }}
        onDirections={onDirections}
        onSelectStation={
          content.kind === 'cluster' ? onSelectStation : undefined
        }
        stations={stations}
      />
    </Animated.View>
  );
}

function StationList({
  expanded,
  onContentScroll,
  onDirections,
  onSelectStation,
  stations,
}: {
  expanded: boolean;
  onContentScroll: (offsetY: number) => void;
  onDirections: (station: MapStation) => void;
  onSelectStation?: (station: MapStation) => void;
  stations: ReadonlyArray<MapStation>;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.stationList}
      nestedScrollEnabled
      onScroll={(event) => onContentScroll(event.nativeEvent.contentOffset.y)}
      scrollEnabled={expanded}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={styles.stationScroll}
    >
      {stations.map((station) => (
        <StationCard
          key={station.id}
          onDirections={onDirections}
          onSelect={onSelectStation}
          station={station}
        />
      ))}
    </ScrollView>
  );
}

function StationCard({
  onDirections,
  onSelect,
  station,
}: {
  onDirections: (station: MapStation) => void;
  onSelect?: (station: MapStation) => void;
  station: MapStation;
}) {
  const directionsDisabled = !station.coordinateVerified;
  const stationCopy = (
    <>
      <View style={styles.stationHeading}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.stationBusiness}>
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
      </View>

      <Text numberOfLines={1} style={styles.address}>
        {station.roadAddress}
      </Text>
    </>
  );

  return (
    <View style={styles.stationCard}>
      {onSelect ? (
        <Pressable
          accessibilityHint="이 주유소를 지도에서 선택하고 확대합니다."
          accessibilityLabel={`${station.pole} ${station.businessName}, ${station.roadAddress}`}
          accessibilityRole="button"
          onPress={() => onSelect(station)}
          style={({ pressed }) => [
            styles.stationCopy,
            pressed && styles.pressed,
          ]}
        >
          {stationCopy}
        </Pressable>
      ) : (
        <View style={styles.stationCopy}>{stationCopy}</View>
      )}

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
        <Text
          style={[
            styles.directionsLabel,
            directionsDisabled && styles.disabled,
          ]}
        >
          길안내
        </Text>
      </View>
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
    gap: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.white,
    paddingTop: 4,
    paddingRight: 20,
    paddingBottom: 20,
    paddingLeft: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  handleButton: {
    width: 64,
    height: 4,
    alignSelf: 'center',
  },
  handle: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.gray400,
  },
  stationScroll: {
    flex: 1,
  },
  stationList: {
    gap: 20,
  },
  stationCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 20,
  },
  stationHeading: {
    alignItems: 'flex-start',
  },
  titleRow: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationBusiness: {
    ...typography.suitMedium14,
    flexShrink: 1,
    color: colors.gray800,
  },
  badge: {
    flexShrink: 0,
    borderRadius: 16,
    backgroundColor: colors.blueTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeLabel: {
    ...typography.caption,
    color: colors.blue500,
  },
  device: {
    ...typography.suitSemiBold18,
    color: colors.gray800,
  },
  address: {
    ...typography.suitMedium12,
    color: colors.gray800,
  },
  directionsArea: {
    flexShrink: 0,
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
    ...typography.suitMedium12,
    color: colors.gray800,
  },
  disabled: {
    opacity: 0.36,
  },
  pressed: {
    opacity: 0.72,
  },
});
