import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Chip } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Alert } from '@mui/material';
import sty from './FormEditorPanel.module.css';
import { FieldPalette } from './FieldPalette';
import { EditorCanvas } from './EditorCanvas';
import { EditorFieldCard } from './EditorFieldCard';
import { FieldConfigPanel } from './FieldConfigPanel';
import {
  createFieldFromType,
  fieldsToJsonSchema,
  jsonSchemaToFields,
  migrateEvaluationToFields,
  type FormField,
} from '@/lib/forms/schema-builder';
import type { FormTemplate } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface FormEditorPanelProps {
  template: FormTemplate;
  onSave: (schema: Record<string, any>, uiSchema: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
}

export function FormEditorPanel({ template, onSave, readOnly }: FormEditorPanelProps) {
  const [fields, setFields] = React.useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [draggedField, setDraggedField] = React.useState<FormField | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('saved');
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const fieldsInitialized = React.useRef(false);

  // Collision detection: context-aware based on pointer position.
  // When pointer is inside a section body → match section children or the section body droppable.
  // When pointer is outside all section bodies → match only top-level items (sections + ungrouped fields).
  const collisionDetection = React.useMemo<CollisionDetection>(() => {
    // Build child-to-section lookup from current fields
    const childToSection = new Map<string, string>();
    for (const f of fields) {
      if (f.type === 'section') {
        for (const childId of f.children || []) {
          childToSection.set(childId, f.id);
        }
      }
    }

    return (args) => {
      // 1. Check if pointer is physically inside any section body
      const sectionBodies = args.droppableContainers.filter((c) =>
        String(c.id).startsWith('section-drop-')
      );
      const sectionHits = sectionBodies.length > 0
        ? pointerWithin({ ...args, droppableContainers: sectionBodies })
        : [];

      if (sectionHits.length > 0) {
        // Pointer is inside a section body — try to match children for within-section reorder
        const sectionDropId = String(sectionHits[0].id);
        const sectionId = sectionDropId.replace('section-drop-', '');

        const sectionChildContainers = args.droppableContainers.filter((c) =>
          childToSection.get(String(c.id)) === sectionId
        );

        if (sectionChildContainers.length > 0) {
          const childHits = closestCenter({ ...args, droppableContainers: sectionChildContainers });
          if (childHits.length > 0) {
            return childHits;
          }
        }

        // No close child — return section body droppable (triggers insert-into-section)
        return [sectionHits[0]];
      }

      // 2. Pointer is outside all section bodies — match top-level items only
      const topLevelContainers = args.droppableContainers.filter((c) => {
        const id = String(c.id);
        return !id.startsWith('section-drop-') && !childToSection.has(id);
      });

      if (topLevelContainers.length > 0) {
        const topHits = closestCenter({ ...args, droppableContainers: topLevelContainers });
        if (topHits.length > 0 && topHits[0].id !== 'editor-canvas') {
          return topHits;
        }
        // Canvas-only match — still return it
        if (topHits.length > 0) {
          return topHits;
        }
      }

      // 3. Fallback
      return closestCenter(args);
    };
  }, [fields]);

  // Initialize fields from template schema
  React.useEffect(() => {
    if (fieldsInitialized.current) return;

    if (template.schema && Object.keys(template.schema).length > 0) {
      let restored = jsonSchemaToFields(template.schema, template.ui_schema || {});

      // Migrate legacy evaluation forms: reconstruct sections and scoring
      // from template.settings.evaluation into the fields array
      if (template.settings?.evaluation) {
        restored = migrateEvaluationToFields(restored, template.settings.evaluation);
      }

      setFields(restored);
    }
    fieldsInitialized.current = true;
  }, [template]);

  // Auto-save with 1s debounce (disabled in readOnly mode)
  const triggerAutoSave = React.useCallback(
    (updatedFields: FormField[]) => {
      if (readOnly) return;

      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          const { schema, uiSchema } = fieldsToJsonSchema(updatedFields);
          await onSave(schema, uiSchema);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('unsaved');
        }
      }, 1000);
    },
    [onSave, readOnly]
  );

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Field updates
  const updateFields = React.useCallback(
    (updater: (prev: FormField[]) => FormField[]) => {
      setFields((prev) => {
        const next = updater(prev);
        triggerAutoSave(next);
        return next;
      });
    },
    [triggerAutoSave]
  );

  const handleDeleteField = React.useCallback(
    (id: string) => {
      if (selectedFieldId === id) {
        setSelectedFieldId(null);
      }
      updateFields((prev) => {
        // Remove the field
        const filtered = prev.filter((f) => f.id !== id);
        // Clean up any section children references to this field
        return filtered.map((f) => {
          if (f.type === 'section' && f.children?.includes(id)) {
            return { ...f, children: f.children.filter((childId) => childId !== id) };
          }
          return f;
        });
      });
    },
    [selectedFieldId, updateFields]
  );

  const handleUpdateField = React.useCallback(
    (id: string, updates: Partial<FormField>) => {
      updateFields((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    [updateFields]
  );

  // Snapshot of fields before a drag starts — restored on cancel
  const fieldsBeforeDragRef = React.useRef<FormField[] | null>(null);
  // Ref for fast container-change detection in onDragOver (avoids stale closure)
  const fieldsRef = React.useRef(fields);
  fieldsRef.current = fields;

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    fieldsBeforeDragRef.current = fields;
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'palette') {
      const newField = createFieldFromType(data.fieldType);
      setDraggedField(newField);
    } else if (data?.type === 'canvas-field') {
      const field = fields.find((f) => f.id === active.id);
      if (field) setDraggedField(field);
    }
  };

  /**
   * onDragOver: moves items between SortableContexts in real-time so that
   * sort transforms are calculated correctly within each container.
   * Only fires state updates when the item crosses a container boundary.
   */
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    if (activeData?.type !== 'canvas-field') return;

    const fieldId = active.id as string;
    const overData = over.data.current;
    const overId = over.id as string;

    // Use ref for fast check before committing a state update
    const current = fieldsRef.current;

    // Don't move sections into other sections
    const draggedF = current.find((f) => f.id === fieldId);
    if (draggedF?.type === 'section') return;

    // Determine which section the active item is currently in
    const activeSection = current.find(
      (f) => f.type === 'section' && f.children?.includes(fieldId)
    );
    const activeSectionId = activeSection?.id || null;

    // Determine which section the over target belongs to
    let overSectionId: string | null = null;
    if (overData?.type === 'section') {
      // Over a section body droppable
      overSectionId = overData.sectionId as string;
    } else if (overId !== 'editor-canvas') {
      // Over a field — check if it's inside a section
      const overSection = current.find(
        (f) => f.type === 'section' && f.children?.includes(overId)
      );
      overSectionId = overSection?.id || null;
    }

    // No container change — SortableContext handles within-container transforms
    if (activeSectionId === overSectionId) return;

    // Container change: move item between containers via setFields (no auto-save)
    setFields((prev) => {
      // Remove from source section
      let updated = activeSectionId
        ? prev.map((f) =>
            f.id === activeSectionId && f.children?.includes(fieldId)
              ? { ...f, children: f.children.filter((id) => id !== fieldId) }
              : f
          )
        : prev;

      // Add to target section
      if (overSectionId) {
        updated = updated.map((f) => {
          if (f.id === overSectionId && !f.children?.includes(fieldId)) {
            const children = [...(f.children || [])];
            // Insert near the over item if it's a child of this section
            const overIdx = children.indexOf(overId);
            if (overIdx >= 0) {
              children.splice(overIdx, 0, fieldId);
            } else {
              children.push(fieldId);
            }
            return { ...f, children };
          }
          return f;
        });
      }

      return updated;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    fieldsBeforeDragRef.current = null;
    setDraggedField(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // ── Palette drops (unchanged) ──────────────────────────────
    if (activeData?.type === 'palette') {
      const newField = createFieldFromType(activeData.fieldType);

      if (overData?.type === 'section') {
        const targetSectionId = overData.sectionId as string;
        updateFields((prev) => {
          const next = [...prev, newField];
          return next.map((f) =>
            f.id === targetSectionId
              ? { ...f, children: [...(f.children || []), newField.id] }
              : f
          );
        });
      } else if (over.id !== 'editor-canvas') {
        updateFields((prev) => {
          const overIndex = prev.findIndex((f) => f.id === over.id);
          if (overIndex >= 0) {
            const next = [...prev];
            next.splice(overIndex + 1, 0, newField);
            return next;
          }
          return [...prev, newField];
        });
      } else {
        updateFields((prev) => [...prev, newField]);
      }

      setSelectedFieldId(newField.id);
      return;
    }

    if (activeData?.type !== 'canvas-field') return;

    const fieldId = active.id as string;
    const overId = over.id as string;

    // ── Dropped on section body or canvas — onDragOver already handled the transfer ──
    if (overData?.type === 'section' || overId === 'editor-canvas') {
      // Just trigger a save of the current state
      updateFields((prev) => prev);
      return;
    }

    // ── Dropped on same item (no reorder needed but container may have changed) ──
    if (fieldId === overId) {
      updateFields((prev) => prev);
      return;
    }

    // ── Section reordering (top-level only, no nesting) ──
    const draggedF = fields.find((f) => f.id === fieldId);
    if (draggedF?.type === 'section') {
      updateFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === fieldId);
        const newIndex = prev.findIndex((f) => f.id === overId);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    // ── Field reordering (within-container — onDragOver already placed it in the right container) ──
    updateFields((prev) => {
      // Within-section reorder
      const parentSection = prev.find(
        (f) => f.type === 'section' && f.children?.includes(fieldId) && f.children?.includes(overId)
      );

      if (parentSection && parentSection.children) {
        const oldIdx = parentSection.children.indexOf(fieldId);
        const newIdx = parentSection.children.indexOf(overId);
        if (oldIdx >= 0 && newIdx >= 0) {
          return prev.map((f) =>
            f.id === parentSection.id
              ? { ...f, children: arrayMove(parentSection.children!, oldIdx, newIdx) }
              : f
          );
        }
      }

      // Top-level reorder
      const oldIndex = prev.findIndex((f) => f.id === fieldId);
      const newIndex = prev.findIndex((f) => f.id === overId);
      if (oldIndex >= 0 && newIndex >= 0) {
        return arrayMove(prev, oldIndex, newIndex);
      }

      return prev;
    });
  };

  const handleDragCancel = () => {
    setDraggedField(null);
    // Restore fields to pre-drag state (onDragOver may have modified them)
    if (fieldsBeforeDragRef.current) {
      setFields(fieldsBeforeDragRef.current);
      fieldsBeforeDragRef.current = null;
    }
  };

  const selectedField = React.useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId]
  );

  return (
    <div className={sty.editorWrapper}>
      {/* Read-only banner for system forms */}
      {readOnly && (
        <Alert
          severity="info"
          icon={<LockOutlinedIcon sx={{ fontSize: 18 }} />}
          sx={{
            fontFamily,
            fontSize: 13,
            borderRadius: '8px',
            mb: 0,
            '& .MuiAlert-message': { fontFamily, fontSize: 13 },
          }}
        >
          This is a system form. Its structure is managed by Levelset and cannot be edited.
        </Alert>
      )}

      {/* Status bar */}
      <div className={sty.statusBar}>
        <span className={sty.fieldCount}>
          {fields.length} field{fields.length !== 1 ? 's' : ''}
        </span>
        {!readOnly && <SaveStatusChip status={saveStatus} />}
      </div>

      {/* Editor body */}
      <div className={sty.editorBody}>
        <DndContext
          collisionDetection={collisionDetection}
          onDragStart={readOnly ? undefined : handleDragStart}
          onDragOver={readOnly ? undefined : handleDragOver}
          onDragEnd={readOnly ? undefined : handleDragEnd}
          onDragCancel={readOnly ? undefined : handleDragCancel}
        >
          {!readOnly && <FieldPalette />}

          <EditorCanvas
            fields={fields}
            selectedFieldId={readOnly ? null : selectedFieldId}
            onSelectField={readOnly ? () => {} : setSelectedFieldId}
            onDeleteField={readOnly ? () => {} : handleDeleteField}
            onUpdateField={readOnly ? undefined : handleUpdateField}
            formType={template.form_type}
          />

          {!readOnly && (
            <DragOverlay dropAnimation={null}>
              {draggedField && (
                draggedField.type === 'section' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: 'var(--ls-color-neutral-foreground)',
                    border: '1px solid var(--ls-color-brand)',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px var(--ls-color-shadow-lg)',
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--ls-color-text-primary)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.3px',
                  }}>
                    {draggedField.settings.sectionName || draggedField.label}
                  </div>
                ) : (
                  <EditorFieldCard
                    field={draggedField}
                    isSelected={false}
                    onSelect={() => {}}
                    onDelete={() => {}}
                    isOverlay
                    formType={template.form_type}
                  />
                )
              )}
            </DragOverlay>
          )}
        </DndContext>

        {!readOnly && (
          <FieldConfigPanel
            field={selectedField}
            onUpdateField={handleUpdateField}
            formType={template.form_type}
          />
        )}
      </div>
    </div>
  );
}

function SaveStatusChip({ status }: { status: SaveStatus }) {
  const config = {
    saved: {
      icon: <CloudDoneOutlinedIcon sx={{ fontSize: 14 }} />,
      label: 'Saved',
      color: 'var(--ls-color-success)',
      bg: 'var(--ls-color-success-soft)',
    },
    saving: {
      icon: <CloudUploadOutlinedIcon sx={{ fontSize: 14 }} />,
      label: 'Saving...',
      color: 'var(--ls-color-brand)',
      bg: 'var(--ls-color-brand-soft)',
    },
    unsaved: {
      icon: <CloudOffOutlinedIcon sx={{ fontSize: 14 }} />,
      label: 'Unsaved',
      color: 'var(--ls-color-warning)',
      bg: 'var(--ls-color-warning-soft)',
    },
  }[status];

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      size="small"
      sx={{
        fontFamily,
        fontSize: 11,
        fontWeight: 600,
        height: 24,
        borderRadius: '12px',
        backgroundColor: config.bg,
        color: config.color,
        '& .MuiChip-icon': {
          color: config.color,
        },
      }}
    />
  );
}
