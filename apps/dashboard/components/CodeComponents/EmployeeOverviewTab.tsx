"use client";

import * as React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee } from "@/lib/supabase.types";
import styles from "./EmployeeOverviewTab.module.css";

export interface EmployeeOverviewTabProps {
  employee: Employee;
  locationId: string;
}

export function EmployeeOverviewTab({ employee, locationId }: EmployeeOverviewTabProps) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Placeholder — will be replaced with real data fetching
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [employee.id, locationId]);

  if (loading) {
    return (
      <Box className={styles.container}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      {/* Section 1: Operational Excellence */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Operational Excellence</Typography>
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 2: Positional Ratings */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Positional Ratings</Typography>
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 3: Discipline */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Discipline</Typography>
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 4: Evaluations (stub) */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Evaluations</Typography>
        <Box className={styles.stubMessage}>Coming soon!</Box>
      </Box>

      {/* Section 5: Pathway (stub) */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Pathway</Typography>
        <Box className={styles.stubMessage}>Coming soon!</Box>
      </Box>
    </Box>
  );
}
