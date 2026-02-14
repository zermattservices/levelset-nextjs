"use client";

import * as React from "react";
import { Box } from "@mui/material";

export interface DrawerFooterProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  align?: "left" | "center" | "right" | "space-between";
}

export function DrawerFooter({
  children,
  className,
  style,
  align = "right",
}: DrawerFooterProps) {
  const justifyContent = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
    "space-between": "space-between",
  }[align];

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent,
        gap: 2,
        ...style,
      }}
      data-plasmic-name="drawer-footer"
    >
      {children}
    </Box>
  );
}

