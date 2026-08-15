import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function ChevronDownIcon() {
  return (
    <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d={iconPaths.chevronDown}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        transform="translate(6 8.71)"
      />
    </Svg>
  );
}
