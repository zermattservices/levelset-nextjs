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

  // Build section lookup and stats
  const sectionStats = React.useMemo(() => {
    if (!isEvalGrouped || !evaluationQuestions) return new Map<string, { fieldCount: number; totalWeight: number }>();
    const stats = new Map<string, { fieldCount: number; totalWeight: number }>();
    for (const section of evaluationSections!) {
      const sectionFields = fields.filter((f) => evaluationQuestions[f.id]?.section_id === section.id);
      stats.set(section.id, {
        fieldCount: sectionFields.length,
        totalWeight: sectionFields.reduce((sum, f) => sum + (evaluationQuestions[f.id]?.weight || 0), 0),
      });
    }
    return stats;
  }, [isEvalGrouped, evaluationSections, evaluationQuestions, fields]);

  const totalWeight = React.useMemo(() => {
    let sum = 0;
    sectionStats.forEach((s) => { sum += s.totalWeight; });
    return sum;
  }, [sectionStats]);

  // Build the field-to-section mapping
  const fieldSectionMap = React.useMemo(() => {
    if (!isEvalGrouped || !evaluationQuestions) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const f of fields) {
      const sid = evaluationQuestions[f.id]?.section_id;
      if (sid) map.set(f.id, sid);
    }
    return map;
  }, [isEvalGrouped, evaluationQuestions, fields]);

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

  // For eval forms: build render items in order — sections appear before their first field,
  // unscored fields render directly in the list
  const evalRenderItems = React.useMemo(() => {
    if (!isEvalGrouped) return null;

    const items: Array<
      | { type: 'section-header'; sectionId: string; name: string; stats: { fieldCount: number; totalWeight: number } }
      | { type: 'section-fields'; sectionId: string; fields: FormField[] }
      | { type: 'field'; field: FormField }
    > = [];

    // Track which sections we've already opened
    const renderedSections = new Set<string>();

    // Group consecutive fields by section
    let currentSectionId: string | null = null;
    let currentSectionFields: FormField[] = [];

    const flushSection = () => {
      if (currentSectionId && currentSectionFields.length > 0) {
        items.push({ type: 'section-fields', sectionId: currentSectionId, fields: currentSectionFields });
        currentSectionFields = [];
      }
      currentSectionId = null;
    };

    for (const field of fields) {
      const sid = fieldSectionMap.get(field.id);

      if (sid) {
        // Field belongs to a section
        if (sid !== currentSectionId) {
          // Flush previous section's fields if any
          flushSection();

          // Emit section header if not already rendered
          if (!renderedSections.has(sid)) {
            const section = evaluationSections!.find((s) => s.id === sid);
            if (section) {
              renderedSections.add(sid);
              items.push({
                type: 'section-header',
                sectionId: sid,
                name: section.name,
                stats: sectionStats.get(sid) || { fieldCount: 0, totalWeight: 0 },
              });
            }
          }
          currentSectionId = sid;
        }
        currentSectionFields.push(field);
      } else {
        // Unscored field — flush any open section, then render inline
        flushSection();
        items.push({ type: 'field', field });
      }
    }
    // Flush remaining
    flushSection();

    // Render any sections that had no fields yet (empty sections)
    for (const section of evaluationSections!) {
      if (!renderedSections.has(section.id)) {
        items.push({
          type: 'section-header',
          sectionId: section.id,
          name: section.name,
          stats: sectionStats.get(section.id) || { fieldCount: 0, totalWeight: 0 },
        });
      }
    }

    return items;
  }, [isEvalGrouped, fields, fieldSectionMap, evaluationSections, sectionStats]);

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
          {isEvalGrouped && evalRenderItems ? (
            <div className={sty.fieldList}>
              {evalRenderItems.map((item) => {
                if (item.type === 'section-header') {
                  const isCollapsed = collapsedSections.has(item.sectionId);
                  return (
                    <div key={`sh-${item.sectionId}`} className={sty.sectionContainer}>
                      <div
                        className={`${sty.sectionHeader} ${isCollapsed ? sty.sectionHeaderCollapsed : ''}`}
                        onClick={() => toggleSection(item.sectionId)}
                      >
                        {isCollapsed ? (
                          <KeyboardArrowRightIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                        )}
                        <span className={sty.sectionName}>{item.name}</span>
                        <div className={sty.sectionMeta}>
                          <span className={sty.sectionFieldCount}>
                            {item.stats.fieldCount} field{item.stats.fieldCount !== 1 ? 's' : ''}
                          </span>
                          <span className={sty.sectionWeight}>
                            {item.stats.totalWeight}pts
                          </span>
                        </div>
                      </div>
                      {!isCollapsed && item.stats.fieldCount === 0 && (
                        <div className={sty.sectionFieldsEmpty}>
                          Drag fields here to score them
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.type === 'section-fields') {
                  const isCollapsed = collapsedSections.has(item.sectionId);
                  if (isCollapsed) return null;
                  return (
                    <div key={`sf-${item.sectionId}`} className={sty.sectionFieldsInline}>
                      {item.fields.map(renderFieldCard)}
                    </div>
                  );
                }

                // Unscored field
                return renderFieldCard(item.field);
              })}

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
