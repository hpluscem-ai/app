import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export type DockIconName = 'mileage' | 'camera' | 'map' | 'profile';

const dockIconConfig = {
  mileage: {
    filled: false,
    height: 21.2,
    path: iconPaths.mileage,
    viewBox: '0 0 21.2016 21.2',
    width: 21.2016,
  },
  camera: {
    filled: true,
    height: 19.52,
    path: iconPaths.camera,
    viewBox: '0 0 21.2 19.52',
    width: 21.2,
  },
  map: {
    filled: false,
    height: 18,
    path: iconPaths.map,
    viewBox: '0 0 20 18',
    width: 20,
  },
  profile: {
    filled: false,
    height: 17.0002,
    path: iconPaths.profile,
    viewBox: '0 0 19.5249 17.0002',
    width: 19.5249,
  },
} as const;

export function DockIcon({
  active,
  name,
}: {
  active: boolean;
  name: DockIconName;
}) {
  const config = dockIconConfig[name];
  const color = active ? colors.brand500 : colors.gray400;

  return (
    <View style={styles.frame}>
      <Svg
        fill="none"
        height={config.height}
        viewBox={config.viewBox}
        width={config.width}
      >
        <Path
          d={config.path}
          fill={config.filled ? color : 'none'}
          stroke={config.filled ? 'none' : color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={config.filled ? 0 : 2}
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
