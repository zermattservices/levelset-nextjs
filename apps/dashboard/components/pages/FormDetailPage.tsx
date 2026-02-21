import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Tab, Tabs, Button, Chip, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import sty from './FormDetailPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { FormSettingsPanel } from '@/components/forms/FormSettingsPanel';
import { FormEditorPanel } from '@/components/forms/editor/FormEditorPanel';
import { FormPreviewPanel } from '@/components/forms/FormPreviewPanel';
import { FormSubmissionsTable } from '@/components/forms/FormSubmissionsTable';
import type { FormTemplate, FormGroup, FormType, FormSubmission } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const TYPE_COLORS: Record<FormType, { bg: string; text: string }> = {
  rating: { bg: 'var(--ls-color-brand-soft)', text: 'var(--ls-color-brand)' },
  discipline: { bg: 'var(--ls-color-warning-soft)', text: 'var(--ls-color-warning)' },
  evaluation: { bg: 'var(--ls-color-success-soft)', text: 'var(--ls-color-success)' },
  custom: { bg: 'var(--ls-color-neutral-foreground)', text: 'var(--ls-color-muted)' },
};

const TYPE_LABELS: Record<FormType, string> = {
  rating: 'Rating',
  discipline: 'Discipline',
  evaluation: 'Evaluation',
  custom: 'Custom',
};

