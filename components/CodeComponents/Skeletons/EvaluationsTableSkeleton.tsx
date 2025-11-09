"use client";

import * as React from "react";
import { Box, Skeleton } from "@mui/material";

export interface EvaluationsTableSkeletonProps {
  className?: string;
  rows?: number;
}

const headers = [
  "Employee",
  "Role",
  "Leader",
  "Rating Status",
  "Month",
  "Date",
  "Status",
];

export function EvaluationsTableSkeleton({
  className = "",
  rows = 8,
}: EvaluationsTableSkeletonProps) {
  return (
    <Box
      className={className}
      data-plasmic-name="evaluations-table-skeleton"
      sx={{
        width: "100%",
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        backgroundColor: "#ffffff",
        boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
        overflow: "hidden",
        fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <Box
        component="div"
        sx={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1.2fr 1fr 0.8fr 1fr 1fr",
          gap: 0,
          backgroundColor: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
          px: 3,
          py: 1.5,
        }}
      >
        {headers.map((header) => (
          <Skeleton
            key={header}
            variant="text"
            width="60%"
            height={20}
            sx={{ fontSize: 12, backgroundColor: "transparent" }}
          />
        ))}
      </Box>

      <Box component="div">
        {Array.from({ length: rows }).map((_, index) => (
          <Box
            key={`evaluation-skeleton-row-${index}`}
            sx={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr 1.2fr 1fr 0.8fr 1fr 1fr",
              alignItems: "center",
              px: 3,
              py: 2,
              borderBottom: "1px solid #e5e7eb",
              "&:last-of-type": {
                borderBottom: "none",
              },
            }}
          >
            <Skeleton variant="text" width="75%" height={20} />
            <Skeleton variant="rounded" width={96} height={24} sx={{ borderRadius: 12 }} />
            <Skeleton variant="text" width="80%" height={20} />
            <Skeleton variant="rounded" width={140} height={28} sx={{ borderRadius: 14 }} />
            <Skeleton variant="text" width="70%" height={20} />
            <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: 12 }} />
            <Skeleton variant="rounded" width={120} height={28} sx={{ borderRadius: 12 }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}


