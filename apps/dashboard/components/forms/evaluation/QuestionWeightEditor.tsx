import * as React from 'react';
import {
  Chip,
  FormControl,
  MenuItem,
} from '@mui/material';
import { ConnectedQuestionPicker } from './ConnectedQuestionPicker';
import { StyledTextField, StyledSelect, fontFamily } from '../dialogStyles';
import type { FormField } from '@/lib/forms/schema-builder';

interface EvaluationQuestion {
  section_id: string;
  weight: number;
  scoring_type: string;
  connected_to?: string;
  connector_params?: Record<string, any>;
}

interface QuestionWeightEditorProps {
  fields: FormField[];
  evaluationQuestions: Record<string, EvaluationQuestion>;
  sections: Array<{ id: string; name: string }>;
  onUpdateQuestion: (
    fieldId: string,
    updates: Partial<{
      section_id: string;
      weight: number;
      scoring_type: string;
      connected_to: string;
      connector_params: Record<string, any>;
    }>
  ) => void;
}

const SCORING_TYPES: Record<string, { label: string; color: string }> = {
  rating_1_3: { label: '1–3', color: 'var(--ls-color-brand)' },
  rating_1_5: { label: '1–5', color: 'var(--ls-color-brand)' },
  true_false: { label: 'T/F', color: '#6366F1' },
  percentage: { label: '%', color: '#D97706' },
};

export function QuestionWeightEditor({
  fields,
  evaluationQuestions,
  sections,
  onUpdateQuestion,
}: QuestionWeightEditorProps) {
  const fieldsBySectionId = React.useMemo(() => {
    const grouped: Record<string, FormField[]> = {};
    for (const field of fields) {
      const q = evaluationQuestions[field.id];
      const sectionId = q?.section_id || '__unassigned__';
      if (!grouped[sectionId]) grouped[sectionId] = [];
      grouped[sectionId].push(field);
    }
    return grouped;
  }, [fields, evaluationQuestions]);

  const sectionLookup = React.useMemo(() => {
    const map: Record<string, string> = { __unassigned__: 'Unassigned' };
    for (const s of sections) map[s.id] = s.name;
    return map;
  }, [sections]);

  const orderedSectionIds = [
    ...sections.map((s) => s.id),
    ...(fieldsBySectionId['__unassigned__'] ? ['__unassigned__'] : []),
  ];

  const totalWeight = Object.values(evaluationQuestions).reduce(
    (sum, q) => sum + (q.weight || 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {orderedSectionIds.map((sectionId) => {
        const sectionFields = fieldsBySectionId[sectionId];
        if (!sectionFields?.length) return null;

        return (
          <div key={sectionId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ls-color-muted)',
                textTransform: 'uppercase' as const,
                letterSpacing: 0.5,
              }}
            >
              {sectionLookup[sectionId] || sectionId}
            </span>

            {sectionFields.map((field) => {
              const q = evaluationQuestions[field.id];
              const scoringType = q?.scoring_type || field.settings.scoringType || 'rating_1_5';
              const weight = q?.weight ?? field.settings.weight ?? 1;
              const scoringConfig = SCORING_TYPES[scoringType] || SCORING_TYPES.rating_1_5;

              return (
                <div
                  key={field.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--ls-color-muted-border)',
                    background: '#fff',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontFamily,
                      fontSize: 13,
                      color: 'var(--ls-color-neutral-soft-foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {field.label}
                  </span>

                  <Chip
                    label={scoringConfig.label}
                    size="small"
                    sx={{
                      fontFamily,
                      fontSize: 10,
                      fontWeight: 700,
                      height: 22,
                      minWidth: 36,
                      borderRadius: '4px',
                      backgroundColor: scoringConfig.color,
                      color: '#fff',
                      '& .MuiChip-label': { padding: '0 6px' },
                    }}
                  />

                  <StyledTextField
                    type="number"
                    value={weight}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      onUpdateQuestion(field.id, { weight: val });
                    }}
                    size="small"
                    slotProps={{ htmlInput: { min: 0, max: 100 } }}
                    sx={{ width: 64 }}
                  />

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <StyledSelect
                      value={q?.section_id || ''}
                      onChange={(e) =>
                        onUpdateQuestion(field.id, { section_id: e.target.value as string })
                      }
                      displayEmpty
                    >
                      <MenuItem value="" disabled sx={{ fontFamily, fontSize: 12 }}>
                        Section...
                      </MenuItem>
                      {sections.map((s) => (
                        <MenuItem key={s.id} value={s.id} sx={{ fontFamily, fontSize: 12 }}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </StyledSelect>
                  </FormControl>

                  <ConnectedQuestionPicker
                    connectedTo={q?.connected_to}
                    connectorParams={q?.connector_params}
                    onChange={(connectedTo, params) =>
                      onUpdateQuestion(field.id, {
                        connected_to: connectedTo as string,
                        connector_params: params as Record<string, any>,
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '8px 0',
          borderTop: '1px solid var(--ls-color-muted-border)',
        }}
      >
        <span
          style={{
            fontFamily,
            fontSize: 13,
            fontWeight: 600,
            color: totalWeight === 100 ? 'var(--ls-color-success)' : 'var(--ls-color-warning)',
          }}
        >
          Total: {totalWeight} / 100
        </span>
      </div>
    </div>
  );
}
