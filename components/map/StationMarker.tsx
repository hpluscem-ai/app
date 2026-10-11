import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { StationMarkerContent } from './StationMarkerContent';
import type { MapCoordinate } from '../../data/mapStations';

type StationMarkerProps = {
  coordinate: MapCoordinate;
  count?: number;
  label: string;
  onPress: () => void;
  selected?: boolean;
};

const MARKER_HEIGHT = 28;
const MAX_LABEL_WIDTH = 220;

export function StationMarker({
  coordinate,
  count,
  label,
  onPress,
  selected = false,
}: StationMarkerProps) {
  const cluster = typeof count === 'number';
  const [size, setSize] = useState({
    height: MARKER_HEIGHT,
    width: cluster ? MARKER_HEIGHT : MAX_LABEL_WIDTH,
  });
  const accessibilityLabel = cluster
    ? `주유소 ${count}곳 모음`
    : `${label} 주유소`;

  return (
    <NaverMapMarkerOverlay
      anchor={{ x: 0.5, y: 0.5 }}
      latitude={coordinate.latitude}
      longitude={coordinate.longitude}
      onTap={onPress}
      height={size.height}
      width={size.width}
      zIndex={selected ? 1 : 0}
    >
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        collapsable={false}
        key={JSON.stringify([count, label, selected, size])}
        onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) => {
          if (layout.width <= 0 || layout.height <= 0) return;
          setSize((current) =>
            current.width === Math.ceil(layout.width) &&
            current.height === Math.ceil(layout.height)
              ? current
              : {
                  height: Math.ceil(layout.height),
                  width: Math.ceil(layout.width),
                },
          );
        }}
        style={styles.content}
      >
        <StationMarkerContent count={count} label={label} selected={selected} />
      </View>
    </NaverMapMarkerOverlay>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'flex-start' },
});
