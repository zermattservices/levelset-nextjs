/**
 * LeadDetailPanel
 * Right-side drawer showing full lead details, stage management,
 * related leads, admin notes, and an event timeline.
 */

import * as React from 'react';
import {
  Drawer,
  Select,
  MenuItem,
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EmailIcon from '@mui/icons-material/Email';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ErrorIcon from '@mui/icons-material/Error';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import NoteIcon from '@mui/icons-material/Note';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './LeadDetailPanel.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  operator_name: string | null;
  store_number: string | null;
  is_multi_unit: boolean;
  source: string | null;
  pipeline_stage: string;
  stage_changed_at: string | null;
  engagement_score: number;
  estimated_value_cents: number;
  visitor_id: string | null;
  org_id: string | null;
  admin_notes: string | null;
  contacted_at: string | null;
  trial_started_at: string | null;
  onboarded_at: string | null;
  converted_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadEvent {
  id: string;
  lead_id: string;
  event_type: string;
  event_data: Record<string, any>;
  created_at: string;
}

interface RelatedLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  pipeline_stage: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'trial', label: 'Trial' },
  { value: 'onboarded', label: 'Onboarded' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
] as const;

const STAGE_COLORS: Record<string, string> = {
  new: '#2196F3',
  contacted: '#FF9800',
  trial: '#9C27B0',
  onboarded: '#00897B',
  converted: '#4CAF50',
  lost: '#F44336',
};

/** Maps pipeline_stage to its timestamp column */
const STAGE_TIMESTAMP_FIELD: Record<string, string> = {
  contacted: 'contacted_at',
  trial: 'trial_started_at',
  onboarded: 'onboarded_at',
  converted: 'converted_at',
  lost: 'lost_at',
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  page_view: <VisibilityIcon sx={{ fontSize: 16 }} />,
  form_submit: <AssignmentIcon sx={{ fontSize: 16 }} />,
  email_sent: <EmailIcon sx={{ fontSize: 16 }} />,
  email_opened: <MarkEmailReadIcon sx={{ fontSize: 16 }} />,
  email_clicked: <TouchAppIcon sx={{ fontSize: 16 }} />,
  email_bounced: <ErrorIcon sx={{ fontSize: 16 }} />,
  stage_change: <SwapHorizIcon sx={{ fontSize: 16 }} />,
  note_added: <NoteIcon sx={{ fontSize: 16 }} />,
};

