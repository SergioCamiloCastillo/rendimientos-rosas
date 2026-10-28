// Paleta estilo FDRY: base crema + tinta casi negra + un solo acento (turquesa profundo).
// Los colores de estado se mantienen porque comunican meta cumplida / no cumplida.
export const colors = {
  primary: '#108474',
  primaryLight: '#DCEBE5',
  primaryDark: '#0B5F54',

  secondary: '#B8641E',
  secondaryLight: '#F5E6D6',

  success: '#2F8A4C',
  successLight: '#E1EFDF',

  danger: '#C2412D',
  dangerLight: '#F6E0DA',

  warning: '#C99317',
  warningLight: '#F6EACB',

  background: '#F7F0E8',
  surface: '#FFFCF8',

  text: '#221E1E',
  textSecondary: '#6F675E',
  textLight: '#8C8379',

  border: '#E4DCD0',
  borderLight: '#EFE8DE',

  white: '#FFFFFF',
  black: '#000000',

  gray: {
    50: '#FBF8F4',
    100: '#F2ECE4',
    200: '#E4DCD0',
    300: '#D2C8BB',
    400: '#A39A8F',
    500: '#6F675E',
    600: '#575049',
    700: '#423C37',
    800: '#2E2927',
    900: '#221E1E',
  },
};

export type Colors = typeof colors;
