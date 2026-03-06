import * as React from 'react';
import { useState } from 'react';
import sty from './ApprovalsToolbar.module.css';
import Tooltip from '@mui/material/Tooltip';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AddIcon from '@mui/icons-material/Add';
import type { RequestsViewMode, RequestTypeFilter, RequestStatusFilter } from '@/lib/scheduling.types';
import { DateNavigation } from './DateNavigation';

interface ApprovalsToolbarProps {
  viewMode: RequestsViewMode;
  onViewModeChange: (mode: RequestsViewMode) => void;
  typeFilters: RequestTypeFilter[];
  onTypeFiltersChange: (types: RequestTypeFilter[]) => void;
  statusFilters: RequestStatusFilter[];
  onStatusFiltersChange: (statuses: RequestStatusFilter[]) => void;
  currentDate: Date;
  onNavigate: (dir: -1 | 1) => void;
  onGoToToday: () => void;
  onAddTimeOff: () => void;
}

const TYPE_OPTIONS: { value: RequestTypeFilter; label: string }[] = [
  { value: 'time_off', label: 'Time Off' },
  { value: 'availability', label: 'Availability' },
];

const STATUS_OPTIONS: { value: RequestStatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
];

function toggleFilter<T>(current: T[], value: T): T[] {
  const isActive = current.includes(value);
  // Don't deactivate if it's the only active filter
  if (isActive && current.length === 1) return current;
  return isActive ? current.filter((v) => v !== value) : [...current, value];
}

export function ApprovalsToolbar({
  viewMode,
  onViewModeChange,
  typeFilters,
  onTypeFiltersChange,
  statusFilters,
  onStatusFiltersChange,
  currentDate,
  onNavigate,
  onGoToToday,
  onAddTimeOff,
}: ApprovalsToolbarProps) {
  const isCalendarView = viewMode === 'weekly' || viewMode === 'monthly';
  const dateNavMode = viewMode === 'monthly' ? 'month' : 'week';

  // Remember last calendar sub-mode so toggling back to Calendar restores it
  const [lastCalendarMode, setLastCalendarMode] = useState<'weekly' | 'monthly'>(
    isCalendarView ? (viewMode as 'weekly' | 'monthly') : 'weekly'
  );

  // Keep lastCalendarMode in sync when the user switches between weekly/monthly
  React.useEffect(() => {
    if (viewMode === 'weekly' || viewMode === 'monthly') {
      setLastCalendarMode(viewMode);
    }
  }, [viewMode]);

  function handleListClick() {
    onViewModeChange('list');
  }

  function handleCalendarClick() {
    onViewModeChange(lastCalendarMode);
  }

  function handleSubModeClick(mode: 'weekly' | 'monthly') {
    setLastCalendarMode(mode);
    onViewModeChange(mode);
  }

  function handleTypeToggle(value: RequestTypeFilter) {
    // Availability is disabled in calendar views
    if (value === 'availability' && isCalendarView) return;
    onTypeFiltersChange(toggleFilter(typeFilters, value));
  }

  function handleStatusToggle(value: RequestStatusFilter) {
    onStatusFiltersChange(toggleFilter(statusFilters, value));
  }

  return (
    <div className={sty.toolbar}>
      {/* Left: date navigation (calendar view only, like schedule page) */}
      <div className={sty.toolbarLeft}>
        {isCalendarView && (
          <DateNavigation
            mode={dateNavMode}
            currentDate={currentDate}
            onNavigate={onNavigate}
            onGoToToday={onGoToToday}
          />
        )}
      </div>

      {/* Center: List/Calendar toggle + Week/Month sub-toggle — always page-centered */}
      <div className={sty.toolbarCenter}>
        <div className={sty.toggleGroup}>
          <button
            className={`${sty.toggleBtn} ${!isCalendarView ? sty.toggleActive : ''}`}
            onClick={handleListClick}
          >
            <ViewListOutlinedIcon className={sty.toggleIcon} />
            <span>List</span>
          </button>
          <button
            className={`${sty.toggleBtn} ${isCalendarView ? sty.toggleActive : ''}`}
            onClick={handleCalendarClick}
          >
            <CalendarMonthOutlinedIcon className={sty.toggleIcon} />
            <span>Calendar</span>
          </button>
        </div>

        {isCalendarView && (
          <div className={sty.subToggleGroup}>
            <button
              className={`${sty.subToggleBtn} ${viewMode === 'weekly' ? sty.subToggleActive : ''}`}
              onClick={() => handleSubModeClick('weekly')}
            >
              Week
            </button>
            <button
              className={`${sty.subToggleBtn} ${viewMode === 'monthly' ? sty.subToggleActive : ''}`}
              onClick={() => handleSubModeClick('monthly')}
            >
              Month
            </button>
          </div>
        )}
      </div>

      {/* Right: filter chips */}
      <div className={sty.toolbarRight}>
        {/* Type filters */}
        <div className={sty.filterGroup}>
          <span className={sty.filterLabel}>Type</span>
          {TYPE_OPTIONS.map((opt) => {
            const isActive = typeFilters.includes(opt.value);
            const isDisabled = opt.value === 'availability' && isCalendarView;

            const chipClasses = [
              sty.filterChip,
              isActive ? sty.filterChipActive : '',
              isDisabled ? sty.filterChipDisabled : '',
            ]
              .filter(Boolean)
              .join(' ');

            const chip = (
              <button
                key={opt.value}
                className={chipClasses}
                onClick={() => handleTypeToggle(opt.value)}
                disabled={isDisabled}
              >
                {opt.label}
              </button>
            );

            if (isDisabled) {
              return (
                <Tooltip key={opt.value} title="Cannot display on calendar" arrow>
                  <span>{chip}</span>
                </Tooltip>
              );
            }

            return chip;
          })}
        </div>

        {/* Status filters */}
        <div className={sty.filterGroup}>
          <span className={sty.filterLabel}>Status</span>
          {STATUS_OPTIONS.map((opt) => {
            const isActive = statusFilters.includes(opt.value);
            return (
              <button
                key={opt.value}
                className={`${sty.filterChip} ${isActive ? sty.filterChipActive : ''}`}
                onClick={() => handleStatusToggle(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Add Time Off button */}
        <button className={sty.addBtn} onClick={onAddTimeOff}>
          <AddIcon sx={{ fontSize: 16 }} />
          <span>Add Time Off</span>
        </button>
      </div>
    </div>
  );
}