const EVENT_COLORS: Record<string, string> = {
  page_view: '#607D8B',
  form_submit: '#2196F3',
  email_sent: '#9C27B0',
  email_opened: '#4CAF50',
  email_clicked: '#FF9800',
  email_bounced: '#F44336',
  stage_change: '#00897B',
  note_added: '#795548',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface LeadDetailPanelProps {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  onStageChange?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getLeadDisplayName(lead: Lead): string {
  const parts = [lead.first_name, lead.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : lead.email;
}

function getEventDescription(event: LeadEvent): string {
  const data = event.event_data || {};
  switch (event.event_type) {
    case 'page_view':
      return data.url || 'Page viewed';
    case 'form_submit':
      return data.source ? `Form: ${data.source}` : 'Form submitted';
    case 'email_sent':
      return data.template_name || data.template_slug || 'Email sent';
    case 'email_opened':
      return data.template_name || data.template_slug || 'Email opened';
    case 'email_clicked':
      return [data.template_name || data.template_slug, data.url].filter(Boolean).join(' - ') || 'Link clicked';
    case 'email_bounced':
      return data.template_name || data.template_slug || 'Email bounced';
    case 'stage_change':
      return `${data.old_stage || '?'} \u2192 ${data.new_stage || '?'}`;
    case 'note_added':
      return data.note || 'Note added';
    default:
      return event.event_type;
  }
}

function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    page_view: 'Page View',
    form_submit: 'Form Submit',
    email_sent: 'Email Sent',
    email_opened: 'Email Opened',
    email_clicked: 'Email Clicked',
    email_bounced: 'Email Bounced',
    stage_change: 'Stage Change',
    note_added: 'Note Added',
  };
  return labels[eventType] || eventType;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LeadDetailPanel({
  leadId,
  open,
  onClose,
  onStageChange,
}: LeadDetailPanelProps) {
  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // State
  const [lead, setLead] = React.useState<Lead | null>(null);
  const [events, setEvents] = React.useState<LeadEvent[]>([]);
  const [relatedLeads, setRelatedLeads] = React.useState<RelatedLead[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [stageUpdating, setStageUpdating] = React.useState(false);
  const [adminNotes, setAdminNotes] = React.useState('');
  const [noteSaving, setNoteSaving] = React.useState(false);
  const [notesDirty, setNotesDirty] = React.useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchLead = React.useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching lead:', error);
      return null;
    }
    return data as Lead;
  }, [supabase]);

  const fetchEvents = React.useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('lead_events')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching lead events:', error);
      return [];
    }
    return (data || []) as LeadEvent[];
  }, [supabase]);

  const fetchRelatedLeads = React.useCallback(async (storeNumber: string | null, currentId: string) => {
    if (!storeNumber) return [];

    const { data, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, pipeline_stage')
      .eq('store_number', storeNumber)
      .neq('id', currentId);

    if (error) {
      console.error('Error fetching related leads:', error);
      return [];
    }
    return (data || []) as RelatedLead[];
  }, [supabase]);

  // Load data when leadId changes
  React.useEffect(() => {
    if (!leadId || !open) {
      setLead(null);
      setEvents([]);
      setRelatedLeads([]);
      setAdminNotes('');
      setNotesDirty(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const leadData = await fetchLead(leadId);
      if (cancelled) return;

      if (leadData) {
        setLead(leadData);
        setAdminNotes(leadData.admin_notes || '');
        setNotesDirty(false);

        const [eventsData, relatedData] = await Promise.all([
          fetchEvents(leadId),
          fetchRelatedLeads(leadData.store_number, leadId),
        ]);
        if (cancelled) return;

        setEvents(eventsData);
        setRelatedLeads(relatedData);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [leadId, open, fetchLead, fetchEvents, fetchRelatedLeads]);

  // ─── Stage Change Handler ─────────────────────────────────────────────

  const handleStageChange = React.useCallback(async (newStage: string) => {
    if (!lead || newStage === lead.pipeline_stage) return;

    setStageUpdating(true);
    const oldStage = lead.pipeline_stage;

    try {
      const now = new Date().toISOString();
      const updatePayload: Record<string, any> = {
        pipeline_stage: newStage,
        stage_changed_at: now,
        updated_at: now,
      };

      // Set the timestamp field for the target stage
      const tsField = STAGE_TIMESTAMP_FIELD[newStage];
      if (tsField) {
        updatePayload[tsField] = now;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id);

      if (updateError) {
        console.error('Error updating lead stage:', updateError);
        return;
      }

      // Insert a stage_change event
      await supabase.from('lead_events').insert({
        lead_id: lead.id,
        event_type: 'stage_change',
        event_data: { old_stage: oldStage, new_stage: newStage },
      });

      // Refresh data
      const [updatedLead, updatedEvents] = await Promise.all([
        fetchLead(lead.id),
        fetchEvents(lead.id),
      ]);
      if (updatedLead) {
        setLead(updatedLead);
      }
      setEvents(updatedEvents);
      onStageChange?.();
    } catch (err) {
      console.error('Stage change failed:', err);
    } finally {
      setStageUpdating(false);
    }
  }, [lead, supabase, fetchLead, fetchEvents, onStageChange]);

  // ─── Save Notes Handler ───────────────────────────────────────────────

  const handleSaveNotes = React.useCallback(async () => {
    if (!lead) return;

    setNoteSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          admin_notes: adminNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error('Error saving notes:', updateError);
        return;
      }

      // Insert a note_added event
      if (adminNotes.trim()) {
        await supabase.from('lead_events').insert({
          lead_id: lead.id,
          event_type: 'note_added',
          event_data: { note: adminNotes.trim() },
        });
      }

      // Refresh events
      const updatedEvents = await fetchEvents(lead.id);
      setEvents(updatedEvents);
      setNotesDirty(false);
    } catch (err) {
      console.error('Save notes failed:', err);
    } finally {
      setNoteSaving(false);
    }
  }, [lead, adminNotes, supabase, fetchEvents]);

  // ─── Engagement bar width ─────────────────────────────────────────────

  const engagementPercent = lead ? Math.min(100, Math.max(0, lead.engagement_score)) : 0;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 520,
          maxWidth: '100vw',
        },
      }}
    >
      <div className={styles.panelContent}>
        {loading ? (
          <div className={styles.loadingState}>
            <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
          </div>
        ) : !lead ? (
          <div className={styles.loadingState}>
            <p className={styles.emptyText}>No lead selected</p>
          </div>
        ) : (
          <>
            {/* ─── Header ──────────────────────────────────────────────── */}
            <div className={styles.panelHeader}>
              <div className={styles.headerInfo}>
                <h2 className={styles.leadName}>{getLeadDisplayName(lead)}</h2>
                <p className={styles.leadEmail}>{lead.email}</p>
              </div>
              <IconButton onClick={onClose} size="small">
                <CloseIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </div>

            {/* ─── Body (scrollable) ───────────────────────────────────── */}
            <div className={styles.panelBody}>

              {/* Stage Selector */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Pipeline Stage</p>
                <Select
                  value={lead.pipeline_stage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  size="small"
                  fullWidth
                  disabled={stageUpdating}
                  sx={{
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: 13,
                    borderRadius: '8px',
                  }}
                  renderValue={(val) => {
                    const color = STAGE_COLORS[val] || '#999';
                    const label = STAGE_OPTIONS.find((s) => s.value === val)?.label || val;
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: color,
                            flexShrink: 0,
                          }}
                        />
                        {label}
                      </span>
                    );
                  }}
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <MenuItem
                      key={opt.value}
                      value={opt.value}
                      sx={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13 }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: STAGE_COLORS[opt.value],
                          marginRight: 8,
                          flexShrink: 0,
                        }}
                      />
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </div>

              {/* Stats Row */}
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Engagement</p>
                  <p className={styles.statValue}>{lead.engagement_score}</p>
                  <div className={styles.engagementBar}>
                    <div
                      className={styles.engagementFill}
                      style={{ width: `${engagementPercent}%` }}
                    />
                  </div>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Est. Value</p>
                  <p className={styles.statValue}>
                    {formatUSD(lead.estimated_value_cents)}
                  </p>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Source</p>
                  <span
                    className={styles.sourceBadge}
                    style={{
                      backgroundColor:
                        lead.source === 'waitlist'
                          ? '#E3F2FD'
                          : lead.source === 'contact'
                            ? '#FFF3E0'
                            : '#F3E5F5',
                      color:
                        lead.source === 'waitlist'
                          ? '#1565C0'
                          : lead.source === 'contact'
                            ? '#E65100'
                            : '#6A1B9A',
                    }}
                  >
                    {lead.source || 'unknown'}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Details</p>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Store #</span>
                    <span className={styles.infoValue}>{lead.store_number || '--'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Multi-unit</span>
                    <span className={styles.infoValue}>{lead.is_multi_unit ? 'Yes' : 'No'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Operator</span>
                    <span className={styles.infoValue}>{lead.operator_name || '--'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Created</span>
                    <span className={styles.infoValue}>{formatDate(lead.created_at)}</span>
                  </div>
                  {lead.org_id && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Org</span>
                      <a
                        className={styles.orgLink}
                        href={`/admin?section=organizations&org=${lead.org_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Org
                        <OpenInNewIcon sx={{ fontSize: 12, marginLeft: '2px' }} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Leads */}
              {relatedLeads.length > 0 && (
                <div className={styles.section}>
                  <p className={styles.sectionLabel}>
                    Related Leads (Store #{lead.store_number})
                  </p>
                  <div className={styles.relatedList}>
                    {relatedLeads.map((rl) => {
                      const name = [rl.first_name, rl.last_name].filter(Boolean).join(' ') || rl.email;
                      const stageColor = STAGE_COLORS[rl.pipeline_stage] || '#999';
                      return (
                        <div key={rl.id} className={styles.relatedItem}>
                          <span className={styles.relatedName}>{name}</span>
                          <span
                            className={styles.relatedStageBadge}
                            style={{
                              backgroundColor: stageColor + '1A',
                              color: stageColor,
                            }}
                          >
                            {STAGE_OPTIONS.find((s) => s.value === rl.pipeline_stage)?.label || rl.pipeline_stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>Admin Notes</p>
                <TextField
                  value={adminNotes}
                  onChange={(e) => {
                    setAdminNotes(e.target.value);
                    setNotesDirty(true);
                  }}
                  placeholder="Add internal notes about this lead..."
                  multiline
                  rows={3}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"Satoshi", sans-serif',
                      fontSize: 13,
                      borderRadius: '8px',
                    },
                  }}
                />
                {notesDirty && (
                  <div className={styles.noteSaveRow}>
                    <button
                      className={styles.saveNoteButton}
                      onClick={handleSaveNotes}
                      disabled={noteSaving}
                    >
                      {noteSaving ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className={styles.section}>
                <p className={styles.sectionLabel}>
                  Timeline ({events.length})
                </p>
                {events.length === 0 ? (
                  <p className={styles.emptyText}>No events yet</p>
                ) : (
                  <div className={styles.timeline}>
                    {events.map((event) => {
                      const icon = EVENT_ICONS[event.event_type] || <NoteIcon sx={{ fontSize: 16 }} />;
                      const color = EVENT_COLORS[event.event_type] || '#999';
                      return (
                        <div key={event.id} className={styles.timelineItem}>
                          <div className={styles.timelineDotCol}>
                            <div
                              className={styles.timelineDot}
                              style={{ backgroundColor: color }}
                            >
                              {icon}
                            </div>
                            <div className={styles.timelineLine} />
                          </div>
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineHeader}>
                              <span className={styles.timelineType}>
                                {getEventTypeLabel(event.event_type)}
                              </span>
                              <span className={styles.timelineDate}>
                                {formatDateTime(event.created_at)}
                              </span>
                            </div>
                            <p className={styles.timelineDesc}>
                              {getEventDescription(event)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

export default LeadDetailPanel;
