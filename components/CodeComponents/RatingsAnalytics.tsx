import * as React from 'react';
import { Box, Skeleton } from '@mui/material';
import AnalyticsMetricCard from './AnalyticsMetricCard';
import TrendCard from '../TrendCard';
import type { GridRowsProp, GridFilterModel } from '@mui/x-data-grid-pro';

interface RatingsAnalyticsProps {
  locationId: string;
  currentRows: GridRowsProp;
  startDate: Date | null;
  endDate: Date | null;
  showFOH: boolean;
  showBOH: boolean;
  searchText: string;
  filterModel: GridFilterModel | undefined;
  loading: boolean;
  onMetricsCalculated?: (metrics: {
    current: { count: number; avgRating: number; ratingsPerDay: number; days: number };
    prior: { count: number; avgRating: number; ratingsPerDay: number } | null;
    periodText: string;
  }) => void;
}

interface AnalyticsData {
  current: {
    count: number;
    avgRating: number;
    ratingsPerDay: number;
  };
  prior: {
    count: number;
    avgRating: number;
    ratingsPerDay: number;
  } | null;
}

function getPeriodText(days: number): string {
  if (days >= 6 && days <= 8) return 'week';
  if (days >= 28 && days <= 32) return 'month';
  if (days >= 88 && days <= 92) return 'quarter';
  if (days >= 360 && days <= 370) return 'year';
  return `${days} days`;
}

function calculatePercentChange(current: number, prior: number): number {
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
}

function formatChange(current: number, prior: number): string {
  const change = current - prior;
  return change >= 0 ? `+${change}` : `${change}`;
}

