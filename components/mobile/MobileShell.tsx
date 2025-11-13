import * as React from 'react';
import Image from 'next/image';
import { Box, Button, Typography } from '@mui/material';
import { MobileFormDrawer } from './MobileFormDrawer';

type ActiveForm = 'positional' | 'infraction' | null;

export interface MobileShellProps {
  location: {
    id: string;
    name?: string | null;
    locationNumber?: string | null;
    orgId?: string | null;
    mobileToken: string;
  };
}

export function MobileShell({ location }: MobileShellProps) {
  const [activeForm, setActiveForm] = React.useState<ActiveForm>(null);

  const locationLabel = React.useMemo(() => {
    const parts = [];
    if (location.name) parts.push(location.name);
    if (location.locationNumber) parts.push(`#${location.locationNumber}`);
    return parts.join(' • ');
  }, [location.locationNumber, location.name]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: { xs: '24px 16px 32px', sm: '32px 20px 48px' },
        gap: 4,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Image
          src="/logos/levelset-horizontal-lockup.png"
          alt="Levelset"
          width={220}
          height={48}
          priority
          style={{ objectFit: 'contain' }}
        />

        <Box sx={{ textAlign: 'center' }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 600,
              fontSize: 24,
              color: '#111827',
            }}
          >
            Mobile Submission Portal
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Satoshi, sans-serif',
              fontSize: 14,
              color: '#4b5563',
              marginTop: '4px',
            }}
          >
            {locationLabel || 'Levelset Location'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
          <Button
            onClick={() => setActiveForm('positional')}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              padding: '20px 24px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #2f7a5c 0%, #30654f 100%)',
              color: '#ffffff',
              boxShadow: '0 12px 24px rgba(49, 102, 74, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #29684f 0%, #28533f 100%)',
                boxShadow: '0 14px 30px rgba(40, 83, 63, 0.28)',
              },
            }}
          >
            <Box>
              <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 18 }}>
                Submit Positional Ratings
              </Typography>
              <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, opacity: 0.8 }}>
                Record Big 5 scores for any team member.
              </Typography>
            </Box>
          </Button>

          <Button
            onClick={() => setActiveForm('infraction')}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              padding: '20px 24px',
              borderRadius: '20px',
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              boxShadow: '0 12px 24px rgba(17, 24, 39, 0.08)',
              '&:hover': {
                backgroundColor: '#f9fafb',
              },
            }}
          >
            <Box>
              <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 18 }}>
                Log a Discipline Infraction
              </Typography>
              <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: '#4b5563' }}>
                Capture infractions and acknowledgements on the floor.
              </Typography>
            </Box>
          </Button>
        </Box>
      </Box>

      <MobileFormDrawer
        open={activeForm === 'positional'}
        title="Positional Excellence Rating"
        subtitle="Complete the Big 5 evaluation"
        onClose={() => setActiveForm(null)}
        footer={
          <Button
            variant="contained"
            disabled
            sx={{
              width: '100%',
              backgroundColor: '#31664a',
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              padding: '14px 12px',
              '&:hover': {
                backgroundColor: '#28533f',
              },
            }}
          >
            Submit rating
          </Button>
        }
      >
        <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontSize: 14, color: '#4b5563' }}>
          The positional excellence form will appear here. This placeholder ensures the drawer layout and navigation
          experience are in place.
        </Typography>
      </MobileFormDrawer>

      <MobileFormDrawer
        open={activeForm === 'infraction'}
        title="Discipline Infraction"
        subtitle="Document points and acknowledgements"
        onClose={() => setActiveForm(null)}
        footer={
          <Button
            variant="contained"
            disabled
            sx={{
              width: '100%',
              backgroundColor: '#31664a',
              fontFamily: 'Satoshi, sans-serif',
              fontWeight: 600,
              textTransform: 'none',
              padding: '14px 12px',
              '&:hover': {
                backgroundColor: '#28533f',
              },
            }}
          >
            Submit infraction
          </Button>
        }
      >
        <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontSize: 14, color: '#4b5563' }}>
          The discipline infraction form will appear here. This placeholder confirms the drawer interactions and guardrails.
        </Typography>
      </MobileFormDrawer>
    </Box>
  );
}

