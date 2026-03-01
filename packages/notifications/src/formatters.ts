/**
 * Slack Block Kit message formatters for each notification event type.
 *
 * Each formatter returns { text, blocks } suitable for Incoming Webhooks.
 * `text` is the plain-text fallback; `blocks` provide rich formatting.
 */

import type {
  LeadSubmittedEvent,
  StageChangedEvent,
  SubscriptionCreatedEvent,
  SubscriptionCanceledEvent,
  InvoicePaidEvent,
  InvoiceFailedEvent,
  BugReportedEvent,
} from './types.js';

const DASHBOARD_URL = 'https://app.levelset.io';

function easternTime(): string {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// Lead submitted
// ---------------------------------------------------------------------------

const SOURCE_EMOJI: Record<string, string> = {
  website: ':globe_with_meridians:',
  the_approach: ':calendar:',
  waitlist: ':clipboard:',
  referral: ':handshake:',
};

export function formatLeadSubmitted(event: LeadSubmittedEvent) {
  const emoji = SOURCE_EMOJI[event.source] || ':envelope:';
  const fields: any[] = [
    { type: 'mrkdwn', text: `*Email:*\n${event.email}` },
    { type: 'mrkdwn', text: `*Source:*\n${event.source}` },
  ];

  if (event.name) {
    fields.push({ type: 'mrkdwn', text: `*Name:*\n${event.name}` });
  }
  if (event.storeNumber) {
    fields.push({ type: 'mrkdwn', text: `*Store #:*\n${event.storeNumber}` });
  }
  if (event.isMultiUnit !== undefined) {
    fields.push({
      type: 'mrkdwn',
      text: `*Multi-Unit:*\n${event.isMultiUnit ? 'Yes' : 'No'}`,
    });
  }
  if (event.role) {
    fields.push({ type: 'mrkdwn', text: `*Role:*\n${event.role}` });
  }
  if (event.isOperator !== undefined) {
    fields.push({
      type: 'mrkdwn',
      text: `*Operator:*\n${event.isOperator ? 'Yes' : 'No'}`,
    });
  }

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} New Lead Submitted` },
    },
    { type: 'section', fields },
  ];

  if (event.message) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Message:*\n>${event.message}` },
    });
  }

  if (event.locations && event.locations.length > 0) {
    const locationLines = event.locations
      .map(
        (l) =>
          `• Store ${l.store_number}${l.location_name ? ` — ${l.location_name}` : ''}${l.state ? ` (${l.state})` : ''}`
      )
      .join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Locations:*\n${locationLines}` },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${easternTime()} ET  |  <${DASHBOARD_URL}/admin/leads|View in CRM>`,
        },
      ],
    }
  );

  return {
    text: `New lead: ${event.email} (${event.source})`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Pipeline stage changed
// ---------------------------------------------------------------------------

const STAGE_EMOJI: Record<string, string> = {
  contacted: ':telephone_receiver:',
  trial: ':test_tube:',
  onboarded: ':white_check_mark:',
  converted: ':tada:',
  lost: ':x:',
};

export function formatStageChanged(event: StageChangedEvent) {
  const emoji = STAGE_EMOJI[event.newStage] || ':arrow_right:';
  const displayName = event.name || event.email || event.leadId;

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} Pipeline: ${event.oldStage} → ${event.newStage}`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Lead:*\n${displayName}` },
        {
          type: 'mrkdwn',
          text: `*Stage:*\n${event.oldStage} → ${event.newStage}`,
        },
      ],
    },
  ];

  if (event.lostReason) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Lost Reason:*\n>${event.lostReason}`,
      },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${easternTime()} ET  |  <${DASHBOARD_URL}/admin/leads|View in CRM>`,
        },
      ],
    }
  );

  return {
    text: `Pipeline: ${displayName} moved ${event.oldStage} → ${event.newStage}`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Billing: subscription created
// ---------------------------------------------------------------------------

export function formatSubscriptionCreated(event: SubscriptionCreatedEvent) {
  const orgLabel = event.orgName || event.orgId;

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':rocket: New Subscription' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Org:*\n${orgLabel}` },
        { type: 'mrkdwn', text: `*Plan:*\n${event.planTier}` },
        { type: 'mrkdwn', text: `*Status:*\n${event.status}` },
        { type: 'mrkdwn', text: `*Seats:*\n${event.quantity}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${easternTime()} ET` }],
    },
  ];

  return {
    text: `New subscription: ${orgLabel} (${event.planTier})`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Billing: subscription canceled
// ---------------------------------------------------------------------------

export function formatSubscriptionCanceled(event: SubscriptionCanceledEvent) {
  const orgLabel = event.orgName || event.orgId;

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':warning: Subscription Canceled',
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Org:*\n${orgLabel}` },
        { type: 'mrkdwn', text: `*Plan:*\n${event.planTier}` },
        { type: 'mrkdwn', text: `*Canceled At:*\n${event.canceledAt}` },
      ],
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${easternTime()} ET` }],
    },
  ];

  return {
    text: `Subscription canceled: ${orgLabel}`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Billing: invoice paid
// ---------------------------------------------------------------------------

export function formatInvoicePaid(event: InvoicePaidEvent) {
  const orgLabel = event.orgName || event.orgId;
  const amount = formatCents(event.amountCents, event.currency);

  const fields: any[] = [
    { type: 'mrkdwn', text: `*Org:*\n${orgLabel}` },
    { type: 'mrkdwn', text: `*Amount:*\n${amount}` },
  ];

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':money_with_wings: Invoice Paid' },
    },
    { type: 'section', fields },
  ];

  if (event.invoiceUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${event.invoiceUrl}|View Invoice>`,
      },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${easternTime()} ET` }],
    }
  );

  return {
    text: `Invoice paid: ${orgLabel} — ${amount}`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Billing: invoice failed
// ---------------------------------------------------------------------------

export function formatInvoiceFailed(event: InvoiceFailedEvent) {
  const orgLabel = event.orgName || event.orgId;
  const amount = formatCents(event.amountCents, event.currency);

  const fields: any[] = [
    { type: 'mrkdwn', text: `*Org:*\n${orgLabel}` },
    { type: 'mrkdwn', text: `*Amount Due:*\n${amount}` },
  ];

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':rotating_light: Invoice Payment Failed',
      },
    },
    { type: 'section', fields },
  ];

  if (event.invoiceUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${event.invoiceUrl}|View Invoice>`,
      },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${easternTime()} ET` }],
    }
  );

  return {
    text: `Invoice payment failed: ${orgLabel} — ${amount}`,
    blocks,
  };
}

// ---------------------------------------------------------------------------
// Bug reported
// ---------------------------------------------------------------------------

export function formatBugReported(event: BugReportedEvent) {
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':bug: Bug Report Submitted' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Feature Area:*\n${event.featureArea}` },
        {
          type: 'mrkdwn',
          text: `*Reported By:*\n${event.reportedBy.name} (${event.reportedBy.email})`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Description:*\n>${event.description}`,
      },
    },
  ];

  if (event.roadmapFeatureId) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${DASHBOARD_URL}/admin/roadmap|View in Roadmap>`,
      },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `${easternTime()} ET` }],
    }
  );

  return {
    text: `Bug report: ${event.featureArea} — ${event.reportedBy.name}`,
    blocks,
  };
}
