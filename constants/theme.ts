import type { TextStyle } from 'react-native';

export const webAppFrame = {
  width: '100%',
  maxWidth: 640,
  alignSelf: 'center',
} as const;

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

const suitMedium12 = {
  fontFamily: fontFamilies.suitMedium,
  fontSize: 12,
  letterSpacing: -0.3,
  lineHeight: 16,
} as const;

const suitMedium14 = {
  fontFamily: fontFamilies.suitMedium,
  fontSize: 14,
  letterSpacing: -0.35,
  lineHeight: 20,
} as const;

const suitMedium16 = {
  fontFamily: fontFamilies.suitMedium,
  fontSize: 16,
  letterSpacing: -0.4,
  lineHeight: 24,
} as const;

const suitSemiBold14 = {
  fontFamily: fontFamilies.suitSemiBold,
  fontSize: 14,
  letterSpacing: -0.35,
  lineHeight: 20,
} as const;

const suitSemiBold16 = {
  fontFamily: fontFamilies.suitSemiBold,
  fontSize: 16,
  letterSpacing: -0.4,
  lineHeight: 24,
} as const;

const suitSemiBold18 = {
  fontFamily: fontFamilies.suitSemiBold,
  fontSize: 18,
  letterSpacing: -0.45,
  lineHeight: 28,
} as const;

const suitSemiBold20 = {
  fontFamily: fontFamilies.suitSemiBold,
  fontSize: 20,
  letterSpacing: -0.5,
  lineHeight: 30,
} as const;

export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FCFCFD',
  gray100: '#F6F7FA',
  gray200: '#E9ECF2',
  gray400: '#A9B1C1',
  gray500: '#848DA0',
  gray600: '#5E677A',
  gray800: '#262C3A',
  red500: '#FE4C4C',
  brand: '#040648',
  brand500: '#000047',
  brandGradientEnd: '#420047',
  blue500: '#4C96FE',
  blueTint: 'rgba(76, 150, 254, 0.1)',
  mileageAction: '#4C69FE',
  mileageTint: '#EDF0FF',
  overlayScrim: 'rgba(38, 44, 58, 0.28)',
  error: '#D92D20',
} as const;

export const typography = {
  suitMedium12,
  suitMedium14,
  suitMedium16,
  suitSemiBold14,
  suitSemiBold16,
  suitSemiBold18,
  suitSemiBold20,
  screenTitle: {
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 16,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  authBody: suitMedium14,
  authAction: suitSemiBold14,
  authResult: suitSemiBold20,
  authCaption: suitMedium12,
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
    fontFamily: fontFamilies.suitSemiBold,
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 44,
  },
} as const satisfies Record<string, TypographyToken>;
