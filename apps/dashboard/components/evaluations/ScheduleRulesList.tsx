import * as React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import type { ScheduleRule } from '@/lib/evaluations/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export interface ScheduleRulesListProps {
  orgId: string | null;
  getAccessToken: () => Promise<string | null>;
}

export function ScheduleRulesList({ orgId, getAccessToken }: ScheduleRulesListProps) {
  const [rules, setRules] = React.useState<ScheduleRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orgId) return;

    let cancelled = false;

    async function fetchRules() {
      setLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `/api/evaluations/schedule-rules?org_id=${encodeURIComponent(orgId)}`,
          { headers }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load schedule rules');
        }

        const data = await res.json();
        if (!cancelled) {
          setRules(data.rules ?? data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load schedule rules');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRules();
    return () => {
      cancelled = true;
    };
  }, [orgId, getAccessToken]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
        <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-destructive-base)' }}>
          {error}
        </Typography>
      </Box>
    );
  }

  if (rules.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: '12px',
          border: '2px dashed var(--ls-color-muted-border)',
          borderRadius: '12px',
          background: 'var(--ls-color-neutral-foreground)',
        }}
      >
        <SettingsOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
        <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
          No schedule rules configured
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
          Schedule rules define when evaluations are automatically assigned to employees.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rules.map((rule) => (
        <Box
          key={rule.id}
          sx={{
            p: 3,
            borderRadius: '12px',
            border: '1px solid var(--ls-color-muted-border)',
            backgroundColor: 'var(--ls-color-bg-container)',
            boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily,
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--ls-color-text-primary)',
              }}
            >
              {rule.form_template?.name ?? 'Unknown form'}
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
              {formatCadence(rule.cadence)}
              {rule.target_role_ids.length > 0 && ` · ${rule.target_role_ids.length} role(s)`}
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: '6px',
              backgroundColor: rule.is_active
                ? 'var(--ls-color-success-soft)'
                : 'var(--ls-color-muted-soft)',
              color: rule.is_active
                ? 'var(--ls-color-success-base)'
                : 'var(--ls-color-muted)',
            }}
          >
            <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600 }}>
              {rule.is_active ? 'Active' : 'Inactive'}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function formatCadence(cadence: string): string {
  switch (cadence) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-annual';
    case 'annual': return 'Annual';
    default: return cadence;
  }
}
