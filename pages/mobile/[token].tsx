import * as React from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Typography,
  IconButton,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { fetchLocationByToken, type MobileLocation } from '@/lib/mobile-location';
import { MobilePortalProvider } from '@/components/mobile/MobilePortalContext';
import { HomeCard } from '@/components/mobile/HomeCard';
import { FormDrawer } from '@/components/mobile/FormDrawer';
import { PositionalRatingsForm } from '@/components/mobile/forms/PositionalRatingsForm';
import { DisciplineInfractionForm } from '@/components/mobile/forms/DisciplineInfractionForm';
import type { FormControlCallbacks, MobileFormKey, SubmissionSummary } from '@/components/mobile/types';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

interface MobilePortalPageProps {
  location: MobileLocation;
  token: string;
}

// Form config will be translated in component using useTranslation
const cards: Array<{ key: MobileFormKey; titleKey: string; descriptionKey: string }> = [
  {
    key: 'ratings',
    titleKey: 'forms:ratings.title',
    descriptionKey: 'forms:ratings.description',
  },
  {
    key: 'infractions',
    titleKey: 'forms:infraction.title',
    descriptionKey: 'forms:infraction.description',
  },
];

type Language = 'en' | 'es';

const LANGUAGES: Array<{ code: Language; label: string; nativeLabel: string }> = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
];

