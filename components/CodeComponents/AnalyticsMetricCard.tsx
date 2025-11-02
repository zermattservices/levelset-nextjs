import * as React from 'react';
import { Box } from '@mui/material';

interface AnalyticsMetricCardProps {
  metricName: string;
  metricValue: string;
  trendCard: React.ReactNode;
  delta: React.ReactNode;
  periodText: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function AnalyticsMetricCard({
  metricName,
  metricValue,
  trendCard,
  delta,
  periodText,
}: AnalyticsMetricCardProps) {
  return (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: 2,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        padding: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        flex: 1,
        minWidth: 0, // Allow flex shrinking
      }}
    >
      {/* Title and Trend Badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box
          sx={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
          }}
        >
          {metricName}
        </Box>
        {trendCard}
      </Box>

      {/* Main Metric Value */}
      <Box
        sx={{
          fontFamily,
          fontSize: 28,
          fontWeight: 700,
          color: '#111827',
          lineHeight: 1,
        }}
      >
        {metricValue}
      </Box>

      {/* Delta and Period Text */}
      <Box
        sx={{
          fontFamily,
          fontSize: 12,
          color: '#6b7280',
          display: 'flex',
          gap: 0.5,
        }}
      >
        {delta}
        {' '}
        {periodText}
      </Box>
    </Box>
  );
}

export default AnalyticsMetricCard;

