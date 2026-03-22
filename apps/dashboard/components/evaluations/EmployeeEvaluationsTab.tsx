/**
 * EmployeeEvaluationsTab — Shows evaluation history for an employee.
 * Used inside the EmployeeModal on the "evaluations" tab.
 *
 * Displays:
 * - Last evaluation summary (score, date, rater)
 * - Cards for each completed evaluation (accordion with score breakdown)
 * - Greyed-out cards for upcoming/pending evaluations
 */

import * as React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { format } from 'date-fns';
import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { SubmissionDetailDialog } from '@/components/forms/SubmissionDetailDialog';
import type { FormSubmission } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

interface EvalSubmission {
  id: string;
  template_name: string;
  score: number | null;
  submitted_by_name: string | null;
  employee_name: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

interface UpcomingEval {
  template_name: string;
  cadence: string;
  source: string;
  due_date: string;
  status: string;
}

function getScoreColor(pct: number): string {
  if (pct >= 80) return '#16A34A';
  if (pct >= 60) return '#FACC15';
  return '#D23230';
}

function formatCadence(c: string): string {
  switch (c) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-annual';
    case 'annual': return 'Annual';
    default: return c;
  }
}

interface Props {
  employeeId: string;
  locationId: string;
}

export function EmployeeEvaluationsTab({ employeeId, locationId }: Props) {
  const { selectedLocationOrgId } = useLocationContext();
  const [submissions, setSubmissions] = React.useState<EvalSubmission[]>([]);
  const [upcoming, setUpcoming] = React.useState<UpcomingEval[]>([]);
  const [loading, setLoading] = React.useState(true);

  // View submission dialog
  const [viewSubmission, setViewSubmission] = React.useState<FormSubmission | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const getAccessToken = React.useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch { return null; }
  }, []);

  React.useEffect(() => {
    if (!employeeId || !selectedLocationOrgId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Fetch completed evaluation submissions for this employee
        const subsRes = await fetch(
          `/api/forms/submissions?org_id=${encodeURIComponent(selectedLocationOrgId!)}&form_type=evaluation&employee_id=${encodeURIComponent(employeeId)}`,
          { headers }
        );

        if (subsRes.ok) {
          const data = await subsRes.json();
          const subs = (Array.isArray(data) ? data : data.submissions ?? data).map((s: any) => ({
            id: s.id,
            template_name: s.template?.name ?? s.form_templates?.name ?? 'Unknown',
            score: s.score,
            submitted_by_name: s.submitted_by_name ?? null,
            employee_name: s.employee_name ?? null,
            created_at: s.created_at,
            metadata: s.metadata ?? {},
          }));
          if (!cancelled) setSubmissions(subs);
        }

        // Fetch upcoming evaluations from status API
        const statusRes = await fetch(
          `/api/evaluations/status?org_id=${encodeURIComponent(selectedLocationOrgId!)}&location_id=${encodeURIComponent(locationId)}`,
          { headers }
        );

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const items = (statusData.items ?? []).filter(
            (item: any) => item.employee?.id === employeeId && item.status !== 'completed'
          );
          if (!cancelled) {
            setUpcoming(items.map((item: any) => ({
              template_name: item.evaluation?.name ?? 'Unknown',
              cadence: item.cadence ?? '',
              source: item.source ?? '',
              due_date: item.due_date ?? '',
              status: item.status ?? 'due',
            })));
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [employeeId, selectedLocationOrgId, locationId, getAccessToken]);

  const handleViewSubmission = React.useCallback(async (submissionId: string) => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(
        `/api/forms/submissions/${encodeURIComponent(submissionId)}?org_id=${encodeURIComponent(selectedLocationOrgId!)}`,
        { headers }
      );
      if (!res.ok) return;
      const sub = await res.json();
      if (sub) {
        setViewSubmission(sub);
        setDialogOpen(true);
      }
    } catch { /* silently fail */ }
  }, [getAccessToken, selectedLocationOrgId]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rounded" width="100%" height={80} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rounded" width="100%" height={100} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rounded" width="100%" height={100} sx={{ borderRadius: '12px' }} />
      </Box>
    );
  }

  const lastCompleted = submissions.length > 0 ? submissions[0] : null;

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Last evaluation summary */}
      {lastCompleted && (
        <Box sx={{
          p: 2.5,
          borderRadius: '12px',
          border: '1px solid var(--ls-color-muted-border)',
          backgroundColor: 'var(--ls-color-bg-container)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Last Evaluation
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 700, color: 'var(--ls-color-text-primary)' }}>
              {lastCompleted.template_name}
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
              {format(new Date(lastCompleted.created_at), 'MMM d, yyyy')}
              {lastCompleted.submitted_by_name && ` · Rated by ${lastCompleted.submitted_by_name}`}
            </Typography>
          </Box>
          {lastCompleted.score != null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56 }}>
                <CircularProgress variant="determinate" value={100} size={56} thickness={4} sx={{ color: 'var(--ls-color-neutral-foreground)', position: 'absolute' }} />
                <CircularProgress variant="determinate" value={Math.min(100, Math.round(lastCompleted.score))} size={56} thickness={4} sx={{ color: getScoreColor(lastCompleted.score), position: 'absolute' }} />
                <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 700, color: getScoreColor(lastCompleted.score) }}>
                  {Math.round(lastCompleted.score)}%
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Completed evaluations */}
      {submissions.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Completed ({submissions.length})
          </Typography>
          {submissions.map((sub) => (
            <CompletedEvalCard
              key={sub.id}
              submission={sub}
              onView={() => handleViewSubmission(sub.id)}
            />
          ))}
        </Box>
      )}

      {/* Upcoming evaluations */}
      {upcoming.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Upcoming ({upcoming.length})
          </Typography>
          {upcoming.map((item, i) => (
            <UpcomingEvalCard key={i} item={item} />
          ))}
        </Box>
      )}

      {submissions.length === 0 && upcoming.length === 0 && (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          py: 6, gap: 1.5, border: '2px dashed var(--ls-color-muted-border)', borderRadius: '12px',
          background: 'var(--ls-color-neutral-foreground)',
        }}>
          <AssignmentOutlinedIcon sx={{ fontSize: 36, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
          <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
            No evaluations
          </Typography>
          <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
            No evaluations have been assigned to this employee.
          </Typography>
        </Box>
      )}

      <SubmissionDetailDialog
        open={dialogOpen}
        submission={viewSubmission}
        onClose={() => { setDialogOpen(false); setViewSubmission(null); }}
        getAccessToken={getAccessToken}
      />
    </Box>
  );
}

