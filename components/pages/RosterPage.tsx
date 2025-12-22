import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './RosterPage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { RosterTable } from '@/components/CodeComponents/RosterTable';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function RosterPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId } = useLocationContext();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push('/auth/login');
    }
  }, [auth.isLoaded, auth.authUser, router]);

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Roster | Levelset</title>
        <meta key="og:title" property="og:title" content="Roster | Levelset" />
        <meta key="twitter:title" name="twitter:title" content="Roster | Levelset" />
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
          <div className={classNames(projectcss.all, sty.freeBox__t6I6)}>
            <div className={classNames(projectcss.all, sty.freeBox__qEcUx)}>
              <div className={classNames(projectcss.all, sty.freeBox__qcdYx)}>
                <div className={classNames(projectcss.all, sty.freeBox__bYvUh)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__fFys8)}>
                    Roster Management
                  </div>
                </div>
                <div className={classNames(projectcss.all, sty.freeBox__m8LNv)}>
                  <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__m1CSw)}>
                    Modify employees, their visibility in different dashboards, and add/remove them as needed.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className={classNames(projectcss.all, sty.freeBox__xbZ1E)}>
            <div className={classNames(projectcss.all, sty.freeBox__hhgMy)}>
              <div className={classNames(projectcss.all, sty.verticalStack)}>
                <RosterTable
                  className={classNames("__wab_instance", sty.rosterTable)}
                  density="comfortable"
                  locationId={selectedLocationId || ''}
                  showActions={true}
                  currentUserRoleProp={auth.role || undefined}
                  currentUserEmployeeIdProp={auth.employee_id || undefined}
                />
              </div>
            </div>
          </div>
        </RedirectIf>
      </div>
    </>
  );
}

export default RosterPage;
