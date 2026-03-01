/**
 * Low-level Slack webhook client.
 *
 * Uses native fetch — zero dependencies. Never throws; logs errors
 * with a [notifications] prefix and moves on.
 */

import { getWebhookUrl, type SlackChannelName } from './channels.js';

export interface SlackMessage {
  text: string;
  blocks?: any[];
}

/**
 * POST a message to a single Slack channel via Incoming Webhook.
 * No-ops silently if the webhook URL is not configured.
 */
export async function sendToSlack(
  channel: SlackChannelName,
  message: SlackMessage
): Promise<void> {
  const url = getWebhookUrl(channel);
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      console.error(
        `[notifications] Slack webhook error for ${channel}: ${res.status} ${res.statusText}`
      );
    }
  } catch (err) {
    console.error(`[notifications] Failed to send to ${channel}:`, err);
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
