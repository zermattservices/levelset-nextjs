# Levi Chat Page UI & Agent Fixes

**Date**: 2026-02-22
**Status**: Approved

## Problems

### Dashboard (3 issues)

1. **User bubbles unreadable** — `ChatMessage.module.css` uses `color: var(--ls-color-brand-foreground)` (#EFF6FF) on `background: var(--ls-color-brand-base)` (#31664A). Poor contrast.
2. **Page background mismatch** — `LeviPage.module.css` uses `var(--ls-color-neutral-soft)` (#E5E7EB). All other dashboard pages use `#ffffff`.
3. **No auto-scroll during streaming** — Scroll effect depends on `totalMessages` count, which doesn't change during token streaming (AI SDK updates content within existing message object).

### Agent (2 issues)

4. **Internal thoughts leaking** — MiniMax M2.5 ignores the system prompt's "NEVER narrate" instruction. Produces phrases like "Got rankings for Host position. Let me present this to the user."
5. **Missing UI blocks for position rankings** — `positionRankingsBlocks` in `ui-blocks.ts` has a silent try/catch that swallows errors. The `employee-list` block for rankings may also not render metrics correctly since `list_employees` blocks don't include `metric_value`.

## Fixes

### Fix 1: User bubble contrast
**File**: `apps/dashboard/components/levi/ChatMessage.module.css`
- Change `.userBubble` color to `#FFFFFF`

### Fix 2: Page background
**File**: `apps/dashboard/components/pages/LeviPage.module.css`
- Change `.page` background to `#ffffff`

### Fix 3: Auto-scroll during streaming
**File**: `apps/dashboard/components/levi/ChatContainer.tsx`
- Replace `totalMessages` dependency with `sessionMessages` array reference (AI SDK returns new array on each token)
- Use `requestAnimationFrame` to debounce scroll-to-bottom during rapid updates
- Keep the "user scrolled up" detection to avoid fighting the user

### Fix 4: Strengthen system prompt for narration suppression
**File**: `apps/agent/src/lib/prompts.ts`
- Add explicit forbidden pattern examples: "Got X. Let me present...", "I found that...", "Let me try..."
- Add a negative example block showing what NOT to output vs what TO output
- Keep instructions concise — MiniMax responds better to examples than rules

### Fix 5: Debug and fix position ranking UI blocks
**Files**: `apps/agent/src/lib/ui-blocks.ts`, `apps/dashboard/components/levi/cards/EmployeeListCard.tsx`
- Add `console.error` to the catch block in `toolResultToUIBlocks` so failures are logged
- Verify `positionRankingsBlocks` handles both data paths (daily averages and fallback)
- Ensure `EmployeeListCard` renders `metric_label` and `metric_value` when present (rankings include these, `list_employees` doesn't)
