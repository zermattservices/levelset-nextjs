import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Chip } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import sty from './FormEditorPanel.module.css';
import { FieldPalette } from './FieldPalette';
import { EditorCanvas } from './EditorCanvas';
import { EditorFieldCard } from './EditorFieldCard';
import { FieldConfigPanel } from './FieldConfigPanel';
import {
  createFieldFromType,
  fieldsToJsonSchema,
  jsonSchemaToFields,
  type FormField,
} from '@/lib/forms/schema-builder';
import type { FormTemplate } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface FormEditorPanelProps {
  template: FormTemplate;
  onSave: (schema: Record<string, any>, uiSchema: Record<string, any>) => Promise<void>;
}

export function FormEditorPanel({ template, onSave }: FormEditorPanelProps) {
  const [fields, setFields] = React.useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [draggedField, setDraggedField] = React.useState<FormField | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('saved');
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const fieldsInitialized = React.useRef(false);

  // Initialize fields from template schema
  React.useEffect(() => {
    if (fieldsInitialized.current) return;

    if (template.schema && Object.keys(template.schema).length > 0) {
      const restored = jsonSchemaToFields(template.schema, template.ui_schema || {});
      setFields(restored);
    }
    fieldsInitialized.current = true;
  }, [template]);

  // Auto-save with 1s debounce
  const triggerAutoSave = React.useCallback(
    (updatedFields: FormField[]) => {
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
    [onSave]
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
      updateFields((prev) => prev.filter((f) => f.id !== id));
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
      // Creating a preview of the field being dragged from palette
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

    // Dropping from palette onto canvas
    if (activeData?.type === 'palette') {
      const newField = createFieldFromType(activeData.fieldType);

      updateFields((prev) => {
        // If dropped over an existing field, insert after it
        if (over.id !== 'editor-canvas') {
          const overIndex = prev.findIndex((f) => f.id === over.id);
          if (overIndex >= 0) {
            const next = [...prev];
            next.splice(overIndex + 1, 0, newField);
            return next;
          }
        }
        // Otherwise append
        return [...prev, newField];
      });

      setSelectedFieldId(newField.id);
      return;
    }

    // Reordering within canvas
    if (activeData?.type === 'canvas-field' && active.id !== over.id) {
      updateFields((prev) => {
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
      {/* Status bar */}
      <div className={sty.statusBar}>
        <span className={sty.fieldCount}>
          {fields.length} field{fields.length !== 1 ? 's' : ''}
        </span>
        <SaveStatusChip status={saveStatus} />
      </div>

      {/* Editor body */}
      <div className={sty.editorBody}>
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <FieldPalette />

          <EditorCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onDeleteField={handleDeleteField}
          />

          <DragOverlay dropAnimation={null}>
            {draggedField && (
              <EditorFieldCard
                field={draggedField}
                isSelected={false}
                onSelect={() => {}}
                onDelete={() => {}}
                isOverlay
              />
            )}
          </DragOverlay>
        </DndContext>

        <FieldConfigPanel
          field={selectedField}
          onUpdateField={handleUpdateField}
        />
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
