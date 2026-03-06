/**
 * Slack channel constants.
 *
 * Each channel maps to a Slack channel name. A single SLACK_BOT_TOKEN
 * is used to post to any channel (no per-channel webhook URLs needed).
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

/**
 * Map logical channel names to actual Slack channel names.
 * These are the #channel names in your Slack workspace.
 */
const CHANNEL_NAME_MAP: Record<SlackChannelName, string> = {
  LEADS: 'leads',
  CONVERSIONS: 'conversions',
  BILLING: 'billing',
  PIPELINE: 'pipeline',
  BUGS: 'bugs',
  ALL_LEVELSET: 'all-levelset',
};

/**
 * Get the Slack channel name (e.g. "#leads") for a logical channel.
 */
export function getSlackChannel(channel: SlackChannelName): string {
  return CHANNEL_NAME_MAP[channel];
}