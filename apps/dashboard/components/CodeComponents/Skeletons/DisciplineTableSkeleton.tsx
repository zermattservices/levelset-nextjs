"use client";

import * as React from "react";
import { Skeleton, Box } from "@mui/material";

export interface DisciplineTableSkeletonProps {
  className?: string;
  rows?: number;
  showActions?: boolean;
  tableClass?: string;
  headerRowClass?: string;
}

export function DisciplineTableSkeleton({
  className = "",
  rows = 10,
  showActions = true,
  tableClass = "rounded-2xl overflow-hidden",
  headerRowClass = "bg-gray-50",
}: DisciplineTableSkeletonProps) {
  return (
    <div
      className={`roster-table-container scrollable ${className}`}
      data-plasmic-name="discipline-table-skeleton"
    >
      <table className={`roster-table ${tableClass}`}>
        <thead>
          <tr className={headerRowClass}>
            <th style={{ textAlign: "center", padding: "12px" }}>Name</th>
            <th style={{ textAlign: "center", padding: "12px" }}>Role</th>
            <th style={{ textAlign: "center", padding: "12px" }}>Last Infraction</th>
            <th style={{ textAlign: "center", padding: "12px" }}>Current Points</th>
            {showActions && <th style={{ textAlign: "center", padding: "12px" }}></th>}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={`skeleton-row-${index}`} className="border-gray-200">
              <td className="name-cell" style={{ padding: "12px" }}>
                <Skeleton variant="text" width="70%" height={20} />
              </td>
              <td className="centered" style={{ padding: "12px" }}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 12 }} />
                </Box>
              </td>
              <td className="centered" style={{ padding: "12px" }}>
                <Skeleton variant="text" width={80} height={20} sx={{ margin: "0 auto" }} />
              </td>
              <td className="centered" style={{ padding: "12px" }}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <Skeleton variant="rounded" width={60} height={28} sx={{ borderRadius: 14 }} />
                </Box>
              </td>
              {showActions && (
                <td className="centered" style={{ padding: "12px" }}>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                    <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: 8 }} />
                    <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 8 }} />
                  </Box>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

