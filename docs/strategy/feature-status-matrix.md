# Levelset Feature Status Matrix

> Last updated: 2026-03-01
> Context: Preparing for "The Approach" event (March 22-24) and marketing site refresh.

## Status Key

| Status | Meaning |
|--------|---------|
| **LIVE** | Production-ready, customers using it |
| **BETA** | Functional but still evolving, flagged as beta |
| **PRE-LAUNCH** | Will be ready before The Approach (March 22-24) |
| **COMING SOON** | Planned, not yet built, marketed as coming soon |
| **INTERNAL** | Built but not marketed or customer-facing yet |
| **EXCLUDED** | Not included in current marketing |

---

## Core Platform Features

### 1. Positional Excellence (Ratings System)
- **Status:** LIVE
- **Maturity:** Polished
- **Description:** The heart of Levelset. Employees are rated on position-specific criteria (the "Big 5") on a 1-3 scale. Rolling averages computed daily. Color-coded thresholds (Green/Yellow/Red) per location. Supports FOH/BOH/General zones.
- **Platforms:** Dashboard + PWA Kiosks (production), Mobile App (in progress)
- **Marketing:** YES — lead feature, fully demo-ready

### 2. Progressive Discipline
- **Status:** LIVE
- **Maturity:** Polished
- **Description:** Full discipline tracking with configurable infraction rubric, point values, 90-day rolling window, escalation ladder with recommended actions, acknowledgements, and supporting documents.
- **Platforms:** Dashboard + PWA Kiosks (production), Mobile App (in progress)
- **Marketing:** YES — core feature

### 3. Roster Management
- **Status:** LIVE
- **Maturity:** Polished
- **Description:** Complete employee lifecycle — hire, edit, terminate, transfer. Tracks role, zone, availability, contact info, hire date, termination reason. Full employee directory.
- **Platforms:** Dashboard
- **Marketing:** YES — foundational feature

### 4. Operational Excellence (OE) Pillars
- **Status:** LIVE
- **Maturity:** Polished
- **Description:** Five CFA-aligned pillars (Great Food, Quick & Accurate, Creating Moments, Caring Interactions, Inviting Atmosphere) with weighted scoring normalized to 0-100 scale. Position-level breakdowns.
- **Platforms:** Dashboard, Levi AI
- **Marketing:** YES — differentiator that speaks CFA language

### 5. Org Chart
- **Status:** LIVE
- **Maturity:** Close to polished
- **Description:** Visual organizational hierarchy. Helps team members understand the organization and get oriented. Shows role relationships and reporting structure.
- **Platforms:** Dashboard, Levi AI (feature-gated)
- **Marketing:** YES — helps with onboarding and organizational clarity

### 6. Documents Hub
- **Status:** LIVE
- **Maturity:** Almost polished (1-2 days remaining)
- **Description:** Upload, extract, and organize documents. Supports PDF, DOCX, images (OCR via GPT-4o), web URLs. Content extracted to markdown for AI retrieval. Org-scoped and global document support.
- **Platforms:** Dashboard
- **Marketing:** YES — supports knowledge management narrative

### 7. Pay System
- **Status:** LIVE
- **Maturity:** Polished
- **Description:** Calculated pay with role-based rules, zone differentials (FOH/BOH), availability modifiers (Limited/Available), and certification pay premiums. Auto-computed via database triggers.
- **Platforms:** Dashboard
- **Marketing:** YES but position carefully — not all orgs may use all pay rules. Frame as "transparent, rule-based pay that rewards performance."
- **Note:** Utility varies by org. Some may not use certification or zone pay rules.

---

## Pre-Launch Features (Ready Before The Approach)

### 8. Scheduling
- **Status:** PRE-LAUNCH
- **Maturity:** Not polished yet, will be ready before March 22
- **Scoped Features for Launch:**
  - Shift templates and management
  - Setup templates (position/headcount per time block)
  - Break rules
  - Shift approvals
  - Shift swaps
  - AI-assisted scheduling
  - House shifts
