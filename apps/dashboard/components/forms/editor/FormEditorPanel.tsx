import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  type DragStartEvent,
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

  // Collision detection for DnD — handles section bodies, gaps, and field reordering
  const collisionDetection = React.useMemo<CollisionDetection>(() => {
    return (args) => {
      const nonCanvas = args.droppableContainers.filter((c) => c.id !== 'editor-canvas');

      if (nonCanvas.length > 0) {
        const hits = pointerWithin({ ...args, droppableContainers: nonCanvas });

        if (hits.length > 0) {
          // 1. Gap droppables — highest priority
          const gapHit = hits.find((h) => String(h.id).startsWith('section-gap-'));
          if (gapHit) return [gapHit];

          // 2. Section body droppable
          const sectionHit = hits.find((h) => String(h.id).startsWith('section-drop-'));
          if (sectionHit) return [sectionHit];

          // 3. Field reorder
          return [hits[0]];
        }
      }

      return pointerWithin(args);
    };
  }, []);

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

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedField(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Dropping from palette onto canvas
    if (activeData?.type === 'palette') {
      const newField = createFieldFromType(activeData.fieldType);

      if (overData?.type === 'section') {
        // Dropped into a section — add to section's children
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
        // Dropped over a field — insert after it
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
        // Dropped on canvas background — append
        updateFields((prev) => [...prev, newField]);
      }

      setSelectedFieldId(newField.id);
      return;
    }

    // Dropping a field into a section
    if (activeData?.type === 'canvas-field' && overData?.type === 'section') {
      const fieldId = active.id as string;
      const targetSectionId = overData.sectionId as string;

      updateFields((prev) =>
        prev.map((f) => {
          // Remove from any current section's children
          if (f.type === 'section' && f.children?.includes(fieldId)) {
            return { ...f, children: f.children.filter((id) => id !== fieldId) };
          }
          // Add to target section's children
          if (f.id === targetSectionId) {
            return { ...f, children: [...(f.children || []).filter((id) => id !== fieldId), fieldId] };
          }
          return f;
        })
      );
      return;
    }

    // Dropping a field into a gap (between sections) — remove from section
    if (activeData?.type === 'canvas-field' && overData?.type === 'section-gap') {
      const fieldId = active.id as string;
      updateFields((prev) =>
        prev.map((f) => {
          if (f.type === 'section' && f.children?.includes(fieldId)) {
            return { ...f, children: f.children.filter((id) => id !== fieldId) };
          }
          return f;
        })
      );
      return;
    }

    // Dropping a field onto the canvas background — no-op
    if (activeData?.type === 'canvas-field' && over.id === 'editor-canvas') {
      return;
    }

    // Reordering within canvas (includes within-section reordering)
    if (activeData?.type === 'canvas-field' && active.id !== over.id) {
      const fieldId = active.id as string;
      const overId = over.id as string;

      updateFields((prev) => {
        // Check if both fields are in the same section — reorder children array
        const parentSection = prev.find(
          (f) => f.type === 'section' && f.children?.includes(fieldId) && f.children?.includes(overId)
        );

        if (parentSection && parentSection.children) {
          const oldIdx = parentSection.children.indexOf(fieldId);
          const newIdx = parentSection.children.indexOf(overId);
          if (oldIdx >= 0 && newIdx >= 0) {
            const newChildren = [...parentSection.children];
            newChildren.splice(oldIdx, 1);
            newChildren.splice(newIdx, 0, fieldId);
            return prev.map((f) =>
              f.id === parentSection.id ? { ...f, children: newChildren } : f
            );
          }
        }

        // Top-level reorder
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleDragCancel = () => {
    setDraggedField(null);
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
                <EditorFieldCard
                  field={draggedField}
                  isSelected={false}
                  onSelect={() => {}}
                  onDelete={() => {}}
                  isOverlay
                  formType={template.form_type}
                />
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
