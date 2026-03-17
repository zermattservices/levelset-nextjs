import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Tab, Tabs } from '@mui/material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import sty from './EvaluationsPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { usePermissions } from '@/lib/providers/PermissionsProvider';
import { P } from '@/lib/permissions/constants';
import { MyEvaluationsTable } from '@/components/evaluations/MyEvaluationsTable';
import { AllEvaluationsTable } from '@/components/evaluations/AllEvaluationsTable';
import { ScheduleRulesList } from '@/components/evaluations/ScheduleRulesList';
import type { EvaluationItem } from '@/lib/evaluations/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function EvaluationsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationOrgId, selectedLocationId } = useLocationContext();
  const { has, loading: permissionsLoading } = usePermissions();
  const [activeTab, setActiveTab] = React.useState(0);

  const [items, setItems] = React.useState<EvaluationItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  const getAccessToken = React.useCallback(async (): Promise<string | null> => {
    try {
      const { createSupabaseClient } = await import('@/util/supabase/component');
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    if (!selectedLocationOrgId) return;
    setLoading(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams({ org_id: selectedLocationOrgId });
      if (selectedLocationId) params.set('location_id', selectedLocationId);

      const res = await fetch(`/api/evaluations/status?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? data);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, selectedLocationOrgId, selectedLocationId]);

  React.useEffect(() => {
    if (!auth.isLoaded || !auth.authUser || !auth.appUser || permissionsLoading || !selectedLocationOrgId) return;
    if (!has(P.EVAL_VIEW_EVALUATIONS)) return;
    fetchData();
  }, [auth.isLoaded, auth.authUser, auth.appUser, permissionsLoading, selectedLocationOrgId, has, fetchData]);

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const canView = has(P.EVAL_VIEW_EVALUATIONS);
  const canManage = has(P.EVAL_MANAGE_EVALUATIONS);

  const myItems = items.filter((item) => item.can_conduct);
  const allItems = items;

  return (
    <>
      <Head>
        <title key="title">Levelset | Evaluations</title>
        <meta key="og:title" property="og:title" content="Levelset | Evaluations" />
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
          className={classNames('__wab_instance', sty.menuNavigation)}
          firstName={auth.first_name}
          userRole={auth.role}
        />

        <div className={sty.contentWrapper}>
          <div className={sty.contentInner}>
            {!canView ? (
              <div className={sty.permissionContainer}>
                <LockOutlinedIcon className={sty.permissionIcon} />
                <h2 className={sty.permissionTitle}>Evaluations</h2>
                <p className={sty.permissionDescription}>
                  You do not have permission to view evaluations.
                </p>
              </div>
            ) : (
              <>
                <div className={sty.pageHeader}>
                  <h1 className={sty.pageTitle}>Evaluations</h1>
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
                        fontFamily,
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
                    <Tab label="Evaluations" />
                    {canManage && <Tab label="Settings" />}
                  </Tabs>
                </div>

                <div className={sty.tabContent}>
                  {activeTab === 0 && (
                    <div className={sty.sectionsWrapper}>
                      <div>
                        <h2 className={sty.sectionTitle}>My Evaluations</h2>
                        <MyEvaluationsTable
                          items={myItems}
                          loading={loading}
                          onRefresh={fetchData}
                          canManage={canManage}
                        />
                      </div>

                      {canManage && (
                        <div>
                          <h2 className={sty.sectionTitle}>All Evaluations</h2>
                          <AllEvaluationsTable
                            items={allItems}
                            loading={loading}
                            onRefresh={fetchData}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 1 && canManage && (
                    <ScheduleRulesList
                      orgId={selectedLocationOrgId}
                      getAccessToken={getAccessToken}
                    />
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
