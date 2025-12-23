import * as React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
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
        <title key="title">Levelset | Discipline</title>
        <meta key="og:title" property="og:title" content="Levelset | Discipline" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Discipline" />
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
            onFalse={() => router.push('/auth/login')}
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
                    <Link href="/org-settings?section=discipline-actions" passHref legacyBehavior>
                      <Button
                        component="a"
                        variant="text"
                        size="small"
                        startIcon={<SettingsIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#9ca3af',
                          textTransform: 'none',
                          padding: '4px 12px',
                          marginTop: '8px',
                          '&:hover': {
                            color: '#6b7280',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          },
                        }}
                      >
                        Configure Actions
                      </Button>
                    </Link>
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
