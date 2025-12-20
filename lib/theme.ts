import { createTheme } from '@mui/material/styles';

// Font stacks
const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Status colors for tables (exported for use in components)
export const statusColors = {
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef3c7', text: '#d97706' },
  error: { bg: '#fee2e2', text: '#991b1b' },
};

// Rating colors for PEA (exported for use in components)
export const ratingColors = {
  green: '#249e6b',
  yellow: '#ffb549',
  red: '#ad2624',
};

// FOH/BOH colors (exported for use in components)
export const fohBohColors = {
  foh: { text: '#006391', bg: '#eaf9ff' },
  boh: { text: '#ffcc5b', bg: '#fffcf0' },
};

// Role badge colors (exported for use in components)
export const roleBadgeColors: Record<string, { bg: string; text: string }> = {
  'New Hire': { bg: '#f0fdf4', text: '#166534' },
  'Team Member': { bg: '#eff6ff', text: '#1d4ed8' },
  'Trainer': { bg: '#fef2f2', text: '#dc2626' },
  'Team Lead': { bg: '#fef3c7', text: '#d97706' },
  'Director': { bg: '#F0F0FF', text: '#483D8B' },
  'Executive': { bg: '#F0F0FF', text: '#483D8B' },
  'Operator': { bg: '#F0F0FF', text: '#483D8B' },
};

// Discipline point colors gradient (exported for use in components)
export const disciplinePointColors = (points: number): { bg: string; text: string } => {
  if (points === 0) return { bg: '#f3f4f6', text: '#111827' };
  if (points <= 10) return { bg: '#fee2e2', text: '#991b1b' };
  if (points <= 30) return { bg: '#fecaca', text: '#991b1b' };
  if (points <= 50) return { bg: '#fca5a5', text: '#7f1d1d' };
  if (points <= 75) return { bg: '#f87171', text: '#7f1d1d' };
  return { bg: '#dc2626', text: '#ffffff' };
};

// Common color values
export const colors = {
  primary: '#31664a',
  primaryDark: '#2d5a42',
  secondary: '#0d1b14',
  backgroundDefault: '#ffffff',
  backgroundPaper: '#ffffff',
  backgroundSubtle: '#f6fffa',
  backgroundGrey: '#f9fafb',
  textPrimary: '#0d1b14',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  divider: '#e5e7eb',
  border: '#d1d5db',
  error: '#dc2626',
  errorDark: '#b91c1c',
  yellowBadge: '#facc15',
};

// MUI Theme
export const theme = createTheme({
  palette: {
    primary: { 
      main: colors.primary,
      dark: colors.primaryDark,
    },
    secondary: { 
      main: colors.secondary,
    },
    background: {
      default: colors.backgroundDefault,
      paper: colors.backgroundPaper,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
    },
    error: { 
      main: colors.error,
      dark: colors.errorDark,
    },
    warning: { 
      main: '#d97706',
    },
    success: { 
      main: '#166534',
    },
    divider: colors.divider,
  },
  typography: {
    fontFamily: satoshiFont,
    h1: { fontFamily: montFont, fontWeight: 700 },
    h2: { fontFamily: montFont, fontWeight: 700 },
    // H3-H6 use Satoshi (default fontFamily)
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { 
      textTransform: 'none' as const, 
      fontWeight: 500,
    },
  },
  shape: { 
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { 
          borderRadius: 8, 
          padding: '6px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { 
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { 
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme;