- **Platforms:** Dashboard (primary), Mobile App (TBD)
- **Marketing:** YES — market the full scoped feature set

### 9. Forms Engine
- **Status:** PRE-LAUNCH
- **Maturity:** Reasonably close, needs 1-2 focused sessions
- **Description:** JSON Schema-based form builder with UI Schema, conditional logic via form connectors (e.g., "no discipline in 30 days", "avg rating meets threshold"). Supports rating, discipline, evaluation, and custom form types. Version tracking. EN/ES support.
- **Platforms:** Dashboard (builder), PWA + Mobile (submission)
- **Marketing:** YES — powers the configurable nature of the platform

### 10. Evaluations
- **Status:** PRE-LAUNCH
- **Maturity:** Tied to forms engine. Created in forms management. Dashboard integration for full feature needs work.
- **Description:** Formal assessments tied to certification lifecycle. When an employee reaches "Pending" status, leaders conduct evaluations. Passing leads to Certified status.
- **Platforms:** Dashboard
- **Marketing:** YES — huge feature. Critical for the development/growth narrative.
- **Note:** This is a major selling point. Evaluations + ratings + discipline + development plans = the full employee growth story.

### 11. Development Plans
- **Status:** PRE-LAUNCH (aggressive timeline)
- **Maturity:** Not built yet. Critical long-term value prop. Pushing hard to complete before The Approach.
- **Description:** Full roadmap for employee advancement. Leaders create custom development plans for moving from one role to the next. Integrates with evaluations, ratings, discipline, development profiles, and pathway tracking. Leaders set checkpoints customized to their organization.
- **Platforms:** Dashboard, eventually Mobile
- **Marketing:** YES — this is THE differentiator. "Build the roadmap for every team member's growth."
- **Dependencies:** Evaluations, Ratings, Discipline, Development Profiles (partial)

### 12. Mobile App
- **Status:** PRE-LAUNCH
- **Maturity:** Major lift. Polished v1 will ship to App Store before The Approach. May not have all features at launch.
- **Description:** Native iOS/Android app replacing the PWA. Bundles Levi AI chat, form submission (ratings + discipline), employee lookup, and more in a native experience. Dark mode, EN/ES support.
- **Stack:** Expo 54, React Native 0.81, Expo Router
- **Marketing:** YES — must be marketed. This is the "Levelset in your pocket" story. Will replace PWA kiosks.
- **Note:** v1 may be scoped — not every dashboard feature will be available on day one.

---

## Beta Features

### 13. Levi AI (Mobile Chat Agent)
- **Status:** BETA
- **Maturity:** Semi-polished, continuing to evolve. Not tested live with customers yet.
- **Description:** AI assistant for restaurant leaders. Natural language queries about team performance, discipline, ratings, scheduling, and more. 13+ data tools. Streaming responses with visual cards (employee cards, infraction lists, rankings). Orchestrator-worker architecture with hybrid RAG.
- **LLM Stack:** MiniMax M2.5 (primary), Claude Sonnet 4.5 (escalation), Claude Opus 4.6 (orchestration)
- **Platforms:** Mobile App (primary interface)
- **Marketing:** YES — flag as beta. Major differentiator. "Your AI-powered restaurant management assistant."

---

## Pre-Launch Features (Ready Before The Approach) — continued

### 14. Goal Tracking
- **Status:** PRE-LAUNCH
- **Maturity:** Not built yet. Will be developed before The Approach.
- **Description:** Configurable goal-setting system at multiple levels: per employee, per team, per location, per organization. Goals integrate with evaluations (goals become evaluation criteria). Supports quantitative and qualitative targets. Leaders set goals, track progress, and evaluate completion.
- **Scoped Levels:**
  - **Employee goals:** Individual development and performance targets
  - **Team goals:** Team-level objectives set by leaders
  - **Location goals:** Restaurant-wide targets (operational, financial, cultural)
  - **Organization goals:** Multi-location strategic objectives
