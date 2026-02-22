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
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import sty from './EditorFieldCard.module.css';
import { FIELD_TYPES, getLevelsetFieldInfo } from '@/lib/forms/field-palette';
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
  PersonOutlined: <PersonOutlinedIcon sx={{ fontSize: 12 }} />,
  SupervisorAccountOutlined: <SupervisorAccountOutlinedIcon sx={{ fontSize: 12 }} />,
  WorkOutlineOutlined: <WorkOutlineOutlinedIcon sx={{ fontSize: 12 }} />,
  ReportProblemOutlined: <ReportProblemOutlinedIcon sx={{ fontSize: 12 }} />,
  GavelOutlined: <GavelOutlinedIcon sx={{ fontSize: 12 }} />,
};

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface EditorFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  /** Render as overlay during drag */
  isOverlay?: boolean;
  formType?: string;
}

export function EditorFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
  isOverlay,
  formType,
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
  const typeLabel = fieldDef?.displayTypeLabel || fieldDef?.label || field.type;
  const typeIconName = fieldDef?.displayTypeIcon || fieldDef?.icon;
  const typeIcon = typeIconName ? TYPE_TAG_ICON_MAP[typeIconName] : null;
  const isSection = field.type === 'section';

  const levelsetInfo = React.useMemo(
    () => getLevelsetFieldInfo(field.type, formType),
    [field.type, formType]
  );
  const isLevelset = levelsetInfo !== null;

  const handleClick = (e: React.MouseEvent) => {
    // Don't select when clicking delete
    if ((e.target as HTMLElement).closest('button')) return;
    onSelect();
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className={`${sty.card} ${isSelected ? sty.cardSelected : ''} ${isSection ? sty.cardSection : ''} ${isOverlay ? sty.cardOverlay : ''} ${isLevelset ? sty.cardLevelset : ''}`}
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
        {levelsetInfo && (
          <span className={sty.levelsetDescription}>{levelsetInfo.description}</span>
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
