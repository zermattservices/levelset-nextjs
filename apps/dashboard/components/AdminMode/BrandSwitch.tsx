/**
 * BrandSwitch
 * Styled MUI Switch with Levelset brand colors.
 * Fully controls all visual aspects so it renders correctly
 * without a global MUI ThemeProvider.
 */
import { styled } from '@mui/material/styles';
import MuiSwitch from '@mui/material/Switch';

export const BrandSwitch = styled(MuiSwitch)({
  width: 40,
  height: 22,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 2,
    transitionDuration: '200ms',
    '&.Mui-checked': {
      transform: 'translateX(18px)',
      '& + .MuiSwitch-track': {
        backgroundColor: 'var(--ls-color-brand)',
        opacity: 1,
        border: 0,
      },
      '& .MuiSwitch-thumb': {
        backgroundColor: 'var(--ls-color-bg-container)',
      },
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.4,
    },
  },
  '& .MuiSwitch-thumb': {
    width: 18,
    height: 18,
    backgroundColor: 'var(--ls-color-bg-container)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 11,
    backgroundColor: 'var(--ls-color-neutral-border)',
    opacity: 1,
  },
});
