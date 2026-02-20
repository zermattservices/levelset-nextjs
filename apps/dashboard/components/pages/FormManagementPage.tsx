import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Tab, Tabs } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import sty from './FormManagementPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function FormManagementPage() {
  const router = useRouter();
  const auth = useAuth();
  const [activeTab, setActiveTab] = React.useState(0);

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

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  return (
    <>
      <Head>
        <title key="title">Levelset | Form Management</title>
        <meta key="og:title" property="og:title" content="Levelset | Form Management" />
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

        <div className={sty.contentWrapper}>
          <div className={sty.contentInner}>
            {!isLevelsetAdmin ? (
              // Coming Soon state for non-admin users
              <div className={sty.comingSoonContainer}>
                <DescriptionOutlinedIcon className={sty.comingSoonIcon} />
                <h2 className={sty.comingSoonTitle}>Form Management</h2>
                <p className={sty.comingSoonDescription}>
                  Create and manage custom forms for your organization. This feature is currently being developed.
                </p>
                <span className={sty.comingSoonBadge}>Coming Soon</span>
              </div>
            ) : (
              // Admin view with tabs
              <>
                <div className={sty.pageHeader}>
                  <h1 className={sty.pageTitle}>Form Management</h1>
                </div>

                <div className={sty.tabsContainer}>
                  <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{
                      '& .MuiTabs-indicator': {
                        backgroundColor: 'var(--ls-color-brand)',
                      },
                      '& .MuiTab-root': {
                        fontFamily: '"Satoshi", sans-serif',
                        fontSize: 14,
                        fontWeight: 500,
                        textTransform: 'none',
                        color: 'var(--ls-color-muted)',
                        '&.Mui-selected': {
                          color: 'var(--ls-color-brand)',
                          fontWeight: 600,
                        },
                      },
                    }}
                  >
                    <Tab label="Forms" />
                    <Tab label="Submissions" />
                  </Tabs>
                </div>

                <div className={sty.tabContent}>
                  {activeTab === 0 && (
                    <div className={sty.emptyState}>
                      <DescriptionOutlinedIcon className={sty.emptyStateIcon} />
                      <h3 className={sty.emptyStateTitle}>No forms yet</h3>
                      <p className={sty.emptyStateDescription}>
                        Create your first form to get started. Forms are organized into groups like Positional Excellence, Discipline, and Evaluations.
                      </p>
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div className={sty.emptyState}>
                      <InboxOutlinedIcon className={sty.emptyStateIcon} />
                      <h3 className={sty.emptyStateTitle}>No submissions yet</h3>
                      <p className={sty.emptyStateDescription}>
                        Form submissions will appear here once forms are created and submitted.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
