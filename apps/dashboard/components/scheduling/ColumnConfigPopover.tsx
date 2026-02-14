import React, { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Switch from '@mui/material/Switch';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import type { ColumnConfig } from './useColumnConfig';
import sty from './ColumnConfigPopover.module.css';

interface ColumnConfigPopoverProps {
  config: ColumnConfig;
  canViewPay: boolean;
  onUpdate: (partial: Partial<ColumnConfig>) => void;
}

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#31664a',
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#31664a',
  },
};

export function ColumnConfigPopover({
  config,
  canViewPay,
  onUpdate,
}: ColumnConfigPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton onClick={handleOpen} size="small" sx={{ padding: '2px' }}>
        <SettingsOutlinedIcon
          sx={{ fontSize: 14, color: 'var(--ls-color-disabled-text)' }}
        />
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className={sty.menu}>
          <div className={sty.menuTitle}>Columns</div>

          <div className={sty.toggleRow}>
            <span className={sty.toggleLabel}>Hours</span>
            <Switch
              size="small"
              checked={config.showHours}
              onChange={(_, checked) => onUpdate({ showHours: checked })}
              sx={switchSx}
            />
          </div>

          {canViewPay && (
            <div className={sty.toggleRow}>
              <span className={sty.toggleLabel}>Wage</span>
              <Switch
                size="small"
                checked={config.showWage}
                onChange={(_, checked) => onUpdate({ showWage: checked })}
                sx={switchSx}
              />
            </div>
          )}

          <div className={sty.toggleRow}>
            <span className={sty.toggleLabel}>Role</span>
            <Switch
              size="small"
              checked={config.showRole}
              onChange={(_, checked) => onUpdate({ showRole: checked })}
              sx={switchSx}
            />
          </div>
        </div>
      </Popover>
    </>
  );
}
