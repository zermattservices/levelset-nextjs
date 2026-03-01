/**
 * Slack channel constants and webhook URL resolution.
 *
 * Each channel maps to an env var SLACK_WEBHOOK_<CHANNEL>.
 * If the env var is not set, the channel is silently skipped (safe for dev).
 */

export const SlackChannel = {
  LEADS: 'LEADS',
  CONVERSIONS: 'CONVERSIONS',
  BILLING: 'BILLING',
  PIPELINE: 'PIPELINE',
  BUGS: 'BUGS',
  ALL_LEVELSET: 'ALL_LEVELSET',
} as const;

export type SlackChannelName = (typeof SlackChannel)[keyof typeof SlackChannel];

const ENV_VAR_MAP: Record<SlackChannelName, string> = {
  LEADS: 'SLACK_WEBHOOK_LEADS',
  CONVERSIONS: 'SLACK_WEBHOOK_CONVERSIONS',
  BILLING: 'SLACK_WEBHOOK_BILLING',
  PIPELINE: 'SLACK_WEBHOOK_PIPELINE',
  BUGS: 'SLACK_WEBHOOK_BUGS',
  ALL_LEVELSET: 'SLACK_WEBHOOK_ALL_LEVELSET',
};

/**
 * Resolve the Incoming Webhook URL for a channel from process.env.
 * Returns null if the env var is not set (notifications silently skipped).
 */
export function getWebhookUrl(channel: SlackChannelName): string | null {
  const envVar = ENV_VAR_MAP[channel];
  return process.env[envVar] || null;
}
