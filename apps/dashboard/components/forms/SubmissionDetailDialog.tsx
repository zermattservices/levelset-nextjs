/**
 * SubmissionDetailDialog — Read-only view of a submitted form with status actions.
 *
 * Renders the form using FormRenderer with schema_snapshot + response_data.
 * Shows metadata and Approve/Reject buttons for admins.
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { FormRenderer } from './FormRenderer';
import { EvaluationScoreDisplay } from './evaluation/EvaluationScoreDisplay';
import { calculateEvaluationScore } from '@/lib/forms/scoring';
import type { FormSubmission, FormType, SubmissionStatus } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; bg: string; text: string }> = {
  submitted: { label: 'Submitted', bg: 'var(--ls-color-brand-soft)', text: 'var(--ls-color-brand)' },
  deleted: { label: 'Deleted', bg: 'var(--ls-color-destructive-soft)', text: 'var(--ls-color-destructive)' },
};

const TYPE_LABELS: Record<FormType, string> = {
  rating: 'Rating',
  discipline: 'Discipline',
  evaluation: 'Evaluation',
  custom: 'Custom',
};

interface SubmissionDetailDialogProps {
  open: boolean;
  submission: FormSubmission | null;
  onClose: () => void;
  onStatusUpdate?: () => void;
  getAccessToken: () => Promise<string | null>;
}

export function SubmissionDetailDialog({
  open,
  submission,
  onClose,
  onStatusUpdate,
  getAccessToken,
}: SubmissionDetailDialogProps) {
  if (!submission) return null;

  const statusConfig = STATUS_CONFIG[submission.status] || STATUS_CONFIG.submitted;
  const typeLabel = TYPE_LABELS[submission.form_type as FormType] || 'Custom';

  const submittedDate = new Date(submission.created_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  // Build a synthetic template from the snapshot for read-only rendering
  const snapshotTemplate = {
    ...submission,
    id: submission.template_id,
    org_id: submission.org_id,
    group_id: '',
    name: submission.template?.name || 'Form',
    name_es: null,
    description: null,
    description_es: null,
    form_type: submission.form_type as FormType,
    schema: submission.schema_snapshot || {},
    ui_schema: submission.schema_snapshot?.['ui:schema'] || submission.template?.ui_schema || {},
    settings: {},
    is_active: true,
    is_system: false,
    created_by: null,
    version: 1,
    created_at: submission.created_at,
    updated_at: submission.updated_at,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          fontFamily,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily,
          fontSize: 18,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
        }}
      >
        <span>Submission Detail</span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ padding: '0 24px 24px' }}>
        {/* Metadata header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip
              label={statusConfig.label}
              size="small"
              sx={{
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                height: 24,
                borderRadius: '12px',
                backgroundColor: statusConfig.bg,
                color: statusConfig.text,
              }}
            />
            <Chip
              label={typeLabel}
              size="small"
              variant="outlined"
              sx={{
                fontFamily,
                fontSize: 11,
                fontWeight: 500,
                height: 24,
                borderRadius: '12px',
                borderColor: 'var(--ls-color-muted-border)',
                color: 'var(--ls-color-muted)',
              }}
            />
            {submission.score != null && (
              <Chip
                label={`Score: ${Math.round(submission.score)}%`}
                size="small"
                sx={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  height: 24,
                  borderRadius: '12px',
                  backgroundColor: 'var(--ls-color-success-soft)',
                  color: 'var(--ls-color-success)',
                }}
              />
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px 24px',
              fontSize: 13,
              fontFamily,
            }}
          >
            <div>
              <span style={{ color: 'var(--ls-color-muted)', fontWeight: 500 }}>Form: </span>
              <span style={{ fontWeight: 600 }}>{submission.template?.name || 'Unknown'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--ls-color-muted)', fontWeight: 500 }}>Submitted: </span>
              <span>{submittedDate}</span>
            </div>
            <div>
              <span style={{ color: 'var(--ls-color-muted)', fontWeight: 500 }}>Submitted By: </span>
              <span>{submission.submitted_by_name || 'Unknown'}</span>
            </div>
            {submission.employee_name && (
              <div>
                <span style={{ color: 'var(--ls-color-muted)', fontWeight: 500 }}>Employee: </span>
                <span>{submission.employee_name}</span>
              </div>
            )}
          </div>
        </div>

        <Divider sx={{ marginBottom: 3 }} />

        {/* Evaluation score display */}
        {submission.form_type === 'evaluation' && submission.metadata?.section_scores && (() => {
          const evalSettings = submission.template?.settings?.evaluation ||
            submission.schema_snapshot?.['x-evaluation'] || {};
          if (evalSettings.sections && evalSettings.questions) {
            const score = calculateEvaluationScore(submission.response_data, evalSettings);
            return (
              <>
                <EvaluationScoreDisplay score={score} />
                <Divider sx={{ marginY: 3 }} />
              </>
            );
          }
          return null;
        })()}

        {/* Read-only form */}
        <FormRenderer
          template={snapshotTemplate as any}
          readOnly
          initialData={submission.response_data}
          hideSubmit
        />
      </DialogContent>

    </Dialog>
  );
}
