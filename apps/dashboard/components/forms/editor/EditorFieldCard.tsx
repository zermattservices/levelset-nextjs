import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconButton, Chip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TextFieldsOutlinedIcon from '@mui/icons-material/TextFieldsOutlined';
import SubjectOutlinedIcon from '@mui/icons-material/SubjectOutlined';
import PinOutlinedIcon from '@mui/icons-material/PinOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import ArrowDropDownCircleOutlinedIcon from '@mui/icons-material/ArrowDropDownCircleOutlined';
import RadioButtonCheckedOutlinedIcon from '@mui/icons-material/RadioButtonCheckedOutlined';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import StarHalfOutlinedIcon from '@mui/icons-material/StarHalfOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import PercentOutlinedIcon from '@mui/icons-material/PercentOutlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import sty from './EditorFieldCard.module.css';
import { FIELD_TYPES } from '@/lib/forms/field-palette';
import { TextBlockEditor } from './TextBlockEditor';
import type { FormField } from '@/lib/forms/schema-builder';

const TYPE_TAG_ICON_MAP: Record<string, React.ReactNode> = {
  TextFieldsOutlined: <TextFieldsOutlinedIcon sx={{ fontSize: 12 }} />,
  SubjectOutlined: <SubjectOutlinedIcon sx={{ fontSize: 12 }} />,
  PinOutlined: <PinOutlinedIcon sx={{ fontSize: 12 }} />,
  CalendarTodayOutlined: <CalendarTodayOutlinedIcon sx={{ fontSize: 12 }} />,
  ArrowDropDownCircleOutlined: <ArrowDropDownCircleOutlinedIcon sx={{ fontSize: 12 }} />,
  RadioButtonCheckedOutlined: <RadioButtonCheckedOutlinedIcon sx={{ fontSize: 12 }} />,
  CheckBoxOutlined: <CheckBoxOutlinedIcon sx={{ fontSize: 12 }} />,
  ToggleOnOutlined: <ToggleOnOutlinedIcon sx={{ fontSize: 12 }} />,
  StarHalfOutlined: <StarHalfOutlinedIcon sx={{ fontSize: 12 }} />,
  StarOutlined: <StarOutlinedIcon sx={{ fontSize: 12 }} />,
  PercentOutlined: <PercentOutlinedIcon sx={{ fontSize: 12 }} />,
  DrawOutlined: <DrawOutlinedIcon sx={{ fontSize: 12 }} />,
  AttachFileOutlined: <AttachFileOutlinedIcon sx={{ fontSize: 12 }} />,
  ViewAgendaOutlined: <ViewAgendaOutlinedIcon sx={{ fontSize: 12 }} />,
  ArticleOutlined: <ArticleOutlinedIcon sx={{ fontSize: 12 }} />,
};

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const SCORING_TYPES: Record<string, { label: string; color: string }> = {
  rating_1_3: { label: '1-3', color: 'var(--ls-color-brand)' },
  rating_1_5: { label: '1-5', color: 'var(--ls-color-brand)' },
  true_false: { label: 'T/F', color: '#6366F1' },
  numeric_score: { label: '#', color: '#D97706' },
};

interface EditorFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  isOverlay?: boolean;
  formType?: string;
  disableSortTransform?: boolean;
}

export function EditorFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
  onUpdateField,
  isOverlay,
  formType,
  disableSortTransform,
}: EditorFieldCardProps) {
  // Section fields are rendered as containers by EditorCanvas
  if (field.type === 'section') return null;

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
        transform: disableSortTransform ? undefined : CSS.Transform.toString(transform),
        transition: disableSortTransform ? undefined : transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const fieldDef = FIELD_TYPES[field.type];
  const typeLabel = fieldDef?.displayTypeLabel || fieldDef?.label || field.type;
  const typeIconName = fieldDef?.displayTypeIcon || fieldDef?.icon;
  const typeIcon = typeIconName ? TYPE_TAG_ICON_MAP[typeIconName] : null;

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onSelect();
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`${sty.card} ${isSelected ? sty.cardSelected : ''} ${isOverlay ? sty.cardOverlay : ''}`}
      onClick={handleClick}
    >
      <div className={sty.dragHandle} {...(isOverlay ? {} : { ...listeners, ...attributes })}>
        <DragIndicatorIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
      </div>

      <div className={sty.cardContent}>
        <div className={sty.cardTop}>
          <span className={sty.fieldLabel}>
            {field.label}
          </span>
          {field.required && (
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
            icon={typeIcon ? <>{typeIcon}</> : undefined}
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
              '& .MuiChip-icon': {
                color: 'inherit',
                marginLeft: '4px',
                marginRight: '-2px',
              },
            }}
          />
        </div>
        {field.description && (
          <span className={sty.fieldDescription}>{field.description}</span>
        )}
        {field.type === 'text_block' && !isOverlay && onUpdateField && (
          <TextBlockEditor
            content={field.settings.content || ''}
            onChange={(html) => {
              onUpdateField(field.id, {
                settings: { ...field.settings, content: html },
              });
            }}
          />
        )}
      </div>

      {field.settings.scored && field.settings.weight != null && (
        <div className={sty.scoringControls}>
          <Chip
            label={SCORING_TYPES[field.type]?.label || '?'}
            size="small"
            sx={{
              fontFamily,
              fontSize: 10,
              fontWeight: 700,
              height: 20,
              minWidth: 32,
              borderRadius: '4px',
              backgroundColor: SCORING_TYPES[field.type]?.color || 'var(--ls-color-brand)',
              color: '#fff',
              '& .MuiChip-label': { padding: '0 5px' },
            }}
          />
          <input
            type="number"
            className={sty.weightInput}
            value={field.settings.weight}
            min={0}
            aria-label={`Weight for ${field.label}`}
            onChange={(e) => {
              const val = Math.max(0, Number(e.target.value) || 0);
              onUpdateField?.(field.id, {
                settings: { ...field.settings, weight: val },
              });
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
