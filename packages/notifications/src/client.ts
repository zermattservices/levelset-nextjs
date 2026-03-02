/**
 * Slack WebClient — singleton instance for all API calls.
 *
 * Uses @slack/web-api. Lazily initialized on first send.
 * Never throws; logs errors with [notifications] prefix and moves on.
 */

import { WebClient } from '@slack/web-api';
import { getSlackChannel, type SlackChannelName } from './channels.js';

export interface SlackMessage {
  text: string;
  blocks?: any[];
}

let client: WebClient | null = null;

function getClient(): WebClient | null {
  if (client) return client;

  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;

  client = new WebClient(token);
  return client;
}

/**
 * Post a message to a single Slack channel.
 * No-ops silently if the bot token is not configured.
 */
export async function sendToSlack(
  channel: SlackChannelName,
  message: SlackMessage
): Promise<void> {
  const web = getClient();
  if (!web) return;

  const slackChannel = getSlackChannel(channel);

  try {
    const result = await web.chat.postMessage({
      channel: slackChannel,
      text: message.text,
      blocks: message.blocks,
    });

    if (!result.ok) {
      console.error(
        `[notifications] Slack API error for ${slackChannel}: ${result.error}`
      );
    }
  } catch (err) {
    console.error(`[notifications] Failed to send to ${slackChannel}:`, err);
  }
}

/**
 * Send the same message to multiple channels concurrently.
 * Each channel is independent — one failure doesn't block others.
 */
export async function sendToMultipleChannels(
  channels: SlackChannelName[],
  message: SlackMessage
): Promise<void> {
  await Promise.allSettled(channels.map((ch) => sendToSlack(ch, message)));
}
