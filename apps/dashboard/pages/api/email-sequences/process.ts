/**
 * Email sequence processing cron endpoint.
 *
 * Called by Vercel Cron on a schedule. For each active sequence:
 * 1. Find leads matching the trigger event
 * 2. Determine which step they should receive next
 * 3. Check if enough time has elapsed since trigger/last step
 * 4. Send the email and record in email_sends
 *
 * Protected by CRON_SECRET bearer token.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { sendTemplate } from '@/lib/emails/send-template';
import { recalculateEngagementScore } from '@/lib/crm/engagement';
import type { NextApiRequest, NextApiResponse } from 'next';

// Maps trigger events to the lead_events event_type that starts the sequence
const TRIGGER_EVENT_MAP: Record<string, string> = {
  form_submitted: 'form_submit',
  trial_started: 'stage_change', // stage_change where new_stage = 'trial'
  onboarded: 'stage_change',     // stage_change where new_stage = 'onboarded'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET (Vercel cron) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only run in production
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return res.status(200).json({ skipped: true, reason: 'Not production' });
  }

  const supabase = createServerSupabaseClient();

  try {
    // Fetch active sequences with their steps
    const { data: sequences, error: seqError } = await supabase
      .from('email_sequences')
      .select('*, email_sequence_steps(*)')
      .eq('active', true);

    if (seqError) {
      console.error('Error fetching sequences:', seqError);
      return res.status(500).json({ error: 'Failed to fetch sequences' });
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const sequence of sequences || []) {
      const steps = (sequence.email_sequence_steps || [])
        .filter((s: any) => s.active)
        .sort((a: any, b: any) => a.step_order - b.step_order);

      if (steps.length === 0) continue;

      // Find leads that should receive emails from this sequence
      const leads = await getEligibleLeads(supabase, sequence, steps);

      for (const { lead, step, triggerTime } of leads) {
        try {
          // Look up the template metadata for subject line
          const { data: template } = await supabase
            .from('email_templates')
            .select('subject, preview_text')
            .eq('slug', step.template_slug)
            .single();

          if (!template) {
            console.error(`Template not found: ${step.template_slug}`);
            totalErrors++;
            continue;
          }

          await sendTemplate({
            to: lead.email,
            templateSlug: step.template_slug,
            subject: template.subject,
            props: { firstName: lead.first_name || undefined },
            leadId: lead.id,
            sequenceId: sequence.id,
          });

          // Recalculate engagement score after sending
          await recalculateEngagementScore(lead.id);

          totalSent++;
        } catch (err) {
          console.error(
            `Failed to send sequence step ${step.template_slug} to ${lead.email}:`,
            err
          );
          totalErrors++;
        }
      }
    }

    return res.status(200).json({
      processed: true,
      sent: totalSent,
      errors: totalErrors,
    });
  } catch (error) {
    console.error('Sequence processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Find leads eligible for the next step in a sequence.
 */
async function getEligibleLeads(
  supabase: any,
  sequence: any,
  steps: any[]
): Promise<Array<{ lead: any; step: any; triggerTime: string }>> {
  const eligible: Array<{ lead: any; step: any; triggerTime: string }> = [];

  // Get the trigger event type
  const triggerEventType = TRIGGER_EVENT_MAP[sequence.trigger_event];
  if (!triggerEventType) return eligible;

  // Find leads with the trigger event who haven't been marked as lost
  let leadsQuery = supabase
    .from('leads')
    .select('id, email, first_name, pipeline_stage')
    .neq('pipeline_stage', 'lost');

  // For form_submitted trigger, all non-lost leads are eligible
  // For stage-based triggers, filter by the relevant stage
  if (sequence.trigger_event === 'trial_started') {
    leadsQuery = leadsQuery.in('pipeline_stage', ['trial', 'onboarded', 'converted']);
  } else if (sequence.trigger_event === 'onboarded') {
    leadsQuery = leadsQuery.in('pipeline_stage', ['onboarded', 'converted']);
  }

  const { data: leads, error: leadsError } = await leadsQuery;

  if (leadsError || !leads) return eligible;

  for (const lead of leads) {
    // Find which emails from this sequence have already been sent to this lead
    const { data: sentEmails } = await supabase
      .from('email_sends')
      .select('template_slug, sent_at')
      .eq('lead_id', lead.id)
      .eq('sequence_id', sequence.id)
      .order('sent_at', { ascending: false });

    const sentSlugs = new Set((sentEmails || []).map((e: any) => e.template_slug));

    // Find the trigger time for this lead
    let triggerTime: string | null = null;

    if (sequence.trigger_event === 'form_submitted') {
      // Use the lead's created_at as the trigger time
      const { data: triggerEvent } = await supabase
        .from('lead_events')
        .select('created_at')
        .eq('lead_id', lead.id)
        .eq('event_type', 'form_submit')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      triggerTime = triggerEvent?.created_at || null;
    } else {
      // For stage-based triggers, find the stage_change event
      const targetStage =
        sequence.trigger_event === 'trial_started' ? 'trial' : 'onboarded';

      const { data: stageEvents } = await supabase
        .from('lead_events')
        .select('created_at, event_data')
        .eq('lead_id', lead.id)
        .eq('event_type', 'stage_change')
        .order('created_at', { ascending: true });

      const matchingEvent = (stageEvents || []).find(
        (e: any) => e.event_data?.new_stage === targetStage
      );
      triggerTime = matchingEvent?.created_at || null;
    }

    if (!triggerTime) continue;

    // Determine which step is next
    for (const step of steps) {
      if (sentSlugs.has(step.template_slug)) continue;

      // Calculate when this step should be sent
      // delay_hours is cumulative from the trigger time
      const sendAfter = new Date(
        new Date(triggerTime).getTime() + step.delay_hours * 60 * 60 * 1000
      );

      if (sendAfter <= new Date()) {
        eligible.push({ lead, step, triggerTime });
      }

      // Only queue the first unsent step per lead per sequence
      break;
    }
  }

  return eligible;
}
