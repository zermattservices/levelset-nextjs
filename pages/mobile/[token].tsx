import * as React from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

import { fetchLocationByToken, type MobileLocation } from '@/lib/mobile-location';
import { MobilePortalProvider } from '@/components/mobile/MobilePortalContext';
import { HomeCard } from '@/components/mobile/HomeCard';
import { FormDrawer } from '@/components/mobile/FormDrawer';
import { PositionalRatingsForm } from '@/components/mobile/forms/PositionalRatingsForm';
import { DisciplineInfractionForm } from '@/components/mobile/forms/DisciplineInfractionForm';
import type { FormControlCallbacks, MobileFormKey, SubmissionSummary } from '@/components/mobile/types';

interface MobilePortalPageProps {
  location: MobileLocation;
  token: string;
}

const FORM_CONFIG: Record<
  MobileFormKey,
  {
    title: string;
    description: string;
    submitLabel: string;
  }
> = {
  ratings: {
    title: 'Positional Ratings',
    description: 'Evaluate Team Members across the Big 5 competencies for the selected position.',
    submitLabel: 'Submit Rating',
  },
  infractions: {
    title: 'Discipline Infraction',
    description: 'Document a discipline incident based on the Accountability Points System.',
    submitLabel: 'Record Infraction',
  },
};

const cards: Array<{ key: MobileFormKey; title: string; description: string }> = [
  {
    key: 'ratings',
    title: 'Submit Positional Ratings',
    description: 'Capture Big 5 ratings in real time to keep coaching aligned.',
  },
  {
    key: 'infractions',
    title: 'Log a Discipline Infraction',
    description: 'Document infractions for Team Members according to the Accountability Points System.',
  },
];

