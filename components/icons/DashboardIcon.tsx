import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function DashboardIcon() {
  return (
    <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
      <Path d={iconPaths.dashboard} fill={colors.gray800} />
    </Svg>
  );
}
