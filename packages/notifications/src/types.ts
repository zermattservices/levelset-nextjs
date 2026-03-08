/**
 * Notification event types — discriminated union keyed on `type`.
 */

export interface LeadSubmittedEvent {
  type: 'lead.submitted';
  email: string;
  name?: string;
  source: string;
  storeNumber?: string;
  isMultiUnit?: boolean;
  message?: string;
  isOperator?: boolean;
  role?: string;
  locations?: Array<{
    store_number: string;
    location_name?: string;
    state?: string;
  }>;
}

export interface StageChangedEvent {
  type: 'pipeline.stage_changed';
  leadId: string;
  email?: string;
  name?: string;
  oldStage: string;
  newStage: string;
  lostReason?: string;
}

export interface SubscriptionCreatedEvent {
  type: 'billing.subscription_created';
  orgId: string;
  orgName?: string;
  planTier: string;
  status: string;
  quantity: number;
}

export interface SubscriptionCanceledEvent {
  type: 'billing.subscription_canceled';
  orgId: string;
  orgName?: string;
  planTier: string;
  canceledAt: string;
}

export interface InvoicePaidEvent {
  type: 'billing.invoice_paid';
  orgId: string;
  orgName?: string;
  amountCents: number;
  currency: string;
  invoiceUrl?: string;
}

export interface InvoiceFailedEvent {
  type: 'billing.invoice_failed';
  orgId: string;
  orgName?: string;
  amountCents: number;
  currency: string;
  invoiceUrl?: string;
}

export interface BugReportedEvent {
  type: 'bug.reported';
  featureArea: string;
  description: string;
  reportedBy: {
    name: string;
    email: string;
  };
  roadmapFeatureId?: string;
}

export interface DailyVisitorReportEvent {
  type: 'analytics.daily_visitor_report';
  date: string; // YYYY-MM-DD
  uniqueVisitors: number;
  totalSessions: number;
  bounceRate: number;
  avgDwellSeconds: number;
  topPages: Array<{ url: string; views: number }>;
  topReferrers: Array<{ source: string; sessions: number }>;
  comparison: {
    visitorsChange: number;
    sessionsChange: number;
    bounceRateChange: number;
  };
}

export type NotificationEvent =
  | LeadSubmittedEvent
  | StageChangedEvent
  | SubscriptionCreatedEvent
  | SubscriptionCanceledEvent
  | InvoicePaidEvent
  | InvoiceFailedEvent
  | BugReportedEvent
  | DailyVisitorReportEvent;
