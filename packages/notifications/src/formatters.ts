/**
 * Slack Block Kit message formatters for each notification event type.
 *
 * Each formatter returns { text, blocks } suitable for Slack's chat.postMessage API.
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
  DailyVisitorReportEvent,
} from './types';

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

// ---------------------------------------------------------------------------
// Analytics: daily visitor report
// ---------------------------------------------------------------------------

function formatDelta(pct: number, inverted = false): string {
  if (pct === 0 || !isFinite(pct)) return '';
  const isPositive = pct > 0;
  const arrow = isPositive ? ':small_red_triangle:' : ':small_red_triangle_down:';
  const sign = isPositive ? '+' : '';
  return `${arrow} ${sign}${pct.toFixed(0)}%`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${Math.round(seconds)}s`;
}

export function formatDailyVisitorReport(event: DailyVisitorReportEvent) {
  const formattedDate = new Date(event.date + 'T12:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const avgDwellFormatted = formatDuration(event.avgDwellSeconds);
  const visitorsDelta = formatDelta(event.comparison.visitorsChange);
  const sessionsDelta = formatDelta(event.comparison.sessionsChange);
  const bounceDelta = formatDelta(event.comparison.bounceRateChange, true);

  const topPagesText =
    event.topPages
      .slice(0, 5)
      .map((p, i) => `${i + 1}. \`${p.url}\` — ${p.views} views`)
      .join('\n') || '_No page views_';

  const topReferrersText =
    event.topReferrers
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.source} — ${r.sessions} sessions`)
      .join('\n') || '_No referrer data_';

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':bar_chart: Daily Visitor Report' },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `*${formattedDate}*` }],
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Unique Visitors*\n${event.uniqueVisitors} ${visitorsDelta}`,
        },
        {
          type: 'mrkdwn',
          text: `*Sessions*\n${event.totalSessions} ${sessionsDelta}`,
        },
        {
          type: 'mrkdwn',
          text: `*Bounce Rate*\n${event.bounceRate.toFixed(1)}% ${bounceDelta}`,
        },
        {
          type: 'mrkdwn',
          text: `*Avg Time on Site*\n${avgDwellFormatted}`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Top Pages*\n${topPagesText}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Top Referrers*\n${topReferrersText}` },
    },
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Sent by Levi  |  <${DASHBOARD_URL}/admin/locations?tab=visitor-analytics|View Dashboard>`,
        },
      ],
    },
  ];

  return {
    text: `Daily Visitor Report: ${event.uniqueVisitors} visitors, ${event.totalSessions} sessions (${formattedDate})`,
    blocks,
  };
}
