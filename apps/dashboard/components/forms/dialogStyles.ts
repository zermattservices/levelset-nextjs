/**
 * Shared styling constants for form management dialogs.
 *
 * Provides a single source-of-truth for the font, TextField, Select,
 * Dialog, and Button sx objects used by CreateFormDialog, CreateGroupDialog,
 * and any future form dialogs.
 *
 * NOTE: Multiline TextFields must use `textFieldMultilineSx` (which omits
 * the input padding override) and set `InputLabelProps={{ shrink: true }}`
 * so the label stays above the textarea instead of overlapping the placeholder.
 */

export const fontFamily =
  '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/* ── TextField (single-line) ───────────────────────────────────── */

export const textFieldSx = {
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 12,
    color: 'var(--ls-color-muted)',
    '&.Mui-focused': { color: 'var(--ls-color-brand)' },
  },
  '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
  '& .MuiInputBase-input': { fontFamily, fontSize: 14, padding: '10px 14px' },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-border)',
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

/* ── TextField (multiline) ─────────────────────────────────────
 *  Identical to textFieldSx but WITHOUT the padding override on
 *  .MuiInputBase-input.  MUI's multiline variant wraps a <textarea>
 *  and handles its own internal padding — overriding it causes the
 *  placeholder text to render outside the outlined border.
 *
 *  When using this, also pass: InputLabelProps={{ shrink: true }}
 *  on the TextField so the label stays in the notch at all times.
 * ────────────────────────────────────────────────────────────── */

export const textFieldMultilineSx = {
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 12,
    color: 'var(--ls-color-muted)',
    '&.Mui-focused': { color: 'var(--ls-color-brand)' },
  },
  '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
  '& .MuiInputBase-input': { fontFamily, fontSize: 14 },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-border)',
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

/* ── Select ────────────────────────────────────────────────────── */

export const selectSx = {
  fontFamily,
  fontSize: 14,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-border)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

/* ── Input label (for FormControl + Select combos) ─────────────── */

export const inputLabelSx = {
  fontFamily,
  fontSize: 12,
  color: 'var(--ls-color-muted)',
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
