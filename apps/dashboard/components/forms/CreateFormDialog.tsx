import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { FormGroup, FormType } from '@/lib/forms/types';
import {
  StyledTextField,
  StyledSelect,
  inputLabelSx,
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
  fontFamily,
  alertSx,
} from './dialogStyles';

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
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Create New Form
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        {error && (
          <Alert severity="error" sx={alertSx}>
            {error}
          </Alert>
        )}

        <StyledTextField
          label="Form Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          required
        />

        <StyledTextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          InputLabelProps={{ shrink: true }}
        />

        <FormControl fullWidth size="small">
          <InputLabel sx={inputLabelSx}>Form Group</InputLabel>
          <StyledSelect
            value={groupId}
            onChange={(e) => setGroupId(e.target.value as string)}
            label="Form Group"
          >
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id} sx={{ fontFamily, fontSize: 13 }}>
                {group.name}
              </MenuItem>
            ))}
          </StyledSelect>
        </FormControl>
      </DialogContent>

      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onClose} disabled={saving} sx={cancelButtonSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={primaryButtonSx}
        >
          {saving ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
