import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './PeaClassicPage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { LevelsetButton } from '@/components/ui/LevelsetButton/LevelsetButton';
import { PEAClassic } from '@/components/CodeComponents/PEAClassic';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import ArrowLeftIcon from '@mui/icons-material/ArrowBack';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function PeaClassicPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId } = useLocationContext();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push('/auth/login');
    }
  }, [auth.isLoaded, auth.authUser, router]);

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
                  <div className={classNames(projectcss.all, sty.freeBox__qFcI)}>
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
    </>
  );
}

export default PeaClassicPage;
