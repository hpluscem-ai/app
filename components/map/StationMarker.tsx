import { StyleSheet, Text, View } from 'react-native';
import { Marker, type LatLng } from 'react-native-maps';

import { colors, typography } from '../../constants/theme';

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
      <View
        style={[
          styles.marker,
          cluster && styles.cluster,
          selected && styles.selected,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.label, selected && styles.selectedLabel]}
        >
          {cluster ? count : label}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    minWidth: 28,
    maxWidth: 164,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  cluster: {
    width: 28,
    paddingHorizontal: 0,
  },
  selected: {
    backgroundColor: colors.mileageAction,
  },
  label: {
    ...typography.body,
    color: colors.gray800,
  },
  selectedLabel: {
    color: colors.white,
  },
});
