# Levelset Action Items

> Last updated: 2026-03-01
> Purpose: Detailed checklist of everything that needs to be created, updated, or fixed — organized by area.

---

## 1. Marketing Site Content Updates

### Terminology Fixes (Minor)
- [ ] `apps/marketing/src/lib/feature-content.ts` line 48: Screenshot alt text "Positional Excellence dashboard" → "Positional Ratings dashboard"
- [ ] `packages/shared/src/billing/constants.ts`: Review feature names "Positional Excellence Dashboard", "Positional Excellence Classic", "Operational Excellence" — these are internal billing names but surface in feature group displays
- [ ] Consider updating "Now in Early Access" badge to something current (or remove)

### Content Gaps — Features Missing from Marketing Site
The marketing site currently shows 9 features (5 Core + 4 Pro). The following are missing and need pages/sections:

**Need Individual Feature Pages (market now):**
- [ ] **OE Pillars / Operational Excellence** — Live and polished. Major differentiator. Currently only in billing constants, no feature page.
- [ ] **Org Chart** — Close to polished. Helps onboarding and orientation.
- [ ] **Documents Hub** — Almost polished. Knowledge management angle.
- [ ] **Pay System** — Live and polished. "Transparent, performance-linked pay."
- [ ] **Goal Tracking** — Pre-launch. "Set goals at every level — employee, team, location, org."
- [ ] **Development Plans** — Pre-launch. THE key differentiator. "Build the roadmap for every team member."

**Need "Coming Soon" Pages:**
- [ ] **Development Profiles** — Gets its own product page. Crystal DISC integration. "Understand the whole person."
- [ ] **Pathway Tracking** — Career progression visibility.
- [ ] **Retention Analytics** — Data-driven retention insights.
- [ ] **Customer Feedback** — Multi-channel feedback aggregation.
- [ ] **Tasks** — Levi-integrated task management.

**Do NOT create pages for (yet):**
- Meetings (Assembly AI) — too far out
- MCP Server — not critical path
- Certification — internal only (Reece Howard)
- Voice-enabled Levi — long-term vision

### Category/Narrative Pages (New)
Per the "Both" decision on site structure:
- [ ] **"Development" category page** — Ties together: Ratings, Evaluations, Development Plans, Goal Tracking, Pathway Tracking, Development Profiles
- [ ] **"Operations" category page** — Ties together: Scheduling, Forms, Setups, Documents, OE Pillars
- [ ] **"Intelligence" category page** — Ties together: Levi AI, Retention Analytics, Customer Feedback, Team Overview

### Screenshots Needed
The following features have `screenshotReady: false`:
- [ ] Mobile App screenshots
- [ ] Forms screenshots
- [ ] Levi AI screenshots
- [ ] Add screenshots for all new feature pages

### Homepage Updates
- [ ] Update features overview to include broader feature set (currently only shows PE, Discipline, Roster)
- [ ] Add "Connected Platform" narrative section
- [ ] Update stats section (currently showing fallback: 2 operators, 3 locations)
- [ ] Consider adding Goal Tracking and Development Plans to homepage hero features

---

## 2. The Approach Playbook Fixes

**CRITICAL:** The playbook uses incorrect CFA terminology that could hurt credibility.

- [ ] Replace all "PEA" references with "Positional Excellence" or "ratings" (multiple occurrences)
- [ ] Replace all "CARES" discipline references — CARES is CFA's customer complaint department, NOT discipline. Use "Progressive Discipline" instead.
- [ ] Update demo script to include new features (Scheduling, Development Plans, Goal Tracking, Mobile App)
- [ ] Update feature list in playbook to match current status matrix
- [ ] Update pricing references if any still show 3-tier model
- [ ] Add Evaluations and Development Plans to demo flow

---

## 3. Admin Task Board Updates

### New Tasks to Create

