import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './ReportingPage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { DisciplineReportTab } from '@/components/CodeComponents/DisciplineReportTab';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

type TabType = 'discipline';

export function ReportingPage() {
  const router = useRouter();
  const auth = useAuth();
  const { has, loading: permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = React.useState<TabType>('discipline');

  // Check permission
  const canViewReporting = has(P.HR_VIEW_REPORTING);

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

  // Show loading while permissions are loading
  if (permissionsLoading) {
    return <AuthLoadingScreen />;
  }

  // Show unauthorized message if user doesn't have permission
  if (!canViewReporting) {
    return (
      <>
        <Head>
          <meta name="twitter:card" content="summary" />
          <title key="title">Levelset | Reporting</title>
          <meta key="og:title" property="og:title" content="Levelset | Reporting" />
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

          <div className={sty.unauthorizedContainer}>
            <h1 className={sty.unauthorizedTitle}>Access Denied</h1>
            <p className={sty.unauthorizedText}>
              You don't have permission to view HR Reporting. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </>
    );
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'discipline', label: 'Discipline' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'discipline':
        return <DisciplineReportTab />;
      default:
        return <DisciplineReportTab />;
    }
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Reporting</title>
        <meta key="og:title" property="og:title" content="Levelset | Reporting" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Reporting" />
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
          {/* Header section - same structure as roster page */}
          <div className={classNames(projectcss.all, sty.freeBox__t6I6)}>
            <div className={classNames(projectcss.all, sty.freeBox__qEcUx)}>
              <div className={classNames(projectcss.all, sty.freeBox__qcdYx)}>
                <div className={classNames(projectcss.all, sty.freeBox__bYvUh)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__fFys8)}>
                    HR Reporting
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox__m8LNv)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__m1CSw)}>
                    View discipline reports for active and inactive employees.
                  </div>
                </div>
              </div>
              {/* Tabs container */}
              <div className={sty.tabsContainer}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={classNames(sty.tab, activeTab === tab.id && sty.tabActive)}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content - same structure as roster page */}
          <div className={classNames(projectcss.all, sty.freeBox__xbZ1E)}>
            <div className={classNames(projectcss.all, sty.freeBox__hhgMy)}>
              <div className={classNames(projectcss.all, sty.verticalStack)}>
                <div className={sty.tabContent} key={activeTab}>
                  {renderTabContent()}
                </div>
              </div>
            </div>
          </div>
        </RedirectIf>
      </div>
    </>
  );
}

export default ReportingPage;
