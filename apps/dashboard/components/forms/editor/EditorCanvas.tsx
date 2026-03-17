import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { IconButton } from '@mui/material';
import sty from './EditorCanvas.module.css';
import { EditorFieldCard } from './EditorFieldCard';
import type { FormField } from '@/lib/forms/schema-builder';

/**
 * Droppable zone inside a section — detects when a field is dragged INTO a section.
 * Does NOT wrap its own SortableContext (that's the critical constraint).
 */
function DroppableSectionBody({
  sectionId,
  children,
}: {
  sectionId: string;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${sectionId}`,
    data: { type: 'section', sectionId },
  });

  return (
    <div
      ref={setNodeRef}
      className={sty.sectionBody}
      style={{
        background: isOver ? 'var(--ls-color-brand-soft)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Sortable wrapper for section containers — makes sections draggable/reorderable.
 */
function SortableSectionContainer({
  field,
  isCollapsed,
  onToggle,
  onSelectField,
  onDeleteField,
  stats,
  children,
}: {
  field: FormField;
  isCollapsed: boolean;
  onToggle: () => void;
  onSelectField: (id: string) => void;
  onDeleteField: (id: string) => void;
  stats: { fieldCount: number; totalWeight: number };
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: { type: 'canvas-field', fieldId: field.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={sty.sectionContainer}>
      <div
        className={`${sty.sectionHeader} ${isCollapsed ? sty.sectionHeaderCollapsed : ''}`}
        onClick={() => {
          onToggle();
          onSelectField(field.id);
        }}
      >
        <div className={sty.sectionDragHandle} {...listeners} {...attributes}>
          <DragIndicatorIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
        </div>
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
      {!isCollapsed && children}
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

  // Build child-to-section mapping
  const childFieldIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const field of fields) {
      if (field.type === 'section') {
        for (const childId of field.children || []) {
          set.add(childId);
        }
      }
    }
    return set;
  }, [fields]);

  // Top-level sortable IDs: sections + fields NOT inside any section.
  // Section children get their own SortableContext inside each section body.
  const topLevelIds = React.useMemo(
    () => fields.filter((f) => !childFieldIds.has(f.id)).map((f) => f.id),
    [fields, childFieldIds]
  );

  // Section stats
  const sectionStats = React.useMemo(() => {
    const stats = new Map<string, { fieldCount: number; totalWeight: number }>();
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    for (const field of fields) {
      if (field.type !== 'section') continue;
      let fieldCount = 0;
      let totalWeight = 0;
      for (const childId of field.children || []) {
        const child = fieldMap.get(childId);
        if (child) {
          fieldCount++;
          if (child.settings.scored && child.settings.weight) {
            totalWeight += child.settings.weight;
          }
        }
      }
      stats.set(field.id, { fieldCount, totalWeight });
    }
    return stats;
  }, [fields]);

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
        <SortableContext items={topLevelIds} strategy={verticalListSortingStrategy}>
          <div className={sty.fieldList}>
            {fields.map((field) => {
              // Section: render as a container with header + children inside
              if (field.type === 'section') {
                const childIds = field.children || [];
                const childFields = childIds
                  .map((id) => fields.find((f) => f.id === id))
                  .filter(Boolean) as FormField[];
                const stats = sectionStats.get(field.id) || { fieldCount: 0, totalWeight: 0 };
                const isCollapsed = collapsedSections.has(field.id);

                return (
                  <SortableSectionContainer
                    key={`section-${field.id}`}
                    field={field}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleSection(field.id)}
                    onSelectField={onSelectField}
                    onDeleteField={onDeleteField}
                    stats={stats}
                  >
                    <DroppableSectionBody sectionId={field.id}>
                      <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
                        {childFields.length === 0 ? (
                          <span className={sty.sectionFieldsEmptyText}>Drag fields here</span>
                        ) : (
                          childFields.map((f) => renderFieldCard(f))
                        )}
                      </SortableContext>
                    </DroppableSectionBody>
                  </SortableSectionContainer>
                );
              }

              // Skip fields that belong to a section — rendered inside their section above
              if (childFieldIds.has(field.id)) return null;

              // Top-level field
              return renderFieldCard(field);
            })}

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
