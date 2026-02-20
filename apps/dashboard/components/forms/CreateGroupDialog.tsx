import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  getAccessToken: () => Promise<string | null>;
}

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

export function CreateGroupDialog({
  open,
  onClose,
  onCreated,
  getAccessToken,
}: CreateGroupDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const res = await fetch('/api/forms/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create group');
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
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
        Create New Group
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
          label="Group Name"
          placeholder="Enter group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
          required
          sx={textFieldSx}
        />

        <TextField
          label="Description"
          placeholder="Optional description for this group"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          sx={textFieldSx}
        />
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
