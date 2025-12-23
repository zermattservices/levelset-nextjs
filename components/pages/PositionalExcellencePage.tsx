import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './PositionalExcellencePage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { LevelsetButton } from '@/components/ui/LevelsetButton/LevelsetButton';
import { PositionalRatings } from '@/components/CodeComponents/PositionalRatings';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function PositionalExcellencePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationImageUrl } = useLocationContext();

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

  const handleGoToClassic = () => {
    router.push('/positional-excellence-classic');
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Positional Excellence</title>
        <meta key="og:title" property="og:title" content="Levelset | Positional Excellence" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Positional Excellence" />
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
          <div className={classNames(projectcss.all, sty.freeBox__ktUyf)}>
            <div className={classNames(projectcss.all, sty.freeBox__q2Oez)}>
              <div className={classNames(projectcss.all, sty.freeBox___82DkP)}>
                <div className={classNames(projectcss.all, sty.freeBox__igRkK)}>
                  <div className={classNames(projectcss.all, sty.freeBox___7MbDt)}>
                    <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text___3OfVz)}>
                      Positional Excellence Dashboard
                    </div>
                  </div>
                  <div className={classNames(projectcss.all, sty.freeBox__ebbmL)}>
                    <LevelsetButton
                      className={classNames("__wab_instance", sty.levelsetButton)}
                      color="brandOutline"
                      onClick={handleGoToClassic}
                      size="compact"
                    >
                      <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__kbjkP)}>
                        Go to Classic View
                      </div>
                    </LevelsetButton>
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox__ixaur)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__r2U50)}>
                    <span style={{ color: "#000000" }}>Coming soon!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className={classNames(projectcss.all, sty.verticalStack3)}>
            <div className={classNames(projectcss.all, sty.freeBox___9LQfr)}>
              <div className={classNames(projectcss.all, sty.freeBox___7G7OF)}>
                <PositionalRatings
                  className={classNames("__wab_instance", sty.positionalRatings)}
                  locationId={selectedLocationId || ''}
                  locationImageUrl={selectedLocationImageUrl}
                />
              </div>
            </div>
          </div>
        </RedirectIf>
      </div>
    </>
  );
}

export default PositionalExcellencePage;
