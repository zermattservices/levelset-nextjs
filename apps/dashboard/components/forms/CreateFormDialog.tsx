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
  Typography,
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

/** Maps system group slugs to their fixed form types */
const SLUG_TO_TYPE: Record<string, FormType> = {
  positional_excellence: 'rating',
  discipline: 'discipline',
  evaluations: 'evaluation',
};

/** Human-readable labels for derived form types */
const TYPE_LABELS: Record<FormType, string> = {
  rating: 'Rating',
  discipline: 'Discipline',
  evaluation: 'Evaluation',
  custom: 'Custom',
};

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
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Derive form type from the selected group's slug
  const selectedGroup = groups.find((g) => g.id === groupId);
  const formType: FormType =
    (selectedGroup?.slug && SLUG_TO_TYPE[selectedGroup.slug]) || 'custom';

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setGroupId(groups[0]?.id || '');
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

        <div>
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
          {selectedGroup && (
            <Typography
              sx={{
                fontFamily,
                fontSize: 12,
                color: 'var(--ls-color-muted)',
                mt: '6px',
                ml: '2px',
              }}
            >
              Form type: <strong>{TYPE_LABELS[formType]}</strong>
            </Typography>
          )}
        </div>
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
