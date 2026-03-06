import * as React from 'react';
import sty from './DateNavigation.module.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';

interface DateNavigationProps {
  mode: 'week' | 'month';
  currentDate: Date; // Sunday of week (week mode) or 1st of month (month mode)
  onNavigate: (dir: -1 | 1) => void;
  onGoToToday: () => void;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatWeekLabel(sunday: Date): string {
  const sat = new Date(sunday);
  sat.setDate(sat.getDate() + 6);

  const startMonth = MONTHS_SHORT[sunday.getMonth()];
  const endMonth = MONTHS_SHORT[sat.getMonth()];
  const startDay = sunday.getDate();
  const endDay = sat.getDate();
  const year = sunday.getFullYear();

  if (sunday.getMonth() === sat.getMonth()) {
    return `${startMonth} ${startDay} \u2013 ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`;
}

function formatMonthLabel(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function DateNavigation({ mode, currentDate, onNavigate, onGoToToday }: DateNavigationProps) {
  const label = mode === 'week' ? formatWeekLabel(currentDate) : formatMonthLabel(currentDate);

  return (
    <div className={sty.navSection}>
      <IconButton size="small" onClick={() => onNavigate(-1)} className={sty.navArrow}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>

      <span className={sty.dateLabel}>{label}</span>

      <IconButton size="small" onClick={() => onNavigate(1)} className={sty.navArrow}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>

      <button className={sty.todayBtn} onClick={onGoToToday}>
        Today
      </button>
    </div>
  );
}
