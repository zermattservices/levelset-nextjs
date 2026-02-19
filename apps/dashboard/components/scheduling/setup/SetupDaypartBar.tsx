import * as React from 'react';
import sty from './SetupDaypartBar.module.css';
import SettingsIcon from '@mui/icons-material/Settings';
import type { DaypartId } from '@/lib/scheduling/dayparts';

interface SetupDaypartBarProps {
  dayparts: { id: DaypartId; label: string; start: string; end: string }[];
  activeDaypartId: DaypartId;
  onDaypartChange: (id: DaypartId) => void;
  onManageTemplates: () => void;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export function SetupDaypartBar({ dayparts, activeDaypartId, onDaypartChange, onManageTemplates }: SetupDaypartBarProps) {
  return (
    <div className={sty.bar}>
      <div className={sty.tabs}>
        {dayparts.map((dp) => (
          <button
            key={dp.id}
            className={`${sty.tab} ${dp.id === activeDaypartId ? sty.tabActive : ''}`}
            onClick={() => onDaypartChange(dp.id)}
          >
            <span className={sty.tabLabel}>{dp.label}</span>
            <span className={sty.tabTime}>
              {formatTime12(dp.start)} – {formatTime12(dp.end)}
            </span>
          </button>
        ))}
      </div>
      <button className={sty.manageBtn} onClick={onManageTemplates}>
        <SettingsIcon sx={{ fontSize: 16 }} />
        <span>Manage Templates</span>
      </button>
    </div>
  );
}
