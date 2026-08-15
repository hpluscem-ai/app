import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function CheckSquareIcon({ checked }: { checked: boolean }) {
  return (
    <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
      <Path
        d={checked ? iconPaths.checkSquare : iconPaths.checkSquareFrame}
        stroke={colors.gray800}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        transform="translate(3 3)"
      />
    </Svg>
  );
}
