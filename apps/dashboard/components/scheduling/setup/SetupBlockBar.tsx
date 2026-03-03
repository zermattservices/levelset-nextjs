import * as React from 'react';
import sty from './SetupBlockBar.module.css';
import SettingsIcon from '@mui/icons-material/Settings';

interface SetupBlockBarProps {
  blocks: { block_time: string; end_time: string }[];
  activeBlockIndex: number;
  onBlockChange: (index: number) => void;
  onManageTemplates: () => void;
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export function SetupBlockBar({ blocks, activeBlockIndex, onBlockChange, onManageTemplates }: SetupBlockBarProps) {
  return (
    <div className={sty.bar}>
      <div className={sty.tabs}>
        {blocks.map((block, index) => (
          <button
            key={index}
            className={`${sty.tab} ${index === activeBlockIndex ? sty.tabActive : ''}`}
            onClick={() => onBlockChange(index)}
          >
            <span className={sty.tabStartTime}>{formatTime12(block.block_time)}</span>
            <span className={sty.tabEndTime}>&ndash; {formatTime12(block.end_time)}</span>
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