export function RatingsAnalytics({
  locationId,
  currentRows,
  startDate,
  endDate,
  showFOH,
  showBOH,
  searchText,
  filterModel,
  loading,
  onMetricsCalculated,
}: RatingsAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);

  // Calculate metrics from current data
  const currentMetrics = React.useMemo(() => {
    // Calculate days between dates
    let days = 30; // Default
    if (startDate && endDate) {
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 0) days = 1; // Prevent division by zero
    }

    if (currentRows.length === 0) {
      return { count: 0, avgRating: 0, ratingsPerDay: 0, days };
    }

    const count = currentRows.length;
    const totalRating = currentRows.reduce((sum, row: any) => sum + (row.rating_avg || 0), 0);
    const avgRating = totalRating / count;
    const ratingsPerDay = count / days;

    return { count, avgRating, ratingsPerDay, days };
  }, [currentRows, startDate, endDate]);

  // Fetch prior period data
  React.useEffect(() => {
    async function fetchPriorPeriod() {
      if (!startDate || !endDate) return;
      if (!locationId) {
        setAnalyticsData(null);
        setAnalyticsLoading(false);
        return;
      }

      setAnalyticsLoading(true);

      try {
        // Calculate prior period dates
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const priorEndDate = new Date(startDate);
        const priorStartDate = new Date(startDate);
        priorStartDate.setDate(priorStartDate.getDate() - daysDiff);

        // Build query params
        const params = new URLSearchParams({
          locationId,
          startDate: priorStartDate.toISOString(),
          endDate: priorEndDate.toISOString(),
          showFOH: showFOH.toString(),
          showBOH: showBOH.toString(),
        });

        if (searchText) {
          params.append('searchText', searchText);
        }

        // Add filter model params
        if (filterModel?.items) {
          filterModel.items.forEach((item, index) => {
            if (item.value) {
              params.append(`filter_${index}_field`, item.field || '');
              params.append(`filter_${index}_operator`, item.operator || '');
              params.append(`filter_${index}_value`, String(item.value));
            }
          });
        }

        const response = await fetch(`/api/ratings/analytics?${params.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Analytics API error:', response.status, errorText);
          setAnalyticsData(null);
          setAnalyticsLoading(false);
          return;
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching prior period:', error);
        setAnalyticsData(null);
      } finally {
        setAnalyticsLoading(false);
      }
    }

    fetchPriorPeriod();
  }, [locationId, startDate, endDate, showFOH, showBOH, searchText, filterModel]);

  const periodText = getPeriodText(currentMetrics.days || 30);
  const priorMetrics = analyticsData?.prior;
  const hasPriorData = priorMetrics && priorMetrics.count > 0;

  // Call onMetricsCalculated whenever metrics are updated
  React.useEffect(() => {
    if (onMetricsCalculated) {
      onMetricsCalculated({
        current: currentMetrics,
        prior: priorMetrics,
        periodText,
      });
    }
  }, [currentMetrics, priorMetrics, periodText, onMetricsCalculated]);

  // Show skeleton during analytics loading (not parent loading)
  if (analyticsLoading) {
    return (
      <Box sx={{ backgroundColor: '#f9fafb', p: 2, display: 'flex', gap: 2, flexWrap: 'nowrap', borderRadius: '16px', mb: '12px' }}>
        <Skeleton 
          variant="rectangular" 
          animation="wave"
          sx={{ 
            flex: 1, 
            height: 106, // Match actual card height (padding + title row + gap + metric row)
            borderRadius: 2,
            backgroundColor: '#e5e7eb',
          }} 
        />
        <Skeleton 
          variant="rectangular" 
          animation="wave"
          sx={{ 
            flex: 1, 
            height: 106,
            borderRadius: 2,
            backgroundColor: '#e5e7eb',
          }} 
        />
        <Skeleton 
          variant="rectangular" 
          animation="wave"
          sx={{ 
            flex: 1, 
            height: 106,
            borderRadius: 2,
            backgroundColor: '#e5e7eb',
          }} 
        />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f9fafb', p: 2, display: 'flex', gap: 2, flexWrap: 'nowrap', borderRadius: '16px', mb: '12px' }}>
      {/* Metric 1: # of Ratings */}
      <AnalyticsMetricCard
        metricName="# of Ratings"
        metricValue={currentMetrics.count.toLocaleString()}
        trendCard={
          hasPriorData ? (
            <TrendCard
              text3={`${Math.abs(calculatePercentChange(currentMetrics.count, priorMetrics.count)).toFixed(1)}`}
              negative={calculatePercentChange(currentMetrics.count, priorMetrics.count) < 0 ? 'negative' : undefined}
            />
          ) : (
            <Box sx={{ 
              backgroundColor: '#e5e7eb', 
              color: '#6b7280', 
              padding: '4px 12px', 
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 600,
            }}>
              % --
            </Box>
          )
        }
        delta={
          hasPriorData ? (
            <span style={{ color: currentMetrics.count >= priorMetrics.count ? '#38A169' : '#E53E3E', fontWeight: 600 }}>
              {formatChange(currentMetrics.count, priorMetrics.count)}
            </span>
          ) : (
            <span style={{ color: '#6b7280', fontWeight: 600 }}>+0</span>
          )
        }
        periodText={hasPriorData ? `over prior ${periodText}` : 'over prior period'}
      />

      {/* Metric 2: Avg. Rating */}
      <AnalyticsMetricCard
        metricName="Avg. Rating"
        metricValue={currentMetrics.avgRating.toFixed(2)}
        trendCard={
          hasPriorData ? (
            <TrendCard
              text3={`${Math.abs(calculatePercentChange(currentMetrics.avgRating, priorMetrics.avgRating)).toFixed(1)}`}
              negative={calculatePercentChange(currentMetrics.avgRating, priorMetrics.avgRating) < 0 ? 'negative' : undefined}
            />
          ) : (
            <Box sx={{ 
              backgroundColor: '#e5e7eb', 
              color: '#6b7280', 
              padding: '4px 12px', 
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 600,
            }}>
              % --
            </Box>
          )
        }
        delta={
          hasPriorData ? (
            <span style={{ color: currentMetrics.avgRating >= priorMetrics.avgRating ? '#38A169' : '#E53E3E', fontWeight: 600 }}>
              {(currentMetrics.avgRating - priorMetrics.avgRating >= 0 ? '+' : '')}{(currentMetrics.avgRating - priorMetrics.avgRating).toFixed(2)}
            </span>
          ) : (
            <span style={{ color: '#6b7280', fontWeight: 600 }}>+0.00</span>
          )
        }
        periodText={hasPriorData ? `over prior ${periodText}` : 'over prior period'}
      />

      {/* Metric 3: Ratings per Day */}
      <AnalyticsMetricCard
        metricName="Ratings per Day"
        metricValue={currentMetrics.ratingsPerDay.toFixed(1)}
        trendCard={
          hasPriorData ? (
            <TrendCard
              text3={`${Math.abs(calculatePercentChange(currentMetrics.ratingsPerDay, priorMetrics.ratingsPerDay)).toFixed(1)}`}
              negative={calculatePercentChange(currentMetrics.ratingsPerDay, priorMetrics.ratingsPerDay) < 0 ? 'negative' : undefined}
            />
          ) : (
            <Box sx={{ 
              backgroundColor: '#e5e7eb', 
              color: '#6b7280', 
              padding: '4px 12px', 
              borderRadius: 2,
              fontSize: 12,
              fontWeight: 600,
            }}>
              % --
            </Box>
          )
        }
        delta={
          hasPriorData ? (
            <span style={{ color: currentMetrics.ratingsPerDay >= priorMetrics.ratingsPerDay ? '#38A169' : '#E53E3E', fontWeight: 600 }}>
              {(currentMetrics.ratingsPerDay - priorMetrics.ratingsPerDay >= 0 ? '+' : '')}{(currentMetrics.ratingsPerDay - priorMetrics.ratingsPerDay).toFixed(1)}
            </span>
          ) : (
            <span style={{ color: '#6b7280', fontWeight: 600 }}>+0.0</span>
          )
        }
        periodText={hasPriorData ? `over prior ${periodText}` : 'over prior period'}
      />
    </Box>
  );
}

export default RatingsAnalytics;

