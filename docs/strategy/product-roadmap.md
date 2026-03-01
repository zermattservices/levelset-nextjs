# Levelset Product Roadmap

> Last updated: 2026-03-01
> Planning horizon: Short (before The Approach, March 22-24), Medium (Q2 2026), Long (Q3+ 2026)

## Strategic Context

Levelset is 100% focused on Chick-fil-A restaurants. The near-term goal is a successful launch at "The Approach" event (March 22-24, 2026) with a complete, connected platform that demonstrates the full value proposition: ratings, discipline, scheduling, development, evaluations, and AI — all working together.

The medium-term goal is to build out the development and retention features that make Levelset indispensable. The long-term goal is to become the standard team management platform for CFA operators nationwide.

---

## Short-Term: Before The Approach (March 1-22, 2026)

**Theme: "Ship the Connected Platform"**

All items below must be demo-ready and included in marketing materials by March 22.

### Must Ship (Critical Path)

| Feature | Current State | Work Remaining | Priority |
|---------|--------------|----------------|----------|
| **Scheduling** | Not polished | Full polish pass: approvals, swaps, AI scheduling, templates, house shifts, break rules | P0 |
| **Forms Engine** | Reasonably close | 1-2 focused sessions to finish | P0 |
| **Evaluations** | Tied to forms | Dashboard integration for full feature experience | P0 |
| **Development Plans** | Not built | Full build — roadmaps, checkpoints, role-to-role advancement | P0 |
| **Goal Tracking** | Not built | Full build: employee/team/location/org goals, evaluation integration | P0 |
| **Mobile App v1** | In progress | Polish, scope for v1, submit to App Store | P0 |
| **Documents Hub** | Almost done | 1-2 days of polish | P1 |

### Must Polish (Already Live)

| Feature | Work Remaining |
|---------|---------------|
| **Positional Excellence** | Marketing screenshots, demo flow |
| **Progressive Discipline** | Marketing screenshots, demo flow |
| **OE Pillars** | Marketing screenshots, demo flow |
| **Org Chart** | Final polish pass |
| **Roster Management** | Marketing screenshots |
| **Pay System** | Marketing screenshots, consider positioning |

### Marketing/Admin Tasks

- [ ] Update admin task board with all items from this roadmap
- [ ] Create new tasks for Development Plans, Evaluations dashboard, etc.
- [ ] Update feature descriptions in agent/public-facing content
- [ ] Add roadmap items to task board
- [ ] Marketing site refresh with updated messaging framework
- [ ] Prepare demo environment with realistic data
- [ ] Screenshot all features for marketing materials
- [ ] Create "Coming Soon" pages for future features

### 360 Overview (Employee Detail View)
- **Status:** Will be built before The Approach
- **Description:** Redesigned employee detail view that aggregates ratings, discipline, evaluations, development profiles, and pathway progress into a comprehensive view of each team member.
- **Purpose:** Not a standalone "feature" to market, but the source of powerful screenshots showing the connected nature of Levelset.

---

## Medium-Term: Q2 2026 (April - June)

**Theme: "Deepen the Development Story"**

After The Approach, the focus shifts to the features that make Levelset's development narrative complete and create long-term stickiness.

### Development Profiles
- **Priority:** HIGH
- **Description:** Two-part feature:
  1. **Crystal Integration (white-labeled):** DISC personality assessments providing insights into communication style, conflict approach, collaboration preferences, and cultural fit.
  2. **Internal Profile Aggregation:** Compile ratings history, discipline record, certification status, evaluation results, and pathway progress into a holistic team member profile.
- **Marketing:** Gets its own product page. Launch as a premium feature.
- **Dependency:** Crystal API integration, white-label agreement

### Pathway Tracking
- **Priority:** HIGH
- **Description:** Define career pathways within the organization (e.g., Team Member → Trainer → Team Lead → Director). Track individual progress along each pathway with milestones, requirements, and timelines.
- **Dependency:** Development Plans, Evaluations

### Retention Analytics
- **Priority:** MEDIUM
- **Description:** Dashboard for tracking and analyzing retention metrics. Identify patterns (tenure, role, location, ratings trajectory), flag at-risk employees, surface retention drivers.
- **Dependency:** Historical employee data, termination tracking

### Customer Feedback (Multi-Channel)
- **Priority:** MEDIUM
- **Description:** Evolve the current review monitoring (Google/Yelp backend) into a full customer feedback dashboard. Aggregate multiple channels, surface trends, connect feedback to operational metrics.
- **Reframing:** "Customer Feedback" not "Review Monitoring" — broader scope.

### Tasks
- **Priority:** MEDIUM-HIGH
- **Description:** Task management system with Levi AI integration. Leaders create and assign tasks. Tasks connect to goals (task completion drives goal progress), meetings (action items become tasks), and development plans (plan steps become tasks).
- **Dependency:** Goal Tracking (for goal-task linking)

### Levi AI Enhancements
- **Priority:** MEDIUM
- **Description:** Expand Levi's tool set, improve response quality, add write capabilities (create infractions, submit ratings via chat). Move from beta to GA based on customer feedback.
- **Items:**
  - New tools for development plans, evaluations, pathway data, goals
  - Background review fetching tool
  - Write actions (with confirmation)
  - Improved RAG with customer documents
  - Goal tracking queries ("are we on track to hit X?")
  - Development queries ("how well has X been developing their team?")

