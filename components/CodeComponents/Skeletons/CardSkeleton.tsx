"use client";

import * as React from "react";
import { Skeleton, Box, Card, CardContent } from "@mui/material";

export interface CardSkeletonProps {
  className?: string;
  count?: number;
  variant?: "metric" | "dashboard" | "simple";
  width?: string | number;
  height?: string | number;
}

export function CardSkeleton({
  className = "",
  count = 1,
  variant = "metric",
  width = "100%",
  height = "auto",
}: CardSkeletonProps) {
  const renderMetricCard = () => (
    <Card
      sx={{
        width,
        height,
        borderRadius: 2,
        boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
        border: "1px solid #e5e7eb",
      }}
    >
      <CardContent>
        <Skeleton variant="text" width="40%" height={16} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="30%" height={14} />
      </CardContent>
    </Card>
  );

  const renderDashboardCard = () => (
    <Card
      sx={{
        width,
        height,
        borderRadius: 2,
        boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
        border: "1px solid #e5e7eb",
      }}
    >
      <CardContent>
        <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={16} />
      </CardContent>
    </Card>
  );

  const renderSimpleCard = () => (
    <Skeleton
      variant="rounded"
      width={width}
      height={height || 100}
      sx={{ borderRadius: 2 }}
    />
  );

  const renderCard = () => {
    switch (variant) {
      case "metric":
        return renderMetricCard();
      case "dashboard":
        return renderDashboardCard();
      case "simple":
        return renderSimpleCard();
      default:
        return renderMetricCard();
    }
  };

  return (
    <Box
      className={className}
      sx={{
        display: "flex",
        flexDirection: count > 1 ? "row" : "column",
        gap: 2,
        flexWrap: "wrap",
      }}
      data-plasmic-name="card-skeleton"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Box key={`card-skeleton-${index}`} sx={{ flex: count > 1 ? "1 1 200px" : "1" }}>
          {renderCard()}
        </Box>
      ))}
    </Box>
  );
}

