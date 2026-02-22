import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import sty from './EditorCanvas.module.css';
import { EditorFieldCard } from './EditorFieldCard';
import type { FormField } from '@/lib/forms/schema-builder';

interface EditorCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  formType?: string;
}

export function EditorCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  formType,
}: EditorCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-canvas',
    data: { type: 'canvas' },
  });

  const fieldIds = React.useMemo(() => fields.map((f) => f.id), [fields]);

  return (
    <div
      ref={setNodeRef}
      className={`${sty.canvas} ${isOver ? sty.canvasOver : ''}`}
      onClick={(e) => {
        // Deselect when clicking canvas background
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
            {fields.map((field) => (
              <EditorFieldCard
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                formType={formType}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
