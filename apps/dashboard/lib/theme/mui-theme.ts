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
  });
}
