# Slack Bot (Levi) — Design Doc

**Date**: 2026-03-01
**Status**: Draft

## Overview

Replace raw `fetch` webhook calls in `@levelset/notifications` with `@slack/bolt`'s `WebClient`. Brand the bot as "Levi." Set up the Slack app with scopes for current posting needs and future slash commands/interactivity.

## Architecture

### Package: `@levelset/notifications`

The shared package remains the single entry point for all Slack communication. Callers (`notifyLead()`, `notifyStageChange()`, etc.) are unchanged — Bolt is an internal implementation detail.

```
packages/notifications/
├── src/
│   ├── index.ts          — public API (unchanged)
│   ├── types.ts          — event types (unchanged)
│   ├── channels.ts       — channel constants (simplified)
│   ├── formatters.ts     — Block Kit formatters (unchanged)
│   └── client.ts         — NEW: singleton WebClient, replaces slack.ts
├── package.json          — adds @slack/web-api dependency
└── tsconfig.json         — unchanged
```

**Key decisions:**
- Use `@slack/web-api` (not full `@slack/bolt`) — we only need the API client for posting. Bolt's `App` class (event listener server) is not needed until slash commands are added.
- Singleton `WebClient` — lazily initialized on first `sendToSlack()` call.
- Same fire-and-forget pattern — never throws, logs errors, silently no-ops if token is missing.

### Slack App Configuration

**App name**: Levi
**Bot display name**: Levi
**Avatar**: Levi logo (to be uploaded manually)

**OAuth scopes** (Bot Token):
- `chat:write` — post messages to channels the bot is invited to
- `chat:write.customize` — post with custom username/icon overrides if needed

**Future scopes** (add when needed, no code changes required):
- `commands` — register slash commands
- `app_mentions:read` — respond when @Levi is mentioned
- `channels:read` — list channels for dynamic routing

**Environment**: Single `SLACK_BOT_TOKEN` env var (xoxb-...) set in Vercel (dashboard + marketing) and `.env.local` for local dev.

### Channel Mapping

Hardcoded channel names in `channels.ts`. The bot must be invited to each channel in Slack.

| Constant | Slack Channel |
|----------|---------------|
| `LEADS` | `#leads` |
| `CONVERSIONS` | `#conversions` |
| `BILLING` | `#billing` |
| `PIPELINE` | `#pipeline` |
| `BUGS` | `#bugs` |
| `ALL_LEVELSET` | `#all-levelset` |

Future: Add `#system` or `#engineering` for system health events (cron results, error spikes, deploy notices).

### Files Changed

1. **`packages/notifications/package.json`** — add `@slack/web-api` as dependency
2. **`packages/notifications/src/client.ts`** — new file: singleton `WebClient`, `sendToSlack()`, `sendToMultipleChannels()`
3. **`packages/notifications/src/channels.ts`** — remove `getBotToken()` and env var resolution (moved to client.ts), keep channel constants and name mapping
4. **`packages/notifications/src/slack.ts`** — delete (replaced by client.ts)
5. **`packages/notifications/src/index.ts`** — update import from `slack.js` to `client.js`
6. **`scripts/test-notifications.ts`** — no changes needed (uses public API)

### Files NOT Changed

- `formatters.ts` — Block Kit format is identical for WebClient
- `types.ts` — event types are unchanged
- All call sites (dashboard API routes, marketing routes) — public API is unchanged

## Slack App Setup Steps (Manual)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From scratch
2. Name: "Levi", Workspace: Levelset
3. **OAuth & Permissions** → Bot Token Scopes → add `chat:write`, `chat:write.customize`
4. **Install to Workspace** → copy Bot User OAuth Token (xoxb-...)
5. **App Home** → set Display Name to "Levi", Default Username to "levi"
6. Upload Levi avatar in Basic Information → Display Information
7. Invite Levi to all 6 channels: `/invite @Levi` in each channel
8. Set `SLACK_BOT_TOKEN` in Vercel (dashboard project + marketing project) and `.env.local`

## Error Handling

Unchanged from current design:
- Missing `SLACK_BOT_TOKEN` → all notifications silently no-op (dev-safe)
- Slack API errors → logged with `[notifications]` prefix, never thrown
- Network failures → caught and logged, request continues normally
- `Promise.allSettled` for multi-channel sends — one failure doesn't block others

## Future Extensibility

When slash commands are needed:
1. Add `commands` scope to the Slack app
2. Create `/api/slack/events` route in the dashboard (or a dedicated Slack handler route)
3. Use `@slack/bolt`'s `App` class in that route to handle commands/interactions
4. The notifications package continues to handle outbound messages unchanged

When system health notifications are needed:
1. Add event types to `types.ts` (e.g., `cron.completed`, `cron.failed`, `deploy.completed`)
2. Add formatters to `formatters.ts`
3. Add `SYSTEM` channel to `channels.ts`
4. Create `#system` channel in Slack, invite Levi
5. Wire up call sites (cron endpoints, deploy hooks)
