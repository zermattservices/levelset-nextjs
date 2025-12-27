/**
 * OrgOverviewTab
 * Overview tab for organization modal showing aggregated metrics
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
import { DashboardMetricCard } from '@/components/CodeComponents/DashboardMetricCard';
import styles from './OrgOverviewTab.module.css';

interface Location {
  id: string;
  location_number: string;
  org_id: string;
}

interface Organization {
  id: string;
  name: string;
  locations: Location[];
  operator_name: string | null;
}

interface OrgOverviewTabProps {
  organization: Organization;
  locationNames: Map<string, string>;
}

export function OrgOverviewTab({ organization, locationNames }: OrgOverviewTabProps) {
  const [selectedLocation, setSelectedLocation] = React.useState<string>('organization');

  // Get the location ID(s) to pass to DashboardMetricCard
  // For organization view, pass all location IDs for aggregation
  const selectedLocationIds = selectedLocation === 'organization' 
    ? organization.locations.map(l => l.id)
    : undefined;
  const selectedLocationId = selectedLocation === 'organization' 
    ? undefined
    : selectedLocation;

  // Get display name for selected location
  const getLocationDisplayName = (locId: string): string => {
    if (locId === 'organization') {
      return 'Organization Summary';
    }
    const location = organization.locations.find(l => l.id === locId);
    if (location) {
      const cfaName = locationNames.get(location.location_number);
      if (cfaName) {
        return `${cfaName.replace(/^CFA\s+/, '')} Summary`;
      }
      return `Location ${location.location_number} Summary`;
    }
    return 'Summary';
  };

  return (
    <div className={styles.container}>
      {/* Header row with title and dropdown */}
      <div className={styles.headerRow}>
        <Typography
          sx={{
            fontFamily: '"Satoshi", sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            color: '#0d1b14',
          }}
        >
          {getLocationDisplayName(selectedLocation)}
        </Typography>

        <FormControl size="small">
          <Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            sx={{
              fontFamily: '"Satoshi", sans-serif',
              fontSize: '14px',
              minWidth: 200,
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e5e5e5',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#31664a',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#31664a',
              },
            }}
          >
            <MenuItem value="organization">Organization</MenuItem>
            {organization.locations.map(loc => {
              const cfaName = locationNames.get(loc.location_number);
              const displayName = cfaName 
                ? cfaName.replace(/^CFA\s+/, '')
                : `Location ${loc.location_number}`;
              return (
                <MenuItem key={loc.id} value={loc.id}>
                  {displayName} ({loc.location_number})
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </div>

      {/* Dashboard Metric Cards - same as homepage */}
      <div className={styles.metricsGrid}>
        <DashboardMetricCard
          variant="positional-excellence"
          locationId={selectedLocationId}
          locationIds={selectedLocationIds}
        />
        <DashboardMetricCard
          variant="discipline-points"
          locationId={selectedLocationId}
          locationIds={selectedLocationIds}
        />
      </div>
    </div>
  );
}

export default OrgOverviewTab;


