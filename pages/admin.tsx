import * as React from 'react';
import { useRouter } from 'next/router';
import { Box, Typography } from '@mui/material';
import { AppShell } from '@/components/layouts/AppShell';
import { RosterTable } from '@/components/CodeComponents/RosterTable';
import { useAuth } from '@/components/CodeComponents/AuthContext';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { colors } from '@/lib/theme';

const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function AdminContent() {
  const router = useRouter();
  const { isLoaded, isAuthenticated } = useAuth();
  const { selectedLocationId } = useLocationContext();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (isLoaded && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoaded, isAuthenticated, router]);

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
          Team
        </Typography>
        <Typography
          sx={{
            fontFamily: satoshiFont,
            fontSize: 16,
            color: colors.textSecondary,
          }}
        >
          Manage your team roster and employee information
        </Typography>
      </Box>

      {/* Roster Table */}
      <Box
        sx={{
          bgcolor: colors.backgroundDefault,
          borderRadius: 2,
          border: `1px solid ${colors.divider}`,
          overflow: 'hidden',
        }}
      >
        <RosterTable locationId={selectedLocationId || ''} />
      </Box>
    </Box>
  );
}

function Admin() {
  return (
    <AppShell>
      <AdminContent />
    </AppShell>
  );
}

export default Admin;
