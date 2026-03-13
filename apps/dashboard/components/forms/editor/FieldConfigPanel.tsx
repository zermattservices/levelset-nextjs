import * as React from 'react';
import {
  Switch,
  FormControlLabel,
  IconButton,
  Button,
  Divider,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import sty from './FieldConfigPanel.module.css';
import { StyledTextField, StyledSelect, fontFamily, inputLabelSx, menuItemSx } from '../dialogStyles';
import { FIELD_TYPES, DATA_SOURCE_OPTIONS } from '@/lib/forms/field-palette';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import type { FormField, FieldOption } from '@/lib/forms/schema-builder';
import { ConnectedQuestionPicker } from '../evaluation/ConnectedQuestionPicker';

interface FieldConfigPanelProps {
  field: FormField | null;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  isEvaluation?: boolean;
  formType?: string;
  /** Available evaluation sections for section assignment dropdown */
  evaluationSections?: Array<{ id: string; name: string }>;
  /** Current evaluation question config for the selected field */
  evaluationQuestion?: { section_id: string; weight: number; scoring_type: string };
  /** Callback to assign field to a section */
  onAssignSection?: (fieldId: string, sectionId: string) => void;
}

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
  formType,
  evaluationSections,
  evaluationQuestion,
  onAssignSection,
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
  const isTextBlock = field.type === 'text_block';

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
        <StyledTextField
          label="English"
          value={field.label}
          onChange={(e) => handleLabelChange(e.target.value)}
          fullWidth
          size="small"
        />
        <StyledTextField
          label="Spanish"
          value={field.labelEs}
          onChange={(e) => handleLabelEsChange(e.target.value)}
          fullWidth
          size="small"
        />
      </div>

      {/* Text Block Spanish Content */}
      {isTextBlock && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Spanish Content</span>
            <StyledTextField
              label="Spanish Text (HTML)"
              value={field.settings.contentEs || ''}
              onChange={(e) => handleSettingsChange('contentEs', e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={4}
              InputLabelProps={{ shrink: true }}
              helperText="HTML content for Spanish version"
            />
          </div>
        </>
      )}

      {/* Description (not for sections) */}
      {!isSection && (
        <div className={sty.configSection}>
          <span className={sty.sectionLabel}>Help Text</span>
          <StyledTextField
            label="English"
            value={field.description || ''}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            InputLabelProps={{ shrink: true }}
          />
          <StyledTextField
            label="Spanish"
            value={field.descriptionEs || ''}
            onChange={(e) => handleDescriptionEsChange(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            InputLabelProps={{ shrink: true }}
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

      {/* Data Source selector (for select fields) */}
      {fieldDef?.hasDataSource && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Data Source</span>
            <FormControl fullWidth size="small">
              <InputLabel sx={inputLabelSx}>Source</InputLabel>
              <StyledSelect
                value={field.settings.dataSource || 'custom'}
                onChange={(e) => {
                  const newSource = e.target.value as string;
                  const updates: Partial<FormField> = {
                    settings: {
                      ...field.settings,
                      dataSource: newSource as any,
                    },
                  };
                  // Clear options when switching to predefined source
                  if (newSource !== 'custom') {
                    updates.options = undefined;
                  } else if (!field.options || field.options.length === 0) {
                    updates.options = [
                      { value: 'option_1', label: 'Option 1' },
                      { value: 'option_2', label: 'Option 2' },
                    ];
                  }
                  onUpdateField(field.id, updates);
                }}
                label="Source"
              >
                {DATA_SOURCE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
                    {opt.label}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            {/* Data source info card */}
            {field.settings.dataSource && field.settings.dataSource !== 'custom' && (() => {
              const sourceInfo = DATA_SOURCE_OPTIONS.find(o => o.value === field.settings.dataSource);
              if (!sourceInfo) return null;
              return (
                <div className={sty.dataSourceInfoCard}>
                  <InfoOutlinedIcon sx={{ fontSize: 14, color: 'var(--ls-color-brand)', flexShrink: 0, mt: '1px' }} />
                  <div className={sty.dataSourceInfoContent}>
                    <span className={sty.dataSourceInfoText}>{sourceInfo.description}</span>
                    {sourceInfo.configLink && (
                      <a href={sourceInfo.configLink} target="_blank" rel="noopener noreferrer" className={sty.dataSourceConfigLink}>
                        {sourceInfo.configLinkLabel}
                        <OpenInNewOutlinedIcon sx={{ fontSize: 12, ml: '2px' }} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Leader hierarchy filter */}
            {field.settings.dataSource === 'leaders' && (
              <StyledTextField
                label="Max Hierarchy Level"
                type="number"
                value={field.settings.maxHierarchyLevel ?? 2}
                onChange={(e) => handleSettingsChange('maxHierarchyLevel', Math.max(0, Math.min(10, Number(e.target.value))))}
                size="small"
                slotProps={{ htmlInput: { min: 0, max: 10 } }}
                helperText="Include roles at this hierarchy level and above (0 = top level)"
              />
            )}
          </div>
        </>
      )}

      {/* Options editor (for select/radio/checkbox) */}
      {fieldDef?.hasOptions && field.options && (!field.settings.dataSource || field.settings.dataSource === 'custom') && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Options</span>
            <div className={sty.optionsList}>
              {field.options.map((option, index) => (
                <div key={index} className={sty.optionRow}>
                  <DragIndicatorIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
                  <StyledTextField
                    value={option.label}
                    onChange={(e) => handleOptionUpdate(index, { label: e.target.value })}
                    size="small"
                    placeholder="Option label"
                    sx={{ flex: 1 }}
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
              <StyledTextField
                label="Min"
                type="number"
                value={field.settings.min ?? ''}
                onChange={(e) => handleSettingsChange('min', e.target.value === '' ? undefined : Number(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
              />
              <StyledTextField
                label="Max"
                type="number"
                value={field.settings.max ?? ''}
                onChange={(e) => handleSettingsChange('max', e.target.value === '' ? undefined : Number(e.target.value))}
                size="small"
                sx={{ flex: 1 }}
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
            <StyledTextField
              label="Rows"
              type="number"
              value={field.settings.rows || 3}
              onChange={(e) => handleSettingsChange('rows', Math.max(1, Math.min(10, Number(e.target.value))))}
              size="small"
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
            />
          </div>
        </>
      )}

      {/* Evaluation section assignment */}
      {isEvaluation && !isSection && evaluationSections && evaluationSections.length > 0 && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Section</span>
            <FormControl fullWidth size="small">
              <InputLabel sx={inputLabelSx}>Section</InputLabel>
              <StyledSelect
                value={evaluationQuestion?.section_id || ''}
                onChange={(e) => onAssignSection?.(field.id, e.target.value as string)}
                label="Section"
              >
                <MenuItem value="" sx={{ fontFamily, fontSize: 13 }}>
                  <em>Unscored</em>
                </MenuItem>
                {evaluationSections.map((s) => (
                  <MenuItem key={s.id} value={s.id} sx={{ fontFamily, fontSize: 13 }}>
                    {s.name}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>
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
              <InputLabel sx={inputLabelSx}>Scoring Type</InputLabel>
              <StyledSelect
                value={field.settings.scoringType || ''}
                onChange={(e) => handleSettingsChange('scoringType', e.target.value || undefined)}
                label="Scoring Type"
              >
                <MenuItem value="">
                  <em>None (not scored)</em>
                </MenuItem>
                {SCORING_TYPES.map((st) => (
                  <MenuItem key={st.value} value={st.value} sx={{ fontFamily, fontSize: 13 }}>
                    {st.label}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            {field.settings.scoringType && (
              <StyledTextField
                label="Weight (points)"
                type="number"
                value={field.settings.weight ?? 10}
                onChange={(e) => handleSettingsChange('weight', Math.max(0, Math.min(100, Number(e.target.value))))}
                size="small"
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
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
