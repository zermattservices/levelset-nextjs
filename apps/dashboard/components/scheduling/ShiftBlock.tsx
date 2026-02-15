import * as React from 'react';
import sty from './ShiftBlock.module.css';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { Shift, GridViewMode } from '@/lib/scheduling.types';
import { ZONE_COLORS } from '@/lib/zoneColors';

interface ShiftBlockProps {
  shift: Shift;
  viewMode: GridViewMode;
  isPublished: boolean;
  onClick: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
}

/** Human-readable zone labels rendered on line 3 of the block. */
const ZONE_LABELS: Record<string, string> = {
  BOH: 'Back of House',
  FOH: 'Front of House',
};

/**
 * Default fallback color when a shift has no position or an unmapped zone.
 * Uses a neutral gray so the block still renders with visible structure.
 */
const FALLBACK_COLOR = '#9ca3af';

/**
 * Format an HH:MM time string to a compact 12-hour representation.
 * Examples: "09:00" -> "9:00a", "17:30" -> "5:30p", "12:00" -> "12p", "00:00" -> "12a"
 */
function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`;
}

/**
 * ShiftBlock renders a single shift cell within the weekly schedule grid.
 *
 * Layout (3 lines):
 *   Line 1 (bold) — Position name (employee view) or Employee name (position view)
 *   Line 2        — Time range (e.g. "9:00a - 4:00p")
 *   Line 3 (muted)— Zone label (e.g. "Back of House")
 *
 * Open/unassigned shifts use a dashed border with lighter tinting and an "OPEN" label.
 * Published shifts show a lock icon; draft shifts show a delete button on hover.
 */
export function ShiftBlock({
  shift,
  viewMode,
  isPublished,
  onClick,
  onDelete,
}: ShiftBlockProps) {
  const { position, assignment } = shift;
  const zone = position?.zone;
  const posColor = zone ? (ZONE_COLORS[zone] ?? FALLBACK_COLOR) : FALLBACK_COLOR;
  const isOpen = !assignment;

  /* ---- Derived display strings ---- */

  // Line 1: In employee view show position name; in position view show employee name.
  const primaryLabel =
    viewMode === 'employees'
      ? (position?.name ?? '')
      : (assignment?.employee?.full_name ?? '');

  // Line 2: Compact time range.
  const timeStr = `${formatTimeShort(shift.start_time)} - ${formatTimeShort(shift.end_time)}`;

  // Line 3: Zone label (mapped to human-readable string).
  const zoneLabel = zone ? (ZONE_LABELS[zone] ?? zone) : '';

  /* ---- Event handlers ---- */

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(shift);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(shift.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(shift);
    }
  };

  /* ---- Inline styles driven by zone color ---- */

  const blockStyle: React.CSSProperties = {
    borderLeftColor: posColor,
    backgroundColor: isOpen ? undefined : `${posColor}1f`, // 12% opacity hex suffix
  };

  /* ---- Class list ---- */

  const classList = [sty.block, isOpen ? sty.openShift : ''].filter(Boolean).join(' ');

  return (
    <div
      className={classList}
      style={blockStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={
        isOpen
          ? `Open shift, ${timeStr}`
          : `${primaryLabel}, ${timeStr}`
      }
    >
      {/* Top-right action area: lock icon OR delete button */}
      <div className={sty.actions}>
        {isPublished && (
          <LockOutlinedIcon
            sx={{ fontSize: 10, color: 'var(--ls-color-disabled-text)' }}
            aria-label="Published"
          />
        )}
        {!isPublished && onDelete && (
          <button
            className={sty.deleteBtn}
            onClick={handleDelete}
            aria-label="Delete shift"
            type="button"
          >
            <CloseIcon sx={{ fontSize: 10 }} />
          </button>
        )}
      </div>

      {/* Line 1 — Primary label (position or employee name) */}
      {isOpen ? (
        <span className={sty.openLabel}>Open</span>
      ) : (
        primaryLabel && <span className={sty.primaryLabel}>{primaryLabel}</span>
      )}

      {/* Line 2 — Time range */}
      <span className={sty.time}>{timeStr}</span>

      {/* Line 3 — Zone label */}
      {zoneLabel && <span className={sty.zoneLabel}>{zoneLabel}</span>}
    </div>
  );
}
