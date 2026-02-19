import * as React from 'react';
import sty from './TemplateSlotGrid.module.css';

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

interface TemplateSlotGridProps {
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

export function TemplateSlotGrid({ positions, slots, startTime, endTime, onChange }: TemplateSlotGridProps) {
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

  // Build a lookup map: "posId:timeSlot" -> SlotEntry
  const slotMap = React.useMemo(() => {
    const map = new Map<string, SlotEntry>();
    for (const s of slots) {
      map.set(`${s.position_id}:${s.time_slot}`, s);
    }
    return map;
  }, [slots]);

  const getSlotCount = (posId: string, timeSlot: string): number => {
    return slotMap.get(`${posId}:${timeSlot}`)?.slot_count ?? 0;
  };

  const updateSlot = (posId: string, timeSlot: string, newCount: number) => {
    const key = `${posId}:${timeSlot}`;
    const existing = slotMap.get(key);

    let newSlots: SlotEntry[];
    if (newCount <= 0) {
      newSlots = slots.filter(s => !(s.position_id === posId && s.time_slot === timeSlot));
    } else if (existing) {
      newSlots = slots.map(s =>
        s.position_id === posId && s.time_slot === timeSlot
          ? { ...s, slot_count: newCount }
          : s
      );
    } else {
      newSlots = [...slots, {
        position_id: posId,
        time_slot: timeSlot,
        slot_count: newCount,
        is_required: true,
      }];
    }
    onChange(newSlots);
  };

  const handleIncrement = (e: React.MouseEvent, posId: string, timeSlot: string) => {
    e.stopPropagation();
    const currentCount = getSlotCount(posId, timeSlot);
    updateSlot(posId, timeSlot, currentCount + 1);
  };

  const handleDecrement = (e: React.MouseEvent, posId: string, timeSlot: string) => {
    e.stopPropagation();
    const currentCount = getSlotCount(posId, timeSlot);
    if (currentCount > 0) {
      updateSlot(posId, timeSlot, currentCount - 1);
    }
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
              const count = getSlotCount(pos.id, tc);
              return (
                <div
                  key={tc}
                  className={`${sty.bodyCell} ${sty.cell} ${count > 0 ? sty.cellFilled : ''}`}
                >
                  <button
                    className={sty.cellBtn}
                    onClick={(e) => handleDecrement(e, pos.id, tc)}
                    disabled={count === 0}
                    tabIndex={-1}
                  >
                    −
                  </button>
                  <span className={sty.cellCount}>{count}</span>
                  <button
                    className={sty.cellBtn}
                    onClick={(e) => handleIncrement(e, pos.id, tc)}
                    tabIndex={-1}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
