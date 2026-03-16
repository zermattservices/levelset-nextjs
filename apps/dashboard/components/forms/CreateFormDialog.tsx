import * as React from 'react';
import {
  Dialog,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { fontFamily } from './dialogStyles';
import sty from './ImportFormDialog.module.css';
import type { FormGroup, FormType } from '@/lib/forms/types';

interface CreateFormDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  groups: FormGroup[];
  getAccessToken: () => Promise<string | null>;
  orgId?: string | null;
}

const SLUG_TO_TYPE: Record<string, FormType> = {
  evaluations: 'evaluation',
};

export function CreateFormDialog({
  open,
  onClose,
  onCreated,
  groups,
  getAccessToken,
  orgId,
}: CreateFormDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [groupId, setGroupId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const formType: FormType =
    (selectedGroup?.slug && SLUG_TO_TYPE[selectedGroup.slug]) || 'custom';

  const sortedGroups = React.useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups]
  );

  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setGroupId(sortedGroups[0]?.id || '');
      setError(null);
    }
  }, [open, sortedGroups]);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Form name is required'); return; }
    if (!groupId) { setError('Please select a group'); return; }

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
          org_id: orgId,
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
          borderRadius: '14px',
          fontFamily,
          overflow: 'hidden',
          backgroundImage: 'none',
        },
      }}
    >
      {/* Header */}
      <div className={sty.header}>
        <span className={sty.title}>Create New Form</span>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
        </IconButton>
      </div>

      {/* Content */}
      <div className={sty.content}>
        {error && <div className={sty.errorBanner}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Form name */}
          <div className={sty.fieldGroup}>
            <span className={sty.fieldLabel}>Form Name</span>
            <input
              type="text"
              className={sty.textInput}
              placeholder="e.g. Quarterly Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className={sty.fieldGroup}>
            <span className={sty.fieldLabel}>Description (optional)</span>
            <textarea
              className={sty.textArea}
              placeholder="What is this form for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Group selector */}
          <div className={sty.fieldGroup}>
            <span className={sty.fieldLabel}>Group</span>
            <div className={sty.groupSelector}>
              {sortedGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`${sty.groupChip} ${groupId === g.id ? sty.groupChipSelected : ''}`}
                  onClick={() => setGroupId(g.id)}
                >
                  {groupId === g.id && (
                    <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                  )}
                  {g.name}
                </button>
              ))}
            </div>
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
