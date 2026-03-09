/**
 * @levelset/notifications — Slack notification hub
 *
 * Public API:
 *   notify(event)          — generic router (fire-and-forget)
 *   notifyLead(...)        — convenience for lead.submitted
 *   notifyStageChange(...) — convenience for pipeline.stage_changed
 *   notifySubscriptionCreated/Canceled(...)
 *   notifyInvoicePaid/Failed(...)
 *   notifyBugReported(...) — convenience for bug.reported
 */

export { SlackChannel, type SlackChannelName } from './channels';
export type {
  NotificationEvent,
  LeadSubmittedEvent,
  StageChangedEvent,
  SubscriptionCreatedEvent,
  SubscriptionCanceledEvent,
  InvoicePaidEvent,
  InvoiceFailedEvent,
  BugReportedEvent,
  DailyVisitorReportEvent,
} from './types';

import { SlackChannel, type SlackChannelName } from './channels';
import type {
  NotificationEvent,
  LeadSubmittedEvent,
  StageChangedEvent,
  SubscriptionCreatedEvent,
  SubscriptionCanceledEvent,
  InvoicePaidEvent,
  InvoiceFailedEvent,
  BugReportedEvent,
  DailyVisitorReportEvent,
} from './types';
import { sendToSlack, sendToMultipleChannels } from './client';
import {
  formatLeadSubmitted,
  formatStageChanged,
  formatSubscriptionCreated,
  formatSubscriptionCanceled,
  formatInvoicePaid,
  formatInvoiceFailed,
  formatBugReported,
  formatDailyVisitorReport,
} from './formatters';

/**
 * Route a notification event to the appropriate Slack channel(s).
 * Returns a promise that resolves when the message is sent.
 * Callers should `await` this in serverless contexts (crons, webhooks)
 * to ensure the message is delivered before the function exits.
 */
export async function notify(event: NotificationEvent): Promise<void> {
  switch (event.type) {
    case 'lead.submitted': {
      const msg = formatLeadSubmitted(event);
      await sendToSlack(SlackChannel.LEADS, msg);
      break;
    }

    case 'pipeline.stage_changed': {
      const msg = formatStageChanged(event);
      const channels: SlackChannelName[] = [SlackChannel.CONVERSIONS];

      if (event.newStage === 'converted') {
        channels.push(SlackChannel.ALL_LEVELSET);
      }

      await sendToMultipleChannels(channels, msg);
      break;
    }

    case 'billing.subscription_created': {
      const msg = formatSubscriptionCreated(event);
      await sendToSlack(SlackChannel.BILLING, msg);
      break;
    }

    case 'billing.subscription_canceled': {
      const msg = formatSubscriptionCanceled(event);
      await sendToSlack(SlackChannel.BILLING, msg);
      break;
    }

    case 'billing.invoice_paid': {
      const msg = formatInvoicePaid(event);
      await sendToSlack(SlackChannel.BILLING, msg);
      break;
    }

    case 'billing.invoice_failed': {
      const msg = formatInvoiceFailed(event);
      await sendToSlack(SlackChannel.BILLING, msg);
      break;
    }

    case 'bug.reported': {
      const msg = formatBugReported(event);
      await sendToSlack(SlackChannel.BUGS, msg);
      break;
    }

    case 'analytics.daily_visitor_report': {
      const msg = formatDailyVisitorReport(event);
      await sendToSlack(SlackChannel.ANALYTICS, msg);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers — each builds the typed event and calls notify()
// ---------------------------------------------------------------------------

export function notifyLead(
  payload: Omit<LeadSubmittedEvent, 'type'>
): Promise<void> {
  return notify({ type: 'lead.submitted', ...payload });
}

export function notifyStageChange(
  payload: Omit<StageChangedEvent, 'type'>
): Promise<void> {
  return notify({ type: 'pipeline.stage_changed', ...payload });
}

export function notifySubscriptionCreated(
  payload: Omit<SubscriptionCreatedEvent, 'type'>
): Promise<void> {
  return notify({ type: 'billing.subscription_created', ...payload });
}

export function notifySubscriptionCanceled(
  payload: Omit<SubscriptionCanceledEvent, 'type'>
): Promise<void> {
  return notify({ type: 'billing.subscription_canceled', ...payload });
}

export function notifyInvoicePaid(
  payload: Omit<InvoicePaidEvent, 'type'>
): Promise<void> {
  return notify({ type: 'billing.invoice_paid', ...payload });
}

export function notifyInvoiceFailed(
  payload: Omit<InvoiceFailedEvent, 'type'>
): Promise<void> {
  return notify({ type: 'billing.invoice_failed', ...payload });
}

export function notifyBugReported(
  payload: Omit<BugReportedEvent, 'type'>
): Promise<void> {
  return notify({ type: 'bug.reported', ...payload });
}

export function notifyDailyVisitorReport(
  payload: Omit<DailyVisitorReportEvent, 'type'>
): Promise<void> {
  return notify({ type: 'analytics.daily_visitor_report', ...payload });
}
