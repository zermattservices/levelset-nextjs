import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './PositionalExcellenceDashboard.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { ManillaTabs, TabId } from '@/components/ui/ManillaTabs/ManillaTabs';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';

// Tab content components
import { SmartViewContent } from './SmartViewContent';
import { ClassicViewContent } from './ClassicViewContent';
import { PELeaderboard } from '@/components/CodeComponents/PELeaderboard';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface PositionalExcellenceDashboardProps {
  activeTab: TabId;
}

export function PositionalExcellenceDashboard({ activeTab }: PositionalExcellenceDashboardProps) {
  const router = useRouter();
  const auth = useAuth();

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'smartview':
        return <SmartViewContent />;
      case 'classic':
        return <ClassicViewContent />;
      case 'leaderboard':
        return <PELeaderboard />;
      default:
        return <SmartViewContent />;
    }
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

        {/* Header section with title and tabs on same row */}
        <div className={sty.headerSection}>
          <div className={sty.headerContainer}>
            <h1 className={sty.pageTitle}>Positional Excellence</h1>
            <ManillaTabs activeTab={activeTab} />
          </div>
        </div>

        {/* Tab content */}
        <div className={sty.contentSection}>
          <div className={sty.contentContainer}>
            <div className={sty.tabContent} key={activeTab}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PositionalExcellenceDashboard;
