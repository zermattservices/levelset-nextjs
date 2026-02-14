"use client";

import * as React from "react";
import { Skeleton, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { styled } from "@mui/material/styles";

const fontFamily = `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

const StyledContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflow: "hidden",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
}));

const StyledTable = styled(Table)(() => ({
  "& th": {
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#111827",
    lineHeight: 1.2,
    fontFamily,
    padding: "12px",
  },
  "& td": {
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.2,
    fontFamily,
    padding: "12px",
  },
}));

export interface EmployeeTableSkeletonProps {
  className?: string;
  rows?: number;
  showActions?: boolean;
}

export function EmployeeTableSkeleton({
  className = "",
  rows = 10,
  showActions = true,
}: EmployeeTableSkeletonProps) {
  return (
    <StyledContainer className={className} data-plasmic-name="employee-table-skeleton">
      <StyledTable>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Current Role</TableCell>
            <TableCell align="center">FOH</TableCell>
            <TableCell align="center">BOH</TableCell>
            <TableCell align="center">Availability</TableCell>
            <TableCell align="center">Certified</TableCell>
            <TableCell align="center">Suggested Pay</TableCell>
            {showActions && <TableCell align="right"></TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={`skeleton-row-${index}`}>
              <TableCell>
                <Skeleton variant="text" width="80%" height={20} />
              </TableCell>
              <TableCell>
                <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: 12 }} />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Skeleton variant="rectangular" width={18} height={18} />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Skeleton variant="rectangular" width={18} height={18} />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 12, margin: "0 auto" }} />
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Skeleton variant="rectangular" width={18} height={18} />
                </Box>
              </TableCell>
              <TableCell align="center">
                <Skeleton variant="text" width={70} height={20} sx={{ margin: "0 auto" }} />
              </TableCell>
              {showActions && (
                <TableCell align="right">
                  <Skeleton variant="circular" width={28} height={28} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </StyledTable>
    </StyledContainer>
  );
}

