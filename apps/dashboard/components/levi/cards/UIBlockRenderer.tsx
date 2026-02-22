/**
 * UIBlockRenderer — dispatches UI block data to the correct card component.
 * Used by ChatMessage to render structured data inline in the chat.
 */

import * as React from 'react';
import { EmployeeCard } from './EmployeeCard';
import { EmployeeListCard } from './EmployeeListCard';
import { RatingSummaryCard } from './RatingSummaryCard';
import { InfractionCard } from './InfractionCard';
import { DiscActionCard } from './DiscActionCard';

export interface UIBlockData {
  blockType: string;
  blockId: string;
  payload: Record<string, any>;
}

interface UIBlockRendererProps {
  block: UIBlockData;
  onEmployeeClick?: (employeeId: string) => void;
}

export function UIBlockRenderer({ block, onEmployeeClick }: UIBlockRendererProps) {
  switch (block.blockType) {
    case 'employee-card':
      return (
        <EmployeeCard
          payload={block.payload as any}
          onClick={onEmployeeClick}
        />
      );
    case 'employee-list':
      return (
        <EmployeeListCard
          payload={block.payload as any}
          onEmployeeClick={onEmployeeClick}
        />
      );
    case 'rating-summary':
      return <RatingSummaryCard payload={block.payload as any} />;
    case 'infraction-card':
      return <InfractionCard payload={block.payload as any} />;
    case 'disc-action-card':
      return <DiscActionCard payload={block.payload as any} />;
    default:
      return null;
  }
}
