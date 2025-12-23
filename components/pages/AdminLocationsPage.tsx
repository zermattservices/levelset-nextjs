import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { LevelsetButton } from '@/components/ui/LevelsetButton/LevelsetButton';
import { useAuth } from '@/lib/providers/AuthProvider';
import styles from './AdminLocationsPage.module.css';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function AdminLocationsPage() {
  const router = useRouter();
  const auth = useAuth();

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push('/auth/login');
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Show access denied for non-Levelset Admin users
  if (auth.isLoaded && auth.authUser && !isLevelsetAdmin) {
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
                Manage locations and clients across the Levelset platform.
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={styles.mainContent}>
          <div className={styles.contentContainer}>
            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Locations Management</h2>
              <p className={styles.sectionDescription}>
                This is where you can view and manage all locations and their associated clients.
              </p>
              {/* TODO: Add location management table/components here */}
              <div className={styles.placeholder}>
                Location management features coming soon.
              </div>
            </div>

            <div className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Client Management</h2>
              <p className={styles.sectionDescription}>
                Manage organizations and their access to the platform.
              </p>
              {/* TODO: Add client management table/components here */}
              <div className={styles.placeholder}>
                Client management features coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminLocationsPage;
