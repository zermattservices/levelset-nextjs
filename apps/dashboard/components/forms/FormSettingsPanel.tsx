import * as React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import sty from './FormSettingsPanel.module.css';
import type { FormTemplate, FormGroup, FormType } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FormSettingsPanelProps {
  template: FormTemplate;
  groups: FormGroup[];
  onSave: (updates: Partial<FormTemplate>) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving: boolean;
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

const TYPE_LABELS: Record<FormType, string> = {
  rating: 'Rating',
  discipline: 'Discipline',
  evaluation: 'Evaluation',
  custom: 'Custom',
};

export function FormSettingsPanel({
  template,
  groups,
  onSave,
  onDelete,
  saving,
}: FormSettingsPanelProps) {
  const [name, setName] = React.useState(template.name);
  const [nameEs, setNameEs] = React.useState(template.name_es || '');
  const [description, setDescription] = React.useState(template.description || '');
  const [descriptionEs, setDescriptionEs] = React.useState(template.description_es || '');
  const [groupId, setGroupId] = React.useState(template.group_id);
  const [isActive, setIsActive] = React.useState(template.is_active);
  const [error, setError] = React.useState<string | null>(null);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Track changes
  React.useEffect(() => {
    const changed =
      name !== template.name ||
      (nameEs || '') !== (template.name_es || '') ||
      (description || '') !== (template.description || '') ||
      (descriptionEs || '') !== (template.description_es || '') ||
      groupId !== template.group_id ||
      isActive !== template.is_active;
    setHasChanges(changed);
  }, [name, nameEs, description, descriptionEs, groupId, isActive, template]);

  // Sync state when template changes
  React.useEffect(() => {
    setName(template.name);
    setNameEs(template.name_es || '');
    setDescription(template.description || '');
    setDescriptionEs(template.description_es || '');
    setGroupId(template.group_id);
    setIsActive(template.is_active);
    setError(null);
  }, [template]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Form name is required');
      return;
    }

    setError(null);

    try {
      await onSave({
        name: name.trim(),
        name_es: nameEs.trim() || null,
        description: description.trim() || null,
        description_es: descriptionEs.trim() || null,
        group_id: groupId,
        is_active: isActive,
      });
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    }
  };

  return (
    <div className={sty.panel}>
      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>General</h3>

        {error && (
          <Alert severity="error" sx={{ fontFamily, fontSize: 13 }}>
            {error}
          </Alert>
        )}

        <div className={sty.fieldRow}>
          <TextField
            label="Form Name (English)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            required
            sx={textFieldSx}
          />
          <TextField
            label="Form Name (Spanish)"
            value={nameEs}
            onChange={(e) => setNameEs(e.target.value)}
            fullWidth
            size="small"
            sx={textFieldSx}
          />
        </div>

        <div className={sty.fieldRow}>
          <TextField
            label="Description (English)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={textFieldSx}
          />
          <TextField
            label="Description (Spanish)"
            value={descriptionEs}
            onChange={(e) => setDescriptionEs(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={textFieldSx}
          />
        </div>
      </div>

      <Divider />

      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Configuration</h3>

        <div className={sty.fieldRow}>
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

          <div className={sty.readOnlyField}>
            <span className={sty.readOnlyLabel}>Form Type</span>
            <Chip
              label={TYPE_LABELS[template.form_type] || template.form_type}
              size="small"
              sx={{
                fontFamily,
                fontSize: 12,
                fontWeight: 600,
                height: 26,
                borderRadius: '6px',
                backgroundColor: 'var(--ls-color-neutral-foreground)',
                color: 'var(--ls-color-text-primary)',
              }}
            />
            {template.is_system && (
              <span className={sty.readOnlyHint}>Type cannot be changed for system forms</span>
            )}
          </div>
        </div>

        <FormControlLabel
          control={
            <Switch
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: 'var(--ls-color-brand)',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: 'var(--ls-color-brand)',
                },
              }}
            />
          }
          label={
            <span style={{ fontFamily, fontSize: 14, color: 'var(--ls-color-text-primary)' }}>
              Active
            </span>
          }
        />
      </div>

      <Divider />

      <div className={sty.actionsRow}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanges}
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
          {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
        </Button>

        {!template.is_system && onDelete && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={onDelete}
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              borderColor: 'var(--ls-color-destructive-border)',
              color: 'var(--ls-color-destructive)',
              '&:hover': {
                borderColor: 'var(--ls-color-destructive)',
                backgroundColor: 'var(--ls-color-destructive-soft)',
              },
            }}
          >
            Archive Form
          </Button>
        )}
      </div>
    </div>
  );
}
