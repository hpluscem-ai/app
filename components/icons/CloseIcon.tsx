import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function CloseIcon() {
  return (
    <Svg fill="none" height={16} viewBox="0 0 16 16" width={16}>
      <Path
        d={iconPaths.close}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeWidth={1.5}
      />
    </Svg>
  );
}
