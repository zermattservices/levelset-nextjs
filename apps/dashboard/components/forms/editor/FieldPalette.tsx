import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
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
import sty from './FieldPalette.module.css';
import { FIELD_CATEGORIES, getFieldTypesByCategory, type FieldTypeDefinition } from '@/lib/forms/field-palette';

const ICON_MAP: Record<string, React.ReactNode> = {
  TextFieldsOutlined: <TextFieldsOutlinedIcon sx={{ fontSize: 16 }} />,
  SubjectOutlined: <SubjectOutlinedIcon sx={{ fontSize: 16 }} />,
  PinOutlined: <PinOutlinedIcon sx={{ fontSize: 16 }} />,
  CalendarTodayOutlined: <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />,
  ArrowDropDownCircleOutlined: <ArrowDropDownCircleOutlinedIcon sx={{ fontSize: 16 }} />,
  RadioButtonCheckedOutlined: <RadioButtonCheckedOutlinedIcon sx={{ fontSize: 16 }} />,
  CheckBoxOutlined: <CheckBoxOutlinedIcon sx={{ fontSize: 16 }} />,
  ToggleOnOutlined: <ToggleOnOutlinedIcon sx={{ fontSize: 16 }} />,
  StarHalfOutlined: <StarHalfOutlinedIcon sx={{ fontSize: 16 }} />,
  StarOutlined: <StarOutlinedIcon sx={{ fontSize: 16 }} />,
  PercentOutlined: <PercentOutlinedIcon sx={{ fontSize: 16 }} />,
  DrawOutlined: <DrawOutlinedIcon sx={{ fontSize: 16 }} />,
  AttachFileOutlined: <AttachFileOutlinedIcon sx={{ fontSize: 16 }} />,
  ViewAgendaOutlined: <ViewAgendaOutlinedIcon sx={{ fontSize: 16 }} />,
  PersonOutlined: <PersonOutlinedIcon sx={{ fontSize: 16 }} />,
  SupervisorAccountOutlined: <SupervisorAccountOutlinedIcon sx={{ fontSize: 16 }} />,
  WorkOutlineOutlined: <WorkOutlineOutlinedIcon sx={{ fontSize: 16 }} />,
  ReportProblemOutlined: <ReportProblemOutlinedIcon sx={{ fontSize: 16 }} />,
  GavelOutlined: <GavelOutlinedIcon sx={{ fontSize: 16 }} />,
};

function DraggableFieldChip({ fieldDef }: { fieldDef: FieldTypeDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${fieldDef.type}`,
    data: { type: 'palette', fieldType: fieldDef.type },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${sty.fieldChip} ${isDragging ? sty.fieldChipDragging : ''}`}
    >
      <span className={sty.fieldChipIcon}>
        {ICON_MAP[fieldDef.icon] || null}
      </span>
      <span className={sty.fieldChipLabel}>{fieldDef.label}</span>
    </div>
  );
}

export function FieldPalette() {
  const grouped = React.useMemo(() => getFieldTypesByCategory(), []);

  return (
    <div className={sty.palette}>
      <h3 className={sty.paletteTitle}>Fields</h3>
      <p className={sty.paletteHint}>Drag fields onto the canvas</p>

      {FIELD_CATEGORIES.map((category) => {
        const fields = grouped[category.key];
        if (fields.length === 0) return null;

        return (
          <div key={category.key} className={sty.category}>
            <span className={sty.categoryLabel}>{category.label}</span>
            <div className={sty.categoryFields}>
              {fields.map((fieldDef) => (
                <DraggableFieldChip key={fieldDef.type} fieldDef={fieldDef} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
