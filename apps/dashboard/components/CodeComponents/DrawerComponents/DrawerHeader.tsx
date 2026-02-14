"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";

export interface DrawerHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DrawerHeader({ title, subtitle, className, style }: DrawerHeaderProps) {
  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        ...style,
      }}
      data-plasmic-name="drawer-header"
    >
      {title && (
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            lineHeight: "24px",
            color: "var(--ls-color-neutral-soft-foreground)",
          }}
        >
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography
          variant="body2"
          component="div"
          sx={{
            fontSize: "14px",
            lineHeight: "20px",
            color: "var(--ls-color-muted)",
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

