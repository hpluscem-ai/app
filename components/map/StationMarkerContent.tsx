import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../constants/theme';

type StationMarkerContentProps = {
  count?: number;
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function StationMarkerContent({
  count,
  label,
  selected = false,
  onPress,
}: StationMarkerContentProps) {
  const cluster = typeof count === 'number';
  const style = [
    styles.marker,
    cluster && styles.cluster,
    selected && styles.selected,
  ];
  const content = (
    <Text
      numberOfLines={1}
      style={[styles.label, selected && styles.selectedLabel]}
    >
      {cluster ? count : label}
    </Text>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={
          cluster ? `주유소 ${count}곳 모음` : `${label} 주유소`
        }
        accessibilityRole="button"
        onPress={(event) => {
          event.stopPropagation();
          onPress();
        }}
        style={style}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  marker: {
    minWidth: 28,
    maxWidth: 220,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  cluster: {
    width: 28,
    paddingHorizontal: 0,
  },
  selected: {
    backgroundColor: colors.brand500,
  },
  label: {
    ...typography.suitMedium14,
    color: colors.gray800,
  },
  selectedLabel: {
    color: colors.white,
  },
});
