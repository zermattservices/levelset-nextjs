import * as React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import sty from './HomePage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { DashboardMetricCard } from '@/components/CodeComponents/DashboardMetricCard';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Map pillar names (from API) → DashboardMetricCard variant
const PILLAR_VARIANT_MAP: Record<string, string> = {
  'Caring Interactions': 'caring-interactions',
  'Great Food': 'great-food',
  'Quick & Accurate': 'quick-accurate',
  'Creating Moments': 'creating-moments',
  'Inviting Atmosphere': 'inviting-atmosphere',
};

interface OEPillarData {
  name: string;
  score: number;
  change: number;
  percentChange: number;
}

export function HomePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationImageUrl } = useLocationContext();
  const { hasFeature } = useOrgFeatures();
  const isOEEnabled = hasFeature(F.OPERATIONAL_EXCELLENCE);

  // OE pillar data for enabled orgs
  const [oePillars, setOEPillars] = React.useState<Record<string, OEPillarData>>({});
  const [oeLoading, setOELoading] = React.useState(false);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Fetch OE pillar scores when feature is enabled
  React.useEffect(() => {
    if (!isOEEnabled || !selectedLocationId) {
      setOEPillars({});
      return;
    }

    let cancelled = false;
    async function fetchOE() {
      setOELoading(true);
      try {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const res = await fetch(
          `/api/operational-excellence?location_id=${selectedLocationId}&start=${start.toISOString()}&end=${now.toISOString()}`
        );
        if (!res.ok) throw new Error('OE fetch failed');
        const data = await res.json();
        if (cancelled) return;

        const pillarMap: Record<string, OEPillarData> = {};
        for (const p of data.pillars || []) {
          const variant = PILLAR_VARIANT_MAP[p.name];
          if (variant) {
            pillarMap[variant] = {
              name: p.name,
              score: p.score,
              change: p.change,
              percentChange: p.percentChange,
            };
          }
        }
        setOEPillars(pillarMap);
      } catch (err) {
        console.error('Failed to fetch OE data for homepage:', err);
        if (!cancelled) setOEPillars({});
      } finally {
        if (!cancelled) setOELoading(false);
      }
    }

    fetchOE();
    return () => { cancelled = true; };
  }, [isOEEnabled, selectedLocationId]);

  // Show loading screen while auth is loading or redirecting
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const handleGoToPositionalExcellence = () => {
    router.push('/positional-excellence');
  };

  const handleGoToDiscipline = () => {
    router.push('/discipline');
  };

  const handleGoToOE = () => {
    router.push('/operational-excellence');
  };

  // Build externalData for an OE pillar card (uses standard card layout)
  const getOEExternalData = (variant: string) => {
    const p = oePillars[variant];
    if (!p) return undefined;
    return {
      total: p.score,
      change: p.change,
      percent: p.percentChange,
    };
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Home</title>
        <meta key="og:title" property="og:title" content="Levelset | Home" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Home" />
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
                  {!isOEEnabled && (
                    <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text___1AVHs)}>
                      Coming soon
                    </div>
                  )}
                </div>
                <div className={classNames(projectcss.all, sty.freeBox__hvq52)}>
                  <div className={classNames(projectcss.all, sty.freeBox___1VsLt, !isOEEnabled && sty.oeBlurred)}>
                    {(['great-food', 'quick-accurate', 'creating-moments', 'caring-interactions', 'inviting-atmosphere'] as const).map((variant) => (
                      <DashboardMetricCard
                        key={variant}
                        className={classNames("__wab_instance", sty.dashboardMetricCard__fWith)}
                        variant={variant}
                        isPlaceholder={!isOEEnabled}
                        externalData={isOEEnabled ? getOEExternalData(variant) : undefined}
                        onClick={isOEEnabled ? handleGoToOE : undefined}
                      />
                    ))}
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