function MobilePortalPage({ location, token }: MobilePortalPageProps) {
  const [activeForm, setActiveForm] = React.useState<MobileFormKey | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [submitDisabled, setSubmitDisabled] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [summary, setSummary] = React.useState<SubmissionSummary | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = React.useState<any>(null);
  const [platform, setPlatform] = React.useState<'ios' | 'android' | null>(null);
  const [showInstallHint, setShowInstallHint] = React.useState(false);
  const [showIosGuide, setShowIosGuide] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setPlatform('android');
      setShowInstallHint(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setPlatform('ios');
      setShowInstallHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('levelset.mobile.lastToken', token);
    }
  }, [token]);

  const handleInstallClick = React.useCallback(async () => {
    if (platform === 'android' && installPromptEvent) {
      installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice.catch(() => null);
      if (choice && choice.outcome !== 'dismissed') {
        setShowInstallHint(false);
        setInstallPromptEvent(null);
      }
    } else if (platform === 'ios') {
      setShowIosGuide(true);
    }
  }, [installPromptEvent, platform]);

  const dismissInstallHint = React.useCallback(() => {
    setShowInstallHint(false);
  }, []);

  const submitHandlerRef = React.useRef<(() => Promise<void> | void) | null>(null);

  const closeDrawer = React.useCallback(() => {
    setActiveForm(null);
    setDirty(false);
    setSubmitDisabled(true);
    setSubmitting(false);
    submitHandlerRef.current = null;
  }, []);

  const controls = React.useMemo<FormControlCallbacks>(
    () => ({
      setDirty,
      setSubmitDisabled,
      setSubmitting,
      completeSubmission: (result) => {
        setSummary(result);
        closeDrawer();
      },
      setSubmitHandler: (handler) => {
        submitHandlerRef.current = handler;
      },
    }),
    [closeDrawer]
  );

  const handleSubmit = React.useCallback(() => {
    if (!submitHandlerRef.current) {
      return;
    }

    const maybePromise = submitHandlerRef.current();
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      setSubmitting(true);
      (maybePromise as Promise<unknown>)
        .catch(() => {
          /* handled in form */
        })
        .finally(() => setSubmitting(false));
    }
  }, []);

  const handleOpenForm = React.useCallback(
    (form: MobileFormKey) => {
      setSummary(null);
      submitHandlerRef.current = null;
      setDirty(false);
      setSubmitDisabled(true);
      setSubmitting(false);
      setActiveForm(form);
    },
    []
  );

  const renderActiveForm = React.useCallback(() => {
    if (!activeForm) {
      return null;
    }
    if (activeForm === 'ratings') {
      return <PositionalRatingsForm controls={controls} />;
    }
    return <DisciplineInfractionForm controls={controls} />;
  }, [activeForm, controls]);

  const activeConfig = activeForm ? FORM_CONFIG[activeForm] : null;

  const summaryCard = summary ? (
    <Box
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #d1fae5',
        padding: '24px 28px',
        textAlign: 'center',
        boxShadow: '0 16px 32px rgba(49, 102, 74, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Image
          src="/logos/Levelset no margin.png"
          alt="Levelset"
          width={140}
          height={48}
          priority
          style={{ width: 'min(140px, 50vw)', height: 'auto' }}
        />
      </Box>
      <Typography
        sx={{
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: '#111827',
        }}
      >
        Submission recorded
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 16,
          color: '#1f2937',
        }}
      >
        {summary.employeeName}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 15,
          color: '#4b5563',
        }}
      >
        {summary.detail}
      </Typography>
      {summary.form === 'infractions' && typeof summary.points === 'number' && (
        <Box
          sx={{
            marginTop: 2,
            alignSelf: 'center',
            borderRadius: '16px',
            padding: '16px 28px',
            backgroundColor:
              summary.points < 0 ? '#d1fae5' : summary.points > 0 ? '#fee2e2' : '#f3f4f6',
            color: summary.points < 0 ? '#065f46' : summary.points > 0 ? '#991b1b' : '#374151',
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          {summary.points > 0 ? `+${summary.points}` : summary.points} pts
        </Box>
      )}
      <Button
        variant="contained"
        onClick={() => setSummary(null)}
        sx={{
          marginTop: '12px',
          backgroundColor: '#31664a',
          textTransform: 'none',
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 600,
          '&:hover': { backgroundColor: '#264d38' },
        }}
      >
        Back to home
      </Button>
    </Box>
  ) : null;

  return (
    <MobilePortalProvider
      value={{
        locationId: location.id,
        locationName: location.name ?? null,
        locationNumber: location.location_number ?? null,
        token,
      }}
    >
      <Head>
        <title>{`Levelset Mobile Portal • ${location.name ?? 'Location'}`}</title>
        <meta
          name="description"
          content="Capture positional ratings and discipline infractions quickly from any device."
        />
        <link rel="icon" href="/Levelset Icon Non Trans.png" />
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f2f5f4',
          padding: '32px 16px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            px: 2,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', paddingTop: 1 }}>
            <Image
              src="/logos/Levelset no margin.png"
              alt="Levelset"
              width={220}
              height={72}
              priority
              style={{ width: 'min(220px, 65vw)', height: 'auto' }}
            />
          </Box>

          {!summary && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                sx={{
                  fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#111827',
                }}
              >
                {location.name ?? 'Levelset Mobile'}
              </Typography>
              {location.location_number && (
                <Typography
                  sx={{
                    fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 14,
                    color: '#6b7280',
                    marginTop: '4px',
                  }}
                >
                  Store #{location.location_number}
                </Typography>
              )}
            </Box>
          )}

          {summary ? (
            summaryCard
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {cards.map((card) => (
                <HomeCard
                  key={card.key}
                  title={card.title}
                  description={card.description}
                  onClick={() => handleOpenForm(card.key)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {activeForm && activeConfig && (
        <FormDrawer
          open={Boolean(activeForm)}
          title={activeConfig.title}
          dirty={dirty}
          disabled={submitDisabled}
          submitting={submitting}
          onClose={closeDrawer}
          onSubmit={handleSubmit}
          submitLabel={activeConfig.submitLabel}
        >
          <Typography
            sx={{
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 15,
              color: '#4b5563',
            }}
          >
            {activeConfig.description}
          </Typography>
          {renderActiveForm()}
        </FormDrawer>
      )}

      {showInstallHint && !activeForm && !summary && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1300,
          }}
        >
          <Box
            sx={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderRadius: '999px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 18px 30px rgba(17, 24, 39, 0.15)',
              padding: '8px 12px',
            }}
          >
            <Button
              variant="contained"
              onClick={handleInstallClick}
              sx={{
                textTransform: 'none',
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontWeight: 600,
                backgroundColor: '#31664a',
                borderRadius: '999px',
                padding: '10px 18px',
                '&:hover': { backgroundColor: '#264d38' },
              }}
            >
              Add to Home Screen
            </Button>
            <Button
              onClick={dismissInstallHint}
              sx={{
                textTransform: 'none',
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                color: '#31664a',
              }}
            >
              Not now
            </Button>
          </Box>
        </Box>
      )}

      <Dialog open={showIosGuide} onClose={() => setShowIosGuide(false)}>
        <DialogTitle
          sx={{
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          Add to Home Screen
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 14,
              color: '#4b5563',
            }}
          >
            In Safari, tap the share icon, then choose "Add to Home Screen." This installs the Levelset portal on your
            device for quick access.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '0 20px 16px' }}>
          <Button
            onClick={() => setShowIosGuide(false)}
            sx={{
              textTransform: 'none',
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              color: '#31664a',
              fontWeight: 600,
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </MobilePortalProvider>
  );
}

export const getServerSideProps: GetServerSideProps<MobilePortalPageProps> = async ({ params }) => {
  const tokenParam = params?.token;
  if (typeof tokenParam !== 'string') {
    return { notFound: true };
  }

  const location = await fetchLocationByToken(tokenParam);

  if (!location) {
    return { notFound: true };
  }

  return {
    props: {
      location,
      token: tokenParam,
    },
  };
};

export default MobilePortalPage;

