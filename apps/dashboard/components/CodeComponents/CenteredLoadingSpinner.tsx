"use client";

import * as React from "react";
import { CircularProgress, Box } from "@mui/material";

export interface CenteredLoadingSpinnerProps {
  className?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  children?: React.ReactNode;
  showChildren?: boolean;
}

export function CenteredLoadingSpinner({
  className = "",
  size = 48,
  color = "#31664a" /* TODO: Use design token */,
  backgroundColor = "rgba(255, 255, 255, 0.8)",
  opacity = 0.8,
  children,
  showChildren = false,
}: CenteredLoadingSpinnerProps) {
  // If children provided and showChildren is true, render them beneath/around the spinner
  if (children && showChildren) {
    return (
      <Box className={className} data-plasmic-name="centered-loading-spinner">
        {children}
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: backgroundColor,
        opacity: opacity,
        zIndex: 9999,
      }}
      data-plasmic-name="centered-loading-spinner"
    >
      <CircularProgress
        size={size}
        sx={{
          color: color,
        }}
      />
    </Box>
  );
}

