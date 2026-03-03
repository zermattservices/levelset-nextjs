import * as React from 'react';
import sty from './SetupPositionGrid.module.css';
import { SetupPositionCard } from './SetupPositionCard';
import type { ResolvedPositionSlots } from '@/lib/scheduling.types';

interface SetupPositionGridProps {
  positionSlots: ResolvedPositionSlots[];
  availableEmployees: any[]; // for reference in slots
}

export function SetupPositionGrid({ positionSlots }: SetupPositionGridProps) {
  if (positionSlots.length === 0) {
    return (
      <div className={sty.emptyState}>
        <span className={sty.emptyIcon}>📋</span>
        <span className={sty.emptyTitle}>No positions configured</span>
        <span className={sty.emptyText}>
          Use Manage Templates to configure positions and time blocks.
        </span>
      </div>
    );
  }

  return (
    <div className={sty.grid}>
      <div className={sty.positionCards}>
        {positionSlots.map(ps => (
          <SetupPositionCard key={ps.position_id} positionSlot={ps} />
        ))}
      </div>
    </div>
  );
}
