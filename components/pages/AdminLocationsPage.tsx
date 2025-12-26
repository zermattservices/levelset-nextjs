import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { LevelsetButton } from '@/components/ui/LevelsetButton/LevelsetButton';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { AdminModeSidebar } from '@/components/AdminMode/AdminModeSidebar';
import { UserTestingPage } from '@/components/AdminMode/UserTestingPage';
import { ComingSoonPlaceholder } from '@/components/OrgSettings/ComingSoonPlaceholder';
import styles from './AdminLocationsPage.module.css';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function AdminLocationsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [activeSection, setActiveSection] = React.useState<string>('user-testing');

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'user-testing':
        return <UserTestingPage />;
      case 'locations':
        return <ComingSoonPlaceholder title="Location Management" description="View and manage all locations across the Levelset platform." />;
      case 'clients':
        return <ComingSoonPlaceholder title="Client Management" description="Manage organizations and their access to the platform." />;
      default:
        return <UserTestingPage />;
    }
  };

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

  // Show access denied for non-Levelset Admin users
  if (!isLevelsetAdmin) {
    return (
      <>
        <Head>
          <title key="title">Levelset | Access Denied</title>
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
            styles.root
          )}
        >
          <MenuNavigation
            firstName={auth.first_name}
            userRole={auth.role}
          />

          <div className={styles.accessDeniedContainer}>
            <div className={styles.accessDeniedCard}>
              <h1 className={styles.accessDeniedTitle}>Access Denied</h1>
              <p className={styles.accessDeniedMessage}>
                You don't have sufficient permissions to view this page.
              </p>
              <LevelsetButton
                color="green"
                link="/"
              >
                Back Home
              </LevelsetButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Admin Mode</title>
        <meta key="og:title" property="og:title" content="Levelset | Admin Mode" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Admin Mode" />
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
          styles.root
        )}
      >
        <MenuNavigation
          firstName={auth.first_name}
          userRole={auth.role}
        />

        {/* Header section */}
        <div className={styles.headerSection}>
          <div className={styles.headerContent}>
            <div className={styles.headerTextContainer}>
              <h1 className={styles.pageTitle}>Admin Mode</h1>
              <p className={styles.pageSubtitle}>
                Test as users, manage locations, and configure clients across the Levelset platform.
              </p>
            </div>
          </div>
        </div>

        {/* Main content with sidebar */}
        <div className={styles.mainContent}>
          <div className={styles.contentContainer}>
            <AdminModeSidebar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
            <div className={styles.contentArea}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminLocationsPage;
