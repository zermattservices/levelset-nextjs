import * as React from 'react';
import sty from './SetupPositionCard.module.css';
import { SetupSlot } from './SetupSlot';
import { ZONE_COLORS } from '@/lib/zoneColors';
import type { ResolvedPositionSlots } from '@/lib/scheduling.types';

interface SetupPositionCardProps {
  positionSlot: ResolvedPositionSlots;
}

export function SetupPositionCard({ positionSlot }: SetupPositionCardProps) {
  const { position_id, position_name, zone, slots } = positionSlot;
  const filledCount = slots.filter(s => s.assignment).length;
  const totalCount = slots.length;
  const accentColor = ZONE_COLORS[zone] || '#999';

  return (
    <div className={sty.card}>
      <div className={sty.header} style={{ borderLeftColor: accentColor }}>
        <span className={sty.positionName}>{position_name}</span>
        <span className={sty.slotIndicator}>
          <span className={sty.slotFilled}>{filledCount}</span>
          <span className={sty.slotSeparator}>/</span>
          <span className={sty.slotTotal}>{totalCount}</span>
        </span>
      </div>
      <div className={sty.slotsContainer}>
        {slots.map((slot) => (
          <SetupSlot
            key={`${position_id}-${slot.index}`}
            positionId={position_id}
            slotIndex={slot.index}
            isRequired={slot.is_required}
            assignment={slot.assignment}
          />
        ))}
      </div>
    </div>
  );
}
