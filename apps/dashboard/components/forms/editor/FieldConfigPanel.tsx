import * as React from 'react';
import {
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Button,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import sty from './FieldConfigPanel.module.css';
import { FIELD_TYPES } from '@/lib/forms/field-palette';
import type { FormField, FieldOption } from '@/lib/forms/schema-builder';
import { ConnectedQuestionPicker } from '../evaluation/ConnectedQuestionPicker';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FieldConfigPanelProps {
  field: FormField | null;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  isEvaluation?: boolean;
}

const textFieldSx = {
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 11,
    color: 'var(--ls-color-muted)',
    '&.Mui-focused': { color: 'var(--ls-color-brand)' },
  },
  '& .MuiInputBase-root': { fontFamily, fontSize: 13 },
  '& .MuiInputBase-input': { fontFamily, fontSize: 13, padding: '8px 10px' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-muted-border)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-border)' },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

const SCORING_TYPES = [
  { value: 'rating_1_3', label: 'Rating (1-3)' },
  { value: 'rating_1_5', label: 'Rating (1-5)' },
  { value: 'true_false', label: 'True / False' },
  { value: 'percentage', label: 'Percentage' },
];

export function FieldConfigPanel({
  field,
  onUpdateField,
  isEvaluation,
}: FieldConfigPanelProps) {
  if (!field) {
    return (
      <div className={sty.panel}>
        <div className={sty.emptyPanel}>
          <span className={sty.emptyText}>Select a field to configure</span>
        </div>
      </div>
    );
  }

  const fieldDef = FIELD_TYPES[field.type];
  const isSection = field.type === 'section';

  const handleLabelChange = (value: string) => {
    onUpdateField(field.id, { label: value });
  };

  const handleLabelEsChange = (value: string) => {
    onUpdateField(field.id, { labelEs: value });
  };

  const handleDescriptionChange = (value: string) => {
    onUpdateField(field.id, { description: value || undefined });
  };

  const handleDescriptionEsChange = (value: string) => {
    onUpdateField(field.id, { descriptionEs: value || undefined });
  };

  const handleRequiredChange = (checked: boolean) => {
    onUpdateField(field.id, { required: checked });
  };

  const handleOptionAdd = () => {
    const newOptions = [
      ...(field.options || []),
      {
        value: `option_${(field.options?.length || 0) + 1}`,
        label: `Option ${(field.options?.length || 0) + 1}`,
      },
    ];
    onUpdateField(field.id, { options: newOptions });
  };

  const handleOptionUpdate = (index: number, updates: Partial<FieldOption>) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = { ...newOptions[index], ...updates };
    // Auto-sync value from label if value hasn't been manually edited
    if (updates.label && newOptions[index].value.startsWith('option_')) {
      newOptions[index].value = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
    }
    onUpdateField(field.id, { options: newOptions });
  };

  const handleOptionDelete = (index: number) => {
    const newOptions = (field.options || []).filter((_, i) => i !== index);
    onUpdateField(field.id, { options: newOptions });
  };

  const handleSettingsChange = (key: string, value: any) => {
    onUpdateField(field.id, {
      settings: { ...field.settings, [key]: value },
    });
  };

  return (
    <div className={sty.panel}>
      <h3 className={sty.panelTitle}>
        {isSection ? 'Section Settings' : 'Field Settings'}
      </h3>
      <span className={sty.fieldType}>{fieldDef?.label || field.type}</span>

      <Divider sx={{ margin: '8px 0' }} />

      {/* Label fields */}
      <div className={sty.configSection}>
        <span className={sty.sectionLabel}>Label</span>
        <TextField
          label="English"
          value={field.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          fullWidth
          size="small"
          sx={textFieldSx}
        />
        <TextField
          label="Spanish"
          value={field.labelEs}
          onChange={(e) => handleLabelEsChange(e.target.value)}
          fullWidth
          size="small"
          sx={textFieldSx}
        />
      </div>

      {/* Description (not for sections) */}
      {!isSection && (
        <div className={sty.configSection}>
          <span className={sty.sectionLabel}>Help Text</span>
          <TextField
            label="English"
            value={field.description || ''}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={textFieldSx}
          />
          <TextField
            label="Spanish"
            value={field.descriptionEs || ''}
            onChange={(e) => handleDescriptionEsChange(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={textFieldSx}
          />
        </div>
      )}

      {/* Required toggle (not for sections) */}
      {!isSection && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <FormControlLabel
            control={
              <Switch
                checked={field.required}
                onChange={(e) => handleRequiredChange(e.target.checked)}
                size="small"
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
              <span style={{ fontFamily, fontSize: 13, color: 'var(--ls-color-text-primary)' }}>
                Required
              </span>
            }
          />
        </>
      )}

      {/* Options editor (for select/radio/checkbox) */}
      {fieldDef?.hasOptions && field.options && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Options</span>
            <div className={sty.optionsList}>
              {field.options.map((option, index) => (
                <div key={index} className={sty.optionRow}>
                  <DragIndicatorIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
                  <TextField
                    value={option.label}
                    onChange={(e) => handleOptionUpdate(index, { label: e.target.value })}
                    size="small"
                    placeholder="Option label"
                    sx={{
                      flex: 1,
                      ...textFieldSx,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleOptionDelete(index)}
                    disabled={field.options!.length <= 1}
                    sx={{
                      padding: '2px',
                      '&:hover': { color: 'var(--ls-color-destructive)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </div>
              ))}
            </div>
            <Button
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 14 }} />}
              onClick={handleOptionAdd}
              sx={{
                fontFamily,
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'none',
                color: 'var(--ls-color-brand)',
                padding: '4px 8px',
                alignSelf: 'flex-start',
              }}
            >
              Add Option
            </Button>
          </div>
        </>
      )}

      {/* Range settings (for number fields) */}
      {fieldDef?.hasRange && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Range</span>
            <div className={sty.rangeRow}>
              <TextField
                label="Min"
                type="number"
                value={field.settings.min ?? ''}
                onChange={(e) => handleSettingsChange('min', e.target.value === '' ? undefined : Number(e.target.value))}
                size="small"
                sx={{ flex: 1, ...textFieldSx }}
              />
              <TextField
                label="Max"
                type="number"
                value={field.settings.max ?? ''}
                onChange={(e) => handleSettingsChange('max', e.target.value === '' ? undefined : Number(e.target.value))}
                size="small"
                sx={{ flex: 1, ...textFieldSx }}
              />
            </div>
          </div>
        </>
      )}

      {/* Textarea rows */}
      {field.type === 'textarea' && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Display</span>
            <TextField
              label="Rows"
              type="number"
              value={field.settings.rows || 3}
              onChange={(e) => handleSettingsChange('rows', Math.max(1, Math.min(10, Number(e.target.value))))}
              size="small"
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
              sx={textFieldSx}
            />
          </div>
        </>
      )}

      {/* Evaluation scoring settings */}
      {isEvaluation && !isSection && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Scoring</span>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontFamily, fontSize: 11 }}>Scoring Type</InputLabel>
              <Select
                value={field.settings.scoringType || ''}
                onChange={(e) => handleSettingsChange('scoringType', e.target.value || undefined)}
                label="Scoring Type"
                sx={{ fontFamily, fontSize: 13 }}
              >
                <MenuItem value="">
                  <em>None (not scored)</em>
                </MenuItem>
                {SCORING_TYPES.map((st) => (
                  <MenuItem key={st.value} value={st.value} sx={{ fontFamily, fontSize: 13 }}>
                    {st.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {field.settings.scoringType && (
              <TextField
                label="Weight (points)"
                type="number"
                value={field.settings.weight ?? 10}
                onChange={(e) => handleSettingsChange('weight', Math.max(0, Math.min(100, Number(e.target.value))))}
                size="small"
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                sx={textFieldSx}
              />
            )}
          </div>

          {field.settings.scoringType && (
            <>
              <Divider sx={{ margin: '8px 0' }} />
              <div className={sty.configSection}>
                <span className={sty.sectionLabel}>Data Connection</span>
                <ConnectedQuestionPicker
                  connectedTo={field.settings.connectedTo}
                  connectorParams={field.settings.connectorParams}
                  onChange={(connectedTo, params) => {
                    onUpdateField(field.id, {
                      settings: {
                        ...field.settings,
                        connectedTo,
                        connectorParams: params,
                      },
                    });
                  }}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
