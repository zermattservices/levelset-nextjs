import * as React from 'react';
import sty from './SetupPositionGrid.module.css';
import { SetupPositionCard } from './SetupPositionCard';
import type { ResolvedPositionSlots } from '@/lib/scheduling.types';

interface SetupPositionGridProps {
  positionSlots: ResolvedPositionSlots[];
  availableEmployees: any[]; // for reference in slots
}

export function SetupPositionGrid({ positionSlots }: SetupPositionGridProps) {
  // Separate into FOH and BOH
  const fohPositions = positionSlots.filter(p => p.zone === 'FOH');
  const bohPositions = positionSlots.filter(p => p.zone === 'BOH');

  const hasPositions = positionSlots.length > 0;

  if (!hasPositions) {
    return (
      <div className={sty.emptyState}>
        <span className={sty.emptyIcon}>📋</span>
        <span className={sty.emptyTitle}>No positions configured</span>
        <span className={sty.emptyText}>
          Set up templates to define position slots for each daypart.
        </span>
      </div>
    );
  }

  return (
    <div className={sty.grid}>
      {fohPositions.length > 0 && (
        <div className={sty.zoneSection}>
          <div className={sty.zoneHeader}>
            <span className={`${sty.zoneBadge} ${sty.zoneFOH}`}>FOH</span>
            <span className={sty.zoneCount}>{fohPositions.length} positions</span>
          </div>
          <div className={sty.positionCards}>
            {fohPositions.map(ps => (
              <SetupPositionCard key={ps.position_id} positionSlot={ps} />
            ))}
          </div>
        </div>
      )}

      {bohPositions.length > 0 && (
        <div className={sty.zoneSection}>
          <div className={sty.zoneHeader}>
            <span className={`${sty.zoneBadge} ${sty.zoneBOH}`}>BOH</span>
            <span className={sty.zoneCount}>{bohPositions.length} positions</span>
          </div>
          <div className={sty.positionCards}>
            {bohPositions.map(ps => (
              <SetupPositionCard key={ps.position_id} positionSlot={ps} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
