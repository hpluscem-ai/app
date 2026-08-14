import { StyleSheet, View } from 'react-native';
import { Appbar } from 'react-native-paper';
import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../constants/assets';
import { colors, typography } from '../constants/theme';

type AppBarProps = {
  title: string;
  onBack?: () => void;
};

function BackIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d={iconPaths.back}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

/** Expo Router Stack 화면에서 공통으로 사용하는 상단 앱바입니다. */
export function AppBar({ title, onBack }: AppBarProps) {
  return (
    <Appbar.Header mode="center-aligned" style={styles.bar}>
      {onBack ? (
        <Appbar.Action
          accessibilityLabel="뒤로가기"
          color={colors.gray800}
          icon={BackIcon}
          isLeading
          onPress={onBack}
          size={24}
          style={styles.action}
        />
      ) : (
        <View style={styles.actionSlot} />
      )}

      <Appbar.Content title={title} titleStyle={styles.title} />
      <View style={styles.actionSlot} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    backgroundColor: colors.white,
  },
  action: {
    margin: 4,
  },
  actionSlot: {
    width: 48,
  },
  title: {
    ...typography.body,
    color: colors.gray800,
  },
});
