import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './DisciplinePage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { CenteredLoadingSpinner } from '@/components/CodeComponents/CenteredLoadingSpinner';
import { RedirectIf } from '@/components/CodeComponents/RedirectIf';
import { DisciplineNotifications } from '@/components/CodeComponents/RecommendedActions';
import { DisciplineTable } from '@/components/CodeComponents/DisciplineTable';
import { DisciplineActionsTable } from '@/components/CodeComponents/DisciplineActionsTable';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function DisciplinePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId } = useLocationContext();

  const handleAuthFalse = async () => {
    router.push('/auth/login');
  };

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Discipline | Levelset</title>
        <meta key="og:title" property="og:title" content="Discipline | Levelset" />
        <meta key="twitter:title" name="twitter:title" content="Discipline | Levelset" />
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

        <CenteredLoadingSpinner
          className={classNames("__wab_instance", sty.centeredLoadingSpinner)}
          backgroundColor="rgba(255, 255, 255, 0.8)"
          color="#31664a"
          opacity={0.8}
          showChildren={true}
          size={48}
        >
          <RedirectIf
            className={classNames("__wab_instance", sty.redirectIf)}
            condition={true}
            onFalse={handleAuthFalse}
          >
            {/* Header section */}
            <div className={classNames(projectcss.all, sty.freeBox__jtUkZ)}>
              <div className={classNames(projectcss.all, sty.freeBox__ureDb)}>
                <div className={classNames(projectcss.all, sty.freeBox__nlSty)}>
                  <div className={classNames(projectcss.all, sty.freeBox__mKhGx)}>
                    <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__wQDeC)}>
                      Discipline Dashboard
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className={classNames(projectcss.all, sty.freeBox__lKzxl)}>
              <div className={classNames(projectcss.all, sty.freeBox__s72NY)}>
                {/* Notifications */}
                <DisciplineNotifications
                  className={classNames("__wab_instance", sty.disciplineNotifications)}
                  currentUser={null}
                  currentUserId={auth.id}
                  locationId={selectedLocationId || ''}
                  maxWidth="1200px"
                  width="100%"
                />

                <div className={classNames(projectcss.all, sty.freeBox__cHwGk)}>
                  {/* Employees section */}
                  <div className={classNames(projectcss.all, sty.verticalStack)}>
                    <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__of8Zu)}>
                      Employees
                    </div>
                    <DisciplineTable
                      className={classNames("__wab_instance", sty.disciplineTable)}
                      currentUserId={auth.id}
                      density="comfortable"
                      locationId={selectedLocationId || ''}
                      showActions={true}
                    />
                  </div>

                  {/* Disciplinary Actions section */}
                  <div className={classNames(projectcss.all, sty.verticalStack2)}>
                    <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__oSxFd)}>
                      Disciplinary Actions
                    </div>
                    <DisciplineActionsTable
                      className={classNames("__wab_instance", sty.disciplineActionsTable)}
                      density="comfortable"
                      locationId={selectedLocationId || ''}
                      showActions={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </RedirectIf>
        </CenteredLoadingSpinner>
      </div>
    </>
  );
}

export default DisciplinePage;
