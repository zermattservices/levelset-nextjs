import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { IconButton } from '@mui/material';
import sty from './EditorCanvas.module.css';
import { EditorFieldCard } from './EditorFieldCard';
import type { FormField } from '@/lib/forms/schema-builder';

/** Registers the section body (not header) as a droppable target. */
function DroppableSectionBody({ sectionId, isEmpty, fieldIds, children }: { sectionId: string; isEmpty: boolean; fieldIds: string[]; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${sectionId}`,
    data: { type: 'section', sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={sty.sectionBody}
      style={{
        background: isOver ? 'var(--ls-color-brand-soft)' : 'transparent',
        minHeight: isEmpty ? 48 : undefined,
      }}
    >
      <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {isEmpty && !isOver && (
        <span className={sty.sectionFieldsEmptyText}>Drag fields here</span>
      )}
    </div>
  );
}

/** Thin droppable zone between section cards — dropping here removes section assignment. */
function SectionGapDropzone({ gapId, afterSectionId }: { gapId: string; afterSectionId?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: gapId,
    data: { type: 'section-gap', afterSectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${sty.sectionGap} ${isOver ? sty.sectionGapOver : ''}`}
    >
      {isOver && (
        <span className={sty.sectionGapLabel}>Drop between sections</span>
      )}
    </div>
  );
}

interface EditorCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  formType?: string;
}

export function EditorCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onUpdateField,
  formType,
}: EditorCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-canvas',
    data: { type: 'canvas' },
  });

  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Identify sections and build structure from the fields array
  const sectionFields = React.useMemo(
    () => fields.filter((f) => f.type === 'section'),
    [fields]
  );

  const hasSections = sectionFields.length > 0;

  // Build a set of all field IDs that are children of a section
  const childFieldIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const section of sectionFields) {
      for (const childId of section.children || []) {
        set.add(childId);
      }
    }
    return set;
  }, [sectionFields]);

  // Build fieldIds in visual order for SortableContext
  const fieldIds = React.useMemo(() => {
    if (!hasSections) return fields.map((f) => f.id);

    const ordered: string[] = [];
    for (const field of fields) {
      if (field.type === 'section') {
        for (const childId of field.children || []) {
          ordered.push(childId);
        }
      } else if (!childFieldIds.has(field.id)) {
        ordered.push(field.id);
      }
    }
    return ordered;
  }, [fields, hasSections, childFieldIds]);

  // Section stats: field count and total weight from scored children
  const sectionStats = React.useMemo(() => {
    const stats = new Map<string, { fieldCount: number; totalWeight: number }>();
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    for (const section of sectionFields) {
      let fieldCount = 0;
      let totalWeight = 0;
      for (const childId of section.children || []) {
        const child = fieldMap.get(childId);
        if (child) {
          fieldCount++;
          if (child.settings.scored && child.settings.weight) {
            totalWeight += child.settings.weight;
          }
        }
      }
      stats.set(section.id, { fieldCount, totalWeight });
    }
    return stats;
  }, [fields, sectionFields]);

  // Total weight across ALL scored fields (in sections + top-level)
  const totalWeight = React.useMemo(() => {
    return fields
      .filter((f) => f.settings.scored && f.settings.weight)
      .reduce((sum, f) => sum + (f.settings.weight || 0), 0);
  }, [fields]);

  const hasScoredFields = totalWeight > 0;

  const renderFieldCard = (field: FormField) => (
    <EditorFieldCard
      key={field.id}
      field={field}
      isSelected={selectedFieldId === field.id}
      onSelect={() => onSelectField(field.id)}
      onDelete={() => onDeleteField(field.id)}
      onUpdateField={onUpdateField}
      formType={formType}
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
          <div className={sty.fieldList}>
            {fields.map((field) => {
              if (field.type === 'section') {
                const childFields = (field.children || [])
                  .map((id) => fields.find((f) => f.id === id))
                  .filter(Boolean) as FormField[];
                const stats = sectionStats.get(field.id) || { fieldCount: 0, totalWeight: 0 };
                const isCollapsed = collapsedSections.has(field.id);

                return (
                  <React.Fragment key={`section-${field.id}`}>
                    <div className={sty.sectionContainer}>
                      <div
                        className={`${sty.sectionHeader} ${isCollapsed ? sty.sectionHeaderCollapsed : ''}`}
                        onClick={() => {
                          toggleSection(field.id);
                          onSelectField(field.id);
                        }}
                      >
                        {isCollapsed ? (
                          <KeyboardArrowRightIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                        )}
                        <span className={sty.sectionName}>
                          {field.settings.sectionName || field.label}
                        </span>
                        <div className={sty.sectionMeta}>
                          <span className={sty.sectionFieldCount}>
                            {stats.fieldCount} field{stats.fieldCount !== 1 ? 's' : ''}
                          </span>
                          {stats.totalWeight > 0 && (
                            <span className={sty.sectionWeight}>
                              {stats.totalWeight}pts
                            </span>
                          )}
                        </div>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteField(field.id);
                          }}
                          sx={{
                            padding: '2px',
                            opacity: 0.4,
                            '&:hover': { opacity: 1, color: 'var(--ls-color-destructive)' },
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </div>
                      {!isCollapsed && (
                        <DroppableSectionBody
                          sectionId={field.id}
                          isEmpty={childFields.length === 0}
                          fieldIds={childFields.map((f) => f.id)}
                        >
                          {childFields.map((f) => renderFieldCard(f))}
                        </DroppableSectionBody>
                      )}
                    </div>
                    <SectionGapDropzone
                      key={`gap-after-${field.id}`}
                      gapId={`section-gap-after-${field.id}`}
                      afterSectionId={field.id}
                    />
                  </React.Fragment>
                );
              }

              // Skip fields that are children of a section (rendered inside their section above)
              if (childFieldIds.has(field.id)) return null;

              // Top-level field
              return renderFieldCard(field);
            })}

            {/* Weight total bar — only show when there are scored fields */}
            {hasScoredFields && (
              <div className={sty.weightTotalBar}>
                <span className={sty.weightTotalText}>
                  Total: {totalWeight} pts
                </span>
              </div>
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
