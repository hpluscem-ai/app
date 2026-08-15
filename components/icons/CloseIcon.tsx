import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function CloseIcon() {
  return (
    <Svg fill="none" height={10} viewBox="0 0 10 10" width={10}>
      <Path
        d={iconPaths.close}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}