function MobilePortalPage({ location, token }: MobilePortalPageProps) {
  const { t } = useTranslation(['forms', 'common'], { nsMode: 'fallback' });
  const [activeForm, setActiveForm] = React.useState<MobileFormKey | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [submitDisabled, setSubmitDisabled] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [summary, setSummary] = React.useState<SubmissionSummary | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = React.useState<any>(null);
  const [platform, setPlatform] = React.useState<'ios' | 'android' | null>(null);
  const [showInstallHint, setShowInstallHint] = React.useState(false);
  const [showIosGuide, setShowIosGuide] = React.useState(false);
  const [language, setLanguage] = React.useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('levelset.mobile.language');
      return (saved === 'es' || saved === 'en') ? saved : 'en';
    }
    return 'en';
  });
  const [languageMenuAnchor, setLanguageMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [thresholds, setThresholds] = React.useState<{ yellow_threshold: number; green_threshold: number } | null>(null);

  // Fetch rating thresholds
  React.useEffect(() => {
    if (!location?.id) return;
    
    fetch(`/api/mobile/${encodeURIComponent(token)}/rating-thresholds`)
      .then((res) => res.json())
      .then((data) => {
        if (data.yellow_threshold && data.green_threshold) {
          setThresholds({
            yellow_threshold: Number(data.yellow_threshold),
            green_threshold: Number(data.green_threshold),
          });
        } else {
          // Fallback to defaults
          setThresholds({ yellow_threshold: 1.75, green_threshold: 2.75 });
        }
      })
      .catch(() => {
        // Fallback to defaults on error
        setThresholds({ yellow_threshold: 1.75, green_threshold: 2.75 });
      });
  }, [location?.id, token]);

  // Initialize i18n with saved language
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Persist language to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('levelset.mobile.language', language);
    }
  }, [language]);

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
        // Only show summary if it's a successful submission (has employee name)
        if (result.employeeName && result.employeeName !== '') {
          setSummary(result);
        }
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

  const activeConfig = activeForm ? {
    title: activeForm === 'ratings' ? t('forms:ratings.title') : t('forms:infraction.title'),
    description: activeForm === 'ratings' ? t('forms:ratings.description') : t('forms:infraction.description'),
    submitLabel: activeForm === 'ratings' ? t('forms:ratings.submitLabel') : t('forms:infraction.submitLabel'),
  } : null;

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
      <Typography
        sx={{
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: '#111827',
        }}
      >
        {t('common:success.title')}
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
      {summary.position && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              backgroundColor: summary.positionZone === 'BOH' ? '#fffcf0' : '#eaf9ff',
              border: `1px solid ${summary.positionZone === 'BOH' ? '#ffcc5b' : '#006391'}`,
              borderRadius: '16px',
              padding: '6px 14px',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: summary.positionZone === 'BOH' ? '#92400e' : '#006391',
              }}
            >
              {summary.position}
            </Typography>
            <Box
              sx={{
                backgroundColor: summary.positionZone === 'BOH' ? '#ffcc5b' : '#006391',
                color: summary.positionZone === 'BOH' ? '#92400e' : '#ffffff',
                borderRadius: '8px',
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {summary.positionZone || 'FOH'}
            </Box>
          </Box>
        </Box>
      )}
      {summary.form === 'ratings' && typeof summary.overallRating === 'number' ? (
        <Box
          sx={{
            marginTop: 2,
            alignSelf: 'center',
            borderRadius: '12px',
            padding: '20px 32px',
            backgroundColor:
              thresholds && summary.overallRating >= thresholds.green_threshold
                ? '#d1fae5'
                : thresholds && summary.overallRating >= thresholds.yellow_threshold
                ? '#fef3c7'
                : '#fee2e2',
            color:
              thresholds && summary.overallRating >= thresholds.green_threshold
                ? '#065f46'
                : thresholds && summary.overallRating >= thresholds.yellow_threshold
                ? '#92400e'
                : '#991b1b',
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            textAlign: 'center',
            minWidth: '200px',
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 1,
              opacity: 0.9,
            }}
          >
            {t('common:success.overallRating')}
          </Typography>
          <Typography
            sx={{
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            {summary.overallRating.toFixed(2)}
          </Typography>
        </Box>
      ) : (
        <Typography
          sx={{
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 15,
            color: '#4b5563',
          }}
        >
          {summary.detail}
        </Typography>
      )}
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
          borderRadius: '8px',
          '&:hover': { backgroundColor: '#264d38' },
        }}
      >
        {t('common:success.backToHome')}
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
        language,
      }}
    >
      <Head>
        <title>{`Levelset Mobile Portal - ${location.name ?? 'Location'}`}</title>
        <meta
          key="description"
          name="description"
          content="Capture positional ratings and discipline infractions quickly from any device."
        />
        
        {/* Open Graph / Social Sharing */}
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:title" property="og:title" content={`Levelset Mobile Portal - ${location.name ?? 'Location'}`} />
        <meta key="og:description" property="og:description" content="Capture positional ratings and discipline infractions quickly from any device." />
        <meta key="og:image" property="og:image" content="https://app.levelset.io/Levelset App Opengraph.png" />
        <meta key="og:url" property="og:url" content={`https://app.levelset.io/mobile/${token}`} />
        <meta key="og:site_name" property="og:site_name" content="Levelset" />
        
        {/* Twitter Card */}
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="twitter:title" name="twitter:title" content={`Levelset Mobile Portal - ${location.name ?? 'Location'}`} />
        <meta key="twitter:description" name="twitter:description" content="Capture positional ratings and discipline infractions quickly from any device." />
        <meta key="twitter:image" name="twitter:image" content="https://app.levelset.io/Levelset App Opengraph.png" />
        
        <link rel="manifest" href={`/api/mobile/manifest/${token}`} />
        <link rel="icon" href="/Levelset Icon Non Trans.png" />
        
        {/* Apple PWA status bar - transparent to show background */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Synchronous body background for iOS status bar transparency */}
        <style>{`
          html, body {
            background-color: #f2f5f4 !important;
          }
        `}</style>
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f2f5f4',
          padding: '16px 16px 48px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            px: 2,
          }}
        >
          {/* Header row with logo and language selector */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Box sx={{ flex: 1 }} /> {/* Spacer for centering */}
            <Image
              src="/logos/Levelset no margin.png"
              alt="Levelset"
              width={180}
              height={60}
              priority
              style={{ width: 'min(180px, 50vw)', height: 'auto' }}
            />
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                onClick={(e) => setLanguageMenuAnchor(e.currentTarget)}
                sx={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 2,
                  padding: '8px 12px',
                  '&:hover': {
                    backgroundColor: '#f9fafb',
                  },
                }}
                aria-label="Change language"
              >
                <LanguageIcon sx={{ fontSize: 20, color: '#31664a', mr: 0.5 }} />
                <Typography
                  sx={{
                    fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#111827',
                    textTransform: 'uppercase',
                    mr: 0.5,
                  }}
                >
                  {language}
                </Typography>
                <ExpandMoreIcon sx={{ fontSize: 16, color: '#6b7280' }} />
              </IconButton>
              <Menu
                anchorEl={languageMenuAnchor}
                open={Boolean(languageMenuAnchor)}
                onClose={() => setLanguageMenuAnchor(null)}
                PaperProps={{
                  sx: {
                    borderRadius: 2,
                    mt: 1,
                    minWidth: 160,
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  },
                }}
              >
                {LANGUAGES.map((lang) => (
                  <MenuItem
                    key={lang.code}
                    selected={language === lang.code}
                    onClick={() => {
                      const newLang = lang.code;
                      setLanguage(newLang);
                      i18n.changeLanguage(newLang);
                      setLanguageMenuAnchor(null);
                    }}
                    sx={{
                      fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      fontSize: 14,
                      fontWeight: language === lang.code ? 600 : 500,
                      color: language === lang.code ? '#31664a' : '#111827',
                      '&.Mui-selected': {
                        backgroundColor: '#f3f4f6',
                        '&:hover': {
                          backgroundColor: '#e5e7eb',
                        },
                      },
                    }}
                  >
                    {lang.nativeLabel}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
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
            </Box>
          )}

          {summary ? (
            summaryCard
          ) : (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {cards.map((card) => (
                  <HomeCard
                    key={card.key}
                    title={t(card.titleKey)}
                    description={t(card.descriptionKey)}
                    onClick={() => handleOpenForm(card.key)}
                  />
                ))}
              </Box>
              
            </>
          )}
          
          {/* Ratings Scorecard link - fixed at bottom of page */}
          {!summary && (
            <Box 
              sx={{ 
                position: 'fixed',
                bottom: 40,
                left: 16,
                right: 16,
                maxWidth: 480 - 32,
                mx: 'auto',
                zIndex: 100,
              }}
            >
              <Button
                component="a"
                href={`/public/positional-excellence/${token}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
                fullWidth
                sx={{
                  textTransform: 'none',
                  padding: '14px 20px',
                  borderRadius: '16px',
                  backgroundColor: '#ffffff',
                  color: '#31664a',
                  border: '4px solid #31664a',
                  fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  '&:hover': {
                    backgroundColor: '#f0fdf4',
                    border: '4px solid #31664a',
                  },
                }}
              >
                View Ratings Scorecard
              </Button>
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
                borderRadius: '8px',
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
            In Safari, tap the share icon, then choose &ldquo;Add to Home Screen.&rdquo; This installs the Levelset portal on
            your device for quick access.
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

