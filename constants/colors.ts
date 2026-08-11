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

const colors = {
  light: {
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
  },

  dark: {
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
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