### Mobile App Feature Expansion
- **Priority:** HIGH
- **Description:** Bring additional dashboard features to the mobile app beyond the v1 scope. Scheduling, evaluations, development plans, goals, tasks, etc.

---

## Long-Term: Q3+ 2026

**Theme: "Become the Standard — The Admin Operations Suite"**

### Meetings (Assembly AI + Google Calendar)
- **Priority:** HIGH
- **Description:** Full meeting management system with three major components:
  1. **Assembly AI integration:** Levi becomes a live-listening agent — note-taker, action-item creator, question-answerer during meetings
  2. **Crystal/Development Profiles integration:** DISC insights surface during 1-on-1s and coaching sessions
  3. **Google Calendar integration:** Schedule meetings, build meeting structures, manage agendas
- **Value:** Combined with Tasks and Goals, this completes the admin operations suite. Levi gains massive real-time context about the business.
- **Dependency:** Tasks (for action item flow), Development Profiles (for Crystal insights), Google Calendar API

### Voice-Enabled Levi
- **Priority:** HIGH
- **Description:** Levi as a voice-enabled agent that can participate in meetings, answer questions aloud, and provide real-time insights. This is the logical extension of Assembly AI integration — Levi doesn't just listen, it speaks.
- **Value:** The "robot employee" vision. Levi is a full team member that can help leaders strategize with real data.

### Agentic Levi (Proactive AI)
- **Priority:** HIGH
- **Description:** Levi transitions from reactive (answers questions) to proactive (reaches out to users). Capabilities include:
  - Proactive task follow-up: "Hey Sarah, you have a development checkpoint due Friday. How's your progress?"
  - Context gathering: Levi asks team members for updates before leader meetings
  - Alert generation: "3 team members have declining ratings this month — here's what I recommend"
  - Complex planning: "Based on our current trajectory, here's what I'd recommend for Q4 staffing"
- **Value:** This is the end-state vision. Levi becomes an indispensable operational partner, not just a query tool.

### Certification System (Generalization)
- **Priority:** MEDIUM
- **Description:** Generalize the certification system (currently Reece Howard only) for all organizations. Enable as a feature toggle.
- **Value:** Certification → pay incentives → retention. Powerful when connected to everything else.

### MCP Server (Levi Everywhere)
- **Priority:** LOW
- **Description:** Expose Levi as an MCP server so Operators can use it within ChatGPT, Claude, or other AI environments.
- **Value:** Power users get Levi in their preferred tools. Low effort, high delight.

### Advanced AI Capabilities
- **Priority:** MEDIUM
- **Description:**
  - Predictive retention modeling (who's likely to leave?)
  - Automated scheduling optimization
  - Performance trend alerts and coaching suggestions
  - Cross-location benchmarking insights
  - Natural language report generation

### Multi-Location Analytics
- **Priority:** HIGH (for multi-unit operators)
- **Description:** Cross-location dashboards comparing team metrics, OE scores, retention, discipline rates, and development progress. Key for the multi-unit operator beachhead strategy.

### Integration Ecosystem
- **Priority:** MEDIUM
- **Description:** Based on existing integrations roadmap:
  - **Live:** Google Maps, Yelp (backend)
  - **Planned:** HotSchedules import, Slack notifications, Crystal (Development Profiles)
  - **Future:** POS integration, payroll export, communication tools

### Resources Library
- **Priority:** MEDIUM
- **Description:** A curated library of development resources, training materials, and best practices that leaders can assign as part of development plans. CFA-specific content.
- **Connection:** Development Plans reference resources. Leaders create custom development paths that include specific training materials.

---

## Feature Release Cadence

### Pre-Approach (March 1-22): SPRINT
- Ship scheduling, forms, evaluations, development plans, mobile v1
- Polish everything live
- Marketing site refresh

### Post-Approach (April): STABILIZE
- Customer onboarding from The Approach event
- Bug fixes and feedback integration
- Start Development Profiles and Pathway Tracking design

### Q2 (May-June): BUILD
- Development Profiles (Crystal integration)
- Pathway Tracking
- Retention Analytics v1
- Mobile feature expansion

### Q3 (July-September): SCALE
- Customer Feedback dashboard
- Certification generalization
- Multi-location analytics
- Advanced AI features

### Q4 (October-December): MATURE
- MCP Server
- Integration ecosystem expansion
- Resources Library
- Predictive analytics

---

## Success Metrics

### The Approach Event (March 22-24)
- Target: 10+ qualified leads from the event
- Demo readiness: All "Must Ship" features functional
- Marketing site: Updated with full messaging framework

### Q2 2026
- Target: First paying customers onboarded
- Target: Development Profiles product page live
- Target: Mobile App feature parity with core dashboard

### Q3 2026
- Target: 20+ active organizations
- Target: Multi-unit operator traction
- Target: Levi AI moved from beta to GA

### End of 2026
- Target: 50+ active organizations
- Target: $50K+ MRR
- Target: Recognized as a CFA-specific solution in the operator community
