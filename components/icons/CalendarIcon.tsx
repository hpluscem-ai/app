import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function CalendarIcon() {
  return (
    <View style={styles.frame}>
      <Svg fill="none" height={20} viewBox="0 0 18 20" width={18}>
        <Path
          d={iconPaths.calendar}
          stroke={colors.gray800}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
