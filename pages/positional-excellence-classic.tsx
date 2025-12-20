import * as React from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppShell } from '@/components/layouts/AppShell';
import { FohBohSlider } from '@/components/CodeComponents/FohBohSlider';
import { PositionButtons } from '@/components/CodeComponents/PositionButtons';
import { ScoreboardTable } from '@/components/CodeComponents/ScoreboardTable';
import { PEARubric } from '@/components/CodeComponents/PEARubric';
import { PEAClassic } from '@/components/CodeComponents/PEAClassic';
import { useAuth } from '@/components/CodeComponents/AuthContext';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { colors } from '@/lib/theme';

const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function PositionalExcellenceClassicContent() {
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
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
            Positional Excellence (Classic)
          </Typography>
          <Typography
            sx={{
              fontFamily: satoshiFont,
              fontSize: 16,
              color: colors.textSecondary,
            }}
          >
            Classic view for positional excellence tracking
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/positional-excellence')}
          sx={{
            fontFamily: satoshiFont,
            fontSize: 14,
            fontWeight: 500,
            color: colors.textSecondary,
            borderColor: colors.divider,
            '&:hover': {
              borderColor: colors.border,
              bgcolor: colors.backgroundGrey,
            },
          }}
        >
          Back to New View
        </Button>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FohBohSlider />
        <PositionButtons />
      </Box>

      {/* Scoreboard Table */}
      <Box
        sx={{
          bgcolor: colors.backgroundDefault,
          borderRadius: 2,
          border: `1px solid ${colors.divider}`,
          overflow: 'hidden',
          mb: 4,
        }}
      >
        <ScoreboardTable />
      </Box>

      {/* PEA Rubric */}
      <Box sx={{ mb: 4 }}>
        <PEARubric />
      </Box>

      {/* PEA Classic Table */}
      <Box
        sx={{
          bgcolor: colors.backgroundDefault,
          borderRadius: 2,
          border: `1px solid ${colors.divider}`,
          overflow: 'hidden',
        }}
      >
        <PEAClassic locationId={selectedLocationId || ''} />
      </Box>
    </Box>
  );
}

function PeaClassic() {
  return (
    <AppShell>
      <PositionalExcellenceClassicContent />
    </AppShell>
  );
}

export default PeaClassic;
