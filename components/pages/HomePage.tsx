import * as React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import sty from './HomePage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { LocationSelectModal } from '@/components/CodeComponents/LocationSelectModal';
import { DashboardMetricCard } from '@/components/CodeComponents/DashboardMetricCard';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function HomePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationImageUrl } = useLocationContext();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push('/auth/login');
    }
  }, [auth.isLoaded, auth.authUser, router]);

  const handleGoToPositionalExcellence = () => {
    router.push('/positional-excellence');
  };

  const handleGoToDiscipline = () => {
    router.push('/discipline');
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Home | Levelset</title>
        <meta key="og:title" property="og:title" content="Home | Levelset" />
        <meta key="twitter:title" name="twitter:title" content="Home | Levelset" />
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
          {/* Location Select Modal */}
          <LocationSelectModal className={classNames("__wab_instance", sty.locationSelectModal)} />

          {/* Welcome Section */}
          <div className={classNames(projectcss.all, sty.freeBox__dtJkS)}>
            <div className={classNames(projectcss.all, sty.freeBox__sheik)}>
              <div className={classNames(projectcss.all, sty.freeBox__bUa1M)}>
                <div className={classNames(projectcss.all, sty.freeBox___7DbEj)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__jTmb)}>
                    Welcome back,{' '}
                  </div>
                  <div className={classNames(projectcss.all, sty.freeBox__d45Ks)}>
                    <span className={sty.slotTargetChildren}>
                      {auth.first_name || 'User'}
                    </span>
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox__tEkmO)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__y0FBf)}>
                    Here's an overview of your organization's talent health.
                  </div>
                </div>
              </div>
              {selectedLocationImageUrl && (
                <img
                  className={sty.img}
                  src={selectedLocationImageUrl}
                  alt="Location Logo"
                  style={{ objectFit: 'contain', width: '150px', height: 'auto', maxHeight: '100px' }}
                />
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className={classNames(projectcss.all, sty.freeBox__vZ6X)}>
            <div className={classNames(projectcss.all, sty.freeBox__wp8V3)}>
              {/* 360° Overview Section */}
              <div className={classNames(projectcss.all, sty._360Stack)}>
                <div className={classNames(projectcss.all, sty.freeBox__ipxsc)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__rksQk)}>
                    360° Overview
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox___56Wts)}>
                  <div className={classNames(projectcss.all, sty.freeBox__thp47)}>
                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                      locationId={selectedLocationId || ''}
                      onClick={handleGoToPositionalExcellence}
                      variant="positional-excellence"
                    />

                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__e62Fz)}
                      locationId={selectedLocationId || ''}
                      onClick={handleGoToDiscipline}
                      variant="discipline-points"
                    />

                    {/* Blurred placeholder cards - Pathway Completion & Coaching Evaluations */}
                    <div className={classNames(projectcss.all, sty.blurredStack)}>
                      <DashboardMetricCard
                        className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                        variant="pathway-completion"
                        isPlaceholder
                      />
                      <DashboardMetricCard
                        className={classNames("__wab_instance", sty.dashboardMetricCard__e62Fz)}
                        variant="coaching-evaluations"
                        isPlaceholder
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational Excellence Section */}
              <div className={classNames(projectcss.all, sty.whedStack)}>
                <div className={classNames(projectcss.all, sty.freeBox___6YHFb)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text___3DmR3)}>
                    Operational Excellence
                  </div>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text___1AVHs)}>
                    Coming soon
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox__hvq52)}>
                  <div className={classNames(projectcss.all, sty.freeBox___1VsLt)}>
                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                      variant="caring-interactions"
                      isPlaceholder
                    />
                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                      variant="great-food"
                      isPlaceholder
                    />
                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                      variant="quick-accurate"
                      isPlaceholder
                    />
                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                      variant="creating-moments"
                      isPlaceholder
                    />
                    <DashboardMetricCard
                      className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                      variant="inviting-atmosphere"
                      isPlaceholder
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </RedirectIf>
      </div>
    </>
  );
}

export default HomePage;
