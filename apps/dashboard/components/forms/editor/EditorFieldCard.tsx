import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton, Chip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import sty from './EditorFieldCard.module.css';
import { FIELD_TYPES } from '@/lib/forms/field-palette';
import type { FormField } from '@/lib/forms/schema-builder';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface EditorFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  /** Render as overlay during drag */
  isOverlay?: boolean;
}

export function EditorFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
  isOverlay,
}: EditorFieldCardProps) {
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

  const style: React.CSSProperties = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const fieldDef = FIELD_TYPES[field.type];
  const typeLabel = fieldDef?.label || field.type;
  const isSection = field.type === 'section';

  const handleClick = (e: React.MouseEvent) => {
    // Don't select when clicking delete
    if ((e.target as HTMLElement).closest('button')) return;
    onSelect();
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`${sty.card} ${isSelected ? sty.cardSelected : ''} ${isSection ? sty.cardSection : ''} ${isOverlay ? sty.cardOverlay : ''}`}
      onClick={handleClick}
    >
      <div className={sty.dragHandle} {...(isOverlay ? {} : { ...listeners, ...attributes })}>
        <DragIndicatorIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
      </div>

      <div className={sty.cardContent}>
        <div className={sty.cardTop}>
          <span className={isSection ? sty.sectionLabel : sty.fieldLabel}>
            {field.label}
          </span>
          {field.required && !isSection && (
            <Chip
              label="Required"
              size="small"
              sx={{
                fontFamily,
                fontSize: 10,
                fontWeight: 600,
                height: 18,
                borderRadius: '4px',
                backgroundColor: 'var(--ls-color-destructive-soft)',
                color: 'var(--ls-color-destructive)',
              }}
            />
          )}
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              fontFamily,
              fontSize: 10,
              fontWeight: 500,
              height: 18,
              borderRadius: '4px',
              backgroundColor: 'var(--ls-color-neutral-foreground)',
              color: 'var(--ls-color-muted)',
            }}
          />
        </div>
        {field.description && (
          <span className={sty.fieldDescription}>{field.description}</span>
        )}
      </div>

      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        sx={{
          padding: '4px',
          opacity: 0.5,
          '&:hover': { opacity: 1, color: 'var(--ls-color-destructive)' },
        }}
      >
        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </div>
  );
}
