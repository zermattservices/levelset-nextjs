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
  CircularProgress,
} from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
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

interface MetricData {
  positionalExcellence: { total: number; change: number };
  disciplinePoints: { total: number; change: number };
  certifiedEmployees: { total: number; percentage: number };
  totalEmployees: number;
  activeLocations: number;
}

export function OrgOverviewTab({ organization, locationNames }: OrgOverviewTabProps) {
  const [selectedLocation, setSelectedLocation] = React.useState<string>('organization');
  const [metrics, setMetrics] = React.useState<MetricData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch metrics based on selected location
  React.useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const locationIds = selectedLocation === 'organization'
          ? organization.locations.map(l => l.id)
          : [selectedLocation];

        // Get date ranges for comparison
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

        // Fetch positional excellence (ratings) for current period
        const { data: currentRatings, error: ratingsError } = await supabase
          .from('ratings')
          .select('id', { count: 'exact' })
          .in('location_id', locationIds)
          .gte('created_at', ninetyDaysAgo.toISOString());

        if (ratingsError) throw ratingsError;

        // Fetch ratings for prior period (for change calculation)
        const { data: priorRatings } = await supabase
          .from('ratings')
          .select('id', { count: 'exact' })
          .in('location_id', locationIds)
          .gte('created_at', oneEightyDaysAgo.toISOString())
          .lt('created_at', ninetyDaysAgo.toISOString());

        // Fetch discipline points for current period
        const { data: currentInfractions, error: infractionsError } = await supabase
          .from('infractions')
          .select('points')
          .in('location_id', locationIds)
          .gte('infraction_date', ninetyDaysAgo.toISOString());

        if (infractionsError) throw infractionsError;

        // Fetch infractions for prior period
        const { data: priorInfractions } = await supabase
          .from('infractions')
          .select('points')
          .in('location_id', locationIds)
          .gte('infraction_date', oneEightyDaysAgo.toISOString())
          .lt('infraction_date', ninetyDaysAgo.toISOString());

        // Calculate discipline points
        const currentPoints = (currentInfractions || []).reduce((sum, i) => sum + (i.points || 0), 0);
        const priorPoints = (priorInfractions || []).reduce((sum, i) => sum + (i.points || 0), 0);

        // Fetch employee stats
        const { data: employees, error: employeesError } = await supabase
          .from('employees')
          .select('id, certified_status')
          .in('location_id', locationIds)
          .eq('active', true);

        if (employeesError) throw employeesError;

        const totalEmployees = employees?.length || 0;
        const certifiedEmployees = (employees || []).filter(
          e => e.certified_status === 'Certified' || e.certified_status === 'PIP'
        ).length;

        setMetrics({
          positionalExcellence: {
            total: currentRatings?.length || 0,
            change: (currentRatings?.length || 0) - (priorRatings?.length || 0),
          },
          disciplinePoints: {
            total: currentPoints,
            change: currentPoints - priorPoints,
          },
          certifiedEmployees: {
            total: certifiedEmployees,
            percentage: totalEmployees > 0 ? Math.round((certifiedEmployees / totalEmployees) * 100) : 0,
          },
          totalEmployees,
          activeLocations: organization.locations.length,
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [selectedLocation, organization.locations, supabase]);

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

      {/* Metrics cards */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <CircularProgress size={32} sx={{ color: '#31664a' }} />
        </div>
      ) : metrics ? (
        <div className={styles.metricsGrid}>
          {/* Positional Excellence */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Positional Excellence</span>
            </div>
            <div className={styles.metricValue}>{metrics.positionalExcellence.total.toLocaleString()}</div>
            <div className={styles.metricSubtext}>
              <span className={metrics.positionalExcellence.change >= 0 ? styles.changePositive : styles.changeNegative}>
                {metrics.positionalExcellence.change >= 0 ? '+' : ''}{metrics.positionalExcellence.change}
              </span>
              <span className={styles.metricPeriod}>vs prior 90 days</span>
            </div>
          </div>

          {/* Discipline Points */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Discipline Points</span>
            </div>
            <div className={styles.metricValue}>{metrics.disciplinePoints.total.toLocaleString()}</div>
            <div className={styles.metricSubtext}>
              <span className={metrics.disciplinePoints.change <= 0 ? styles.changePositive : styles.changeNegative}>
                {metrics.disciplinePoints.change >= 0 ? '+' : ''}{metrics.disciplinePoints.change}
              </span>
              <span className={styles.metricPeriod}>vs prior 90 days</span>
            </div>
          </div>

          {/* Total Employees */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Total Employees</span>
            </div>
            <div className={styles.metricValue}>{metrics.totalEmployees.toLocaleString()}</div>
            <div className={styles.metricSubtext}>
              <span className={styles.metricPeriod}>active employees</span>
            </div>
          </div>

          {/* Certified Employees */}
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricTitle}>Certified Employees</span>
            </div>
            <div className={styles.metricValue}>{metrics.certifiedEmployees.percentage}%</div>
            <div className={styles.metricSubtext}>
              <span className={styles.metricPeriod}>{metrics.certifiedEmployees.total} of {metrics.totalEmployees} employees</span>
            </div>
          </div>

          {/* Active Locations (only show for org view) */}
          {selectedLocation === 'organization' && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>Active Locations</span>
              </div>
              <div className={styles.metricValue}>{metrics.activeLocations}</div>
              <div className={styles.metricSubtext}>
                <span className={styles.metricPeriod}>locations in organization</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Typography sx={{ fontFamily: '"Satoshi", sans-serif', color: '#999' }}>
            Unable to load metrics
          </Typography>
        </div>
      )}
    </div>
  );
}

export default OrgOverviewTab;
