import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import sty from './EditorCanvas.module.css';
import { EditorFieldCard } from './EditorFieldCard';
import type { FormField } from '@/lib/forms/schema-builder';

interface EditorCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  formType?: string;
  /** Evaluation-specific: scoring sections to group fields into */
  evaluationSections?: Array<{ id: string; name: string }>;
  /** Evaluation-specific: question config keyed by field ID */
  evaluationQuestions?: Record<string, { section_id: string; weight: number; scoring_type: string }>;
  /** Evaluation-specific: callback to update a question's section or weight */
  onUpdateEvaluationQuestion?: (fieldId: string, updates: Partial<{ section_id: string; weight: number }>) => void;
}

function SectionDropZone({ sectionId, children }: { sectionId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${sectionId}`,
    data: { type: 'section-drop', sectionId },
  });
  return (
    <div
      ref={setNodeRef}
      style={isOver ? { backgroundColor: 'var(--ls-color-brand-soft)', borderRadius: 6 } : undefined}
    >
      {children}
    </div>
  );
}

export function EditorCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onUpdateField,
  formType,
  evaluationSections,
  evaluationQuestions,
  onUpdateEvaluationQuestion,
}: EditorCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-canvas',
    data: { type: 'canvas' },
  });

  const fieldIds = React.useMemo(() => fields.map((f) => f.id), [fields]);

  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const isEvalGrouped = formType === 'evaluation' && evaluationSections && evaluationSections.length > 0;

  // Group fields by section for evaluation forms
  const { sectionGroups, unscoredFields, totalWeight } = React.useMemo(() => {
    if (!isEvalGrouped || !evaluationQuestions) {
      return { sectionGroups: [], unscoredFields: fields, totalWeight: 0 };
    }

    const groups = evaluationSections!.map((section) => {
      const sectionFields = fields.filter(
        (f) => evaluationQuestions[f.id]?.section_id === section.id
      );
      const sectionWeight = sectionFields.reduce(
        (sum, f) => sum + (evaluationQuestions[f.id]?.weight || 0),
        0
      );
      return { ...section, fields: sectionFields, totalWeight: sectionWeight };
    });

    const assignedIds = new Set(
      fields
        .filter((f) => evaluationQuestions[f.id]?.section_id)
        .map((f) => f.id)
    );
    const unscored = fields.filter((f) => !assignedIds.has(f.id));
    const total = groups.reduce((sum, g) => sum + g.totalWeight, 0);

    return { sectionGroups: groups, unscoredFields: unscored, totalWeight: total };
  }, [isEvalGrouped, evaluationSections, evaluationQuestions, fields]);

  const renderFieldCard = (field: FormField) => (
    <EditorFieldCard
      key={field.id}
      field={field}
      isSelected={selectedFieldId === field.id}
      onSelect={() => onSelectField(field.id)}
      onDelete={() => onDeleteField(field.id)}
      onUpdateField={onUpdateField}
      formType={formType}
      evaluationQuestion={evaluationQuestions?.[field.id]}
      onUpdateWeight={
        onUpdateEvaluationQuestion
          ? (weight) => onUpdateEvaluationQuestion(field.id, { weight })
          : undefined
      }
    />
  );

  return (
    <div
      ref={setNodeRef}
      className={`${sty.canvas} ${isOver ? sty.canvasOver : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectField(null);
        }
      }}
    >
      {fields.length === 0 ? (
        <div className={sty.emptyCanvas}>
          <InboxOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.4 }} />
          <span className={sty.emptyTitle}>Drop fields here</span>
          <span className={sty.emptyDescription}>
            Drag fields from the palette to build your form
          </span>
        </div>
      ) : (
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          {isEvalGrouped ? (
            <div className={sty.fieldList}>
              {sectionGroups.map((section) => {
                const isCollapsed = collapsedSections.has(section.id);
                return (
                  <div key={section.id} className={sty.sectionContainer}>
                    <div
                      className={`${sty.sectionHeader} ${isCollapsed ? sty.sectionHeaderCollapsed : ''}`}
                      onClick={() => toggleSection(section.id)}
                    >
                      {isCollapsed ? (
                        <KeyboardArrowRightIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                      ) : (
                        <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                      )}
                      <span className={sty.sectionName}>{section.name}</span>
                      <div className={sty.sectionMeta}>
                        <span className={sty.sectionFieldCount}>
                          {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
                        </span>
                        <span className={sty.sectionWeight}>
                          {section.totalWeight}pts
                        </span>
                      </div>
                    </div>
                    {!isCollapsed && (
                      <SectionDropZone sectionId={section.id}>
                        {section.fields.length === 0 ? (
                          <div className={sty.sectionFieldsEmpty}>
                            Drag fields here to score them
                          </div>
                        ) : (
                          <div className={sty.sectionFields}>
                            {section.fields.map(renderFieldCard)}
                          </div>
                        )}
                      </SectionDropZone>
                    )}
                  </div>
                );
              })}

              {/* Unscored fields */}
              {unscoredFields.length > 0 && (
                <div className={sty.unscoredArea}>
                  <span className={sty.unscoredHeader}>Unscored Fields</span>
                  <SectionDropZone sectionId="">
                    {unscoredFields.map(renderFieldCard)}
                  </SectionDropZone>
                </div>
              )}

              {/* Weight total bar */}
              <div className={sty.weightTotalBar}>
                <span
                  className={`${sty.weightTotalText} ${totalWeight === 100 ? sty.weightBalanced : sty.weightUnbalanced}`}
                >
                  Total: {totalWeight} / 100
                </span>
              </div>
            </div>
          ) : (
            <div className={sty.fieldList}>
              {fields.map((field) => (
                <EditorFieldCard
                  key={field.id}
                  field={field}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => onSelectField(field.id)}
                  onDelete={() => onDeleteField(field.id)}
                  onUpdateField={onUpdateField}
                  formType={formType}
                />
              ))}
            </div>
          )}
        </SortableContext>
      )}
    </div>
  );
}
