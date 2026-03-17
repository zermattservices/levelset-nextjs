import * as React from 'react';
import { Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material';
import type { EvaluationScoreSummary as EvaluationScoreSummaryType } from '@/lib/evaluations/types';
import { EvaluationSubmissionModal } from './EvaluationSubmissionModal';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export interface EvaluationScoreSummaryProps {
  submissionId: string;
  onClose: () => void;
}

export function EvaluationScoreSummary({ submissionId, onClose }: EvaluationScoreSummaryProps) {
  const [score, setScore] = React.useState<EvaluationScoreSummaryType | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchScore() {
      setLoading(true);
      setError(null);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `/api/evaluations/submission-score?submission_id=${encodeURIComponent(submissionId)}`,
          { headers }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load score');
        }

        const data = await res.json();
        if (!cancelled) {
          setScore(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load score');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchScore();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  return (
    <>
      <Box
        sx={{
          mt: 2,
          p: 3,
          borderRadius: '12px',
          border: '1px solid var(--ls-color-muted-border)',
          backgroundColor: 'var(--ls-color-bg-container)',
          boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.04)',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive-base)' }}>
              {error}
            </Typography>
            <Button
              size="small"
              onClick={onClose}
              sx={{
                fontFamily,
                fontSize: 12,
                textTransform: 'none',
                color: 'var(--ls-color-muted)',
                alignSelf: 'flex-start',
              }}
            >
              Close
            </Button>
          </Box>
        ) : score ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Overall score */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 40,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: 'var(--ls-color-text-primary)',
                }}
              >
                {Math.round(score.overall_percentage)}%
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
                overall score
              </Typography>
            </Box>

            {/* Per-section breakdown */}
            {score.sections.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {score.sections.map((section) => (
                  <Box key={section.name} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--ls-color-neutral-soft-foreground)',
                        }}
                      >
                        {section.name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--ls-color-neutral-soft-foreground)',
                        }}
                      >
                        {Math.round(section.percentage)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={section.percentage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'var(--ls-color-muted-soft)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 'var(--ls-color-brand)',
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setModalOpen(true)}
                sx={{
                  fontFamily,
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderColor: 'var(--ls-color-muted-border)',
                  color: 'var(--ls-color-neutral-soft-foreground)',
                  borderRadius: '6px',
                  '&:hover': {
                    borderColor: 'var(--ls-color-brand)',
                    color: 'var(--ls-color-brand)',
                  },
                }}
              >
                View Full Submission
              </Button>
              <Button
                size="small"
                onClick={onClose}
                sx={{
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  color: 'var(--ls-color-muted)',
                }}
              >
                Close
              </Button>
            </Box>
          </Box>
        ) : null}
      </Box>

      <EvaluationSubmissionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        submissionId={submissionId}
      />
    </>
  );
}
