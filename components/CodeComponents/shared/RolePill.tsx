"use client";

import * as React from "react";
import { Box } from "@mui/material";

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  "New Hire": { bg: "#f0fdf4", color: "#166534" },
  "Team Member": { bg: "#eff6ff", color: "#1d4ed8" },
  Trainer: { bg: "#fef2f2", color: "#dc2626" },
  "Team Lead": { bg: "#fef3c7", color: "#d97706" },
  Director: { bg: "#f3e8ff", color: "#7c3aed" },
  Executive: { bg: "#F0F0FF", color: "#483D8B" },
  Operator: { bg: "#F0F0FF", color: "#483D8B" },
};

export interface RolePillProps {
  role?: string | null;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  tabIndex?: number;
  "data-testid"?: string;
}

export function RolePill({
  role = "Team Member",
  onClick,
  className,
  tabIndex,
  "data-testid": dataTestId,
}: RolePillProps) {
  const style = ROLE_STYLES[role] || ROLE_STYLES["Team Member"];

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
        fontSize: 12,
        fontWeight: 500,
        minHeight: 24,
        px: 1.5,
        borderRadius: 12,
        backgroundColor: style.bg,
        color: style.color,
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
      {role}
    </Box>
  );
}


