"use client";

import * as React from "react";
import { Skeleton, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

export interface TableSkeletonProps {
  className?: string;
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  height?: number;
}

export function TableSkeleton({
  className = "",
  rows = 10,
  columns = 5,
  showHeader = true,
  height = 40,
}: TableSkeletonProps) {
  return (
    <TableContainer className={className} data-plasmic-name="table-skeleton">
      <Table>
        {showHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`header-${colIndex}`}>
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
                <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                  <Skeleton variant="text" width="90%" height={height} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

