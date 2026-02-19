import * as React from 'react';
import dynamic from 'next/dynamic';
import sty from './BottomPanel.module.css';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { HouseShiftsTab } from './HouseShiftsTab';
import { ScheduleSummaryTab } from './ScheduleSummaryTab';
import type { Shift, Position, LaborSummary, TimeViewMode } from '@/lib/scheduling.types';

const LaborSpreadTab = dynamic(
  () => import('./LaborSpreadTab').then(mod => ({ default: mod.LaborSpreadTab })),
  { ssr: false },
);

export type BottomTab = 'house_shifts' | 'summary' | 'labor_spread';

interface BottomPanelProps {
  shifts: Shift[];
  positions: Position[];
  laborSummary: LaborSummary;
  days: string[];
  canViewPay: boolean;
  isPublished: boolean;
  timeViewMode: TimeViewMode;
  selectedDay: string;
  onDeleteShift: (id: string) => Promise<void>;
  /** Hover time in minutes-of-day from ScheduleGrid */
  externalHoverMinute?: number | null;
  /** Called when the LaborSpreadTab hover changes */
  onHoverMinuteChange?: (minute: number | null) => void;
}

const MIN_CONTENT_HEIGHT = 100;
const MAX_CONTENT_HEIGHT = 600;
const DEFAULT_CONTENT_HEIGHT = 280;

export function BottomPanel({
  shifts, positions, laborSummary, days, canViewPay, isPublished,
  timeViewMode, selectedDay,
  onDeleteShift,
  externalHoverMinute, onHoverMinuteChange,
}: BottomPanelProps) {
  const [activeTab, setActiveTab] = React.useState<BottomTab>('house_shifts');
  const [expanded, setExpanded] = React.useState(true);
  const [contentHeight, setContentHeight] = React.useState(DEFAULT_CONTENT_HEIGHT);
  const draggingRef = React.useRef(false);
  const startYRef = React.useRef(0);
  const startHeightRef = React.useRef(0);

  const houseShifts = React.useMemo(() => shifts.filter(s => s.is_house_shift), [shifts]);

  const handleDragStart = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = contentHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY;
      const next = Math.min(MAX_CONTENT_HEIGHT, Math.max(MIN_CONTENT_HEIGHT, startHeightRef.current + delta));
      setContentHeight(next);
    };

    const handleMouseUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [contentHeight]);

  return (
    <div className={sty.panel}>
      {expanded && <div className={sty.dragHandle} onMouseDown={handleDragStart}><div className={sty.dragGrip} /></div>}
      <div className={sty.tabBar}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              fontFamily: 'var(--ls-font-body)',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'none',
              minHeight: 36,
              padding: '6px 16px',
              color: 'var(--ls-color-disabled-text)',
            },
            '& .Mui-selected': {
              color: 'var(--ls-color-brand) !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--ls-color-brand)',
              height: 2,
            },
          }}
        >
          <Tab label="House Shifts" value="house_shifts" />
          <Tab label="Schedule Summary" value="summary" />
          <Tab label="Labor Spread" value="labor_spread" />
        </Tabs>
        <IconButton size="small" onClick={() => setExpanded(!expanded)} className={sty.collapseBtn}>
          {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowUpIcon fontSize="small" />}
        </IconButton>
      </div>
      {expanded && (
        <div className={sty.content} style={{ height: contentHeight }}>
          {activeTab === 'house_shifts' && (
            <HouseShiftsTab
              houseShifts={houseShifts}
              isPublished={isPublished}
              onDeleteShift={onDeleteShift}
            />
          )}
          {activeTab === 'summary' && (
            <ScheduleSummaryTab
              shifts={shifts}
              positions={positions}
              laborSummary={laborSummary}
              canViewPay={canViewPay}
            />
          )}
          {activeTab === 'labor_spread' && (
            <LaborSpreadTab
              shifts={shifts}
              laborSummary={laborSummary}
              days={days}
              canViewPay={canViewPay}
              timeViewMode={timeViewMode}
              selectedDay={selectedDay}
              externalHoverMinute={externalHoverMinute}
              onHoverMinuteChange={onHoverMinuteChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
