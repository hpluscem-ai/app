import { Marker, type LatLng } from 'react-native-maps';

import { StationMarkerContent } from './StationMarkerContent';

type StationMarkerProps = {
  coordinate: LatLng;
  count?: number;
  label: string;
  onPress: () => void;
  selected?: boolean;
};

export function StationMarker({
  coordinate,
  count,
  label,
  onPress,
  selected = false,
}: StationMarkerProps) {
  const cluster = typeof count === 'number';
  const accessibilityLabel = cluster
    ? `주유소 ${count}곳 모음`
    : `${label} 주유소`;

  return (
    <Marker
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={coordinate}
      onPress={onPress}
      stopPropagation
      tracksViewChanges={false}
    >
      <StationMarkerContent count={count} label={label} selected={selected} />
    </Marker>
  );
}
