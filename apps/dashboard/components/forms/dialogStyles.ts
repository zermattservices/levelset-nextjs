/**
 * Shared styling constants for form management components.
 *
 * Provides styled MUI components and sx objects used across form management.
 * The StyledTextField and StyledSelect components match the working pattern
 * from OrgSettings (OrganizationDetails, RatingCriteriaTab, etc.).
 *
 * IMPORTANT: Do NOT override `.MuiInputBase-input` padding or label fontSize —
 * this breaks MUI's internal label positioning math when combined with size="small".
 *
 * For multiline StyledTextFields, add InputLabelProps={{ shrink: true }}
 * so the label stays in the notch above the textarea.
 */

import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';

export const fontFamily =
  '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/* ── Styled TextField ──────────────────────────────────────────────
 *  Matches the working pattern from OrgSettings/OrganizationDetails.
 *  Targets .MuiOutlinedInput-root (NOT .MuiInputBase-input) so MUI's
 *  internal padding and label positioning works correctly with size="small".
 *
 *  For multiline, also pass: InputLabelProps={{ shrink: true }}
 * ────────────────────────────────────────────────────────────────── */

export const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    borderRadius: 8,
    '&:hover fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
  },
  '& .MuiInputLabel-root': {
    fontFamily,
  },
  // Notch legend must use same font as label so notch width matches
  '& .MuiOutlinedInput-notchedOutline legend': {
    fontFamily,
  },
}));

/* ── Styled Select ─────────────────────────────────────────────── */

export const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  borderRadius: 8,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
}));

/* ── Input label (for FormControl + Select combos) ─────────────── */

export const inputLabelSx = {
  fontFamily,
  '&.Mui-focused': { color: 'var(--ls-color-brand)' },
};

/* ── Dialog paper ──────────────────────────────────────────────── */

export const dialogPaperSx = {
  borderRadius: '12px',
  fontFamily,
};

/* ── Dialog title ──────────────────────────────────────────────── */

export const dialogTitleSx = {
  fontFamily: '"Mont", sans-serif',
  fontSize: 18,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
};

/* ── Dialog content ────────────────────────────────────────────── */

export const dialogContentSx = {
  padding: '8px 24px 24px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
};

/* ── Dialog actions ────────────────────────────────────────────── */

export const dialogActionsSx = {
  padding: '8px 24px 16px',
  gap: '8px',
};

/* ── Buttons ───────────────────────────────────────────────────── */

export const cancelButtonSx = {
  fontFamily,
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'none' as const,
  color: 'var(--ls-color-muted)',
  borderRadius: '8px',
};

export const primaryButtonSx = {
  fontFamily,
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'none' as const,
  backgroundColor: 'var(--ls-color-brand)',
  borderRadius: '8px',
  boxShadow: 'none',
  padding: '6px 20px',
  '&:hover': {
    backgroundColor: 'var(--ls-color-brand-hover)',
    boxShadow: 'none',
  },
};

/* ── Menu item ─────────────────────────────────────────────────── */

export const menuItemSx = {
  fontFamily,
  fontSize: 13,
};

/* ── Alert ─────────────────────────────────────────────────────── */

export const alertSx = {
  fontFamily,
  fontSize: 13,
};
