import type { TextStyle } from 'react-native';

type TypographyToken = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'fontWeight' | 'letterSpacing' | 'lineHeight'
>;

export const colors = {
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FCFCFD',
  gray100: '#F6F7FA',
  gray200: '#E9ECF2',
  gray400: '#A9B1C1',
  gray800: '#262C3A',
  red500: '#FE4C4C',
  brand: '#040648',
  error: '#D92D20',
} as const;

export const typography = {
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
} as const satisfies Record<string, TypographyToken>;
