import * as React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import sty from './FormSettingsPanel.module.css';
import { StyledTextField, StyledSelect, fontFamily, inputLabelSx } from './dialogStyles';
import type { FormTemplate, FormGroup } from '@/lib/forms/types';

interface FormSettingsPanelProps {
  template: FormTemplate;
  groups: FormGroup[];
  onSave: (updates: Partial<FormTemplate>) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving: boolean;
  isSystem?: boolean;
}

const readOnlyInputSx = {
  '& .MuiOutlinedInput-root': { backgroundColor: 'var(--ls-color-neutral-foreground)' },
};

export function FormSettingsPanel({
  template,
  groups,
  onSave,
  onDelete,
  saving,
  isSystem,
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

        {isSystem && (
          <Alert
            severity="info"
            sx={{ fontFamily, fontSize: 13, borderRadius: '8px', mb: 1 }}
          >
            This is a system form. Its structure is managed by Levelset.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ fontFamily, fontSize: 13 }}>
            {error}
          </Alert>
        )}

        <div className={sty.fieldRow}>
          <StyledTextField
            label="Form Name (English)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            required
            InputProps={isSystem ? { readOnly: true } : undefined}
            sx={isSystem ? readOnlyInputSx : undefined}
          />
          <StyledTextField
            label="Form Name (Spanish)"
            value={nameEs}
            onChange={(e) => setNameEs(e.target.value)}
            fullWidth
            size="small"
            InputProps={isSystem ? { readOnly: true } : undefined}
            sx={isSystem ? readOnlyInputSx : undefined}
          />
        </div>

        <div className={sty.fieldRow}>
          <StyledTextField
            label="Description (English)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            InputLabelProps={{ shrink: true }}
            InputProps={isSystem ? { readOnly: true } : undefined}
            sx={isSystem ? readOnlyInputSx : undefined}
          />
          <StyledTextField
            label="Description (Spanish)"
            value={descriptionEs}
            onChange={(e) => setDescriptionEs(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            InputLabelProps={{ shrink: true }}
            InputProps={isSystem ? { readOnly: true } : undefined}
            sx={isSystem ? readOnlyInputSx : undefined}
          />
        </div>
      </div>

      <Divider />

      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Configuration</h3>

        <FormControl fullWidth size="small">
          <InputLabel sx={inputLabelSx}>
            Form Group
          </InputLabel>
          <StyledSelect
            value={groupId}
            onChange={(e) => setGroupId(e.target.value as string)}
            label="Form Group"
            disabled={isSystem}
          >
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id} sx={{ fontFamily, fontSize: 13 }}>
                {group.name}
              </MenuItem>
            ))}
          </StyledSelect>
        </FormControl>

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
