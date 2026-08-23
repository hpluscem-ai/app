import Svg, { Path, Rect } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';
import { colors } from '../../constants/theme';

export function CheckSquareIcon({ checked }: { checked: boolean }) {
  return (
    <Svg fill="none" height={20} viewBox="0 0 20 20" width={20}>
      <Rect
        fill={checked ? colors.brand500 : colors.gray400}
        height={20}
        rx={8}
        width={20}
      />
      <Path
        d={iconPaths.check}
        stroke={colors.white}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        transform="translate(2 2)"
      />
    </Svg>
  );
}
