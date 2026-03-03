import * as React from 'react';
import sty from './TemplatePositionGrid.module.css';

interface Position {
  id: string;
  name: string;
  zone: 'FOH' | 'BOH';
}

interface SlotEntry {
  position_id: string;
  time_slot: string;
  slot_count: number;
  is_required: boolean;
}

interface TemplatePositionGridProps {
  positions: Position[];
  slots: SlotEntry[];
  startTime: string;
  endTime: string;
  onChange: (slots: SlotEntry[]) => void;
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeStr(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTime12Short(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'p' : 'a';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hour12}${period}`;
  return `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export function TemplatePositionGrid({ positions, slots, startTime, endTime, onChange }: TemplatePositionGridProps) {
  // Generate 30-min time columns
  const timeColumns = React.useMemo(() => {
    const cols: string[] = [];
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    for (let min = startMin; min < endMin; min += 30) {
      cols.push(minutesToTimeStr(min));
    }
    return cols;
  }, [startTime, endTime]);

  // Build a lookup set: "posId:timeSlot" for checked cells
  const slotSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      set.add(`${s.position_id}:${s.time_slot}`);
    }
    return set;
  }, [slots]);

  const isChecked = (posId: string, timeSlot: string): boolean => {
    return slotSet.has(`${posId}:${timeSlot}`);
  };

  const handleToggle = (posId: string, timeSlot: string) => {
    const key = `${posId}:${timeSlot}`;
    let newSlots: SlotEntry[];

    if (slotSet.has(key)) {
      // Uncheck — remove the entry
      newSlots = slots.filter(s => !(s.position_id === posId && s.time_slot === timeSlot));
    } else {
      // Check — add a new entry
      newSlots = [...slots, {
        position_id: posId,
        time_slot: timeSlot,
        slot_count: 0,
        is_required: true,
      }];
    }
    onChange(newSlots);
  };

  // CSS grid template: fixed position column + equal-width time columns
  const gridTemplateColumns = `140px repeat(${timeColumns.length}, minmax(52px, 1fr))`;

  if (positions.length === 0) {
    return (
      <div className={sty.empty}>
        No positions available for this zone.
      </div>
    );
  }

  return (
    <div className={sty.gridWrapper}>
      <div className={sty.grid} style={{ gridTemplateColumns }}>
        {/* Header row */}
        <div className={`${sty.headerCell} ${sty.positionHeader}`}>Position</div>
        {timeColumns.map(tc => (
          <div key={tc} className={`${sty.headerCell} ${sty.timeHeader}`}>
            {formatTime12Short(tc)}
          </div>
        ))}

        {/* Position rows */}
        {positions.map(pos => (
          <React.Fragment key={pos.id}>
            <div className={`${sty.bodyCell} ${sty.positionCell}`}>
              <span className={sty.positionName}>{pos.name}</span>
            </div>
            {timeColumns.map(tc => {
              const checked = isChecked(pos.id, tc);
              return (
                <div
                  key={tc}
                  className={`${sty.bodyCell} ${sty.cell} ${checked ? sty.cellChecked : ''}`}
                  onClick={() => handleToggle(pos.id, tc)}
                >
                  <label className={sty.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={sty.checkboxInput}
                      checked={checked}
                      onChange={() => handleToggle(pos.id, tc)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`${sty.checkboxBox} ${checked ? sty.checkboxChecked : ''}`}>
                      {checked && (
                        <svg className={sty.checkIcon} viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6L5 8.5L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </label>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
