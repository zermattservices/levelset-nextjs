/**
 * Send a CRM email using a React Email template.
 *
 * Renders the template to HTML, sends via Resend, and records the send
 * in email_sends so delivery tracking works through the Resend webhook.
 */

import * as React from 'react';
import { render } from '@react-email/render';
import { getResend } from '@/lib/resend';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { WaitlistWelcome } from './templates/waitlist-welcome';
import { WaitlistFollowup } from './templates/waitlist-followup';
import { TrialNudge } from './templates/trial-nudge';

interface SendTemplateParams {
  to: string;
  templateSlug: string;
  subject: string;
  previewText?: string;
  props?: Record<string, any>;
  leadId?: string;
  sequenceId?: string;
}

function renderTemplate(slug: string, props: Record<string, any>): React.ReactElement {
  switch (slug) {
    case 'waitlist-welcome':
      return <WaitlistWelcome {...props} />;
    case 'waitlist-followup':
      return <WaitlistFollowup {...props} />;
    case 'trial-nudge':
      return <TrialNudge {...props} />;
    default:
      throw new Error(`Unknown email template: ${slug}`);
  }
}

export async function sendTemplate({
  to,
  templateSlug,
  subject,
  props = {},
  leadId,
  sequenceId,
}: SendTemplateParams) {
  const element = renderTemplate(templateSlug, props);

  // Render React Email component to HTML
  const html = await render(element);

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: 'Levelset <hello@levelset.io>',
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`Failed to send template "${templateSlug}" to ${to}:`, error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  // Record the send for delivery tracking
  if (data?.id) {
    const supabase = createServerSupabaseClient();
    const { error: insertError } = await supabase.from('email_sends').insert({
      lead_id: leadId || null,
      template_slug: templateSlug,
      sequence_id: sequenceId || null,
      resend_message_id: data.id,
      status: 'sent',
    });

    if (insertError) {
      console.error('Failed to record email send:', insertError);
      // Don't throw — the email was already sent successfully
    }

    // Create a lead_event if we have a lead_id
    if (leadId) {
      await supabase.from('lead_events').insert({
        lead_id: leadId,
        event_type: 'email_sent',
        event_data: {
          template_slug: templateSlug,
          subject,
          resend_message_id: data.id,
          sequence_id: sequenceId || null,
        },
      });
    }
  }

  return data;
}
