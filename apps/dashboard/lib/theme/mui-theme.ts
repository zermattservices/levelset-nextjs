import { createTheme, type Theme } from '@mui/material/styles';

export function createLevelsetTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#31664A' : '#3d8060' },
      error: { main: mode === 'light' ? '#dc2626' : '#f85149' },
      background: {
        default: mode === 'light' ? '#ffffff' : '#0d1117',
        paper: mode === 'light' ? '#ffffff' : '#161b22',
      },
      text: {
        primary: mode === 'light' ? '#181D27' : '#e6edf3',
        secondary: mode === 'light' ? '#414651' : '#8b949e',
      },
      divider: mode === 'light' ? '#D1D5DB' : '#30363d',
    },
    typography: {
      fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: 14,
    },
    shape: { borderRadius: 8 },
    components: {
      MuiTextField: {
        defaultProps: { size: 'small', fullWidth: true },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: 14,
            '&:hover fieldset': { borderColor: 'var(--ls-color-brand)' },
            '&.Mui-focused fieldset': { borderColor: 'var(--ls-color-brand)' },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontFamily: '"Satoshi", sans-serif',
            fontSize: '14px !important',
            fontWeight: 500,
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontFamily: '"Satoshi", sans-serif',
            fontSize: '14px !important',
            fontWeight: 500,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { fontFamily: '"Satoshi", sans-serif', textTransform: 'none' as const, fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiSelect: {
        defaultProps: { size: 'small' },
      },
      MuiRadio: {
        styleOverrides: {
          root: { '&.Mui-checked': { color: 'var(--ls-color-brand)' } },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: { '&.Mui-checked': { color: 'var(--ls-color-brand)' } },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--ls-color-brand)' },
          },
        },
      },
    },
  });
}
