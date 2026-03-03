/**
 * Smoke test for @levelset/notifications
 *
 * Sends one of each notification type to whichever channels are configured.
 * Set SLACK_BOT_TOKEN env var in .env.local before running.
 *
 * Usage:
 *   npx tsx scripts/test-notifications.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import {
  notifyLead,
  notifyStageChange,
  notifySubscriptionCreated,
  notifySubscriptionCanceled,
  notifyInvoicePaid,
  notifyInvoiceFailed,
  notifyBugReported,
} from '@levelset/notifications';

console.log('Sending test notifications...\n');

notifyLead({
  email: 'test@example.com',
  name: 'Jane Doe',
  source: 'website',
  storeNumber: '12345',
  isMultiUnit: true,
  message: 'I want to learn more about Levelset!',
});

notifyStageChange({
  leadId: 'test-lead-001',
  email: 'test@example.com',
  name: 'Jane Doe',
  oldStage: 'new',
  newStage: 'contacted',
});

notifyStageChange({
  leadId: 'test-lead-002',
  email: 'converted@example.com',
  name: 'John Smith',
  oldStage: 'onboarded',
  newStage: 'converted',
});

notifyStageChange({
  leadId: 'test-lead-003',
  email: 'lost@example.com',
  name: 'Lost Lead',
  oldStage: 'trial',
  newStage: 'lost',
  lostReason: 'Went with competitor — pricing',
});

notifySubscriptionCreated({
  orgId: 'test-org-001',
  orgName: 'Test Restaurant LLC',
  planTier: 'pro',
  status: 'active',
  quantity: 3,
});

notifySubscriptionCanceled({
  orgId: 'test-org-002',
  orgName: 'Former Customer Inc',
  planTier: 'pro',
  canceledAt: new Date().toISOString(),
});

notifyInvoicePaid({
  orgId: 'test-org-001',
  orgName: 'Test Restaurant LLC',
  amountCents: 29900,
  currency: 'usd',
  invoiceUrl: 'https://pay.stripe.com/invoice/test',
});

notifyInvoiceFailed({
  orgId: 'test-org-003',
  orgName: 'Payment Issue Co',
  amountCents: 9900,
  currency: 'usd',
  invoiceUrl: 'https://pay.stripe.com/invoice/test-failed',
});

notifyBugReported({
  featureArea: 'Schedule',
  description: 'The shift calendar does not display correctly when switching between weeks on mobile.',
  reportedBy: {
    name: 'Test User',
    email: 'testuser@example.com',
  },
  roadmapFeatureId: 'test-feature-001',
});

console.log('All notifications dispatched (fire-and-forget).');
console.log('Waiting 3s for async delivery...\n');

setTimeout(() => {
  console.log('Done! Check your Slack channels.');
  process.exit(0);
}, 3000);
