import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button, CircularProgress, Typography, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import sty from './EvaluationConductPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { FormRenderer } from '@/components/forms/FormRenderer';
import { createSupabaseClient } from '@/util/supabase/component';
import type { FormTemplate } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function EvaluationConductPage() {
  const router = useRouter();
  const { id } = router.query;
  const auth = useAuth();
  const { selectedLocationOrgId } = useLocationContext();

  const [template, setTemplate] = React.useState<FormTemplate | null>(null);
  const [employeeName, setEmployeeName] = React.useState<string>('');
  const [employeeId, setEmployeeId] = React.useState<string>('');
  const [initialData, setInitialData] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // The evaluation item ID is "{ruleId}_{employeeId}" — parse it
  // and fetch the evaluation status to get the template_id, then fetch the template
  React.useEffect(() => {
    if (!id || !selectedLocationOrgId || !auth.isLoaded || !auth.authUser) return;

    let cancelled = false;

    async function loadForm() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Fetch evaluation status to find the item and its template_id
        const statusRes = await fetch(
          `/api/evaluations/status?org_id=${encodeURIComponent(selectedLocationOrgId)}`,
          { headers }
        );
        if (!statusRes.ok) throw new Error('Failed to load evaluation data');
        const statusData = await statusRes.json();
        const items = statusData.items ?? [];
        const item = items.find((i: any) => i.id === id);

        if (!item) throw new Error('Evaluation not found');

        if (cancelled) return;
        setEmployeeName(item.employee?.name ?? '');
        setEmployeeId(item.employee?.id ?? '');

        // Fetch the form template
        const templateRes = await fetch(
          `/api/forms/${item.evaluation.template_id}?org_id=${encodeURIComponent(selectedLocationOrgId)}`,
          { headers }
        );
        if (!templateRes.ok) throw new Error('Failed to load form template');
        const templateData = await templateRes.json();

        if (!cancelled) {
          setTemplate(templateData);

          // Build initialData: prefill employee name fields and date fields
          const prefill: Record<string, any> = {};
          const uiSchema = templateData.ui_schema || {};
          for (const fieldId of Object.keys(templateData.schema?.properties || {})) {
            const meta = uiSchema[fieldId]?.['ui:fieldMeta'] || {};
            // Prefill data_select employee fields with the employee's ID
            if (meta.dataSource === 'employees') {
              prefill[fieldId] = item.employee?.id ?? '';
            }
          }
          setInitialData(prefill);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load evaluation form');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadForm();
    return () => { cancelled = true; };
  }, [id, selectedLocationOrgId, auth.isLoaded, auth.authUser]);

  const handleSubmit = React.useCallback(async (formData: Record<string, any>) => {
    if (!template || !selectedLocationOrgId) return;

    try {
      const supabase = createSupabaseClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/forms/submissions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          org_id: selectedLocationOrgId,
          template_id: template.id,
          location_id: undefined, // evaluations are org-wide
          employee_id: employeeId || undefined,
          response_data: formData,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to submit evaluation');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('[EvaluationConduct] Submit failed:', err);
      alert(err.message || 'Failed to submit evaluation');
    }
  }, [template, selectedLocationOrgId, employeeId]);

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className={classNames(
      projectcss.all,
      projectcss.root_reset,
      projectcss.plasmic_default_styles,
      projectcss.plasmic_mixins,
      projectcss.plasmic_tokens,
      sty.root
    )}>
      <Head>
        <title>{employeeName ? `Evaluation — ${employeeName}` : 'Evaluation Form'} | Levelset</title>
      </Head>

      <MenuNavigation
        className={classNames('__wab_instance', sty.menuNavigation)}
        firstName={auth.first_name}
        userRole={auth.role}
      />

      <div className={sty.contentWrapper}>
        <div className={sty.contentInner}>
          {/* Header */}
          <div className={sty.pageHeader}>
            <Button
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/evaluations')}
              sx={{
                fontFamily,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ls-color-muted)',
                textTransform: 'none',
                minWidth: 'auto',
                '&:hover': { color: 'var(--ls-color-text-primary)', background: 'transparent' },
              }}
            >
              Back
            </Button>
            <h1 className={sty.pageTitle}>
              {employeeName ? `Evaluation — ${employeeName}` : 'Evaluation Form'}
            </h1>
          </div>

          {/* Content */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={28} sx={{ color: 'var(--ls-color-brand)' }} />
            </Box>
          ) : error ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-destructive-base)', mb: 2 }}>
                {error}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => router.push('/evaluations')}
                sx={{ fontFamily, fontSize: 13, textTransform: 'none', borderRadius: '8px' }}
              >
                Back to Evaluations
              </Button>
            </Box>
          ) : submitted ? (
            <Box sx={{
              py: 8,
              textAlign: 'center',
              border: '1px solid var(--ls-color-success-border)',
              borderRadius: '12px',
              backgroundColor: 'var(--ls-color-success-soft)',
            }}>
              <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 700, color: 'var(--ls-color-success-base)', mb: 1 }}>
                Evaluation Submitted
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)', mb: 3 }}>
                The evaluation for {employeeName} has been recorded.
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/evaluations')}
                sx={{
                  fontFamily, fontSize: 13, fontWeight: 600, textTransform: 'none',
                  backgroundColor: 'var(--ls-color-brand)', borderRadius: '8px', boxShadow: 'none',
                  '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)', boxShadow: 'none' },
                }}
              >
                Back to Evaluations
              </Button>
            </Box>
          ) : template ? (
            <div className={sty.formContainer}>
              <FormRenderer
                template={template}
                onSubmit={handleSubmit}
                submitLabel="Submit Evaluation"
                initialData={initialData}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
