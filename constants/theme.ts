import type { TextStyle } from 'react-native';

type TypographyToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

export const fontFamilies = {
  interBold: 'Inter-Bold',
  interMedium: 'Inter-Medium',
  suitMedium: 'SUIT-Medium',
  suitSemiBold: 'SUIT-SemiBold',
} as const;

export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FCFCFD',
  gray100: '#F6F7FA',
  gray200: '#E9ECF2',
  gray400: '#A9B1C1',
  gray600: '#5E677A',
  gray800: '#262C3A',
  red500: '#FE4C4C',
  brand: '#040648',
  brand500: '#000047',
  mileageAction: '#4C69FE',
  mileageTint: '#EDF0FF',
  overlayScrim: 'rgba(38, 44, 58, 0.28)',
  error: '#D92D20',
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  authBody: {
    fontFamily: fontFamilies.suitMedium,
    fontSize: 14,
    letterSpacing: -0.35,
    lineHeight: 20,
  },
  authAction: {
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 14,
    letterSpacing: -0.35,
    lineHeight: 20,
  },
  authResult: {
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  authCaption: {
    fontFamily: fontFamilies.suitMedium,
    fontSize: 12,
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  footer: {
    fontFamily: fontFamilies.interMedium,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
  footerStrong: {
    fontFamily: fontFamilies.interBold,
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 16,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 16,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 26,
  },
  mileageBalance: {
    fontSize: 32,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 48,
  },
} as const satisfies Record<string, TypographyToken>;
