"use client";

import * as React from "react";
import { Box } from "@mui/material";

export interface DrawerContentProps {
  children?: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  style?: React.CSSProperties;
}

export function DrawerContent({
  children,
  className,
  scrollable = true,
  style,
}: DrawerContentProps) {
  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflow: scrollable ? "auto" : "visible",
        height: "100%",
        ...style,
      }}
      data-plasmic-name="drawer-content"
    >
      {children}
    </Box>
  );
}

