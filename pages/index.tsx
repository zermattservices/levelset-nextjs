import * as React from 'react';
import { useRouter } from 'next/router';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { AppShell } from '@/components/layouts/AppShell';
import { DashboardMetricCard } from '@/components/CodeComponents/DashboardMetricCard';
import { LocationSelectModal } from '@/components/CodeComponents/LocationSelectModal';
import { useAuth } from '@/components/CodeComponents/AuthContext';
import { colors } from '@/lib/theme';

const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function DashboardContent() {
  const router = useRouter();
  const { isLoaded, isAuthenticated, firstName } = useAuth();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoaded, isAuthenticated, router]);

  const displayName = firstName || 'there';

  return (
    <Box>
      {/* Location Select Modal - shows when no location is selected */}
      <LocationSelectModal />

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h1"
          sx={{
            fontFamily: montFont,
            fontSize: { xs: 24, md: 32 },
            fontWeight: 700,
            color: colors.textPrimary,
            mb: 1,
          }}
        >
          Welcome back, {displayName}
        </Typography>
        <Typography
          sx={{
            fontFamily: satoshiFont,
            fontSize: 16,
            color: colors.textSecondary,
          }}
        >
          Here&apos;s what&apos;s happening at your location
        </Typography>
      </Box>

      {/* Metric Cards */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardMetricCard
            variant="positional-excellence"
            linkHref="/positional-excellence"
            onClick={() => router.push('/positional-excellence')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardMetricCard
            variant="discipline-points"
            linkHref="/discipline"
            onClick={() => router.push('/discipline')}
          />
        </Grid>
      </Grid>

      {/* Quick Actions Section */}
      <Box sx={{ mt: 6 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: montFont,
            fontSize: { xs: 18, md: 20 },
            fontWeight: 700,
            color: colors.textPrimary,
            mb: 3,
          }}
        >
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              onClick={() => router.push('/admin')}
              sx={{
                p: 3,
                bgcolor: colors.backgroundDefault,
                borderRadius: 2,
                border: `1px solid ${colors.divider}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: colors.primary,
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <Typography
                sx={{
                  fontFamily: satoshiFont,
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  mb: 0.5,
                }}
              >
                Manage Team
              </Typography>
              <Typography
                sx={{
                  fontFamily: satoshiFont,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                View and edit employee roster
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              onClick={() => router.push('/discipline')}
              sx={{
                p: 3,
                bgcolor: colors.backgroundDefault,
                borderRadius: 2,
                border: `1px solid ${colors.divider}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: colors.primary,
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <Typography
                sx={{
                  fontFamily: satoshiFont,
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  mb: 0.5,
                }}
              >
                Discipline Tracker
              </Typography>
              <Typography
                sx={{
                  fontFamily: satoshiFont,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                Record and review infractions
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              onClick={() => router.push('/positional-excellence')}
              sx={{
                p: 3,
                bgcolor: colors.backgroundDefault,
                borderRadius: 2,
                border: `1px solid ${colors.divider}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: colors.primary,
                  boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
                },
              }}
            >
              <Typography
                sx={{
                  fontFamily: satoshiFont,
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.textPrimary,
                  mb: 0.5,
                }}
              >
                PEA Ratings
              </Typography>
              <Typography
                sx={{
                  fontFamily: satoshiFont,
                  fontSize: 14,
                  color: colors.textSecondary,
                }}
              >
                View positional excellence scores
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

function Homepage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

export default Homepage;
