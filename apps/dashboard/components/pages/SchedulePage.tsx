import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './SchedulePage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function SchedulePage() {
  const router = useRouter();
  const auth = useAuth();

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Show loading screen while auth is loading
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  // Show unauthorized message if user is not Levelset Admin
  if (!isLevelsetAdmin) {
    return (
      <>
        <Head>
          <title key="title">Levelset | Scheduling</title>
          <meta key="og:title" property="og:title" content="Levelset | Scheduling" />
        </Head>

        <style>{`body { margin: 0; }`}</style>

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
              You don&apos;t have permission to view Scheduling. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title key="title">Levelset | Scheduling</title>
        <meta key="og:title" property="og:title" content="Levelset | Scheduling" />
      </Head>

      <style>{`body { margin: 0; }`}</style>

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

        {/* Coming Soon content */}
        <div className={sty.comingSoonContainer}>
          <div className={sty.comingSoonIcon}>
            <CalendarMonthOutlinedIcon sx={{ fontSize: 64, color: '#31664a' }} />
          </div>
          <h1 className={sty.comingSoonTitle}>Scheduling</h1>
          <p className={sty.comingSoonSubtitle}>
            Coming soon! Build weekly shift schedules, assign employees, and track labor costs.
          </p>
          <div className={sty.comingSoonBadge}>
            <span className={sty.comingSoonBadgeText}>In Development</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default SchedulePage;