**Pre-Launch (P0 — Before March 22):**
- [ ] Scheduling — full feature polish (approvals, swaps, AI scheduling, templates, house shifts, break rules)
- [ ] Forms Engine — final 1-2 sessions to complete
- [ ] Evaluations — dashboard integration
- [ ] Development Plans — full build (milestones, checkpoints, role-to-role advancement)
- [ ] Goal Tracking — full build (employee/team/location/org levels, evaluation integration)
- [ ] Mobile App v1 — scope, polish, submit to App Store
- [ ] Documents Hub — final 1-2 days polish
- [ ] 360 Overview — employee detail view redesign (for screenshots/demos)
- [ ] Marketing site refresh — updated messaging, new feature pages, Coming Soon pages
- [ ] Demo environment — realistic data for The Approach
- [ ] Approach Playbook terminology fixes (PEA/CARES)

**Medium-Term (Q2 2026):**
- [ ] Tasks feature — Levi-integrated task management
- [ ] Development Profiles — Crystal integration setup + white-labeling
- [ ] Development Profiles — internal profile aggregation
- [ ] Pathway Tracking feature
- [ ] Retention Analytics feature
- [ ] Customer Feedback dashboard (multi-channel)
- [ ] Levi AI enhancements — goals/tasks tools, write capabilities, GA push

**Long-Term (Q3+ 2026):**
- [ ] Meetings — Assembly AI integration, Google Calendar, structured agendas
- [ ] Voice-Enabled Levi — voice agent capability
- [ ] Agentic Levi — proactive task follow-up, context gathering, alerts
- [ ] Certification system generalization
- [ ] MCP Server
- [ ] Multi-location analytics
- [ ] Resources Library

### Existing Tasks to Update
- [ ] Review all current task descriptions for accuracy against feature status matrix
- [ ] Ensure task priorities align with The Approach deadline
- [ ] Archive completed/irrelevant tasks

### Roadmap Items to Add
- [ ] Short-term milestone: "The Approach Ready" (March 22)
- [ ] Medium-term milestone: "First 10 Paying Orgs" (Q2 2026)
- [ ] Long-term milestone: "Admin Operations Suite Complete" (Q3 2026)
- [ ] Vision milestone: "Agentic Levi GA" (Q4 2026 / Q1 2027)

### Agent/Public Descriptions to Update
- [ ] Levi AI description — should mention beta status, available tools, and limitations
- [ ] Feature descriptions in any admin-facing UI
- [ ] Public API or documentation descriptions if any exist

---

## 4. Levi Context Updates

The following context documents should be updated to reflect new features:

- [ ] `global-context/levelset-glossary.md` — Add Goal Tracking, Tasks, Meetings terms ✅ (CARES/PEA already added)
- [ ] `global-context/levelset-domain-model.md` — Add Goal Tracking system description (once built)
- [ ] `global-context/levelset-platform-architecture.md` — Add Goal Tracking, Tasks, and Meetings once built
- [ ] Core context chunks (for RAG) — Will need updating as features ship
- [ ] Levi tool registry — New tools needed for Goal Tracking queries once built

---

## 5. Priority Matrix

### MUST DO before The Approach (March 22)

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Development Plans build | HIGH |
| P0 | Goal Tracking build | MEDIUM |
| P0 | Scheduling polish | HIGH |
| P0 | Forms Engine completion | MEDIUM |
| P0 | Evaluations dashboard | MEDIUM |
| P0 | Mobile App v1 submit | HIGH |
| P1 | Documents Hub polish | LOW |
| P1 | Marketing site refresh | MEDIUM |
| P1 | Demo environment setup | MEDIUM |
| P1 | Approach Playbook fixes | LOW |
| P2 | 360 Overview build | MEDIUM |
| P2 | New feature page screenshots | LOW |

### CAN WAIT until after The Approach

- Task board updates (document exists, can execute post-event)
- Category narrative pages (individual feature pages first)
- Coming Soon pages (lower priority than core feature pages)
- Levi context updates (update as features ship)
- Stats section update on marketing site
