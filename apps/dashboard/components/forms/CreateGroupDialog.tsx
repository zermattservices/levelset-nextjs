import * as React from 'react';
import {
  Dialog,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { fontFamily } from './dialogStyles';
import sty from './ImportFormDialog.module.css';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  getAccessToken: () => Promise<string | null>;
  orgId?: string | null;
}

export function CreateGroupDialog({
  open,
  onClose,
  onCreated,
  getAccessToken,
  orgId,
}: CreateGroupDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
          org_id: orgId,
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
          borderRadius: '14px',
          fontFamily,
          overflow: 'hidden',
          backgroundImage: 'none',
        },
      }}
    >
      {/* Header */}
      <div className={sty.header}>
        <span className={sty.title}>Create New Group</span>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
        </IconButton>
      </div>

      {/* Content */}
      <div className={sty.content}>
        {error && <div className={sty.errorBanner}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={sty.fieldGroup}>
            <span className={sty.fieldLabel}>Group Name</span>
            <input
              type="text"
              className={sty.textInput}
              placeholder="e.g. Safety Forms"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={sty.fieldGroup}>
            <span className={sty.fieldLabel}>Description (optional)</span>
            <textarea
              className={sty.textArea}
              placeholder="What types of forms belong in this group?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={sty.footer}>
        <button
          type="button"
          className={sty.cancelBtn}
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`${sty.primaryBtn} ${(saving || !name.trim()) ? sty.primaryBtnDisabled : ''}`}
          onClick={handleCreate}
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <CircularProgress size={14} sx={{ color: '#fff' }} />
          ) : (
            <AddOutlinedIcon sx={{ fontSize: 15 }} />
          )}
          {saving ? 'Creating...' : 'Create'}
        </button>
      </div>
    </Dialog>
  );
}
