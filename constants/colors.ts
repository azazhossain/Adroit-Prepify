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
    // Legacy aliases (kept for backward compatibility)
    text: '#14213D',
    tint: '#2B6CB0',

    // Core surfaces
    background: '#F4F7FB',
    foreground: '#14213D',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#14213D',

    // Primary action color (buttons, links, active states)
    primary: '#2B6CB0',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E7EEF7',
    secondaryForeground: '#234064',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#E7EEF7',
    mutedForeground: '#63748A',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#DCEFEA',
    accentForeground: '#1B665A',

    // Destructive actions (delete, error states)
    destructive: '#C95C67',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#D5DFEA',
    input: '#D5DFEA',
    heroStart: '#173A66',
    heroEnd: '#1C6D78',
    heroText: '#FFFFFF',
    heroMuted: '#D4EBF1',
};

const skyDark = {
    text: '#F6F8FC',
    tint: '#76B5E6',
    background: '#101A2D',
    foreground: '#F6F8FC',
    card: '#17243B',
    cardForeground: '#F6F8FC',
    primary: '#76B5E6',
    primaryForeground: '#10213C',
    secondary: '#223553',
    secondaryForeground: '#E6EEF9',
    muted: '#223553',
    mutedForeground: '#A9B8CE',
    accent: '#204C4B',
    accentForeground: '#A7E2D3',
    destructive: '#EC818A',
    destructiveForeground: '#2D1116',
    border: '#30445F',
    input: '#30445F',
    heroStart: '#1B3F61',
    heroEnd: '#173B49',
    heroText: '#FFFFFF',
    heroMuted: '#C8E0E4',
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