export function FormDetailPage() {
  const router = useRouter();
  const { formId } = router.query;
  const auth = useAuth();
  const [activeTab, setActiveTab] = React.useState(0);
  const [template, setTemplate] = React.useState<FormTemplate | null>(null);
  const [groups, setGroups] = React.useState<FormGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [submissions, setSubmissions] = React.useState<FormSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = React.useState(false);
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

  // Redirect non-admins (wait for appUser to load so role is populated)
  React.useEffect(() => {
    if (auth.isLoaded && auth.authUser && auth.appUser && auth.role !== 'Levelset Admin') {
      router.push('/form-management');
    }
  }, [auth.isLoaded, auth.authUser, auth.appUser, auth.role, router]);

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

  // Fetch template and groups
  React.useEffect(() => {
    if (!formId || !auth.isLoaded || !auth.authUser || !auth.appUser) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const [templateRes, groupsRes] = await Promise.all([
          fetch(`/api/forms/${formId}`, { headers }),
          fetch('/api/forms/groups', { headers }),
        ]);

        if (templateRes.ok) {
          const templateData = await templateRes.json();
          setTemplate(templateData);
        } else {
          router.push('/form-management');
          return;
        }

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(groupsData);
        }
      } catch {
        router.push('/form-management');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, auth.isLoaded, auth.authUser, getAccessToken, router]);

  // Fetch submissions for this template (use template.id UUID, not the slug from URL)
  const fetchSubmissions = React.useCallback(async () => {
    if (!template) return;
    setSubmissionsLoading(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/forms/submissions?template_id=${template.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch {
      // Silently handle
    } finally {
      setSubmissionsLoading(false);
    }
  }, [template, getAccessToken]);

  // Load submissions when switching to submissions tab
  React.useEffect(() => {
    if (activeTab === 3 && template) {
      fetchSubmissions();
    }
  }, [activeTab, template, fetchSubmissions]);

  const handleSaveSettings = async (updates: Partial<FormTemplate>) => {
    if (!template) return;

    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/forms/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const updated = await res.json();
      setTemplate((prev) => (prev ? { ...prev, ...updated } : prev));
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save', severity: 'error' });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchema = React.useCallback(
    async (schema: Record<string, any>, uiSchema: Record<string, any>) => {
      if (!template) return;

      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/forms/${template.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ schema, ui_schema: uiSchema }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save schema');
        }

        const updated = await res.json();
        setTemplate((prev) => (prev ? { ...prev, ...updated } : prev));
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Failed to save schema', severity: 'error' });
        throw err;
      }
    },
    [template, getAccessToken]
  );

  const handleSaveEvaluationSettings = React.useCallback(
    async (evaluationSettings: Record<string, any>) => {
      if (!template) return;

      try {
        const token = await getAccessToken();
        const mergedSettings = {
          ...(template.settings || {}),
          evaluation: evaluationSettings,
        };
        const res = await fetch(`/api/forms/${template.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ settings: mergedSettings }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save evaluation settings');
        }

        const updated = await res.json();
        setTemplate((prev) => (prev ? { ...prev, ...updated } : prev));
      } catch (err: any) {
        setSnackbar({ open: true, message: err.message || 'Failed to save evaluation settings', severity: 'error' });
        throw err;
      }
    },
    [template, getAccessToken]
  );

  const handleDelete = async () => {
    if (!template) return;

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
      router.push('/form-management');
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to archive', severity: 'error' });
    }
  };

  // Loading states
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!template) {
    return null;
  }

  const typeColor = TYPE_COLORS[template.form_type] || TYPE_COLORS.custom;
  const typeLabel = TYPE_LABELS[template.form_type] || 'Custom';

  return (
    <>
      <Head>
        <title key="title">Levelset | {template.name}</title>
        <meta key="og:title" property="og:title" content={`Levelset | ${template.name}`} />
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
            {/* Breadcrumb / Back */}
            <div className={sty.breadcrumb}>
              <Button
                size="small"
                startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                onClick={() => router.push('/form-management')}
                sx={{
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: 'none',
                  color: 'var(--ls-color-muted)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  '&:hover': {
                    backgroundColor: 'var(--ls-color-neutral-foreground)',
                  },
                }}
              >
                Back to Form Management
              </Button>
            </div>

            {/* Page Header */}
            <div className={sty.pageHeader}>
              <div className={sty.headerLeft}>
                <h1 className={sty.pageTitle}>{template.name}</h1>
                <div className={sty.headerBadges}>
                  <Chip
                    label={typeLabel}
                    size="small"
                    sx={{
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 600,
                      height: 22,
                      borderRadius: '6px',
                      backgroundColor: typeColor.bg,
                      color: typeColor.text,
                    }}
                  />
                  {template.is_system && (
                    <Chip
                      label="System"
                      size="small"
                      variant="outlined"
                      sx={{
                        fontFamily,
                        fontSize: 11,
                        fontWeight: 500,
                        height: 22,
                        borderRadius: '6px',
                        borderColor: 'var(--ls-color-muted-border)',
                        color: 'var(--ls-color-muted)',
                      }}
                    />
                  )}
                  <Chip
                    label={template.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    sx={{
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 500,
                      height: 22,
                      borderRadius: '6px',
                      backgroundColor: template.is_active
                        ? 'var(--ls-color-success-soft)'
                        : 'var(--ls-color-destructive-soft)',
                      color: template.is_active
                        ? 'var(--ls-color-success)'
                        : 'var(--ls-color-destructive)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
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
                    fontSize: 13,
                    fontWeight: 500,
                    textTransform: 'none',
                    color: 'var(--ls-color-muted)',
                    minHeight: 42,
                    padding: '8px 16px',
                    gap: '6px',
                    '&.Mui-selected': {
                      color: 'var(--ls-color-brand)',
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <Tab
                  icon={<SettingsOutlinedIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label="Settings"
                />
                <Tab
                  icon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label="Editor"
                />
                <Tab
                  icon={<PreviewOutlinedIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label="Preview"
                />
                <Tab
                  icon={<InboxOutlinedIcon sx={{ fontSize: 16 }} />}
                  iconPosition="start"
                  label="Submissions"
                />
              </Tabs>
            </div>

            {/* Tab Content */}
            <div className={sty.tabContent}>
              {activeTab === 0 && (
                <FormSettingsPanel
                  template={template}
                  groups={groups}
                  onSave={handleSaveSettings}
                  onDelete={handleDelete}
                  saving={saving}
                />
              )}

              {activeTab === 1 && (
                <FormEditorPanel
                  template={template}
                  onSave={handleSaveSchema}
                  onSaveSettings={template.form_type === 'evaluation' ? handleSaveEvaluationSettings : undefined}
                />
              )}

              {activeTab === 2 && (
                <FormPreviewPanel template={template} />
              )}

              {activeTab === 3 && (
                <FormSubmissionsTable
                  submissions={submissions}
                  loading={submissionsLoading}
                  templateId={template.id}
                  showFormName={false}
                  onRefresh={fetchSubmissions}
                  getAccessToken={getAccessToken}
                />
              )}
            </div>
          </div>
        </div>
      </div>

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
