/**
 * EmailSequencesPage
 * Admin CRM page for viewing and managing email automation sequences.
 * Lists sequences as expandable cards with their steps shown as a timeline.
 */

import * as React from 'react';
import { CircularProgress, Switch } from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './EmailSequencesPage.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailSequenceStep {
  id: string;
  step_order: number;
  template_slug: string;
  delay_hours: number;
  active: boolean;
}

interface EmailSequence {
  id: string;
  name: string;
  trigger_event: string;
  active: boolean;
  created_at: string;
  email_sequence_steps: EmailSequenceStep[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  form_submitted: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  trial_started: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  onboarded: { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' },
};

const TRIGGER_LABELS: Record<string, string> = {
  form_submitted: 'Form Submitted',
  trial_started: 'Trial Started',
  onboarded: 'Onboarded',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDelay(hours: number): string {
  if (hours === 0) return 'Immediately';
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} after`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} after`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} after`;
}

function formatTrigger(trigger: string): string {
  return TRIGGER_LABELS[trigger] || trigger
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailSequencesPage() {
  const [sequences, setSequences] = React.useState<EmailSequence[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [togglingSequence, setTogglingSequence] = React.useState<string | null>(null);
  const [togglingStep, setTogglingStep] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch sequences with steps
  React.useEffect(() => {
    async function fetchSequences() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('email_sequences')
          .select('*, email_sequence_steps(id, step_order, template_slug, delay_hours, active)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Sort steps by step_order within each sequence
        const sorted = (data || []).map((seq: EmailSequence) => ({
          ...seq,
          email_sequence_steps: (seq.email_sequence_steps || []).sort(
            (a: EmailSequenceStep, b: EmailSequenceStep) => a.step_order - b.step_order
          ),
        }));

        setSequences(sorted);
      } catch (err) {
        console.error('Error fetching email sequences:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSequences();
  }, [supabase]);

  // Toggle sequence active
  const handleToggleSequence = React.useCallback(
    async (sequenceId: string, currentActive: boolean) => {
      setTogglingSequence(sequenceId);
      try {
        const { error } = await supabase
          .from('email_sequences')
          .update({ active: !currentActive })
          .eq('id', sequenceId);

        if (error) throw error;

        setSequences((prev) =>
          prev.map((seq) =>
            seq.id === sequenceId ? { ...seq, active: !currentActive } : seq
          )
        );
      } catch (err) {
        console.error('Error toggling sequence:', err);
      } finally {
        setTogglingSequence(null);
      }
    },
    [supabase]
  );

  // Toggle step active
  const handleToggleStep = React.useCallback(
    async (stepId: string, sequenceId: string, currentActive: boolean) => {
      setTogglingStep(stepId);
      try {
        const { error } = await supabase
          .from('email_sequence_steps')
          .update({ active: !currentActive })
          .eq('id', stepId);

        if (error) throw error;

        setSequences((prev) =>
          prev.map((seq) => {
            if (seq.id !== sequenceId) return seq;
            return {
              ...seq,
              email_sequence_steps: seq.email_sequence_steps.map((step) =>
                step.id === stepId ? { ...step, active: !currentActive } : step
              ),
            };
          })
        );
      } catch (err) {
        console.error('Error toggling step:', err);
      } finally {
        setTogglingStep(null);
      }
    },
    [supabase]
  );

  // Toggle expand/collapse
  const handleCardClick = React.useCallback((sequenceId: string) => {
    setExpandedId((prev) => (prev === sequenceId ? null : sequenceId));
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
        <span className={styles.loadingText}>Loading email sequences...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Email Sequences</h1>
          <p className={styles.subtitle}>
            Manage automated email sequences triggered by lead events.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Sequences</span>
          <span className={styles.summaryValue}>{sequences.length}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Active</span>
          <span className={styles.summaryValue}>
            {sequences.filter((s) => s.active).length}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Steps</span>
          <span className={styles.summaryValue}>
            {sequences.reduce((sum, s) => sum + s.email_sequence_steps.length, 0)}
          </span>
        </div>
      </div>

      {/* Sequence cards */}
      <div className={styles.sequenceList}>
        {sequences.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>No email sequences found.</p>
          </div>
        ) : (
          sequences.map((sequence) => {
            const isExpanded = expandedId === sequence.id;
            const stepCount = sequence.email_sequence_steps.length;
            const activeStepCount = sequence.email_sequence_steps.filter(
              (s) => s.active
            ).length;
            const triggerStyle = TRIGGER_COLORS[sequence.trigger_event] || {
              bg: '#F3F4F6',
              text: '#374151',
              border: '#D1D5DB',
            };

            return (
              <div
                key={sequence.id}
                className={`${styles.sequenceCard} ${isExpanded ? styles.sequenceCardExpanded : ''} ${
                  !sequence.active ? styles.sequenceCardInactive : ''
                }`}
              >
                {/* Card header */}
                <div
                  className={styles.sequenceHeader}
                  onClick={() => handleCardClick(sequence.id)}
                >
                  <div className={styles.sequenceInfo}>
                    <div className={styles.sequenceNameRow}>
                      <h3 className={styles.sequenceName}>{sequence.name}</h3>
                      <span
                        className={styles.triggerBadge}
                        style={{
                          backgroundColor: triggerStyle.bg,
                          color: triggerStyle.text,
                          borderColor: triggerStyle.border,
                        }}
                      >
                        {formatTrigger(sequence.trigger_event)}
                      </span>
                    </div>
                    <div className={styles.sequenceMeta}>
                      <span className={styles.stepCount}>
                        {stepCount} step{stepCount !== 1 ? 's' : ''}
                        {' '}
                        <span className={styles.stepCountDetail}>
                          ({activeStepCount} active)
                        </span>
                      </span>
                      <span className={styles.sequenceDate}>
                        Created {formatDate(sequence.created_at)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={styles.sequenceActions}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={sequence.active}
                      onChange={() =>
                        handleToggleSequence(sequence.id, sequence.active)
                      }
                      disabled={togglingSequence === sequence.id}
                      size="small"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: 'var(--ls-color-brand, #31664A)',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: 'var(--ls-color-brand, #31664A)',
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Expanded steps timeline */}
                {isExpanded && (
                  <div className={styles.stepsContainer}>
                    <div className={styles.stepsDivider} />
                    {sequence.email_sequence_steps.length === 0 ? (
                      <p className={styles.noSteps}>No steps configured for this sequence.</p>
                    ) : (
                      <div className={styles.timeline}>
                        {sequence.email_sequence_steps.map((step, index) => {
                          const isLast =
                            index === sequence.email_sequence_steps.length - 1;
                          return (
                            <div
                              key={step.id}
                              className={`${styles.timelineStep} ${
                                !step.active ? styles.timelineStepInactive : ''
                              }`}
                            >
                              {/* Timeline connector */}
                              <div className={styles.timelineTrack}>
                                <div className={styles.timelineDot}>
                                  <span className={styles.timelineNumber}>
                                    {step.step_order}
                                  </span>
                                </div>
                                {!isLast && (
                                  <div className={styles.timelineLine} />
                                )}
                              </div>

                              {/* Step content */}
                              <div className={styles.stepContent}>
                                <div className={styles.stepHeader}>
                                  <div className={styles.stepInfo}>
                                    <span className={styles.stepTemplate}>
                                      {step.template_slug}
                                    </span>
                                    <span className={styles.stepDelay}>
                                      {formatDelay(step.delay_hours)}
                                    </span>
                                  </div>
                                  <div
                                    className={styles.stepToggle}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Switch
                                      checked={step.active}
                                      onChange={() =>
                                        handleToggleStep(
                                          step.id,
                                          sequence.id,
                                          step.active
                                        )
                                      }
                                      disabled={togglingStep === step.id}
                                      size="small"
                                      sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                          color: 'var(--ls-color-brand, #31664A)',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                          {
                                            backgroundColor:
                                              'var(--ls-color-brand, #31664A)',
                                          },
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EmailSequencesPage;
