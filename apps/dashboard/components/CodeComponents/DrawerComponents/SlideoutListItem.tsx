"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";

export interface SlideoutListItemProps {
  icon?: React.ReactNode;
  label?: React.ReactNode;
  value?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SlideoutListItem({
  icon,
  label,
  value,
  onClick,
  className,
  style,
}: SlideoutListItemProps) {
  return (
    <Box
      className={className}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: "8px",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color 0.15s ease",
        "&:hover": onClick ? {
          backgroundColor: "var(--ls-color-neutral-foreground)",
        } : undefined,
        ...style,
      }}
      data-plasmic-name="slideout-list-item"
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {icon && (
          <Box sx={{ display: "flex", alignItems: "center", color: "var(--ls-color-muted)" }}>
            {icon}
          </Box>
        )}
        <Typography
          variant="body2"
          sx={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--ls-color-neutral-soft-foreground)",
          }}
        >
          {label}
        </Typography>
      </Box>
      {value && (
        <Typography
          variant="body2"
          sx={{
            fontSize: "14px",
            color: "var(--ls-color-muted)",
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
}