- **Integrations:** Evaluations (goal evaluation), Levi AI (future: "are we on track to hit X goal?")
- **Platforms:** Dashboard
- **Marketing:** YES — market as a core feature. Goal tracking is universally understood and valued.

---

## Coming Soon Features

### 15. Tasks
- **Status:** COMING SOON
- **Maturity:** Not built. Part of the admin operations suite.
- **Description:** Task management system integrated with Levi AI. Leaders create and assign tasks. Levi will eventually be fully agentic — able to reach out directly to users to follow up about tasks, help gather context, and facilitate completion. Tasks connect to goals, meetings, and development plans for full operational context.
- **Future Vision:** Levi proactively manages task follow-up, reminders, and status gathering via direct outreach to team members.
- **Marketing:** YES — coming soon. Frame as part of the operational suite.

### 16. Meetings
- **Status:** COMING SOON
- **Maturity:** Not built. Part of the admin operations suite.
- **Description:** Meeting management with structured agendas, note-taking, and action item tracking. Three major integration points:
  1. **Assembly AI integration:** Levi becomes a live-listening agent — part note-taker, part action-item creator, part question-answerer during meetings
  2. **Crystal/Development Profiles integration:** Crystal DISC insights surface during meetings to help leaders tailor communication
  3. **Google Calendar integration:** Set meetings, manage schedules, build meeting structures
- **Future Vision:** Levi participates in meetings in real-time as a voice-enabled agent, capturing notes, creating action items, answering questions about team data, and providing contextual insights.
- **Marketing:** Coming soon but do NOT market yet. This is a future differentiator to announce when closer to ready.

### 17. Development Profiles
- **Status:** COMING SOON
- **Maturity:** Not built. Partially dependent on Crystal (crystalknows.com) integration.
- **Description:** Two components:
  1. **Crystal Integration (white-labeled):** DISC assessments for communication, conflict, collaboration, and culture analysis.
  2. **Internal profiles:** Employee development data aggregated from ratings, discipline, evaluations, and pathway progress.
- **Marketing:** YES — gets its own product page. Marked as "Coming Soon."
- **Note:** This is a premium differentiator. DISC + performance data = holistic team member understanding.

### 18. Pathway Tracking
- **Status:** COMING SOON
- **Maturity:** Not built.
- **Description:** Track employee progress along defined career pathways. Connects to development plans, certifications, and role advancement.
- **Marketing:** YES — coming soon

### 19. Retention Analytics
- **Status:** COMING SOON
- **Maturity:** Not built.
- **Description:** Track and analyze employee retention metrics. Identify patterns, at-risk employees, and retention drivers.
- **Marketing:** YES — coming soon

### 20. Customer Feedback (formerly Review Monitoring)
- **Status:** COMING SOON
- **Maturity:** Backend collecting Google/Yelp reviews but no dashboard feature yet.
- **Description:** Multi-channel customer feedback aggregation. Google Reviews, Yelp, and potentially other channels. Reframed from "review monitoring" to encompass broader feedback strategy.
- **Marketing:** YES — coming soon. Frame as "Customer Feedback" with multi-channel support.

---

## Excluded from Marketing

### Certification System
- **Status:** INTERNAL
- **Reason:** Currently only available to Reece Howard org. One-off implementation. Not generalizable yet.
- **Future:** May be promoted once generalized for all orgs.

### MCP Server (Levi for ChatGPT/Claude)
- **Status:** EXCLUDED
- **Reason:** Not built. Not critical path. Would allow operators to use Levi in their own AI environment.
- **Future:** Nice-to-have for power users. Revisit post-launch.

### Review Monitoring (raw)
- **Status:** EXCLUDED (reframed as "Customer Feedback" in Coming Soon)
- **Reason:** Backend-only. No dashboard feature. Levi tool may come first.

---

## Feature Interdependencies

