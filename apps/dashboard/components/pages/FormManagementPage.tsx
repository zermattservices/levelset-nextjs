import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Tab, Tabs, Snackbar, Alert } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import sty from './FormManagementPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { FormManagementToolbar } from '@/components/forms/FormManagementToolbar';
import { FormGroupsList } from '@/components/forms/FormGroupsList';
import { CreateFormDialog } from '@/components/forms/CreateFormDialog';
import { CreateGroupDialog } from '@/components/forms/CreateGroupDialog';
import { FormSubmissionsTable } from '@/components/forms/FormSubmissionsTable';
import type { FormGroup, FormTemplate, FormType, FormSubmission } from '@/lib/forms/types';

const fontFamily = '"Satoshi", sans-serif';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function FormManagementPage() {
  const router = useRouter();
  const auth = useAuth();
  const [activeTab, setActiveTab] = React.useState(0);

  // Data state
  const [groups, setGroups] = React.useState<FormGroup[]>([]);
  const [templates, setTemplates] = React.useState<FormTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submissions, setSubmissions] = React.useState<FormSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = React.useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<FormType | null>(null);

  // Dialog state
  const [createFormOpen, setCreateFormOpen] = React.useState(false);
  const [createGroupOpen, setCreateGroupOpen] = React.useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

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

  // Fetch data
  const fetchData = React.useCallback(async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [groupsRes, templatesRes] = await Promise.all([
        fetch('/api/forms/groups', { headers }),
        fetch('/api/forms', { headers }),
      ]);

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  React.useEffect(() => {
    if (!auth.isLoaded || !auth.authUser || !auth.appUser || auth.role !== 'Levelset Admin') return;
    fetchData();
  }, [auth.isLoaded, auth.authUser, auth.role, fetchData]);

  // Fetch all submissions for org
  const fetchSubmissions = React.useCallback(async () => {
    setSubmissionsLoading(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/forms/submissions', { headers });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch {
      // Silently handle
    } finally {
      setSubmissionsLoading(false);
    }
  }, [getAccessToken]);

  // Load submissions when switching to submissions tab
  React.useEffect(() => {
    if (activeTab === 1 && auth.role === 'Levelset Admin') {
      fetchSubmissions();
    }
  }, [activeTab, auth.role, fetchSubmissions]);

  const handleDuplicateTemplate = async (template: FormTemplate) => {
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          intent: 'create_template',
          name: `${template.name} (Copy)`,
          description: template.description,
          group_id: template.group_id,
          form_type: template.form_type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to duplicate');
      }

      setSnackbar({ open: true, message: 'Form duplicated', severity: 'success' });
      fetchData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to duplicate', severity: 'error' });
    }
  };

  const handleArchiveTemplate = async (template: FormTemplate) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/forms/${template.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to archive');
      }

      setSnackbar({ open: true, message: 'Form archived', severity: 'success' });
      fetchData();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to archive', severity: 'error' });
    }
  };

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
                    <Tab label="Forms" />
                    <Tab label="Submissions" />
                  </Tabs>
                </div>

                <div className={sty.tabContent}>
                  {activeTab === 0 && (
                    <>
                      <FormManagementToolbar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activeTypeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                        onCreateForm={() => setCreateFormOpen(true)}
                        onCreateGroup={() => setCreateGroupOpen(true)}
                      />

                      {loading ? (
                        <div className={sty.loadingState}>
                          <span className={sty.loadingText}>Loading forms...</span>
                        </div>
                      ) : groups.length === 0 ? (
                        <div className={sty.emptyState}>
                          <DescriptionOutlinedIcon className={sty.emptyStateIcon} />
                          <h3 className={sty.emptyStateTitle}>No forms yet</h3>
                          <p className={sty.emptyStateDescription}>
                            Create your first form to get started. Forms are organized into groups like Positional Excellence, Discipline, and Evaluations.
                          </p>
                        </div>
                      ) : (
                        <FormGroupsList
                          groups={groups}
                          templates={templates}
                          searchQuery={searchQuery}
                          typeFilter={typeFilter}
                          onDuplicateTemplate={handleDuplicateTemplate}
                          onArchiveTemplate={handleArchiveTemplate}
                        />
                      )}
                    </>
                  )}

                  {activeTab === 1 && (
                    submissions.length === 0 && !submissionsLoading ? (
                      <div className={sty.emptyState}>
                        <InboxOutlinedIcon className={sty.emptyStateIcon} />
                        <h3 className={sty.emptyStateTitle}>No submissions yet</h3>
                        <p className={sty.emptyStateDescription}>
                          Form submissions will appear here once forms are created and submitted.
                        </p>
                      </div>
                    ) : (
                      <FormSubmissionsTable
                        submissions={submissions}
                        loading={submissionsLoading}
                        showFormName
                        onRefresh={fetchSubmissions}
                        getAccessToken={getAccessToken}
                      />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateFormDialog
        open={createFormOpen}
        onClose={() => setCreateFormOpen(false)}
        onCreated={() => {
          setSnackbar({ open: true, message: 'Form created', severity: 'success' });
          fetchData();
        }}
        groups={groups}
        getAccessToken={getAccessToken}
      />

      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={() => {
          setSnackbar({ open: true, message: 'Group created', severity: 'success' });
          fetchData();
        }}
        getAccessToken={getAccessToken}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ fontFamily, fontSize: 13, borderRadius: '8px' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
