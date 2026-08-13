/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const skyLight = {
  text: '#162338',
  tint: '#4C78C2',
  background: '#F2F6FB',
  backgroundGlow: '#E5F0FC',
  foreground: '#162338',
  card: 'rgba(255,255,255,0.72)',
  cardForeground: '#162338',
  primary: '#4C78C2',
  primaryForeground: '#FFFFFF',
  secondary: 'rgba(225,235,247,0.84)',
  secondaryForeground: '#274467',
  muted: 'rgba(225,235,247,0.62)',
  mutedForeground: '#61738C',
  accent: 'rgba(213,239,233,0.94)',
  accentForeground: '#176457',
  destructive: '#C85868',
  destructiveForeground: '#FFFFFF',
  border: 'rgba(135,163,198,0.28)',
  input: 'rgba(135,163,198,0.44)',
  glass: 'rgba(255,255,255,0.62)',
  glassStrong: 'rgba(255,255,255,0.9)',
  glassBorder: 'rgba(255,255,255,0.86)',
  tabBar: 'rgba(248,251,255,0.78)',
  tabBarBorder: 'rgba(135,163,198,0.24)',
  tabActive: 'rgba(76,120,194,0.13)',
  heroStart: '#1B385F',
  heroEnd: '#2D7A83',
  heroText: '#FFFFFF',
  heroMuted: '#DCECF2',
  sessionAccent: '#F4C56C',
};

const skyDark = {
  text: '#F6F9FF',
  tint: '#8DB9FF',
  background: '#000000',
  backgroundGlow: '#000000',
  foreground: '#F4F7FC',
  card: 'rgba(18,23,31,0.86)',
  cardForeground: '#F4F7FC',
  primary: '#8DB9FF',
  primaryForeground: '#07111F',
  secondary: 'rgba(22,30,41,0.94)',
  secondaryForeground: '#E4ECF8',
  muted: 'rgba(22,30,41,0.72)',
  mutedForeground: '#A9B7CA',
  accent: 'rgba(17,61,57,0.9)',
  accentForeground: '#9BE5D2',
  destructive: '#F08A98',
  destructiveForeground: '#260B11',
  border: 'rgba(158,181,215,0.2)',
  input: 'rgba(158,181,215,0.34)',
  glass: 'rgba(19,26,36,0.76)',
  glassStrong: 'rgba(25,32,43,0.96)',
  glassBorder: 'rgba(164,188,224,0.22)',
  tabBar: 'rgba(8,10,14,0.94)',
  tabBarBorder: 'rgba(164,188,224,0.18)',
  tabActive: 'rgba(141,185,255,0.16)',
  heroStart: '#061425',
  heroEnd: '#0D3A48',
  heroText: '#FFFFFF',
  heroMuted: '#C8D8E8',
  sessionAccent: '#F5C76C',
};

const emeraldLight = {
  ...skyLight,
  tint: '#168A70',
  primary: '#168A70',
  secondary: '#E4F4EE',
  secondaryForeground: '#145A4B',
  muted: '#E4F4EE',
  accent: '#D9F1E8',
  accentForeground: '#146B56',
  border: '#CDE5DC',
  input: '#CDE5DC',
  heroStart: '#075E54',
  heroEnd: '#168A70',
};

const emeraldDark = {
  ...skyDark,
  tint: '#67D6B4',
  primary: '#67D6B4',
  primaryForeground: '#082B25',
  secondary: '#173F38',
  secondaryForeground: '#E4FFF7',
  muted: '#173F38',
  accent: '#1B5548',
  accentForeground: '#8DE8C9',
  border: '#2A5C51',
  input: '#2A5C51',
  heroStart: '#0C4139',
  heroEnd: '#176352',
};

const amberLight = {
  ...skyLight,
  tint: '#C26A20',
  primary: '#C26A20',
  secondary: '#FFF0D9',
  secondaryForeground: '#75400E',
  muted: '#FFF0D9',
  accent: '#FFE5B7',
  accentForeground: '#8D4B0D',
  border: '#EAD8BC',
  input: '#EAD8BC',
  heroStart: '#7A3E12',
  heroEnd: '#C26A20',
};

const amberDark = {
  ...skyDark,
  tint: '#F5B66B',
  primary: '#F5B66B',
  primaryForeground: '#3A1D06',
  secondary: '#49301A',
  secondaryForeground: '#FFF0DB',
  muted: '#49301A',
  accent: '#62421F',
  accentForeground: '#FFD19A',
  border: '#76532F',
  input: '#76532F',
  heroStart: '#4A2915',
  heroEnd: '#7D4A1D',
};

const violetLight = {
  ...skyLight,
  tint: '#7656C5',
  primary: '#7656C5',
  secondary: '#EEE9FF',
  secondaryForeground: '#4C378D',
  muted: '#EEE9FF',
  accent: '#E5DEFF',
  accentForeground: '#5940A4',
  border: '#DCD3F3',
  input: '#DCD3F3',
  heroStart: '#3E287E',
  heroEnd: '#7656C5',
};

const violetDark = {
  ...skyDark,
  tint: '#B9A4FF',
  primary: '#B9A4FF',
  primaryForeground: '#25164F',
  secondary: '#30264F',
  secondaryForeground: '#F0EBFF',
  muted: '#30264F',
  accent: '#453568',
  accentForeground: '#CBBEFF',
  border: '#594A7C',
  input: '#594A7C',
  heroStart: '#2D1F5D',
  heroEnd: '#563E9A',
};

export type AppPalette = typeof skyLight;

const colors = {
  light: skyLight,
  dark: skyDark,
  themes: {
    sky: { light: skyLight, dark: skyDark },
    emerald: { light: emeraldLight, dark: emeraldDark },
    amber: { light: amberLight, dark: amberDark },
    violet: { light: violetLight, dark: violetDark },
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
