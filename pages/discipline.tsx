import * as React from 'react';
import { useRouter } from 'next/router';
import { Box, Typography } from '@mui/material';
import { AppShell } from '@/components/layouts/AppShell';
import { DisciplineTable } from '@/components/CodeComponents/DisciplineTable';
import { DisciplineNotifications } from '@/components/CodeComponents/RecommendedActions';
import { DisciplineActionsTable } from '@/components/CodeComponents/DisciplineActionsTable';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/components/CodeComponents/AuthContext';
import { colors } from '@/lib/theme';

const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Locations where discipline features are disabled
const DISCIPLINE_DISABLED_LOCATIONS = ['05467'];

function AccessDeniedMessage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        textAlign: 'center',
        p: 4,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontFamily: montFont,
          fontSize: 24,
          fontWeight: 700,
          color: colors.textPrimary,
          mb: 2,
        }}
      >
        Access Restricted
      </Typography>
      <Typography
        sx={{
          fontFamily: satoshiFont,
          fontSize: 16,
          color: colors.textSecondary,
          maxWidth: 400,
        }}
      >
        You don&apos;t have access to this page. The discipline feature is not available for your location.
      </Typography>
    </Box>
  );
}

function DisciplineContent() {
  const router = useRouter();
  const { isLoaded, isAuthenticated, role, user } = useAuth();
  const { selectedLocationNumber, selectedLocationId } = useLocationContext();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoaded, isAuthenticated, router]);

  // Check if discipline is disabled for this location
  const isDisciplineDisabled = DISCIPLINE_DISABLED_LOCATIONS.includes(selectedLocationNumber ?? '');
  const isLevelsetAdmin = role === 'Levelset Admin';

  // Show access denied if discipline is disabled and user is not a Levelset Admin
  if (isDisciplineDisabled && !isLevelsetAdmin) {
    return <AccessDeniedMessage />;
  }

  return (
    <Box>
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
          Discipline
        </Typography>
        <Typography
          sx={{
            fontFamily: satoshiFont,
            fontSize: 16,
            color: colors.textSecondary,
          }}
        >
          Track and manage employee discipline records
        </Typography>
      </Box>

      {/* Recommended Actions / Notifications */}
      <Box sx={{ mb: 4 }}>
        <DisciplineNotifications 
          locationId={selectedLocationId || ''} 
          currentUser={null}
          currentUserId={user?.id}
        />
      </Box>

      {/* Discipline Points Table */}
      <Box
        sx={{
          bgcolor: colors.backgroundDefault,
          borderRadius: 2,
          border: `1px solid ${colors.divider}`,
          overflow: 'hidden',
          mb: 4,
        }}
      >
        <DisciplineTable locationId={selectedLocationId || ''} />
      </Box>

      {/* Discipline Actions History */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h2"
          sx={{
            fontFamily: montFont,
            fontSize: { xs: 18, md: 20 },
            fontWeight: 700,
            color: colors.textPrimary,
            mb: 2,
          }}
        >
          Action History
        </Typography>
      </Box>
      <Box
        sx={{
          bgcolor: colors.backgroundDefault,
          borderRadius: 2,
          border: `1px solid ${colors.divider}`,
          overflow: 'hidden',
        }}
      >
        <DisciplineActionsTable locationId={selectedLocationId || ''} />
      </Box>
    </Box>
  );
}

function Discipline() {
  return (
    <AppShell>
      <DisciplineContent />
    </AppShell>
  );
}

export default Discipline;
