import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function ReceiptIcon() {
  return (
    <Svg fill="none" height={20} viewBox="0 0 17.6 20" width={17.6}>
      <Path
        d={iconPaths.receipt}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}
