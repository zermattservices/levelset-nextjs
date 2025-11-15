"use client";

import * as React from "react";
import { Skeleton, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

export interface ScoreboardSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function ScoreboardSkeleton({
  className = "",
  rows = 15,
  columns = 8,
  showHeader = true,
}: ScoreboardSkeletonProps) {
  return (
    <Box className={className} data-plasmic-name="scoreboard-skeleton" sx={{ width: "100%", overflow: "auto" }}>
      {/* Header skeleton */}
      <Box sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="rectangular" width={100} height={100} sx={{ borderRadius: 2 }} />
        </Box>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`tab-${index}`} variant="rounded" width={80} height={36} sx={{ borderRadius: 8 }} />
          ))}
        </Box>
        <Skeleton variant="text" width="100%" height={20} />
      </Box>

      {/* Table skeleton */}
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          {showHeader && (
            <TableHead>
              <TableRow>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={`header-${colIndex}`} sx={{ p: 1 }}>
                    <Skeleton variant="text" width="80%" height={20} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={`cell-${rowIndex}-${colIndex}`} sx={{ p: 1 }}>
                    {colIndex === 0 ? (
                      <Skeleton variant="text" width="90%" height={20} />
                    ) : (
                      <Skeleton variant="text" width="60%" height={20} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