// ── Completed evaluation card with accordion ─────────────────────────────────

function CompletedEvalCard({ submission, onView }: { submission: EvalSubmission; onView: () => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const score = submission.score != null ? Math.round(submission.score) : null;
  const scoreColor = score != null ? getScoreColor(score) : 'var(--ls-color-muted)';
  const rawSections = submission.metadata?.section_scores ?? submission.metadata?.sections ?? [];
  const sections: Array<{ name: string; percentage: number; earned: number; max: number }> =
    rawSections.map((s: any) => ({
      name: s.sectionName ?? s.name ?? 'Unknown',
      percentage: s.percentage ?? 0,
      earned: s.earned ?? s.earnedPoints ?? 0,
      max: s.max ?? s.maxPoints ?? 0,
    }));

  return (
    <Box sx={{
      border: '1px solid var(--ls-color-muted-border)',
      borderRadius: '10px',
      overflow: 'hidden',
      backgroundColor: 'var(--ls-color-bg-container)',
    }}>
      {/* Header — clickable to expand */}
      <Box
        onClick={() => sections.length > 0 && setExpanded(!expanded)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 2,
          cursor: sections.length > 0 ? 'pointer' : 'default',
          '&:hover': sections.length > 0 ? { backgroundColor: 'var(--ls-color-neutral-foreground)' } : {},
        }}
      >
        {sections.length > 0 && (
          <ExpandMoreIcon sx={{
            fontSize: 20, color: 'var(--ls-color-muted)', flexShrink: 0,
            transition: 'transform 0.2s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
            {submission.template_name}
          </Typography>
          <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
            {format(new Date(submission.created_at), 'MMM d, yyyy')}
            {submission.submitted_by_name && ` · ${submission.submitted_by_name}`}
          </Typography>
        </Box>
        {score != null && (
          <Chip
            label={`${score}%`}
            size="small"
            sx={{
              fontFamily, fontSize: 12, fontWeight: 700, height: 26,
              backgroundColor: `${scoreColor}18`, color: scoreColor,
              border: 'none', flexShrink: 0,
            }}
          />
        )}
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => { e.stopPropagation(); onView(); }}
          sx={{
            fontFamily, fontSize: 11, fontWeight: 600, textTransform: 'none',
            borderColor: 'var(--ls-color-muted-border)', color: 'var(--ls-color-neutral-soft-foreground)',
            borderRadius: '6px', minWidth: 48, flexShrink: 0,
            '&:hover': { borderColor: 'var(--ls-color-brand)', color: 'var(--ls-color-brand)' },
          }}
        >
          View
        </Button>
      </Box>

      {/* Expanded section breakdown */}
      {expanded && sections.length > 0 && (
        <Box sx={{ px: 2, pb: 2, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 1.5, borderTop: '1px solid var(--ls-color-muted-soft)' }}>
          {sections.map((section, i) => {
            const pct = Math.round(section.percentage);
            const color = getScoreColor(pct);
            return (
              <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: 'var(--ls-color-neutral-soft-foreground)' }}>
                    {section.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
                      {section.earned.toFixed(1)} / {section.max.toFixed(1)} pts
                    </Typography>
                    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 700, color }}>{pct}%</Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 5, borderRadius: 3,
                    backgroundColor: 'var(--ls-color-muted-soft)',
                    '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 3 },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// ── Upcoming evaluation card (greyed out) ────────────────────────────────────

function formatSource(source: string): string {
  switch (source) {
    case 'certification_pending': return 'Certification';
    case 'certification_expired': return 'Re-certification';
    case 'manual': return 'Requested';
    default: return '';
  }
}

function UpcomingEvalCard({ item }: { item: UpcomingEval }) {
  const isOverdue = item.status === 'overdue';
  const sourceLabel = formatSource(item.source);
  const cadenceLabel = formatCadence(item.cadence);
  // Show source label for event-triggered evals, cadence label for scheduled ones
  const typeLabel = sourceLabel || cadenceLabel;

  return (
    <Box sx={{
      border: '1px dashed var(--ls-color-muted-border)',
      borderRadius: '10px',
      p: 2,
      opacity: 0.65,
      backgroundColor: 'var(--ls-color-neutral-foreground)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Box>
        <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
          {item.template_name}
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
          {typeLabel}
          {item.due_date && `${typeLabel ? ' · ' : ''}Due ${format(new Date(item.due_date + 'T00:00:00'), 'MMM d, yyyy')}`}
        </Typography>
      </Box>
      <Chip
        label={isOverdue ? 'Overdue' : 'Pending'}
        size="small"
        sx={{
          fontFamily, fontSize: 11, fontWeight: 600, height: 22,
          backgroundColor: isOverdue ? 'var(--ls-color-destructive-soft)' : 'var(--ls-color-muted-soft)',
          color: isOverdue ? 'var(--ls-color-destructive-base)' : 'var(--ls-color-muted)',
          border: 'none',
        }}
      />
    </Box>
  );
}
