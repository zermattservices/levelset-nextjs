/**
 * UIBlockRenderer — dispatches UI block data to the correct card component.
 * Used by ChatBubble to render structured data inline in the chat.
 */

import React from "react";
import { EmployeeCard } from "./EmployeeCard";
import { EmployeeListCard } from "./EmployeeListCard";
import { RatingSummaryCard } from "./RatingSummaryCard";
import { InfractionCard } from "./InfractionCard";

export interface UIBlock {
  blockType: "employee-card" | "employee-list" | "rating-summary" | "infraction-card";
  blockId: string;
  payload: Record<string, any>;
}

interface UIBlockRendererProps {
  block: UIBlock;
}

export function UIBlockRenderer({ block }: UIBlockRendererProps) {
  switch (block.blockType) {
    case "employee-card":
      return <EmployeeCard payload={block.payload as any} />;
    case "employee-list":
      return <EmployeeListCard payload={block.payload as any} />;
    case "rating-summary":
      return <RatingSummaryCard payload={block.payload as any} />;
    case "infraction-card":
      return <InfractionCard payload={block.payload as any} />;
    default:
      return null;
  }
}

export default UIBlockRenderer;
