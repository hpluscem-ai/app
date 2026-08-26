import { SvgXml } from 'react-native-svg';

import { svgMarkup } from '../../constants/assets';

type MileageWaterJugIconProps = {
  accessibilityLabel: string;
  variant?: 'full' | 'empty';
};

export function MileageWaterJugIcon({
  accessibilityLabel,
  variant = 'full',
}: MileageWaterJugIconProps) {
  return (
    <SvgXml
      accessibilityLabel={accessibilityLabel}
      accessible
      height={98}
      width={64}
      xml={
        variant === 'empty'
          ? svgMarkup.mileageWaterJugEmpty
          : svgMarkup.mileageWaterJug
      }
    />
  );
}
