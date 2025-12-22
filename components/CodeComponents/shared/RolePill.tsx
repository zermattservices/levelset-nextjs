"use client";

import * as React from "react";
import { Box } from "@mui/material";
import { getRoleColor, type RoleColorKey } from "@/lib/role-utils";

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// Legacy role styles for backward compatibility when colorKey is not provided
const LEGACY_ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  "New Hire": { bg: "#dcfce7", text: "#166534" },
  "Team Member": { bg: "#dbeafe", text: "#1d4ed8" },
  Trainer: { bg: "#fee2e2", text: "#dc2626" },
  "Team Lead": { bg: "#fef3c7", text: "#d97706" },
  "Team Leader": { bg: "#fef3c7", text: "#d97706" },
  Director: { bg: "#f3e8ff", text: "#7c3aed" },
  Executive: { bg: "#e0e7ff", text: "#4f46e5" },
  Operator: { bg: "#e0e7ff", text: "#4f46e5" },
  "Area Coordinator": { bg: "#fef3c7", text: "#d97706" },
};

export interface RolePillProps {
  role?: string | null;
  colorKey?: RoleColorKey | string | null;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  tabIndex?: number;
  "data-testid"?: string;
  endIcon?: React.ReactNode;
}

export function RolePill({
  role = "Team Member",
  colorKey,
  onClick,
  className,
  tabIndex,
  "data-testid": dataTestId,
  endIcon,
}: RolePillProps) {
  // If colorKey is provided, use the new color system
  // Otherwise fall back to legacy role-based styles
  const style = colorKey 
    ? getRoleColor(colorKey) 
    : (LEGACY_ROLE_STYLES[role || "Team Member"] || getRoleColor('blue'));

  return (
    <Box
      role={onClick ? "button" : undefined}
      onClick={onClick}
      tabIndex={onClick ? tabIndex ?? 0 : undefined}
      className={className}
      data-testid={dataTestId}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        fontSize: 13,
        fontWeight: 500,
        minHeight: 28,
        height: 28,
        px: 1.5,
        borderRadius: 14,
        backgroundColor: style.bg,
        color: style.text,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s ease-in-out",
        whiteSpace: "nowrap",
        "&:hover": onClick
          ? {
              filter: "brightness(0.96)",
            }
          : undefined,
        "&:focus-visible": onClick
          ? {
              outline: "2px solid rgba(49, 102, 74, 0.5)",
              outlineOffset: 2,
            }
          : undefined,
      }}
    >
      <span>{role}</span>
      {endIcon ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginLeft: 6,
            lineHeight: 0,
          }}
        >
          {endIcon}
        </span>
      ) : null}
    </Box>
  );
}
