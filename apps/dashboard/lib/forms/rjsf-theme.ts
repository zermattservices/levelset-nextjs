/**
 * RJSF Theme Configuration
 *
 * Custom theme wrapping @rjsf/mui with Levelset design tokens.
 * Exports the MUI theme and widget registry for FormRenderer.
 */

import { createTheme } from '@mui/material/styles';

/**
 * MUI theme with Levelset design token overrides for RJSF forms
 */
export const rjsfMuiTheme = createTheme({
  typography: {
    fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,
  },
  palette: {
    primary: {
      main: '#2E7D32', // Fallback for var(--ls-color-brand)
    },
    error: {
      main: '#D32F2F',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiTextField: {
      defaultProps: {
        size: 'small',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            fontFamily: '"Satoshi", sans-serif',
          },
          '& .MuiInputBase-root': {
            fontFamily: '"Satoshi", sans-serif',
            fontSize: 14,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover fieldset': {
            borderColor: 'var(--ls-color-brand)',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--ls-color-brand)',
          },
        },
        // Ensure notch legend uses Satoshi so its width matches the label
        notchedOutline: {
          '& legend': {
            fontFamily: '"Satoshi", sans-serif',
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontFamily: '"Satoshi", sans-serif',
          fontSize: 14,
          fontWeight: 500,
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontFamily: '"Satoshi", sans-serif',
          fontSize: 12,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontFamily: '"Satoshi", sans-serif',
          fontSize: 14,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: '"Satoshi", sans-serif',
          textTransform: 'none' as const,
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          fontFamily: '"Satoshi", sans-serif',
          fontSize: 14,
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: 'var(--ls-color-brand)',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: 'var(--ls-color-brand)',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: 'var(--ls-color-brand)',
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: 'var(--ls-color-brand)',
          },
        },
      },
    },
  },
});
