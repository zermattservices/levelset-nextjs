import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { FormGroup, FormType } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface CreateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  groups: FormGroup[];
  getAccessToken: () => Promise<string | null>;
}

const FORM_TYPES: { value: FormType; label: string }[] = [
  { value: 'rating', label: 'Rating' },
  { value: 'discipline', label: 'Discipline' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'custom', label: 'Custom' },
];

const textFieldSx = {
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 12,
    color: 'var(--ls-color-muted)',
    '&.Mui-focused': { color: 'var(--ls-color-brand)' },
  },
  '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
  '& .MuiInputBase-input': { fontFamily, fontSize: 14, padding: '10px 14px' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-muted-border)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-border)' },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

const selectSx = {
  fontFamily,
  fontSize: 14,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-muted-border)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-border)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

export function CreateFormDialog({
  open,
  onClose,
  onCreated,
  groups,
  getAccessToken,
}: CreateFormDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [groupId, setGroupId] = React.useState('');
  const [formType, setFormType] = React.useState<FormType>('custom');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setGroupId(groups[0]?.id || '');
      setFormType('custom');
      setError(null);
    }
  }, [open, groups]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Form name is required');
      return;
    }
    if (!groupId) {
      setError('Please select a group');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          intent: 'create_template',
          name: name.trim(),
          description: description.trim() || null,
          group_id: groupId,
          form_type: formType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create form');
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          fontFamily,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: '"Mont", sans-serif',
          fontSize: 18,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
        }}
      >
        Create New Form
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '8px 24px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <Alert severity="error" sx={{ fontFamily, fontSize: 13 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Form Name"
          placeholder="Enter form name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          required
          sx={textFieldSx}
        />

        <TextField
          label="Description"
          placeholder="Optional description for this form"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          sx={textFieldSx}
        />

        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', '&.Mui-focused': { color: 'var(--ls-color-brand)' } }}>
            Form Group
          </InputLabel>
          <Select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            label="Form Group"
            sx={selectSx}
          >
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id} sx={{ fontFamily, fontSize: 13 }}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)', '&.Mui-focused': { color: 'var(--ls-color-brand)' } }}>
            Form Type
          </InputLabel>
          <Select
            value={formType}
            onChange={(e) => setFormType(e.target.value as FormType)}
            label="Form Type"
            sx={selectSx}
          >
            {FORM_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value} sx={{ fontFamily, fontSize: 13 }}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ padding: '8px 24px 16px', gap: '8px' }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            color: 'var(--ls-color-muted)',
            borderRadius: '8px',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'none',
            backgroundColor: 'var(--ls-color-brand)',
            borderRadius: '8px',
            boxShadow: 'none',
            padding: '6px 20px',
            '&:hover': {
              backgroundColor: 'var(--ls-color-brand-hover)',
              boxShadow: 'none',
            },
          }}
        >
          {saving ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
