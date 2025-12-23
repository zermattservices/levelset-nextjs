import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';
import sty from './PeaClassicPage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { LevelsetButton } from '@/components/ui/LevelsetButton/LevelsetButton';
import { PEAClassic } from '@/components/CodeComponents/PEAClassic';
import { EmbedModal } from '@/components/CodeComponents/EmbedModal';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function PeaClassicPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationMobileToken } = useLocationContext();
  const [embedModalOpen, setEmbedModalOpen] = React.useState(false);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Show loading screen while auth is loading or redirecting
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const handleBackToSmartView = () => {
    router.push('/positional-excellence');
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Ratings Scorecard</title>
        <meta key="og:title" property="og:title" content="Levelset | Ratings Scorecard" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Ratings Scorecard" />
      </Head>

      <style>{`
        body {
          margin: 0;
        }
      `}</style>

      <div
        className={classNames(
          projectcss.all,
          projectcss.root_reset,
          projectcss.plasmic_default_styles,
          projectcss.plasmic_mixins,
          projectcss.plasmic_tokens,
          sty.root
        )}
      >
        <MenuNavigation
          className={classNames("__wab_instance", sty.menuNavigation)}
          firstName={auth.first_name}
          userRole={auth.role}
        />

        <RedirectIf
          className={classNames("__wab_instance", sty.redirectIf)}
          condition={!!(auth.authUser && auth.authUser.email)}
          onFalse={() => router.push('/auth/login')}
        >
          {/* Header section */}
          <div className={classNames(projectcss.all, sty.freeBox__evXNr)}>
            <div className={classNames(projectcss.all, sty.freeBox__okPhs)}>
              <div className={classNames(projectcss.all, sty.freeBox__rv6F)}>
                <div className={classNames(projectcss.all, sty.freeBox__ode13)}>
                  <div className={classNames(projectcss.all, sty.freeBox__zh3Ru)}>
                    <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__yBey6)}>
                      PEA Dashboard - Classic View
                    </div>
                  </div>
                  <div className={classNames(projectcss.all, sty.freeBox__qFcI)} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setEmbedModalOpen(true)}
                      sx={{
                        fontFamily,
                        fontSize: 13,
                        fontWeight: 600,
                        textTransform: 'none',
                        borderColor: '#d1d5db',
                        color: '#4b5563',
                        borderRadius: '8px',
                        px: 2,
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          borderColor: '#9ca3af',
                          backgroundColor: '#f9fafb',
                        },
                      }}
                    >
                      Embed
                    </Button>
                    <LevelsetButton
                      className={classNames("__wab_instance", sty.levelsetButton)}
                      color="brand"
                      onClick={handleBackToSmartView}
                      size="compact"
                      showStartIcon={true}
                      startIcon={<ArrowLeftIcon className={classNames(projectcss.all, sty.svg)} />}
                    >
                      <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__fWt60)}>
                        Back to SmartView
                      </div>
                    </LevelsetButton>
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox___4Zgo)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__d5U67)}>
                    <span style={{ color: "#000000" }}>Coming soon!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className={classNames(projectcss.all, sty.verticalStack3)}>
            <div className={classNames(projectcss.all, sty.freeBox___5RvN7)}>
              <div className={classNames(projectcss.all, sty.freeBox__cVeu1)}>
                <PEAClassic
                  className={classNames("__wab_instance", sty.peaClassic)}
                  defaultArea="FOH"
                  defaultTab="overview"
                  density="comfortable"
                  locationId={selectedLocationId || ''}
                  maxWidth="100%"
                  width="100%"
                />
              </div>
            </div>
          </div>
        </RedirectIf>
      </div>

      {/* Embed Modal */}
      <EmbedModal
        open={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        mobileToken={selectedLocationMobileToken}
      />
    </>
  );
}

export default PeaClassicPage;