```
Positional Excellence (Ratings)
├── Certification System (internal only)
│   └── Pay System (certification rules)
├── Evaluations
│   └── Development Plans
│       ├── Development Profiles (Crystal + internal)
│       ├── Pathway Tracking
│       └── 360 Overview (employee detail view)
├── Progressive Discipline
│   └── Development Plans (discipline history informs plans)
└── OE Pillars (derived from ratings)

Scheduling
├── AI Scheduling (Levi integration)
├── Setup Templates
└── Labor/Cost tracking

Forms Engine
├── Rating Forms
├── Discipline Forms
├── Evaluation Forms
└── Custom Forms

Mobile App
├── Levi AI Chat
├── Form Submission
├── Employee Lookup
└── (Future: all dashboard features)

Goal Tracking
├── Employee goals → Evaluations (goals become eval criteria)
├── Team goals → Team Overview
├── Location goals → OE Pillars, Retention Analytics
└── Org goals → Multi-location dashboards

Tasks (Coming Soon)
├── Levi AI (agentic task follow-up, proactive outreach)
├── Goals (task completion → goal progress)
├── Meetings (action items → tasks)
└── Development Plans (plan steps → tasks)

Meetings (Coming Soon)
├── Assembly AI (live-listening agent, note-taking, action items)
├── Crystal/Development Profiles (DISC insights during meetings)
├── Google Calendar (scheduling, meeting structures)
├── Tasks (action items flow to tasks)
└── Levi AI (voice-enabled meeting participant)

Levi AI
├── All data tools (13+)
├── Document RAG
├── (Future: Voice-enabled agent via Assembly AI)
├── (Future: Agentic task management with proactive outreach)
├── (Future: Goal tracking queries — "are we on track?")
├── (Future: Development queries — "how well has X been developing their team?")
├── (Future: Complex planning/strategy queries)
└── (Future: MCP Server)
```

### The Admin Operations Suite (Long-Term Vision)

Tasks + Meetings + Goal Tracking together form the **admin operations suite**. Combined with Levi AI, this gives Levelset massive context about what's happening in the business, unlocking:

- **Goal queries:** "Are we on track to hit our Q3 retention goal?"
- **Development queries:** "How well has Sarah been developing her team on leadership principles?"
- **Planning queries:** Complex organizational planning and strategy support
- **Proactive outreach:** Levi reaches out to team members directly for task follow-up and context gathering
- **Meeting intelligence:** Live note-taking, action item creation, and question answering during meetings
- **Full agentic capability:** Levi becomes a "robot employee" that helps leaders truly strategize with real data, not generic ChatGPT responses

---

## Admin Task Board Updates Needed

The following items need to be created/updated in the admin mode task board:

### New Tasks to Create:
- [ ] Development Plans feature (full build)
- [ ] Goal Tracking feature (employee/team/location/org levels)
- [ ] Development Profiles - Crystal integration setup
- [ ] Development Profiles - internal profile aggregation
- [ ] Pathway Tracking feature
- [ ] Retention Analytics feature
- [ ] Customer Feedback dashboard (multi-channel)
- [ ] Tasks feature (Levi-integrated task management)
- [ ] Meetings feature (Assembly AI, Google Calendar, structured meetings)
- [ ] 360 Overview (employee detail view redesign)
- [ ] Mobile App v1 — scope and ship to App Store
- [ ] Forms Engine — final polish sessions
- [ ] Evaluations — dashboard integration
- [ ] Scheduling — full feature polish

### Existing Tasks to Update:
- [ ] Review all current task descriptions for accuracy
- [ ] Add roadmap items for Coming Soon features
- [ ] Update agent/public descriptions for all features
- [ ] Verify feature flags align with marketing status

### Roadmap Items to Add:
- [ ] Short-term (Before The Approach): Scheduling, Forms, Evaluations, Development Plans, Goal Tracking, Mobile App v1, Documents Hub polish
- [ ] Medium-term (Q2 2026): Development Profiles, Pathway Tracking, Retention Analytics, Customer Feedback dashboard, Tasks
- [ ] Long-term (Q3+ 2026): Meetings (Assembly AI), Voice-enabled Levi, MCP Server, Certification generalization, Agentic Levi capabilities
