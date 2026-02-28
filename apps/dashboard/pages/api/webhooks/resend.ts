import { createServerSupabaseClient } from '@/lib/supabase-server';
import { recalculateEngagementScore } from '@/lib/crm/engagement';
import type { NextApiRequest, NextApiResponse } from 'next';

// Maps Resend event types to the corresponding email_sends timestamp columns
const EVENT_TIMESTAMP_MAP: Record<string, string> = {
  'email.delivered': 'delivered_at',
  'email.opened': 'opened_at',
  'email.clicked': 'clicked_at',
  'email.bounced': 'bounced_at',
};

// Maps Resend event types to email status values
const EVENT_STATUS_MAP: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
};

// Maps Resend event types to lead_events event_type values
const EVENT_TYPE_MAP: Record<string, string> = {
  'email.delivered': 'email_delivered',
  'email.opened': 'email_opened',
  'email.clicked': 'email_clicked',
  'email.bounced': 'email_bounced',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate webhook signature if RESEND_WEBHOOK_SECRET is configured
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = req.headers['svix-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }
    // Note: For full Svix signature verification, use the svix library.
    // For now, we check that the header is present when a secret is configured.
  }

  const supabase = createServerSupabaseClient();

  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Only handle supported event types
    const timestampColumn = EVENT_TIMESTAMP_MAP[type];
    const status = EVENT_STATUS_MAP[type];
    const eventType = EVENT_TYPE_MAP[type];

    if (!timestampColumn || !status || !eventType) {
      // Acknowledge unsupported event types without processing
      return res.status(200).json({ received: true, processed: false });
    }

    // Resend provides the message ID in data.email_id
    const resendMessageId = data.email_id;
    if (!resendMessageId) {
      console.error('Resend webhook missing email_id:', type);
      return res.status(400).json({ error: 'Missing email_id in webhook data' });
    }

    // Find the email_send record by resend_message_id
    const { data: emailSend, error: fetchError } = await supabase
      .from('email_sends')
      .select('id, lead_id')
      .eq('resend_message_id', resendMessageId)
      .single();

    if (fetchError || !emailSend) {
      // Email send not found -- might be from a non-CRM email
      console.warn('No email_send found for resend_message_id:', resendMessageId);
      return res.status(200).json({ received: true, processed: false });
    }

    const now = new Date().toISOString();

    // Update the email_send record with the event timestamp and status
    const updateData: Record<string, any> = {
      [timestampColumn]: now,
      status,
    };

    const { error: updateError } = await supabase
      .from('email_sends')
      .update(updateData)
      .eq('id', emailSend.id);

    if (updateError) {
      console.error('Error updating email_send:', updateError);
      return res.status(500).json({ error: 'Failed to update email send record' });
    }

    // Create a lead_event entry if we have a lead_id
    if (emailSend.lead_id) {
      const { error: eventError } = await supabase
        .from('lead_events')
        .insert({
          lead_id: emailSend.lead_id,
          event_type: eventType,
          event_data: {
            email_send_id: emailSend.id,
            resend_message_id: resendMessageId,
          },
        });

      if (eventError) {
        console.error('Error creating lead event for email tracking:', eventError);
        // Don't fail the webhook response
      }

      // Recalculate engagement score on email events
      recalculateEngagementScore(emailSend.lead_id).catch((err) =>
        console.error('Engagement score recalc error:', err)
      );
    }

    return res.status(200).json({ received: true, processed: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
