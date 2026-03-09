/**
 * Stripe Webhook Handler
 *
 * Receives and processes Stripe webhook events to keep our DB in sync.
 * Handles subscription lifecycle, invoices, and trial notifications.
 *
 * IMPORTANT: This route disables Next.js body parsing to access the raw body
 * for Stripe signature verification.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTierFromPriceId, PlanTier } from '@/lib/billing/constants';
import { handleSubscriptionStatusChange } from '@/lib/billing/sync-features';
import {
  notifySubscriptionCreated,
  notifySubscriptionCanceled,
  notifyInvoicePaid,
  notifyInvoiceFailed,
} from '@levelset/notifications';

// Disable Next.js body parsing — we need the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = getStripe();
  const supabase = createServerSupabaseClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(supabase, stripe, subscription, event.type);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, stripe, subscription);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceEvent(supabase, stripe, invoice);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`Error processing webhook event ${event.type}:`, err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription,
  eventType: string
) {
  // Find the org by stripe_customer_id
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.error('No org found for Stripe customer:', customerId);
    return;
  }

  // Determine plan tier from the subscription's price
  const priceId = subscription.items.data[0]?.price?.id;
  const tierInfo = priceId ? getTierFromPriceId(priceId) : null;
  const planTier: PlanTier = tierInfo?.tier || 'core';

  // Upsert subscription record
  const { error: upsertError } = await supabase
    .from('subscriptions')
    .upsert(
      {
        org_id: org.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId || null,
        plan_tier: planTier,
        status: subscription.status,
        quantity: subscription.items.data[0]?.quantity || 1,
        current_period_start: subscription.items.data[0]?.current_period_start
          ? new Date(subscription.items.data[0].current_period_start * 1000).toISOString()
          : null,
        current_period_end: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
          : null,
        trial_start: subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    );

  if (upsertError) {
    console.error('Failed to upsert subscription:', upsertError);
    return;
  }

  // Sync feature flags based on new tier and status
  await handleSubscriptionStatusChange(
    supabase,
    org.id,
    planTier,
    subscription.status as any
  );

  // Only notify on creation (not every update)
  if (eventType === 'customer.subscription.created') {
    await notifySubscriptionCreated({
      orgId: org.id,
      planTier,
      status: subscription.status,
      quantity: subscription.items.data[0]?.quantity || 1,
    });
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const { data: org } = await supabase
    .from('orgs')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.error('No org found for Stripe customer:', customerId);
    return;
  }

  // Update subscription status to canceled
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', org.id);

  // Clear features (unless custom pricing)
  await handleSubscriptionStatusChange(supabase, org.id, 'core', 'canceled');

  await notifySubscriptionCanceled({
    orgId: org.id,
    planTier: 'core',
    canceledAt: new Date().toISOString(),
  });
}

async function handleInvoiceEvent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  stripe: Stripe,
  invoice: Stripe.Invoice
) {
  if (!invoice.customer) return;

  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer.id;

  const { data: org } = await supabase
    .from('orgs')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!org) {
    console.error('No org found for Stripe customer:', customerId);
    return;
  }

  // Upsert invoice record
  await supabase
    .from('invoices')
    .upsert(
      {
        org_id: org.id,
        stripe_invoice_id: invoice.id,
        amount_due: invoice.amount_due || 0,
        amount_paid: invoice.amount_paid || 0,
        currency: invoice.currency || 'usd',
        status: invoice.status || 'draft',
        invoice_pdf: invoice.invoice_pdf || null,
        hosted_invoice_url: invoice.hosted_invoice_url || null,
        period_start: invoice.period_start
          ? new Date(invoice.period_start * 1000).toISOString()
          : null,
        period_end: invoice.period_end
          ? new Date(invoice.period_end * 1000).toISOString()
          : null,
      },
      { onConflict: 'stripe_invoice_id' }
    );

  // Slack notifications for invoice events
  if (invoice.status === 'paid') {
    await notifyInvoicePaid({
      orgId: org.id,
      amountCents: invoice.amount_paid || 0,
      currency: invoice.currency || 'usd',
      invoiceUrl: invoice.hosted_invoice_url || undefined,
    });
  }
  if (invoice.status === 'uncollectible' || invoice.status === 'open') {
    await notifyInvoiceFailed({
      orgId: org.id,
      amountCents: invoice.amount_due || 0,
      currency: invoice.currency || 'usd',
      invoiceUrl: invoice.hosted_invoice_url || undefined,
    });
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  session: Stripe.Checkout.Session
) {
  // Link Stripe customer to org if metadata contains org_id
  const orgId = session.metadata?.org_id;
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;

  if (orgId && customerId) {
    await supabase
      .from('orgs')
      .update({ stripe_customer_id: customerId })
      .eq('id', orgId);
  }
}
