import * as React from 'react';
import { Slider, Divider } from '@mui/material';
import sty from './EvaluationEditorExtension.module.css';
import { SectionManager } from './SectionManager';
import { QuestionWeightEditor } from './QuestionWeightEditor';
import type { FormTemplate } from '@/lib/forms/types';
import type { FormField } from '@/lib/forms/schema-builder';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface EvaluationSection {
  id: string;
  name: string;
  name_es?: string;
  order: number;
  is_predefined: boolean;
  max_role_level?: number;
}

interface EvaluationQuestion {
  section_id: string;
  weight: number;
  scoring_type: string;
  connected_to?: string;
  connector_params?: Record<string, any>;
}

interface EvaluationEditorExtensionProps {
  template: FormTemplate;
  fields: FormField[];
  onUpdateTemplate: (settings: Record<string, any>) => void;
}

const DEFAULT_SECTIONS: EvaluationSection[] = [
  { id: 'sec_leadership', name: 'Leadership Culture', order: 0, is_predefined: true, max_role_level: 3 },
  { id: 'sec_execution', name: 'Execution of Core Strategy', order: 1, is_predefined: true },
  { id: 'sec_win', name: "What's Important Now", order: 2, is_predefined: true },
  { id: 'sec_results', name: 'Business Results', order: 3, is_predefined: true },
];

export function EvaluationEditorExtension({
  template,
  fields,
  onUpdateTemplate,
}: EvaluationEditorExtensionProps) {
  const evalSettings = template.settings?.evaluation || {};
  const roleLevel: number = evalSettings.role_level ?? 3;
  const sections: EvaluationSection[] = evalSettings.sections?.length
    ? evalSettings.sections
    : DEFAULT_SECTIONS;
  const questions: Record<string, EvaluationQuestion> = evalSettings.questions || {};

  const handleRoleLevelChange = (_: Event, value: number | number[]) => {
    const level = Array.isArray(value) ? value[0] : value;
    onUpdateTemplate({
      ...template.settings,
      evaluation: { ...evalSettings, role_level: level },
    });
  };

  const handleSectionsChange = (updated: EvaluationSection[]) => {
    onUpdateTemplate({
      ...template.settings,
      evaluation: { ...evalSettings, sections: updated },
    });
  };

  const handleQuestionUpdate = (
    fieldId: string,
    updates: Partial<EvaluationQuestion>
  ) => {
    const current = questions[fieldId] || {
      section_id: sections[0]?.id || '',
      weight: 1,
      scoring_type: 'rating_1_5',
    };
    const updated = { ...questions, [fieldId]: { ...current, ...updates } };
    onUpdateTemplate({
      ...template.settings,
      evaluation: { ...evalSettings, questions: updated },
    });
  };

  const scorableFields = fields.filter(
    (f) => f.type !== 'section' && f.type !== 'signature' && f.type !== 'file_upload'
  );

  const totalWeight = Object.values(questions).reduce((sum, q) => sum + (q.weight || 0), 0);

  return (
    <div className={sty.panel}>
      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Evaluation Settings</h3>
        <p className={sty.sectionSubtitle}>
          Configure role level, sections, and question weights for this evaluation form.
        </p>
      </div>

      <Divider />

      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Role Level</h3>
        <p className={sty.sectionSubtitle}>
          Determines which sections apply. Higher levels include more sections.
        </p>
        <div className={sty.roleLevelRow}>
          <span className={sty.roleLevelLabel}>Level</span>
          <Slider
            value={roleLevel}
            onChange={handleRoleLevelChange}
            min={1}
            max={5}
            step={1}
            marks={[
              { value: 1, label: '1' },
              { value: 2, label: '2' },
              { value: 3, label: '3' },
              { value: 4, label: '4' },
              { value: 5, label: '5' },
            ]}
            sx={{
              flex: 1,
              maxWidth: 300,
              color: 'var(--ls-color-brand)',
              '& .MuiSlider-markLabel': { fontFamily, fontSize: 11 },
              '& .MuiSlider-thumb': {
                width: 18,
                height: 18,
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0 0 0 6px rgba(49,102,74,0.16)',
                },
              },
            }}
          />
          <span className={sty.roleLevelValue}>{roleLevel}</span>
        </div>
      </div>

      <Divider />

      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Sections</h3>
        <SectionManager
          sections={sections}
          onSectionsChange={handleSectionsChange}
          roleLevel={roleLevel}
        />
      </div>

      <Divider />

      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Question Weights</h3>
        <QuestionWeightEditor
          fields={scorableFields}
          evaluationQuestions={questions}
          sections={sections.map((s) => ({ id: s.id, name: s.name }))}
          onUpdateQuestion={handleQuestionUpdate}
        />
      </div>

      <div className={sty.weightSummary}>
        <span className={sty.weightSummaryLabel}>Total Weight</span>
        <span
          className={`${sty.weightSummaryValue} ${
            totalWeight === 100 ? sty.weightBalanced : sty.weightUnbalanced
          }`}
        >
          {totalWeight}
        </span>
      </div>
    </div>
  );
}
