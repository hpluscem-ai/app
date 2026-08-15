import Svg, { Path } from 'react-native-svg';

import { iconPaths } from '../../constants/assets';

type BackIconProps = {
  color: string;
  size: number;
};

export function BackIcon({ color, size }: BackIconProps) {
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
