import * as React from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import {
  dialogPaperSx,
  dialogTitleSx,
  fontFamily,
} from '@/components/forms/dialogStyles';

export interface EvaluationSubmissionModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
}

interface SubmissionData {
  id: string;
  employee_name?: string;
  form_name?: string;
  submitted_at?: string;
  reviewer_name?: string;
  overall_percentage?: number;
  sections?: {
    name: string;
    percentage: number;
    fields: {
      label: string;
      answer: string | number | boolean | null;
    }[];
  }[];
}

export function EvaluationSubmissionModal({
  open,
  onClose,
  submissionId,
}: EvaluationSubmissionModalProps) {
  const [submission, setSubmission] = React.useState<SubmissionData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !submissionId) return;

    let cancelled = false;

    async function fetchSubmission() {
      setLoading(true);
      setError(null);
      setSubmission(null);
      try {
        const { createSupabaseClient } = await import('@/util/supabase/component');
        const supabase = createSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `/api/forms/submissions?submission_id=${encodeURIComponent(submissionId)}`,
          { headers }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load submission');
        }

        const data = await res.json();
        if (!cancelled) {
          setSubmission(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load submission');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSubmission();
    return () => {
      cancelled = true;
    };
  }, [open, submissionId]);

  function formatAnswer(answer: string | number | boolean | null): string {
    if (answer === null || answer === undefined) return '—';
    if (typeof answer === 'boolean') return answer ? 'Yes' : 'No';
    return String(answer);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        <span>Evaluation Submission</span>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: 'var(--ls-color-muted)', ml: 1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '8px 24px 24px' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
            <CircularProgress size={28} sx={{ color: 'var(--ls-color-brand)' }} />
          </Box>
        ) : error ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-destructive-base)' }}>
              {error}
            </Typography>
          </Box>
        ) : submission ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header meta */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 2,
                p: 2,
                borderRadius: '8px',
                backgroundColor: 'var(--ls-color-neutral-foreground)',
                border: '1px solid var(--ls-color-muted-border)',
              }}
            >
              {submission.employee_name && (
                <Box>
                  <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    Employee
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
                    {submission.employee_name}
                  </Typography>
                </Box>
              )}
              {submission.form_name && (
                <Box>
                  <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    Evaluation
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
                    {submission.form_name}
                  </Typography>
                </Box>
              )}
              {submission.submitted_at && (
                <Box>
                  <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    Date
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-neutral-soft-foreground)' }}>
                    {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                  </Typography>
                </Box>
              )}
              {submission.reviewer_name && (
                <Box>
                  <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    Reviewer
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-neutral-soft-foreground)' }}>
                    {submission.reviewer_name}
                  </Typography>
                </Box>
              )}
              {submission.overall_percentage !== undefined && (
                <Box>
                  <Typography sx={{ fontFamily, fontSize: 11, fontWeight: 600, color: 'var(--ls-color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    Score
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 700, color: 'var(--ls-color-brand)' }}>
                    {Math.round(submission.overall_percentage)}%
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Sections + responses */}
            {submission.sections && submission.sections.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {submission.sections.map((section, si) => (
                  <Box key={si}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--ls-color-text-primary)',
                        }}
                      >
                        {section.name}
                      </Typography>
                      {section.percentage !== undefined && (
                        <Typography
                          sx={{
                            fontFamily,
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--ls-color-brand)',
                          }}
                        >
                          {Math.round(section.percentage)}%
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {section.fields.map((field, fi) => (
                        <Box key={fi}>
                          {fi > 0 && (
                            <Divider sx={{ borderColor: 'var(--ls-color-muted-soft)', my: 1.5 }} />
                          )}
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              py: fi === 0 ? 0 : undefined,
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily,
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--ls-color-neutral-soft-foreground)',
                              }}
                            >
                              {field.label}
                            </Typography>
                            <Typography
                              sx={{
                                fontFamily,
                                fontSize: 14,
                                color: 'var(--ls-color-text-primary)',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {formatAnswer(field.answer)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
