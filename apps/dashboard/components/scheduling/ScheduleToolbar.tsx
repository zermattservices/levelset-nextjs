import * as React from 'react';
import sty from './ScheduleToolbar.module.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import type { Schedule, GridViewMode, TimeViewMode, LaborSummary } from '@/lib/scheduling.types';

interface ScheduleToolbarProps {
  weekStart: Date;
  selectedDay: string;
  timeViewMode: TimeViewMode;
  gridViewMode: GridViewMode;
  schedule: Schedule | null;
  laborSummary: LaborSummary;
  onNavigateWeek: (dir: -1 | 1) => void;
  onNavigateDay: (dir: -1 | 1) => void;
  onGoToToday: () => void;
  onTimeViewChange: (mode: TimeViewMode) => void;
  onGridViewChange: (mode: GridViewMode) => void;
  onManageAreas: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatWeekLabel(sunday: Date): string {
  const sat = new Date(sunday);
  sat.setDate(sat.getDate() + 6);

  const startMonth = MONTHS[sunday.getMonth()];
  const endMonth = MONTHS[sat.getMonth()];
  const startDay = sunday.getDate();
  const endDay = sat.getDate();
  const year = sunday.getFullYear();

  if (sunday.getMonth() === sat.getMonth()) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_LONG[d.getDay()];
  const month = MONTHS[d.getMonth()];
  return `${dayName}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatHours(n: number): string {
  return n.toFixed(1) + 'h';
}

export function ScheduleToolbar({
  weekStart,
  selectedDay,
  timeViewMode,
  gridViewMode,
  schedule,
  laborSummary,
  onNavigateWeek,
  onNavigateDay,
  onGoToToday,
  onTimeViewChange,
  onGridViewChange,
  onManageAreas,
  onPublish,
  onUnpublish,
}: ScheduleToolbarProps) {
  const isPublished = schedule?.status === 'published';
  const label = timeViewMode === 'week' ? formatWeekLabel(weekStart) : formatDayLabel(selectedDay);

  return (
    <div className={sty.toolbar}>
      {/* Left: navigation */}
      <div className={sty.navSection}>
        <IconButton
          size="small"
          onClick={() => timeViewMode === 'week' ? onNavigateWeek(-1) : onNavigateDay(-1)}
          className={sty.navArrow}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>

        <span className={sty.dateLabel}>{label}</span>

        <IconButton
          size="small"
          onClick={() => timeViewMode === 'week' ? onNavigateWeek(1) : onNavigateDay(1)}
          className={sty.navArrow}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>

        <button className={sty.todayBtn} onClick={onGoToToday}>Today</button>
      </div>

      {/* Center: status + toggles + summary */}
      <div className={sty.centerSection}>
        <span className={`${sty.statusChip} ${isPublished ? sty.statusPublished : sty.statusDraft}`}>
          {isPublished ? 'Published' : 'Draft'}
        </span>

        <div className={sty.toggleGroup}>
          <button
            className={`${sty.toggleBtn} ${timeViewMode === 'week' ? sty.toggleActive : ''}`}
            onClick={() => onTimeViewChange('week')}
          >
            Week
          </button>
          <button
            className={`${sty.toggleBtn} ${timeViewMode === 'day' ? sty.toggleActive : ''}`}
            onClick={() => onTimeViewChange('day')}
          >
            Day
          </button>
        </div>

        <div className={sty.toggleGroup}>
          <button
            className={`${sty.toggleBtn} ${gridViewMode === 'employees' ? sty.toggleActive : ''}`}
            onClick={() => onGridViewChange('employees')}
          >
            Employees
          </button>
          <button
            className={`${sty.toggleBtn} ${gridViewMode === 'areas' ? sty.toggleActive : ''}`}
            onClick={() => onGridViewChange('areas')}
          >
            Areas
          </button>
        </div>

        <div className={sty.summaryChips}>
          <span className={sty.summaryChip}>{formatHours(laborSummary.total_hours)}</span>
          <span className={sty.summaryChip}>{formatCurrency(laborSummary.total_cost)}</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className={sty.actionSection}>
        <button className={sty.secondaryBtn} onClick={onManageAreas}>Manage Areas</button>
        {isPublished ? (
          <button className={sty.unpublishBtn} onClick={onUnpublish}>Unpublish</button>
        ) : (
          <button className={sty.publishBtn} onClick={onPublish}>Publish</button>
        )}
      </div>
    </div>
  );
}
