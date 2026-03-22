import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Tab, Tabs, Dialog, DialogContent, Button, Box, Typography } from '@mui/material';
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
import { EvaluationRulesList } from '@/components/evaluations/EvaluationRulesList';
import { dialogPaperSx, primaryButtonSx } from '@/components/forms/dialogStyles';
import { EmployeeModal } from '@/components/CodeComponents/EmployeeModal';
import { createSupabaseClient } from '@/util/supabase/component';
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

  const handleTabChange = (_: any, newValue: number) => {
    setActiveTab(newValue);
    // Background refresh when switching to data tabs (show cached data immediately)
    if (newValue === 0 || newValue === 1) {
      fetchData(true);
    }
  };

  const [items, setItems] = React.useState<EvaluationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasEvalTemplates, setHasEvalTemplates] = React.useState<boolean | null>(null);

  // Employee modal state
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);

  const handleEmployeeClick = React.useCallback(async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEmployeeModalOpen(true);
    // Fetch employee data
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      if (data) setSelectedEmployee(data);
    } catch { /* silently fail */ }
  }, []);

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

  const fetchData = React.useCallback(async (background = false) => {
    if (!selectedLocationOrgId) return;
    if (!background) setLoading(true);
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

  const checkEvalTemplates = React.useCallback(async () => {
    if (!selectedLocationOrgId) return;
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `/api/forms?org_id=${encodeURIComponent(selectedLocationOrgId)}&form_type=evaluation`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const templates = Array.isArray(data) ? data : (data.templates ?? []);
        setHasEvalTemplates(templates.length > 0);
      }
    } catch {
      // If check fails, don't block the page
      setHasEvalTemplates(true);
    }
  }, [getAccessToken, selectedLocationOrgId]);

  React.useEffect(() => {
    if (!auth.isLoaded || !auth.authUser || !auth.appUser || permissionsLoading || !selectedLocationOrgId) return;
    if (!has(P.EVAL_VIEW_EVALUATIONS)) return;
    fetchData();
    checkEvalTemplates();
  }, [auth.isLoaded, auth.authUser, auth.appUser, permissionsLoading, selectedLocationOrgId, has, fetchData, checkEvalTemplates]);

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const canView = has(P.EVAL_VIEW_EVALUATIONS);
  const canManage = has(P.EVAL_MANAGE_EVALUATIONS);

  const upcomingItems = items.filter((item) => item.status !== 'completed');
  const myUpcoming = upcomingItems.filter((item) => item.can_conduct);
  const completedItems = items.filter((item) => item.status === 'completed');

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
            {/* No evaluation templates — onboarding modal */}
            <Dialog
              open={canView && hasEvalTemplates === false}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  ...dialogPaperSx,
                  maxHeight: '90vh',
                },
              }}
            >
              <DialogContent sx={{ padding: '40px 36px 36px', overflow: 'auto' }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <AssignmentOutlinedIcon
                    sx={{
                      fontSize: 52,
                      color: 'var(--ls-color-brand)',
                      opacity: 0.85,
                      mb: 1.5,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: '"Mont", sans-serif',
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--ls-color-text-primary)',
                      mb: 1,
                    }}
                  >
                    Get Started with Evaluations
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 14,
                      color: 'var(--ls-color-muted)',
                      lineHeight: 1.6,
                      maxWidth: 540,
                      mx: 'auto',
                    }}
                  >
                    Evaluations let you schedule and track employee performance reviews on a
                    recurring cadence. Reviewers are assigned automatically based on the rules
                    you configure, and completed evaluations are scored and stored here.
                  </Typography>
                </Box>

                {/* How it works */}
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--ls-color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    mb: 2,
                  }}
                >
                  How to set up evaluations
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 4 }}>
                  {/* Step 1 */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'var(--ls-color-brand)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily,
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      1
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--ls-color-text-primary)',
                          mb: 0.5,
                        }}
                      >
                        Create an evaluation form
                      </Typography>
                      <Typography
                        sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', lineHeight: 1.55 }}
                      >
                        Go to <strong>Form Management</strong> and create an evaluation form in the
                        Evaluations group. You can import an existing form from{' '}
                        <strong>Google Forms</strong>, <strong>Jotform</strong>, or a{' '}
                        <strong>PDF</strong> you already use — or build one from scratch using the
                        form builder. Each form defines the questions and scoring criteria for the
                        evaluation.
                      </Typography>
                    </Box>
                  </Box>

                  {/* Step 2 */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'var(--ls-color-brand)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily,
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      2
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--ls-color-text-primary)',
                          mb: 0.5,
                        }}
                      >
                        Create evaluation rules
                      </Typography>
                      <Typography
                        sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', lineHeight: 1.55 }}
                      >
                        Back on this page, go to the <strong>Settings</strong> tab and create
                        evaluation rules. A rule ties an evaluation form to a cadence (monthly,
                        quarterly, semi-annual, or annual) and specifies which{' '}
                        <strong>employee roles</strong> get evaluated and which{' '}
                        <strong>reviewer roles</strong> conduct the evaluations. You can create
                        multiple rules for different forms, roles, or cadences.
                      </Typography>
                    </Box>
                  </Box>

                  {/* Step 3 */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'var(--ls-color-brand)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily,
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      3
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--ls-color-text-primary)',
                          mb: 0.5,
                        }}
                      >
                        Evaluations appear automatically
                      </Typography>
                      <Typography
                        sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', lineHeight: 1.55 }}
                      >
                        Once rules are active, evaluations are generated for each period
                        automatically. They'll show up on the <strong>Upcoming</strong> tab with a
                        due date based on the cadence. Reviewers will see their assigned evaluations
                        under <strong>My Evaluations</strong>, and managers can track all evaluations
                        across the team.
                      </Typography>
                    </Box>
                  </Box>

                  {/* Step 4 */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: 'var(--ls-color-brand)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily,
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      4
                    </Box>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--ls-color-text-primary)',
                          mb: 0.5,
                        }}
                      >
                        Conduct and review
                      </Typography>
                      <Typography
                        sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)', lineHeight: 1.55 }}
                      >
                        When it's time, click into an evaluation to complete the form for that
                        employee. Completed evaluations are scored automatically and move to the{' '}
                        <strong>Completed</strong> tab, where you can review results and track
                        progress over time.
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* CTA */}
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 14,
                      color: 'var(--ls-color-text-primary)',
                      fontWeight: 600,
                      mb: 2,
                    }}
                  >
                    Ready to get started? Create your first evaluation form.
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => router.push('/form-management')}
                    sx={{
                      ...primaryButtonSx,
                      fontSize: 14,
                      padding: '10px 32px',
                    }}
                  >
                    Go to Form Management
                  </Button>
                </Box>
              </DialogContent>
            </Dialog>

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
                    onChange={handleTabChange}
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
                    <Tab label="Upcoming" />
                    <Tab label="Completed" />
                    {canManage && <Tab label="Settings" />}
                  </Tabs>
                </div>

                <div className={sty.tabContent}>
                  {activeTab === 0 && (
                    <div className={sty.sectionsWrapper}>
                      <div>
                        <h2 className={sty.sectionTitle}>My Evaluations</h2>
                        <MyEvaluationsTable
                          items={myUpcoming}
                          loading={loading}
                          onRefresh={fetchData}
                          canManage={canManage}
                          orgId={selectedLocationOrgId}
                          onEmployeeClick={handleEmployeeClick}
                        />
                      </div>

                      {canManage && (
                        <div>
                          <h2 className={sty.sectionTitle}>All Evaluations</h2>
                          <AllEvaluationsTable
                            items={upcomingItems}
                            loading={loading}
                            onRefresh={fetchData}
                            orgId={selectedLocationOrgId}
                            onEmployeeClick={handleEmployeeClick}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 1 && (
                    <div className={sty.sectionsWrapper}>
                      <AllEvaluationsTable
                        items={completedItems}
                        loading={loading}
                        onRefresh={fetchData}
                        orgId={selectedLocationOrgId}
                        onEmployeeClick={handleEmployeeClick}
                      />
                    </div>
                  )}

                  {activeTab === 2 && canManage && (
                    <EvaluationRulesList
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

      {selectedLocationId && (
        <EmployeeModal
          open={employeeModalOpen}
          employee={selectedEmployee}
          onClose={() => { setEmployeeModalOpen(false); setSelectedEmployee(null); }}
          locationId={selectedLocationId}
          initialTab="evaluations"
          onRecordAction={() => fetchData(true)}
        />
      )}
    </>
  );
}
