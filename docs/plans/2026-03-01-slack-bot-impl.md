# Slack Bot (Levi) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace raw `fetch` calls in `@levelset/notifications` with Slack's official `@slack/web-api` SDK, branded as Levi, using a single `SLACK_BOT_TOKEN`.

**Architecture:** Swap the low-level `slack.ts` (raw fetch to `chat.postMessage`) for a singleton `WebClient` from `@slack/web-api`. Public API (`notify()`, `notifyLead()`, etc.) is unchanged — callers don't know the SDK exists. Move bot token resolution into the new client module. Fix the Vercel marketing build to include the notifications package.

**Tech Stack:** `@slack/web-api` (Slack's official Node.js SDK for API calls)

---

### Task 1: Add `@slack/web-api` dependency

**Files:**
- Modify: `packages/notifications/package.json`

**Step 1: Install the package**

Run:
```bash
cd /Users/andrewdyar/levelset-nextjs && pnpm --filter @levelset/notifications add @slack/web-api
```

Expected: `@slack/web-api` added to `dependencies` in `packages/notifications/package.json`, lockfile updated.

**Step 2: Verify package.json**

Confirm `@slack/web-api` appears under `dependencies` (not devDependencies).

---

### Task 2: Create `client.ts` and delete `slack.ts`

**Files:**
- Create: `packages/notifications/src/client.ts`
- Delete: `packages/notifications/src/slack.ts`
- Modify: `packages/notifications/src/channels.ts` (remove `getBotToken`)

**Step 1: Create `packages/notifications/src/client.ts`**

```typescript
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
```

**Step 2: Remove `getBotToken` from `channels.ts`**

Remove the `getBotToken()` function and its JSDoc comment from `packages/notifications/src/channels.ts`. The bot token is now resolved inside `client.ts`. Keep everything else (SlackChannel, SlackChannelName, CHANNEL_NAME_MAP, getSlackChannel).

Updated `channels.ts`:
```typescript
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
  LEADS: '#leads',
  CONVERSIONS: '#conversions',
  BILLING: '#billing',
  PIPELINE: '#pipeline',
  BUGS: '#bugs',
  ALL_LEVELSET: '#all-levelset',
};

/**
 * Get the Slack channel name (e.g. "#leads") for a logical channel.
 */
export function getSlackChannel(channel: SlackChannelName): string {
  return CHANNEL_NAME_MAP[channel];
}
```

**Step 3: Delete `packages/notifications/src/slack.ts`**

Run:
```bash
rm packages/notifications/src/slack.ts
```

**Step 4: Update import in `index.ts`**

In `packages/notifications/src/index.ts`, change line 36:
```typescript
// OLD
import { sendToSlack, sendToMultipleChannels } from './slack.js';
// NEW
import { sendToSlack, sendToMultipleChannels } from './client.js';
```

No other changes to `index.ts`.

---

### Task 3: Build and typecheck

**Step 1: Build the notifications package**

Run:
```bash
cd /Users/andrewdyar/levelset-nextjs && pnpm --filter @levelset/notifications build
```

Expected: Clean build, no errors. `dist/` contains `client.js`, `client.d.ts`, no `slack.js`.

**Step 2: Typecheck dashboard**

Run:
```bash
pnpm --filter dashboard typecheck
```

Expected: Pass (no changes to public API).

**Step 3: Typecheck marketing**

Run:
```bash
pnpm --filter @levelset/marketing typecheck
```

Expected: Pass.

---

### Task 4: Update test script and formatters comment

**Files:**
- Modify: `scripts/test-notifications.ts` (update comment only)
- Modify: `packages/notifications/src/formatters.ts` (update comment only)

**Step 1: Update test script comment**

In `scripts/test-notifications.ts`, change lines 6-7:
```typescript
// OLD
 * Set SLACK_WEBHOOK_* env vars in .env.local before running.
// NEW
 * Set SLACK_BOT_TOKEN env var in .env.local before running.
```

**Step 2: Update formatters header comment**

In `packages/notifications/src/formatters.ts`, change line 4:
```typescript
// OLD
 * Each formatter returns { text, blocks } suitable for Incoming Webhooks.
// NEW
 * Each formatter returns { text, blocks } suitable for Slack's chat.postMessage API.
```

---

### Task 5: Commit and push

**Step 1: Stage all notification package changes**

```bash
git add packages/notifications/ scripts/test-notifications.ts
```

**Step 2: Commit**

```bash
git commit -m "refactor: replace raw fetch with @slack/web-api SDK in notifications package

Single SLACK_BOT_TOKEN replaces 6 per-channel webhook URLs.
Singleton WebClient lazily initialized on first send.
Public API unchanged — callers unaffected."
```

**Step 3: Push**

```bash
git push
```

---

### Task 6: Fix Vercel marketing build (manual)

This is a manual step — cannot be done via code.

**Action:** Update the marketing project's **Build Command** in Vercel Dashboard:

**Path:** Vercel Dashboard → Marketing project → Settings → General → Build & Development Settings → Build Command

**Old:**
```
cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @levelset/design-tokens build && pnpm --filter @levelset/marketing build
```

**New:**
```
cd ../.. && pnpm install --frozen-lockfile && pnpm turbo run build --filter=@levelset/marketing
```

This uses turborepo's `^build` dependency resolution to automatically build all workspace dependencies (design-tokens, notifications) before marketing. Future package additions won't require updating this command.

---

### Task 7: Slack app setup (manual)

This is a manual step — done in the Slack admin UI.

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **App name:** Levi | **Workspace:** Levelset
3. **OAuth & Permissions** → Bot Token Scopes → add:
   - `chat:write`
   - `chat:write.customize`
4. **Install to Workspace** → copy **Bot User OAuth Token** (`xoxb-...`)
5. **App Home** → Display Name: "Levi", Default Username: "levi"
6. **Basic Information** → Display Information → upload Levi avatar
7. In Slack, invite Levi to each channel: `/invite @Levi` in `#leads`, `#conversions`, `#billing`, `#pipeline`, `#bugs`, `#all-levelset`
8. Set `SLACK_BOT_TOKEN` in:
   - Vercel → dashboard project → Environment Variables
   - Vercel → marketing project → Environment Variables
   - Local `.env.local` for dev
