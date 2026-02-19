# Levi - Levelset AI Architecture

> An autonomous AI team member modeled after the [OpenClaw](https://github.com/openclaw/openclaw) agent architecture, sandboxed per organization.

> **Last updated:** February 2026

---

## Implementation Progress

| Phase | Status | What's Done | What Remains |
|-------|--------|-------------|--------------|
| **Phase 1: Monorepo** | **Complete** | pnpm workspaces, Turborepo, `apps/agent` on Fly.io, `packages/shared`, `packages/permissions`, `packages/supabase-client`, `packages/design-tokens` | — |
| **Phase 2: Agentic Foundation** | **In Progress** | Agent skeleton (Hono, auth middleware, health check, CORS), chat route stub | LLM integration, conversation DB tables, tools, dashboard chat UI, conversation persistence, streaming |
| **Phase 3: Doc Intelligence** | Not Started | — | PageIndex integration, hybrid RAG |
| **Phase 4-5: Meetings** | Not Started | — | All meeting functionality |
| **Phase 6: Memory** | Not Started | — | Memory tables, feedback, learning |
| **Phase 7: Autonomy** | Not Started | — | Heartbeat, escalation, channels |
| **Phase 8: Mobile** | **Partially Done** | Full chat UI (ChatScreen, ChatInput, ChatBubble, TypingIndicator), drawer nav (LeviSlidingMenu), settings modal, LeviChatContext + LeviMenuContext, tab integration with animated drawer | Backend integration (connects to unimplemented agent), Tasks/Meetings/Alerts screens are stubs |
| **Phase 9: Polish** | Not Started | — | — |

**Key deviation from original plan:** Mobile chat UI was built ahead of the backend (Phase 8 before Phase 2). The mobile app has a complete Levi interface that currently displays a fallback message ("I'm still being set up. Check back soon!"). The mobile app lives at `apps/mobile/` as a separate npm workspace (excluded from pnpm).

### Current Architecture (What Exists)

```
apps/agent/src/
├── index.ts                 # Hono server setup, CORS, routing
├── middleware/
│   └── auth.ts             # JWT verification via Supabase, role checks (Levelset Admin only)
└── routes/
    ├── health.ts           # GET /health — public health check
    └── ai/
        └── chat.ts         # POST /api/ai/chat — returns 501 (not yet implemented)

apps/mobile/src/
├── components/levi/
│   ├── ChatScreen.tsx      # Main chat interface with message list + input
│   ├── ChatInput.tsx       # Claude-style input with +, send, microphone buttons
│   ├── ChatBubble.tsx      # User (right) and assistant (left, with Levi avatar) bubbles
│   ├── TypingIndicator.tsx # Animated "Levi is typing..." dots
│   ├── LeviSettingsModal.tsx  # Notifications, language toggle, clear history
│   └── LeviSlidingMenu.tsx    # Drawer sidebar with Chat/Tasks/Meetings/Alerts tabs
├── screens/levi/
│   ├── TasksScreen.tsx     # Stub — "Coming soon"
│   ├── MeetingsScreen.tsx  # Stub — "Coming soon"
│   └── AlertsScreen.tsx    # Stub — "Coming soon"
├── context/
│   ├── LeviChatContext.tsx  # Chat state management, sends to EXPO_PUBLIC_AGENT_URL/api/ai/chat
│   └── LeviMenuContext.tsx  # Drawer navigation state
└── app/(tabs)/(levi)/
    ├── _layout.tsx         # Wraps with LeviMenuProvider + LeviChatProvider
    └── index.tsx           # Animated drawer layout with gesture support
```

### Next Priority: Functional Chat (Phase 2 Completion)

The immediate next step is getting the chat pipeline working end-to-end:
1. LLM integration in the agent (MiniMax M2.5 via OpenRouter as primary model)
2. Database migrations for `ai_conversations` and `ai_messages` tables
3. Basic structured data tools (employee lookup, ratings, discipline)
4. Streaming responses via SSE to both mobile and dashboard
5. Conversation persistence and history management

---

## Vision: Levi as a Digital Employee

Unlike a simple assistant, Levi is designed to evolve into a proactive participant in each organization:

**Proactive Engagement:**
- Reaches out to leaders and team members at opportune times
- "Hey, your action item from yesterday's meeting is due - have you finished it?"
- "I noticed Sarah's ratings have declined 15% this month - want me to schedule a check-in?"

**Meeting Participant:**
- Joins meetings to answer questions in real-time
- "Hey Levi, did we ever tell Maria about her infraction last week?"
- Evolves from text sidebar → voice interaction

**Autonomous Actions:**
- Takes actions based on configurable trust levels per role
- Sends reminders, updates statuses, escalates issues
- Learns which actions require approval vs can execute autonomously

**Organizational Memory:**
- Remembers interactions, patterns, preferences
- Builds knowledge about each org's terminology and processes
- Improves recommendations based on feedback

**Multi-Channel Communication:**
- In-app notifications and chat
- Email for important items
- SMS for urgent escalations

---

## 1. OpenClaw-Inspired Architecture

### Core Concepts from OpenClaw

| OpenClaw Concept | Levi Implementation |
|------------------|---------------------|
| Gateway (control plane) | **Levi Gateway** - API layer managing all agent sessions |
| Heartbeat daemon | **Scheduled Tasks** - pg_cron jobs that wake Levi to check action items, patterns |
| Session isolation | **Org Sandbox** - Each org has isolated context, tools, memory |
| Multi-channel routing | **Channel Router** - In-app, email, SMS based on urgency/preference |
| Local-first memory | **Org Memory Store** - Supabase tables per org for context persistence |
| Tool execution | **Permission-scoped Tools** - Tools filtered by user role and org settings |

### Levi Gateway Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LEVI GATEWAY                                       │
│                    (Central Control Plane per Org)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     SESSION MANAGER                                  │   │
│  │                                                                      │   │
│  │  • User sessions (dashboard chat, mobile)                           │   │
│  │  • Meeting sessions (real-time participation)                        │   │
│  │  • Heartbeat sessions (autonomous background tasks)                  │   │
│  │  • Each session scoped to org + location + user permissions          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │   USER CHAT     │   │  MEETING MODE   │   │   HEARTBEAT     │           │
│  │   SESSION       │   │   SESSION       │   │   DAEMON        │           │
│  │                 │   │                 │   │                 │           │
│  │ • Query/respond │   │ • Live Q&A      │   │ • Check todos   │           │
│  │ • Tool calls    │   │ • Transcribe    │   │ • Send reminders│           │
│  │ • Form prefill  │   │ • Voice (future)│   │ • Pattern detect│           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           └─────────────────────┼─────────────────────┘                     │
│                                 ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      TOOL EXECUTOR                                   │   │
│  │                                                                      │   │
│  │  Permission check → Org sandbox filter → Execute → Audit log        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                        │
│              ▼                  ▼                  ▼                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │  STRUCTURED     │ │  DOCUMENT       │ │  ACTION         │               │
│  │  DATA TOOLS     │ │  TOOLS          │ │  TOOLS          │               │
│  │  (pgvector)     │ │  (PageIndex)    │ │  (Autonomy)     │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHANNEL ROUTER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐   │
│  │   IN-APP    │    │    EMAIL    │    │     SMS     │    │   VOICE    │   │
│  │             │    │             │    │             │    │  (Future)  │   │
│  │ • Chat UI   │    │ • Reminders │    │ • Urgent    │    │ • Meeting  │   │
│  │ • Push      │    │ • Digests   │    │ • Escalate  │    │ • Phone    │   │
│  │ • Dashboard │    │ • Reports   │    │             │    │            │   │
│  └─────────────┘    └─────────────┘    └─────────────┘    └────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Heartbeat System (Autonomous Actions)

Inspired by OpenClaw's heartbeat daemon that wakes periodically to check tasks:

```typescript
// Heartbeat configuration per org
interface HeartbeatConfig {
  enabled: boolean;
  interval_minutes: number;  // Default: 30

  // What Levi checks on each heartbeat
  checks: {
    overdue_action_items: boolean;
    upcoming_due_dates: boolean;      // 24h warning
    rating_decline_patterns: boolean; // Weekly
    discipline_escalation: boolean;   // Point thresholds
    evaluation_scheduling: boolean;   // Upcoming audits
    unanswered_questions: boolean;    // Knowledge gaps
  };

  // Autonomy settings
  autonomy: {
    send_reminders: 'auto' | 'ask' | 'disabled';
    escalate_issues: 'auto' | 'ask' | 'disabled';
    update_statuses: 'auto' | 'ask' | 'disabled';
    schedule_meetings: 'ask' | 'disabled';  // Never auto
  };
}
```

**Heartbeat Flow:**
```
pg_cron (every 30 min)
    │
    ▼
┌─────────────────────────────────────┐
│  For each org with heartbeat enabled │
│                                      │
│  1. Load HEARTBEAT.md equivalent    │
│     (org's heartbeat config)         │
│                                      │
│  2. Check each enabled task:         │
│     • Query overdue items            │
│     • Detect patterns                │
│     • Evaluate escalation needs      │
│                                      │
│  3. For each finding:                │
│     • Check autonomy level           │
│     • If 'auto': execute action      │
│     • If 'ask': queue for approval   │
│                                      │
│  4. Route notifications via          │
│     Channel Router                   │
└─────────────────────────────────────┘
```

---

## 2. Memory & Learning System

### 4-Layer Memory Architecture

Levi's memory operates in four distinct layers with strict access controls:

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: GLOBAL CONTEXT (all orgs)                                 │
│                                                                     │
│  • Chick-fil-A brand standards and policies                        │
│  • Industry compliance requirements (food safety, labor law)       │
│  • Common operational procedures                                    │
│  • Shared terminology across all locations                         │
│                                                                     │
│  Source: Managed by Levelset admins, immutable by orgs             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: ORG MEMORY                                                │
│                                                                     │
│  • Local terminology ("we call it the walk-in")                    │
│  • Process variations from standard                                │
│  • Org-specific policies and procedures                            │
│  • Learned patterns from org interactions                          │
│                                                                     │
│  Source: Configured by org admins + learned by Levi                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: USER MEMORY                                               │
│                                                                     │
│  • Communication preferences (detail level, formality)             │
│  • Common queries and shortcuts                                    │
│  • Language preference (English/Spanish/code-switching)            │
│  • Interaction patterns                                            │
│                                                                     │
│  Source: Learned from user interactions                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: SENSITIVE CONTEXT (compartmentalized)                     │
│                                                                     │
│  • Employee disclosures (personal issues, complaints)              │
│  • Locked to specific employee + authorized user(s)                │
│  • Time-boxed retention or explicit unlock required                │
│  • NEVER surfaces in reports, analytics, or to unauthorized users  │
│                                                                     │
│  Source: Conversations flagged as sensitive                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Memory Tables

```sql
-- Global context (managed by Levelset, applies to all orgs)
CREATE TABLE levi_global_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT NOT NULL,  -- 'brand_standard', 'compliance', 'procedure', 'terminology'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  applies_to TEXT[] DEFAULT '{}',  -- Empty = all orgs, or specific org types
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(context_type, key)
);

-- Long-term organizational memory
CREATE TABLE levi_org_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,  -- 'terminology', 'process', 'pattern', 'preference'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  confidence NUMERIC(4,3) DEFAULT 1.0,
  source TEXT,  -- 'learned', 'configured', 'inferred'
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, memory_type, key)
);

-- User-specific preferences and patterns
CREATE TABLE levi_user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,  -- 'preference', 'pattern', 'language', 'shortcut'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, memory_type, key)
);

-- Sensitive context with strict access control
CREATE TABLE levi_sensitive_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  visible_to_user_ids UUID[] NOT NULL,  -- Only these users can see this context
  context_type TEXT NOT NULL,  -- 'disclosure', 'complaint', 'personal', 'medical'
  summary TEXT NOT NULL,  -- What Levi remembers (not full transcript)
  source_conversation_id UUID REFERENCES ai_conversations(id),
  expires_at TIMESTAMPTZ,  -- Optional auto-expiry
  unlocked_by UUID REFERENCES app_users(id),  -- If manually unlocked to additional users
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure employee's own conversations are always visible to them
  CONSTRAINT employee_always_visible CHECK (employee_id = ANY(visible_to_user_ids) OR visible_to_user_ids = '{}')
);

-- Index for fast lookup of sensitive context
CREATE INDEX idx_sensitive_context_employee ON levi_sensitive_context(employee_id);
CREATE INDEX idx_sensitive_context_visible ON levi_sensitive_context USING GIN(visible_to_user_ids);

-- Feedback for adaptive learning
CREATE TABLE levi_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  message_id UUID REFERENCES ai_messages(id),
  feedback_type TEXT NOT NULL,  -- 'thumbs_up', 'thumbs_down', 'correction', 'preference'
  feedback_data JSONB,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Adaptive Learning Pipeline

```
User Interaction
       │
       ▼
┌─────────────────────────────────────┐
│  FEEDBACK COLLECTION                │
│                                     │
│  • Thumbs up/down on responses      │
│  • Corrections ("Actually, we...")  │
│  • Explicit preferences ("Always...│
│  • Implicit signals (retry, rephrase)│
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  LEARNING ENGINE (Batch)            │
│                                     │
│  1. Aggregate feedback patterns     │
│  2. Extract learnable insights:     │
│     • Terminology mappings          │
│     • Format preferences            │
│     • Process workflows             │
│     • Accuracy corrections          │
│                                     │
│  3. Update memory stores            │
│  4. Adjust confidence scores        │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  MEMORY APPLICATION                 │
│                                     │
│  On each query, inject relevant:    │
│  • Org terminology ("we call it X") │
│  • User preferences (detail level)  │
│  • Past corrections (avoid repeats) │
│  • Successful patterns              │
└─────────────────────────────────────┘
```

---

## 3. Action Items & Task Management

Action items are the **primary object** Levi revolves around. Every meeting produces them, every heartbeat checks them, and Levi can own them just like a human team member.

### Action Items as First-Class Citizens

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACTION ITEM LIFECYCLE                            │
│                                                                     │
│  Sources:                     Ownership:                           │
│  • Meeting extraction         • Human-assigned (to team member)    │
│  • Manual creation            • Levi-assigned (to team member)     │
│  • AI suggestion              • Levi-owned (Levi does the work)    │
│  • Heartbeat detection        • Shared (human + Levi collaborate)  │
│                                                                     │
│  Tracking:                    Resolution:                          │
│  • Due dates + reminders      • Completed by assignee              │
│  • Progress updates           • Completed by Levi                  │
│  • Blockers flagged           • Escalated to manager               │
│  • Linked objects             • Expired/cancelled                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Levi-Owned Action Items

Levi can own tasks just like any team member:

```typescript
// Examples of Levi-owned action items:
const leviOwnedTasks = [
  {
    title: "Follow up with Sarah about training completion",
    assigned_to: 'LEVI',  // Special assignee
    action_type: 'follow_up',
    target_employee_id: 'sarah-uuid',
    due_date: '2024-01-20',
    auto_action: {
      trigger: 'due_date',
      action: 'check_training_status',
      if_incomplete: 'notify_manager',
      if_complete: 'mark_done_and_celebrate'
    }
  },
  {
    title: "Monitor John's ratings for 2 weeks",
    assigned_to: 'LEVI',
    action_type: 'monitor',
    target_employee_id: 'john-uuid',
    duration_days: 14,
    auto_action: {
      trigger: 'pattern_detected',
      if_improved: 'notify_manager_positive',
      if_declined: 'escalate_with_recommendation'
    }
  },
  {
    title: "Send weekly summary to management",
    assigned_to: 'LEVI',
    action_type: 'recurring',
    schedule: 'weekly_friday_4pm',
    auto_action: {
      trigger: 'schedule',
      action: 'generate_and_send_summary'
    }
  }
];
```

### Task Management Dashboard Integration

Managers (Level 0, 1, 2) can view and manage Levi's tasks alongside team tasks:

```
┌─────────────────────────────────────────────────────────────────────┐
│  TASK MANAGEMENT DASHBOARD                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [All Tasks] [My Tasks] [Team Tasks] [Levi's Tasks]                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  LEVI'S CURRENT FOCUS                                        │   │
│  │                                                              │   │
│  │  🔄 In Progress (3)                                         │   │
│  │  ├─ Monitoring Sarah's ratings (day 5 of 14)               │   │
│  │  ├─ Following up on Monday's meeting action items          │   │
│  │  └─ Preparing weekly summary for Friday                    │   │
│  │                                                              │   │
│  │  📋 Queued (2)                                              │   │
│  │  ├─ Check John's training completion (due tomorrow)        │   │
│  │  └─ Send reminder to Maria about evaluation                │   │
│  │                                                              │   │
│  │  ✅ Completed Today (4)                                     │   │
│  │  ├─ Sent reminder to Alex about ServSafe                   │   │
│  │  ├─ Updated action item status from team sync              │   │
│  │  └─ ...                                                     │   │
│  │                                                              │   │
│  │  [Override] [Reassign] [Cancel] [Add Task for Levi]        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Manager Override Capabilities

Managers can intervene in Levi's tasks at any time:

| Action | Effect |
|--------|--------|
| **Override** | Take over a task from Levi, or change how Levi handles it |
| **Reassign** | Move task from Levi to human, or vice versa |
| **Cancel** | Stop Levi from working on a task |
| **Pause** | Temporarily halt Levi's work on sensitive items |
| **Expedite** | Bump priority, Levi handles immediately |

### Action Item Database Schema

```sql
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),

  -- Core fields
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled', 'expired')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,

  -- Assignment (can be human or Levi)
  assigned_to UUID REFERENCES app_users(id),  -- NULL if assigned to Levi
  assigned_to_levi BOOLEAN DEFAULT false,
  ownership_type TEXT DEFAULT 'human' CHECK (ownership_type IN ('human', 'levi', 'shared')),

  -- Source tracking
  created_by UUID REFERENCES app_users(id),
  source_type TEXT CHECK (source_type IN ('manual', 'meeting', 'ai_suggestion', 'heartbeat', 'pattern')),
  source_id UUID,
  source_meeting_id UUID REFERENCES meetings(id),

  -- Linked objects (what this action item relates to)
  linked_employee_id UUID REFERENCES employees(id),
  linked_infraction_id UUID REFERENCES infractions(id),
  linked_rating_id UUID REFERENCES ratings(id),
  linked_evaluation_id UUID REFERENCES evaluations(id),
  linked_action_id UUID REFERENCES disciplinary_actions(id),

  -- Levi tracking
  levi_auto_action JSONB,  -- What Levi should do automatically
  levi_reminder_count INTEGER DEFAULT 0,
  levi_last_reminder_at TIMESTAMPTZ,
  levi_escalated BOOLEAN DEFAULT false,
  levi_escalated_at TIMESTAMPTZ,
  levi_progress_notes JSONB DEFAULT '[]',  -- Levi's notes on progress

  -- Detection metadata
  auto_detected BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(4,3),

  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES app_users(id),  -- NULL if Levi completed
  completed_by_levi BOOLEAN DEFAULT false,
  completion_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for Levi's task queue
CREATE INDEX idx_action_items_levi ON action_items(org_id, assigned_to_levi, status, due_date)
  WHERE assigned_to_levi = true;

-- Index for manager task views
CREATE INDEX idx_action_items_location ON action_items(location_id, status, due_date);
```

### Meeting Follow-Through Loop

Every meeting creates action items, and Levi ensures they get done:

```
Meeting ends
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  POST-MEETING PROCESSING                                            │
│                                                                     │
│  1. Levi sends summary to participants (in-app notification)       │
│  2. Action items created with source_type = 'meeting'              │
│  3. Each item tagged with source_meeting_id for traceability       │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VISIBILITY                                                         │
│                                                                     │
│  • Dashboard shows "Created by Levi from [Meeting Name]"           │
│  • Manager can see all action items from a meeting grouped         │
│  • Click meeting → see transcript + extracted items                │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  HEARTBEAT PICKS UP (every 30 min)                                  │
│                                                                     │
│  Checks action items where source_type = 'meeting':                │
│  • 24h before due → Send reminder to assignee                      │
│  • On due date → Check status, nudge if needed                     │
│  • Overdue → Escalate to meeting originator                        │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LOOP CLOSURE                                                       │
│                                                                     │
│  When completed:                                                    │
│  • Levi notifies meeting originator                                │
│  • "Sarah completed her task from Monday's sync ✓"                 │
│  • Links back to original meeting for context                      │
│                                                                     │
│  If all items from meeting complete:                               │
│  • "All action items from Monday's team sync are done!"           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Autonomy & Escalation System

### Progressive Trust Unlocks

Trust is earned through successful interactions. Managers can see and control Levi's autonomy level:

```typescript
interface TrustLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: 'Observer' | 'Assistant' | 'Contributor' | 'Partner' | 'Autonomous';

  capabilities: {
    // Level 1: Observer
    read_data: boolean;              // ✓ from start
    answer_questions: boolean;       // ✓ from start

    // Level 2: Assistant
    send_reminders_to_self: boolean; // Remind the user who asked
    draft_messages: boolean;         // Draft but don't send

    // Level 3: Contributor
    send_reminders_to_assignee: boolean;  // Remind action item owners
    update_action_item_status: boolean;   // Mark items complete
    create_action_items: boolean;         // From meetings/patterns

    // Level 4: Partner
    send_to_others: boolean;         // Notify managers, escalate
    own_action_items: boolean;       // Levi can be assigned tasks

    // Level 5: Autonomous
    auto_escalate: boolean;          // Escalate without asking
    auto_schedule: boolean;          // Schedule meetings/evaluations
    proactive_outreach: boolean;     // Reach out unprompted
  };
}

// Unlock criteria (org can customize thresholds)
interface TrustUnlockCriteria {
  level: number;
  requirements: {
    successful_interactions: number;  // e.g., 50 for level 2
    positive_feedback_rate: number;   // e.g., 80% for level 3
    days_active: number;              // e.g., 14 days for level 2
    manager_approval: boolean;        // Required for levels 4+
    no_major_errors_days: number;     // e.g., 7 days without issues
  };
}

const DEFAULT_UNLOCK_CRITERIA: TrustUnlockCriteria[] = [
  { level: 2, requirements: { successful_interactions: 25, positive_feedback_rate: 0.7, days_active: 7, manager_approval: false, no_major_errors_days: 3 }},
  { level: 3, requirements: { successful_interactions: 100, positive_feedback_rate: 0.8, days_active: 14, manager_approval: false, no_major_errors_days: 7 }},
  { level: 4, requirements: { successful_interactions: 250, positive_feedback_rate: 0.85, days_active: 30, manager_approval: true, no_major_errors_days: 14 }},
  { level: 5, requirements: { successful_interactions: 500, positive_feedback_rate: 0.9, days_active: 60, manager_approval: true, no_major_errors_days: 30 }},
];
```

### Trust Level UI (Settings Page)

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEVI TRUST LEVEL                                          Settings │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Current Level: ██████████░░░░░░░░░░ Level 3 - Contributor         │
│                                                                     │
│  ✓ Read data and answer questions                                  │
│  ✓ Send reminders to you                                           │
│  ✓ Send reminders to action item owners                            │
│  ✓ Update action item status                                       │
│  ✓ Create action items from meetings                               │
│  ○ Notify managers and escalate (Level 4)                          │
│  ○ Own action items (Level 4)                                      │
│  ○ Autonomous operations (Level 5)                                 │
│                                                                     │
│  Progress to Level 4:                                              │
│  ├─ Interactions: 187/250                                          │
│  ├─ Feedback score: 88% (need 85%)  ✓                             │
│  ├─ Days active: 22/30                                             │
│  └─ Manager approval: Required  [Request Unlock]                   │
│                                                                     │
│  [View Levi's Activity Log]  [Adjust Trust Settings]               │
└─────────────────────────────────────────────────────────────────────┘
```

### Role-Based Autonomy Configuration

```sql
-- Autonomy settings per role
CREATE TABLE levi_autonomy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,  -- Maps to permission hierarchy

  -- Action autonomy levels: 'auto', 'ask', 'disabled'
  send_action_item_reminders TEXT DEFAULT 'auto',
  send_due_date_warnings TEXT DEFAULT 'auto',
  update_action_item_status TEXT DEFAULT 'ask',
  escalate_overdue_items TEXT DEFAULT 'ask',
  schedule_evaluations TEXT DEFAULT 'disabled',
  send_performance_alerts TEXT DEFAULT 'ask',

  -- Notification channels
  allowed_channels TEXT[] DEFAULT ARRAY['in_app'],
  urgent_channel TEXT DEFAULT 'in_app',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, role_name)
);
```

### Escalation Engine

```typescript
interface EscalationRule {
  trigger: 'action_item_overdue' | 'pattern_detected' | 'threshold_exceeded' | 'no_response';
  condition: {
    days_overdue?: number;
    reminder_count?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  actions: {
    notify_assignee: boolean;
    notify_manager: boolean;
    escalate_to_director: boolean;
    create_insight: boolean;
  };
  message_template: string;
}

// Example escalation flow
const escalationRules: EscalationRule[] = [
  {
    trigger: 'action_item_overdue',
    condition: { days_overdue: 1, reminder_count: 0 },
    actions: { notify_assignee: true, notify_manager: false, escalate_to_director: false, create_insight: false },
    message_template: "Hey {name}, your action item '{title}' was due yesterday. Need any help?"
  },
  {
    trigger: 'action_item_overdue',
    condition: { days_overdue: 3, reminder_count: 2 },
    actions: { notify_assignee: true, notify_manager: true, escalate_to_director: false, create_insight: true },
    message_template: "{name} has an action item '{title}' that's been overdue for 3 days. May need follow-up."
  },
  {
    trigger: 'action_item_overdue',
    condition: { days_overdue: 7, reminder_count: 3 },
    actions: { notify_assignee: false, notify_manager: true, escalate_to_director: true, create_insight: true },
    message_template: "ESCALATION: Action item '{title}' assigned to {name} has been overdue for a week despite reminders."
  }
];
```

### Proactive Pattern Detection

Beyond checking action items, Levi actively looks for patterns that humans might miss:

| Pattern | Detection Logic | Levi's Action |
|---------|-----------------|---------------|
| **Employee Decline** | 3+ consecutive rating drops | "Maria's ratings have dropped 3 weeks in a row (4.2 → 3.8 → 3.4). Want me to flag for 1:1?" |
| **Meeting Inflation** | Same action items appear in multiple meetings | "This is the 3rd meeting where 'inventory count' was discussed. Should I create a recurring task?" |
| **Quiet Quitting Signals** | Reduced engagement + no infractions + no ratings logged | "John hasn't had any ratings logged in 2 weeks. Everything okay?" |
| **Positive Momentum** | Streak of early completions + rating improvements | "Sarah has completed 5 action items early this month and ratings are up 15%. Recognition opportunity?" |
| **Training Gap** | Multiple similar infractions across employees | "3 employees have had 'improper food storage' infractions this month. Training refresher needed?" |
| **Scheduling Conflict** | Evaluations due during peak periods | "5 evaluations are due next week, which overlaps with the holiday rush. Want to reschedule?" |
| **Burnout Risk** | High action item load + declining completion rate | "Alex has 12 open action items and completion rate dropped from 90% to 60%. Overloaded?" |

### Pattern Detection Engine

```typescript
interface PatternRule {
  id: string;
  name: string;
  description: string;

  // Detection
  trigger: 'heartbeat' | 'real_time' | 'daily_batch';
  query: string;  // SQL or function reference
  threshold: Record<string, number>;

  // Action
  severity: 'info' | 'warning' | 'alert';
  suggested_action: string;
  auto_create_action_item: boolean;
  notify_roles: string[];  // Which roles see this pattern
}

const PATTERN_RULES: PatternRule[] = [
  {
    id: 'employee_decline',
    name: 'Employee Performance Decline',
    description: 'Detects consecutive rating drops',
    trigger: 'heartbeat',
    query: `
      SELECT employee_id, array_agg(rating ORDER BY created_at DESC) as recent_ratings
      FROM ratings
      WHERE created_at > now() - interval '21 days'
      GROUP BY employee_id
      HAVING count(*) >= 3
    `,
    threshold: { consecutive_drops: 3, min_drop_percent: 10 },
    severity: 'warning',
    suggested_action: 'Schedule 1:1 check-in',
    auto_create_action_item: false,  // Requires trust level 4+
    notify_roles: ['manager', 'director']
  },
  {
    id: 'recurring_meeting_topic',
    name: 'Recurring Meeting Topic',
    description: 'Same action items appearing across meetings',
    trigger: 'real_time',  // Detected during meeting processing
    query: 'semantic_similarity_search',
    threshold: { similar_items: 3, time_window_days: 14 },
    severity: 'info',
    suggested_action: 'Convert to recurring task or address root cause',
    auto_create_action_item: false,
    notify_roles: ['manager']
  },
  {
    id: 'positive_momentum',
    name: 'Positive Employee Momentum',
    description: 'Streak of good performance',
    trigger: 'daily_batch',
    query: `
      SELECT employee_id
      FROM action_items
      WHERE completed_at < due_date
        AND created_at > now() - interval '30 days'
      GROUP BY employee_id
      HAVING count(*) >= 5
    `,
    threshold: { early_completions: 5, rating_improvement_percent: 10 },
    severity: 'info',
    suggested_action: 'Send recognition or nominate for reward',
    auto_create_action_item: true,  // Auto-create "send recognition" task for Levi
    notify_roles: ['manager']
  }
];
```

### Proactive Recommendation Engine

Beyond following rules, Levi surfaces insights with context and reasoning:

```typescript
interface ProactiveRecommendation {
  id: string;
  type: 'escalation' | 'intervention' | 'recognition' | 'scheduling' | 'training' | 'pattern';
  priority: 'suggestion' | 'recommendation' | 'urgent';

  context: {
    employee_id?: string;
    pattern_id?: string;
    supporting_data: Record<string, any>;
    confidence: number;  // 0-1
  };

  recommended_action: string;
  reasoning: string;  // Human-readable explanation

  // What happens if accepted
  on_accept: {
    create_action_item?: Partial<ActionItem>;
    send_notification?: NotificationConfig;
    schedule_meeting?: MeetingConfig;
  };

  // Tracking
  surfaced_at: Date;
  surfaced_to: string[];  // User IDs
  response: 'accepted' | 'dismissed' | 'snoozed' | 'pending';
  response_at?: Date;
}
```

**Example recommendations Levi surfaces:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  💡 LEVI'S RECOMMENDATION                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Maria's ratings dropped 20% this month                            │
│                                                                     │
│  Pattern detected: 3 consecutive weeks of declining ratings        │
│  (4.2 → 3.8 → 3.4) combined with 2 overdue action items.          │
│                                                                     │
│  Suggested: Schedule a 1:1 check-in to understand what's going on. │
│                                                                     │
│  [Schedule 1:1]  [Assign to Me]  [Dismiss]  [Snooze 1 Week]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌟 POSITIVE PATTERN                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  John is on a roll!                                                │
│                                                                     │
│  • Completed last 5 action items ahead of schedule                 │
│  • Ratings up 15% this month                                       │
│  • No infractions in 60 days                                       │
│                                                                     │
│  This might be a good time for recognition.                        │
│                                                                     │
│  [Draft Recognition]  [Nominate for Award]  [Dismiss]             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Meeting Participation System

### Meeting Modes

Levi operates in two distinct modes during meetings:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Listen** | Silent observer, extracts insights post-meeting | Sensitive 1:1s, performance reviews, external calls |
| **Participate** | Active participant, asks clarifying questions, confirms action items in real-time | Team syncs, shift handoffs, training sessions |

### Continuous Processing Architecture

**Key principle:** Levi is always "thinking" during a meeting - not waiting for wake words. The system continuously processes transcript chunks and decides when to intervene based on context.

```
Audio Stream (Expo/Dashboard)
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME TRANSCRIPTION                          │
│                       (AssemblyAI Streaming)                        │
│                                                                     │
│  • WebSocket connection: Client → Agent → AssemblyAI               │
│  • ~250ms latency for partial results                              │
│  • Speaker diarization                                              │
│  • ~$0.50/hour (vs $0.37 async)                                    │
└─────────────────────────────────────────────────────────────────────┘
       │
       │  Transcript chunks every 2-5 seconds
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MEETING PROCESSOR (Always Running)               │
│                                                                     │
│  Lightweight NLP (regex + pattern matching):                        │
│  ├── Entity extraction → Match against employee roster             │
│  ├── Action item detection → "needs to", "should", "will do"       │
│  ├── Topic tracking → Keywords, context shifts                     │
│  ├── Ambiguity detection → Unclear owner, vague deadline           │
│  ├── Memory triggers → "Remember that...", preferences             │
│  └── Direct address → "Levi", "Hey Levi" (immediate response)      │
│                                                                     │
│  Builds internal state:                                             │
│  • pending_clarifications: Question[]                              │
│  • detected_action_items: ActionItem[]                             │
│  • mentioned_employees: Employee[]                                  │
│  • topic_history: Topic[]                                          │
└─────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERVENTION DECISION ENGINE                     │
│                                                                     │
│  IF mode == LISTEN:                                                 │
│    → Queue everything for post-meeting summary                     │
│    → Only respond if directly addressed by name                    │
│                                                                     │
│  IF mode == PARTICIPATE:                                            │
│    → Check intervention criteria:                                  │
│      ├── Natural pause detected? (2-3 sec silence via VAD)        │
│      ├── Topic transition? (conversation moving on)                │
│      ├── High-stakes ambiguity? (action item without owner/date)  │
│      ├── Data conflict? (contradicts existing records)            │
│      └── Priority threshold met?                                   │
│    → If criteria met: Generate and deliver response                │
│    → If not: Continue observing                                    │
└─────────────────────────────────────────────────────────────────────┘
       │
       ├─── Intervention warranted ──────────────────────────────────┐
       │                                                              ▼
       │                          ┌───────────────────────────────────────┐
       │                          │  RESPONSE GENERATOR (Claude)          │
       │                          │                                       │
       │                          │  Only invoked when needed:            │
       │                          │  1. Build context from meeting state  │
       │                          │  2. Query tools if data needed        │
       │                          │  3. Generate natural response         │
       │                          │  4. Deliver via text/voice            │
       │                          │                                       │
       │                          │  Example outputs:                     │
       │                          │  • "Quick clarification - is that    │
       │                          │     the walk-in inventory count?      │
       │                          │     Should I set deadline for Friday?"│
       │                          │  • "Actually, Maria completed that   │
       │                          │     last Tuesday according to the log"│
       │                          └───────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POST-MEETING PROCESSING                          │
│                                                                     │
│  • Full transcript stored                                          │
│  • AI-generated summary (Claude)                                   │
│  • Action items created/updated in DB                              │
│  • Memory updates (org terminology, preferences)                   │
│  • Q&A log preserved                                               │
│  • Handoff to heartbeat for follow-up                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Intervention Examples

**Participate Mode - Clarifying Questions:**
```
[Manager]: "So John needs to handle the inventory thing by... sometime soon"
[2 sec pause - VAD detects silence]
[Levi]: "Quick clarification - is that the walk-in inventory count?
         And should I set the deadline for end of week?"
[Manager]: "Yeah Friday works"
[Levi]: "Got it. Action item created: John - walk-in inventory count, due Friday."
```

**Participate Mode - Data Conflict:**
```
[Manager]: "We need to follow up with Sarah about her training"
[Levi]: "Just a note - Sarah completed her food safety certification
         last Wednesday. Did you mean a different training?"
```

**Listen Mode - Direct Address Only:**
```
[Manager]: "Sarah's been struggling lately"
[Levi stays silent - sensitive topic, listen mode]
[Manager]: "Levi, what were Sarah's ratings last month?"
[Levi]: "Sarah averaged 3.2 last month, down from 3.8 the month before.
         The drop started around the 15th."
```

### Smart Silence Detection

Not all pauses are intervention opportunities. The system uses Voice Activity Detection (VAD) with context:

| Pause Type | Detection | Action |
|------------|-----------|--------|
| Thinking pause | Short (1-2s), mid-sentence | Don't interrupt |
| Emotional moment | Tone analysis, sensitive keywords | Never interrupt |
| Topic concluded | Natural sentence end + silence | Safe to clarify |
| Waiting for response | Question asked, silence follows | Don't compete |

### Meeting Configuration

```typescript
interface MeetingConfig {
  mode: 'listen' | 'participate';

  // Participate mode settings
  intervention_threshold: 'conservative' | 'moderate' | 'proactive';
  confirm_action_items: boolean;      // "Did I get that right?"
  ask_clarifying_questions: boolean;
  provide_relevant_data: boolean;     // Proactively share context

  // What Levi tracks regardless of mode
  extract_action_items: boolean;
  detect_employee_mentions: boolean;
  flag_data_conflicts: boolean;
  update_memory: boolean;
}

// Preset configurations
const MEETING_PRESETS = {
  team_sync: {
    mode: 'participate',
    intervention_threshold: 'moderate',
    confirm_action_items: true,
    ask_clarifying_questions: true,
    provide_relevant_data: true
  },
  one_on_one: {
    mode: 'listen',
    // Only responds when directly addressed
  },
  training: {
    mode: 'participate',
    intervention_threshold: 'proactive',
    // More active in answering questions
  },
  external_call: {
    mode: 'listen',
    // Silent observer, extracts insights post-call
  },
  shift_handoff: {
    mode: 'participate',
    intervention_threshold: 'proactive',
    confirm_action_items: true,
    // Ensures nothing falls through the cracks
  }
};
```

### Meeting Session State

```typescript
interface MeetingSession {
  id: string;
  meeting_id: string;
  org_id: string;
  location_id: string;
  config: MeetingConfig;
  participants: MeetingParticipant[];

  // Real-time state
  status: 'preparing' | 'active' | 'paused' | 'ended';
  transcript_buffer: TranscriptSegment[];

  // Levi's internal state (continuously updated)
  state: {
    mentioned_employees: Array<{ id: string; name: string; context: string }>;
    detected_action_items: Array<{
      description: string;
      assignee?: string;
      due_date?: string;
      confidence: number;
      needs_clarification: boolean;
    }>;
    pending_clarifications: Array<{
      topic: string;
      question: string;
      priority: 'low' | 'medium' | 'high';
      asked: boolean;
    }>;
    topic_history: Array<{ topic: string; timestamp: number }>;
    data_conflicts: Array<{
      claim: string;
      actual: string;
      source: string;
    }>;
  };

  // Intervention tracking
  interventions: Array<{
    timestamp: number;
    type: 'clarification' | 'confirmation' | 'data_share' | 'conflict';
    content: string;
    response?: string;
  }>;
}
```

### Evolution Path

**Phase 1: Text Interface**
- Chat sidebar visible during recording
- Type questions, Levi responds in text
- Action items displayed in real-time

**Phase 2: Proactive Text**
- Levi asks clarifying questions via text
- Confirmations appear in sidebar
- User can approve/modify before speaking

**Phase 3: Voice Output**
- Text-to-speech for Levi responses (ElevenLabs)
- Natural interjections in conversation
- Configurable voice persona

**Phase 4: Voice Input**
- Direct voice-to-Levi without typing
- "Hey Levi" for immediate attention
- Full conversational meeting participant

---

## 6. Levi's Presence & Cross-Channel Continuity

### Levi's View Dashboard Widget

Levi should feel "present" even when not actively chatting. A persistent dashboard widget shows Levi's current state:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 LEVI'S FOCUS TODAY                                    [Expand] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📋 Action Items                                                   │
│  ├─ 3 need attention today                                        │
│  ├─ 2 overdue (following up)                                      │
│  └─ 5 completed yesterday                                         │
│                                                                     │
│  👀 Watching                                                       │
│  ├─ Sarah's ratings (monitoring for 2 weeks)                      │
│  └─ Monday's meeting follow-ups                                   │
│                                                                     │
│  💡 1 recommendation ready                                         │
│                                                                     │
│  💬 "Good morning! 3 things need your attention today."           │
│                                                                     │
│  [Open Chat]  [View Tasks]  [See Recommendations]                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Widget States

The widget adapts to Levi's current state:

| State | Appearance | Message |
|-------|------------|---------|
| **All Clear** | Green accent | "Everything's on track! No urgent items." |
| **Attention Needed** | Yellow accent | "3 items need your attention today." |
| **Urgent** | Red accent | "2 overdue items require immediate action." |
| **Learning** | Blue accent | "I noticed something - got a recommendation for you." |
| **In Meeting** | Purple accent | "Currently in team sync - extracting action items." |

### Expanded Widget View

When expanded, shows more detail:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖 LEVI'S DASHBOARD                                       [Close] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TODAY'S FOCUS                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ⚠️  Follow up with Alex about ServSafe (overdue)           │   │
│  │  📅  Maria's evaluation due tomorrow                        │   │
│  │  📋  3 action items from Monday's sync need review         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  LEVI'S ACTIVE TASKS                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  🔄 Monitoring Sarah's ratings (day 5 of 14)                │   │
│  │  🔄 Tracking John's training completion                     │   │
│  │  ✅ Sent reminder to Alex (2 hours ago)                     │   │
│  │  ✅ Updated meeting summary (yesterday)                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  RECOMMENDATIONS                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  💡 Maria's ratings down 3 weeks in a row - schedule 1:1?  │   │
│  │     [Schedule]  [Dismiss]  [Snooze]                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Open Full Chat]  [View All Tasks]  [Levi Settings]              │
└─────────────────────────────────────────────────────────────────────┘
```

### Cross-Channel Conversation Continuity

Levi maintains context across all channels - chat, meetings, email, SMS. A conversation started in one channel continues seamlessly in another:

```
┌─────────────────────────────────────────────────────────────────────┐
│  CHANNEL CONTINUITY EXAMPLE                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [MEETING - Monday 2pm]                                            │
│  Manager: "Sarah needs to complete her ServSafe by Friday"         │
│  Levi: "Got it. Action item created."                             │
│                                                                     │
│  [CHAT - Wednesday 10am]                                           │
│  Manager: "Hey Levi, what did we say about Sarah?"                │
│  Levi: "In Monday's team sync, you assigned Sarah to complete      │
│         ServSafe by Friday. She hasn't started yet - want me      │
│         to send a reminder?"                                       │
│  Manager: "Yes please"                                             │
│  Levi: "Sent! I'll follow up if she doesn't complete by Thursday."│
│                                                                     │
│  [SMS - Thursday 4pm]                                              │
│  Levi → Manager: "Heads up: Sarah's ServSafe is due tomorrow      │
│         and still not started. Want me to escalate?"              │
│                                                                     │
│  [CHAT - Friday 9am]                                               │
│  Levi: "Good news! Sarah completed her ServSafe this morning.     │
│         The action item from Monday's sync is done. ✓"            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Context Handoff Architecture

```typescript
interface ConversationContext {
  // Core identity
  user_id: string;
  org_id: string;

  // Active threads (what Levi is tracking for this user)
  active_threads: Thread[];

  // Recent context (last 24h of relevant interactions)
  recent_context: {
    meetings: MeetingSummary[];
    action_items_mentioned: ActionItem[];
    employees_discussed: Employee[];
    topics: string[];
  };

  // Channel history (for "what did we say about X?")
  channel_history: {
    channel: 'chat' | 'meeting' | 'email' | 'sms';
    timestamp: Date;
    summary: string;
    full_context_id: string;  // Link to full conversation
  }[];
}

// When user says "what did we say about Sarah?"
// Levi searches across ALL channels for Sarah mentions
const findContext = async (query: string, user: User): Promise<ContextMatch[]> => {
  return await Promise.all([
    searchMeetingTranscripts(query, user),
    searchChatHistory(query, user),
    searchEmailThreads(query, user),
    searchActionItems(query, user)
  ]).then(results => rankByRelevance(results.flat()));
};
```

### Channel-Specific Behavior

| Channel | Levi's Tone | Length | Proactive? |
|---------|-------------|--------|------------|
| **Chat** | Conversational, helpful | Full responses | Yes - surfaces recommendations |
| **Meeting** | Brief, non-disruptive | Short interjections | Only when needed |
| **Email** | Professional, structured | Detailed with context | Daily/weekly digests only |
| **SMS** | Urgent, actionable | Very short | Only urgent items |
| **Push** | Alert-style | Title + short body | Reminders, completions |

---

## 7. Bilingual Intelligence

### Beyond Translation

Levi doesn't just translate - it understands cultural context and communication norms for English and Spanish speakers:

```typescript
interface LanguageProfile {
  primary_language: 'en' | 'es';
  detected_from: 'explicit' | 'first_interaction' | 'user_settings';

  // Communication style
  formality: 'formal' | 'informal' | 'adaptive';
  honorifics: boolean;  // Use "usted" vs "tú" in Spanish

  // Code-switching
  code_switching_enabled: boolean;  // Handle Spanglish naturally
  common_switches: string[];  // Words user mixes between languages
}
```

### Language Detection Flow

```
User sends first message
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LANGUAGE DETECTION                                                 │
│                                                                     │
│  1. Check user settings (if set)                                   │
│  2. Detect language of message                                     │
│  3. Check for code-switching patterns                              │
│  4. Store preference for future interactions                       │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  RESPONSE GENERATION                                                │
│                                                                     │
│  • Respond in detected language                                    │
│  • Match formality level                                           │
│  • Use culturally appropriate phrasing                             │
│  • Handle code-switching naturally if detected                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Code-Switching Support

Many Spanish-English speakers naturally mix languages. Levi handles this gracefully:

```
User: "Oye Levi, what's the deal con Sarah's training? She was supposed to finish last week pero todavía nothing."

Levi: "Sí, I see Sarah's ServSafe training is overdue by 5 days. She started the online portion pero hasn't completed the final assessment. Want me to send her a reminder, or do you want to talk to her directly?"
```

### Culturally Appropriate Communication

| Aspect | English | Spanish |
|--------|---------|---------|
| **Greeting** | "Hi! How can I help?" | "¡Hola! ¿En qué te puedo ayudar?" |
| **Urgency** | "This needs attention ASAP" | "Esto requiere atención urgente" |
| **Positive** | "Great job!" | "¡Excelente trabajo!" |
| **Formal request** | "Could you please..." | "¿Podría usted..." (formal) / "¿Podrías..." (informal) |
| **Reminder tone** | Direct but friendly | Slightly softer, relationship-aware |

### Escalation to Human

For sensitive conversations, Levi knows when to suggest human intervention:

```typescript
const shouldEscalateToHuman = (context: ConversationContext): boolean => {
  // Sensitive topics that may need human touch
  if (context.topic_sensitivity > 0.8) return true;

  // Complex emotional situations
  if (context.detected_emotion === 'distressed') return true;

  // Legal/HR matters
  if (context.topic_type === 'complaint' || context.topic_type === 'harassment') return true;

  // User explicitly asks
  if (context.requested_human) return true;

  return false;
};

// Levi's response when escalating:
// EN: "This sounds like something that might be better to discuss with your manager directly. Would you like me to help schedule a private conversation?"
// ES: "Esto suena como algo que sería mejor discutir directamente con tu gerente. ¿Te gustaría que te ayude a programar una conversación privada?"
```

---

## 8. Technology Stack

### LLM Strategy

**Tiered Routing via OpenRouter + Direct Anthropic**

OpenRouter provides a unified API for multiple LLM providers with automatic fallback and cost optimization. Direct Anthropic API is reserved for latency-critical paths only.

#### Model Selection (February 2026)

Based on SWE-bench and Berkeley Function Calling Leaderboard (BFCL) benchmarks:

| Model | SWE-bench Score | BFCL Tool Calling | Avg Cost/Task | Avg Runtime |
|-------|----------------|-------------------|---------------|-------------|
| Claude Opus 4.6 | 63.84 | 63.3 | $1.44 | 366s |
| GPT-5.2-Codex | 61.12 | — | $1.75 | 770s |
| Claude Opus 4.5 | 60.58 | — | $2.19 | 371s |
| **MiniMax M2.5** | **52.72** | **76.8** | **$0.11** | 509s |
| GPT-5.2 | 52.60 | — | $1.08 | 596s |
| Claude Sonnet 4.5 | 50.22 | — | $1.42 | 536s |
| Kimi-K2.5 | 49.18 | — | $0.76 | 686s |

**Key insight:** MiniMax M2.5 scores above Claude Sonnet 4.5 and GPT-5.2 at ~1/10th the cost, and leads all models on the Berkeley Function Calling Leaderboard (76.8). It is open-weight (self-hostable) and purpose-built for agentic tool-use workflows.

#### Tiered Architecture

| Tier | Model | Input $/1M | Output $/1M | % of Requests | Use Case |
|------|-------|-----------|-------------|---------------|----------|
| **Primary** | MiniMax M2.5 (OpenRouter) | $0.30 | $1.20 | ~85% | User chat, tool calls, action item extraction, heartbeat checks, meeting NLP, summaries |
| **Escalation** | Claude Sonnet 4.5 (OpenRouter) | $3.00 | $15.00 | ~10-12% | Complex multi-step tool chains, sensitive conversations, when M2.5 fails or returns low confidence |
| **Critical** | Claude Opus 4.6 (direct Anthropic) | $5.00 | $25.00 | ~3-5% | Real-time meeting interventions requiring highest accuracy + lowest latency |
| **Batch/Large Context** | Gemini 2.5 Flash (OpenRouter) | $0.30 | $2.50 | As needed | Batch analytics, learning engine, document RAG over large docs (1M context window) |

**Escalation triggers** (auto-promote from Primary to Escalation tier):
- Tool chain fails after 2 attempts on M2.5
- Conversation flagged as sensitive (HR, complaints, legal)
- User explicitly requests higher quality ("think harder about this")
- Task requires >3 sequential tool calls with dependencies

**Models explicitly excluded:**
- **DeepSeek V3/R1** — Cheapest available but tool calling is unreliable/unstable in production. No official function calling template. Unsuitable for agentic systems despite strong reasoning scores.
- **Kimi-K2.5** — Outperformed by MiniMax M2.5 on both score (52.72 vs 49.18) and cost ($0.11 vs $0.76).

#### Routing Logic

```typescript
// apps/agent/src/lib/llm-router.ts
type TaskType =
  | 'meeting_intervention'    // Real-time, latency + accuracy critical
  | 'user_chat'               // Interactive, needs quality tool use
  | 'tool_orchestration'      // Complex multi-step reasoning
  | 'meeting_processor'       // Continuous NLP, high volume
  | 'heartbeat_check'         // Background, cost sensitive
  | 'summary_generation'      // Quality matters, not latency
  | 'action_item_extraction'  // Structured output
  | 'simple_query'            // FAQ-style questions
  | 'batch_analytics';        // Large-scale data processing

const routeToModel = (task: TaskType, escalated: boolean = false) => {
  // Critical tier — direct Anthropic for lowest latency
  if (task === 'meeting_intervention') {
    return { provider: 'anthropic', model: 'claude-opus-4-6' };
  }

  // Escalation tier — Claude Sonnet for complex/sensitive tasks
  if (escalated || task === 'tool_orchestration') {
    return {
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4.5',
      fallback: ['openai/gpt-5.2', 'google/gemini-2.5-pro']
    };
  }

  // Batch tier — Gemini Flash for large-context tasks
  if (task === 'batch_analytics') {
    return {
      provider: 'openrouter',
      model: 'google/gemini-2.5-flash',
      fallback: ['minimax/minimax-m2.5']
    };
  }

  // Primary tier — MiniMax M2.5 for everything else (85%+ of requests)
  return {
    provider: 'openrouter',
    model: 'minimax/minimax-m2.5',
    fallback: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5']
  };
};
```

#### Response Style Controls

Since customers are billed on token usage, controlling output verbosity is critical for both UX and cost:

```typescript
// Per-task-type response constraints
const RESPONSE_LIMITS: Record<TaskType, { max_tokens: number; style: string }> = {
  user_chat:              { max_tokens: 500,  style: 'concise' },
  simple_query:           { max_tokens: 300,  style: 'concise' },
  meeting_intervention:   { max_tokens: 100,  style: 'brief' },
  action_item_extraction: { max_tokens: 1000, style: 'structured' },
  summary_generation:     { max_tokens: 800,  style: 'structured' },
  heartbeat_check:        { max_tokens: 200,  style: 'internal' },
  meeting_processor:      { max_tokens: 200,  style: 'internal' },
  tool_orchestration:     { max_tokens: 1000, style: 'concise' },
  batch_analytics:        { max_tokens: 2000, style: 'structured' },
};

// System prompt verbosity instructions (injected per request)
const STYLE_INSTRUCTIONS = {
  concise: 'Be concise. Prefer 1-3 sentence responses. Use bullet points for lists. Never repeat the question back.',
  brief: 'Be extremely brief. One sentence max. No preamble.',
  structured: 'Use structured output. Bullet points, headers where appropriate. No filler text.',
  internal: 'Internal processing only. Return structured data, not prose.',
};
```

#### Self-Hosting Path (Future Option)

MiniMax M2.5 is open-weight and can be self-hosted. At current OpenRouter pricing ($0.30/$1.20 per 1M tokens), self-hosting only makes economic sense at high volume:

| Scenario | OpenRouter Cost | Self-Hosted (est.) | When to Switch |
|----------|----------------|--------------------|--------------------|
| 1-5 orgs (low volume) | $5-50/mo | $720-2,160/mo (GPU) | Never — OpenRouter is cheaper |
| 10-25 orgs (moderate) | $50-250/mo | $720-2,160/mo (GPU) | Break-even around 15-20 active orgs |
| 50+ orgs (high volume) | $250-1,250/mo | $720-2,160/mo (GPU) | Self-host saves 50%+ |

**Recommendation:** Start with OpenRouter. Evaluate self-hosting when monthly LLM spend exceeds ~$500/mo consistently.

#### Why OpenRouter

- **Single API** — One integration for MiniMax, Claude, Gemini, GPT, and 100+ models
- **Automatic fallback** — If MiniMax is down, routes to Gemini Flash or Haiku automatically
- **Cost tracking** — Built-in per-model usage monitoring (essential for customer billing)
- **No vendor lock-in** — Switch primary model without code changes (just update router config)
- **OpenRouter supports MiniMax M2.5** — Model ID: `minimax/minimax-m2.5`

#### Cost Estimates (per org, 500 queries/day)

| Scenario | Monthly LLM Cost |
|----------|------------------|
| All Claude Sonnet 4.5 | $45-150 |
| All Claude Opus 4.6 | $150-500 |
| **MiniMax M2.5 primary + Claude escalation** | **$5-20** |
| **Savings vs all-Sonnet** | **85-90%** |

Additional cost optimization levers:
- **Prompt caching** (Anthropic: 90% off cached reads, Google: 75% off) — system prompt + tool definitions are consistent per session
- **Batch API** (Anthropic/OpenAI: 50% off) — for heartbeat and learning engine tasks
- **`max_tokens` caps** — prevents runaway responses from inflating bills

#### Usage Tracking & Billing

Every LLM call is logged for billing purposes:

```sql
CREATE TABLE levi_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  model TEXT NOT NULL,           -- 'minimax/minimax-m2.5', 'anthropic/claude-sonnet-4.5', etc.
  tier TEXT NOT NULL,            -- 'primary', 'escalation', 'critical', 'batch'
  task_type TEXT NOT NULL,       -- Maps to TaskType enum
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10,6),       -- Calculated from model pricing
  latency_ms INTEGER,
  escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_log_org_date ON levi_usage_log(org_id, created_at);
CREATE INDEX idx_usage_log_billing ON levi_usage_log(org_id, created_at, cost_usd);
```

Per-org rate limiting:

```typescript
interface OrgRateLimits {
  queries_per_minute: number;    // Default: 30
  queries_per_day: number;       // Default: 1000
  tokens_per_day: number;        // Default: 500,000
  escalation_per_day: number;    // Default: 50 (limit expensive Claude calls)
}
```

**Environment Variables:**
```
ANTHROPIC_API_KEY=sk-ant-...     # Direct for critical path (Opus)
OPENROUTER_API_KEY=sk-or-...     # Routed for primary + escalation + batch tiers
```

### Hybrid RAG

| Data Type | System | Why |
|-----------|--------|-----|
| Structured (employees, ratings, discipline) | **pgvector** | SQL joins, RLS, real-time, free |
| Documents (transcripts, SOPs, policies) | **PageIndex** | Reasoning-based, handles cross-refs, 98.7% accuracy |

### Streaming Architecture

All chat responses are streamed via Server-Sent Events (SSE) to provide real-time token-by-token output:

```
Client (Mobile/Dashboard)
       │
       │  POST /api/ai/chat
       │  Accept: text/event-stream
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT (Fly.io)                                    │
│                                                                     │
│  1. Validate auth, load user context                               │
│  2. Route to appropriate model (MiniMax M2.5 / Claude / Gemini)    │
│  3. Stream response via SSE:                                       │
│                                                                     │
│     data: {"type":"token","content":"Hi"}                          │
│     data: {"type":"token","content":" there"}                      │
│     data: {"type":"tool_call","name":"employee_lookup",...}         │
│     data: {"type":"tool_result","content":"..."}                   │
│     data: {"type":"token","content":"Sarah's rating is..."}        │
│     data: {"type":"done","usage":{"input":234,"output":89}}        │
│                                                                     │
│  4. On stream complete: persist messages, log usage                │
└─────────────────────────────────────────────────────────────────────┘
```

**SSE Event Types:**

| Event | Purpose |
|-------|---------|
| `token` | Streamed text content (display immediately) |
| `tool_call` | Levi is calling a tool (show "Looking up..." indicator) |
| `tool_result` | Tool returned data (can show inline or hide) |
| `done` | Stream complete, includes token usage for billing |
| `error` | Error occurred, includes message |
| `escalated` | Request was escalated to a higher-tier model |

**Why SSE over WebSocket for chat:**
- Simpler — unidirectional (server → client), no connection management
- Works through Vercel proxy without special config
- HTTP/2 multiplexing eliminates the need for persistent connections
- WebSocket reserved for meeting streaming (bidirectional audio required)

### Conversation History Management

To control costs and stay within context windows, conversations use a sliding window with summarization:

```typescript
interface ConversationWindowConfig {
  max_messages: number;          // Keep last N messages in full (default: 20)
  max_tokens: number;            // Total token budget for history (default: 8000)
  summarize_after: number;       // Summarize messages older than N turns (default: 10)
  summary_model: string;         // Use cheap model for summarization (Gemini 2.5 Flash)
}

// On each new message:
// 1. If history exceeds max_messages or max_tokens:
//    a. Take oldest messages beyond the window
//    b. Summarize them into a single "conversation so far" message
//    c. Replace them with the summary
// 2. Inject: system prompt + summary + recent messages + new message
// 3. Send to LLM
```

This ensures:
- Conversations can run indefinitely without hitting context limits
- Older context is preserved in compressed form
- Cost stays bounded regardless of conversation length
- Summarization uses Gemini 2.5 Flash ($0.30/$2.50) — cheapest option with good quality

### Communication Services

| Channel | Provider | Use Case |
|---------|----------|----------|
| In-app | Supabase Realtime | Chat, push notifications, dashboard alerts |
| Email | SendGrid/Resend | Reminders, digests, reports |
| SMS | Twilio | Urgent escalations, time-sensitive |
| Voice | ElevenLabs (future) | Meeting participation |

---

## 9. Database Schema

### Core Tables

```sql
-- Levi configuration per org
CREATE TABLE levi_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Identity
  persona_name TEXT DEFAULT 'Levi',
  persona_prompt TEXT,

  -- Features
  enabled BOOLEAN DEFAULT true,
  heartbeat_enabled BOOLEAN DEFAULT false,
  heartbeat_interval_minutes INTEGER DEFAULT 30,
  meeting_participation_enabled BOOLEAN DEFAULT false,

  -- Data access
  excluded_data_types TEXT[] DEFAULT '{}',
  pageindex_enabled BOOLEAN DEFAULT true,

  -- Memory settings
  memory_enabled BOOLEAN DEFAULT true,
  memory_retention_days INTEGER DEFAULT 365,
  learning_enabled BOOLEAN DEFAULT true,

  -- Channel settings
  email_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id)
);

-- Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  session_type TEXT DEFAULT 'chat', -- 'chat', 'meeting', 'heartbeat'
  title TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages with tool call support
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_call_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Heartbeat execution log
CREATE TABLE levi_heartbeat_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  checks_performed JSONB,
  actions_taken JSONB,
  errors TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pending approvals (for 'ask' autonomy level)
CREATE TABLE levi_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_user_id UUID REFERENCES app_users(id),
  action_data JSONB NOT NULL,
  reasoning TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES app_users(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'expired'))
);

-- Outbound messages (email, SMS queue)
CREATE TABLE levi_outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  recipient_user_id UUID REFERENCES app_users(id),
  recipient_address TEXT,
  subject TEXT,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log
CREATE TABLE levi_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID,
  session_id UUID,
  action_type TEXT NOT NULL,
  action_data JSONB,
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Meeting Tables

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  title TEXT,
  meeting_date TIMESTAMPTZ,
  duration_seconds INTEGER,
  audio_url TEXT,
  transcription_status TEXT DEFAULT 'pending',
  transcription_id TEXT,
  pageindex_indexed BOOLEAN DEFAULT false,
  levi_participated BOOLEAN DEFAULT false,
  levi_session_id UUID REFERENCES ai_conversations(id),
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL,
  utterances JSONB,
  summary TEXT,
  key_points JSONB,
  language TEXT DEFAULT 'en',
  confidence NUMERIC(4,3),
  mentioned_employees JSONB,
  detected_action_items JSONB,
  levi_qa_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id)
);
```

### Action Items

```sql
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID REFERENCES app_users(id),
  created_by UUID REFERENCES app_users(id),
  source_type TEXT CHECK (source_type IN ('manual', 'meeting', 'ai_suggestion', 'heartbeat')),
  source_id UUID,

  -- Linked objects
  linked_employee_id UUID REFERENCES employees(id),
  linked_infraction_id UUID REFERENCES infractions(id),
  linked_rating_id UUID REFERENCES ratings(id),
  linked_evaluation_id UUID REFERENCES evaluations(id),
  linked_action_id UUID REFERENCES disciplinary_actions(id),

  -- Levi tracking
  levi_reminder_count INTEGER DEFAULT 0,
  levi_last_reminder_at TIMESTAMPTZ,
  levi_escalated BOOLEAN DEFAULT false,
  levi_escalated_at TIMESTAMPTZ,

  auto_detected BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(4,3),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Feature-Level Tools

```typescript
// lib/ai/tools/index.ts
export const LEVI_TOOLS = {
  // Data Access Tools
  employee: employeeTool,      // Search, details, history, stats
  ratings: ratingsTool,        // Rating data, trends, comparisons
  discipline: disciplineTool,  // Infractions, actions, recommendations
  evaluation: evaluationTool,  // Evaluations, certification status
  analytics: analyticsTool,    // Cross-object analytics, reports

  // Document Tools (PageIndex)
  document: documentTool,      // Operational docs, SOPs
  meeting: meetingTool,        // Transcripts, summaries

  // Workflow Tools
  workflow: workflowTool,      // Guide users through processes
  prefill: prefillTool,        // Pre-fill form data

  // Action Tools (Autonomy-controlled)
  reminder: reminderTool,      // Send reminders
  notification: notifyTool,    // Send notifications
  actionItem: actionItemTool,  // Create/update action items
  escalate: escalateTool,      // Escalate issues

  // Settings Tools
  settings: settingsTool,      // Org/location configuration
  memory: memoryTool,          // Query/update org memory
};
```

---

## 11. Phased Implementation

### Phase 1: Infrastructure & Monorepo — COMPLETE
- [x] Initialize pnpm workspaces + Turborepo
- [x] Move current code to `apps/dashboard`
- [x] Extract `packages/shared`, `packages/permissions`, `packages/supabase-client`, `packages/design-tokens`
- [x] Create `apps/agent` skeleton with Hono
- [x] Deploy agent to Fly.io
- [x] Verify Vercel still deploys dashboard
- [ ] Set up Vercel rewrites to proxy `/api/ai/*` to agent

**Deliverables:** Monorepo structure with dashboard + agent deployed independently

### Phase 2: Agentic Foundation — IN PROGRESS
- [x] Agent skeleton with Hono, auth middleware, health check
- [x] Mobile chat UI (built ahead of schedule — see Phase 8)
- [ ] Database migrations for core tables (`levi_config`, `ai_conversations`, `ai_messages`, `levi_usage_log`)
- [ ] LLM client abstraction with tiered routing (MiniMax M2.5 primary, Claude escalation)
- [ ] OpenRouter integration with automatic fallback
- [ ] Streaming responses via SSE (Server-Sent Events) to both mobile and dashboard
- [ ] Basic tools: employee, ratings, discipline, evaluation
- [ ] Chat UI on dashboard (AI page + FAB modal)
- [ ] Conversation persistence and history management
- [ ] Context window management (sliding window + summarization for long conversations)
- [ ] Per-org usage tracking and rate limiting
- [ ] Bilingual support (EN/ES) via system prompt + language detection
- [ ] Response verbosity controls (`max_tokens` per task type, concise system prompts)

**Deliverables:** Functional chat assistant with structured data tools, streaming, and usage tracking

### Phase 3: Document Intelligence
- [ ] PageIndex integration
- [ ] Document and meeting tools
- [ ] Hybrid retrieval (pgvector for structured, PageIndex for documents)
- [ ] Operational overview document indexing

**Deliverables:** AI can intelligently search documents and transcripts

### Phase 4: Meeting System - Listen Mode
- [ ] Audio recording component (Expo + Dashboard)
- [ ] AssemblyAI real-time streaming integration
- [ ] WebSocket: Client → Agent → AssemblyAI pipeline
- [ ] Meeting processor (continuous transcript processing)
- [ ] Entity extraction (employee name matching)
- [ ] Action item detection (pattern-based)
- [ ] Post-meeting summary generation
- [ ] Meeting transcripts stored with action items
- [ ] Listen mode: Silent observation + direct address response

**Deliverables:** Levi participates in meetings (Listen mode)

### Phase 5: Meeting System - Participate Mode
- [ ] Voice Activity Detection (VAD) for pause detection
- [ ] Intervention decision engine
- [ ] Clarifying question generation
- [ ] Action item confirmation flow
- [ ] Data conflict detection
- [ ] Meeting presets (team_sync, one_on_one, training, etc.)
- [ ] Real-time action item creation/updates
- [ ] Text sidebar UI for interventions

**Deliverables:** Levi actively participates in meetings with intelligent interventions

### Phase 6: Memory & Learning
- [ ] Memory tables (levi_org_memory, levi_user_memory, levi_feedback)
- [ ] Feedback collection UI (thumbs up/down, corrections)
- [ ] Learning engine (batch processing via Gemini 2.5 Flash)
- [ ] Memory injection in queries
- [ ] Preference adaptation
- [ ] Org terminology learning

**Deliverables:** Levi remembers and improves over time

### Phase 7: Autonomy & Proactive Operations
- [ ] Autonomy config tables
- [ ] Action tools (reminder, notify, escalate)
- [ ] Pending approvals workflow
- [ ] Channel router (in-app, email, SMS)
- [ ] Heartbeat daemon (pg_cron or Inngest scheduled)
- [ ] Escalation engine
- [ ] Proactive recommendation engine

**Deliverables:** Levi operates autonomously with configurable trust levels

### Phase 8: Mobile — PARTIALLY COMPLETE
- [x] Mobile app with Expo Router + NativeTabs (`apps/mobile/`)
- [x] Mobile auth flow with Supabase
- [x] Mobile chat interface (full Claude-style UI with 6 components)
- [x] Animated drawer navigation (Chat/Tasks/Meetings/Alerts)
- [x] Settings modal (language toggle, notifications, clear history)
- [x] LeviChatContext (state management, API integration)
- [ ] Connect to working backend (currently shows fallback message)
- [ ] Mobile meeting recording
- [ ] TTS integration (ElevenLabs) for voice responses
- [ ] Voice output during meetings
- [ ] Dashboard widgets for insights
- [ ] Tasks, Meetings, Alerts screens (currently stubs)

**Deliverables:** Full mobile app + voice interaction

### Phase 9: Polish & Advanced Features
- [ ] Voice input processing
- [ ] Advanced intervention tuning per org/manager
- [ ] Analytics dashboard for Levi usage and billing
- [ ] Self-hosting evaluation for MiniMax M2.5 (if volume justifies)
- [ ] Performance optimization
- [ ] Documentation

---

## 12. File Structure

### Agent Service (apps/agent/src/)

```
apps/agent/src/
├── index.ts                     # Hono server setup, CORS, routing
├── middleware/
│   └── auth.ts                  # JWT verification, role checks
├── routes/
│   ├── health.ts                # GET /health
│   └── ai/
│       └── chat.ts              # POST /api/ai/chat
├── lib/
│   ├── llm-router.ts            # Task → model routing (MiniMax/Claude/Gemini)
│   ├── llm-clients/
│   │   ├── anthropic.ts         # Direct Anthropic client (critical path)
│   │   ├── openrouter.ts        # OpenRouter client (primary + escalation + batch)
│   │   └── types.ts             # Shared LLM types
│   ├── streaming.ts             # SSE streaming response handler
│   ├── context-builder.ts       # Permission-aware context assembly
│   ├── prompts.ts               # System prompts (EN/ES, verbosity controls)
│   ├── usage-tracker.ts         # Per-org token usage logging and rate limiting
│   └── conversation-manager.ts  # History management, sliding window, summarization
├── tools/
│   ├── index.ts                 # Tool registry
│   ├── data/                    # Structured data tools (employee, ratings, discipline, evaluation)
│   ├── document/                # Document tools (PageIndex)
│   ├── workflow/                # Workflow tools (form prefill, guided processes)
│   └── action/                  # Autonomy tools (reminder, notify, escalate)
├── memory/
│   ├── store.ts                 # Memory CRUD
│   └── learning.ts              # Adaptive learning (batch via Gemini 2.5 Flash)
├── heartbeat/
│   ├── daemon.ts                # Heartbeat execution
│   ├── checks/                  # Individual check implementations
│   └── actions/                 # Autonomous action handlers
├── channels/
│   ├── router.ts                # Channel routing logic
│   ├── email.ts                 # SendGrid/Resend
│   ├── sms.ts                   # Twilio
│   └── push.ts                  # Supabase Realtime
├── meeting/
│   ├── processor.ts             # Continuous transcript processing
│   ├── intervention.ts          # Decide when to speak
│   └── vad.ts                   # Voice activity detection
├── pageindex/
│   └── client.ts                # PageIndex API wrapper
└── embeddings.ts                # pgvector operations
```

### Dashboard AI Integration (apps/dashboard/)

```
apps/dashboard/
├── lib/ai/
│   └── ARCHITECTURE.md          # This document
├── components/
│   └── ai/                      # (planned) Chat UI, FAB modal, dashboard widgets
└── pages/
    └── api/                     # Dashboard API routes proxy to agent, not AI logic here
```

---

## 13. Cost Estimates

### Per Organization (500 queries/day)

**Baseline (all Claude Sonnet 4.5):**
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Claude Sonnet 4.5 (all queries) | ~15M tokens | $45-150 |
| PageIndex | ~300 queries | $10-30 |
| OpenAI Embeddings | ~2M tokens | $0.04 |
| AssemblyAI | ~20 hours | $7.40 |
| SendGrid | ~1000 emails | $15 |
| Twilio SMS | ~100 messages | $8 |
| **Total/org** | | **$85-210** |

**With MiniMax M2.5 Primary + Claude Escalation:**
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| MiniMax M2.5 (85% of queries, OpenRouter) | ~12M tokens | $4-15 |
| Claude Sonnet 4.5 (10-12% escalation, OpenRouter) | ~2M tokens | $6-20 |
| Claude Opus 4.6 (3-5% critical, direct Anthropic) | ~0.5M tokens | $3-10 |
| Gemini 2.5 Flash (batch, as needed) | ~1M tokens | $0.30-2 |
| PageIndex | ~300 queries | $10-30 |
| OpenAI Embeddings | ~2M tokens | $0.04 |
| AssemblyAI | ~20 hours | $7.40 |
| SendGrid | ~1000 emails | $15 |
| Twilio SMS | ~100 messages | $8 |
| **Total/org** | | **$54-108** |

### Cost Savings Summary

| Scenario | LLM Cost | Total Cost | Savings |
|----------|----------|------------|---------|
| All Claude Sonnet 4.5 | $45-150 | $85-210 | — |
| All Claude Opus 4.6 | $150-500 | $190-560 | — |
| **MiniMax M2.5 primary + Claude escalation** | **$13-47** | **$54-108** | **85-90% LLM savings** |

### Token-Based Customer Billing

Since customers are billed on token usage, the `levi_usage_log` table (see Section 8) tracks every LLM call with cost. This enables:
- Per-org monthly billing based on actual consumption
- Tier breakdown reports (how much was primary vs escalation vs critical)
- Usage alerts when approaching plan limits
- Cost transparency — customers can see exactly what they're paying for

---

## 14. Security & Compliance

### Org Sandbox Isolation

- All data access filtered by `org_id`
- Tools cannot access cross-org data
- Memory stores are per-org
- Heartbeat runs in org context

### Autonomy Guardrails

- All autonomous actions logged
- Sensitive actions require approval
- Rate limits on outbound messages
- Escalation rules are configurable, not hardcoded

---

## 15. Repository & Hosting Architecture

### Context

The Levi agent requires capabilities beyond Vercel's limits:
- Long-running operations (meeting transcription, LLM orchestration)
- WebSocket connections for real-time chat and meeting streaming
- Heartbeat daemon (30-minute intervals)
- Independence from dashboard deploys
- Low-latency for real-time meeting participation

### Monorepo Structure (pnpm + Turborepo)

```
levelset-nextjs/
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # pnpm workspace definition
├── turbo.json                   # Turborepo pipeline config
├── .github/workflows/           # CI/CD per service
│
├── apps/
│   ├── dashboard/               # Next.js 14 Pages Router → Vercel
│   │   ├── package.json
│   │   ├── vercel.json
│   │   ├── pages/
│   │   ├── components/
│   │   └── lib/ai/
│   │       └── ARCHITECTURE.md  # This document
│   │
│   └── agent/                   # Levi Agent → Fly.io (Hono.js, TS strict)
│       ├── package.json
│       ├── Dockerfile
│       ├── fly.toml
│       └── src/
│           ├── index.ts         # Hono server, CORS, routing
│           ├── middleware/
│           │   └── auth.ts      # JWT verification, role checks
│           ├── routes/
│           │   ├── health.ts    # GET /health
│           │   └── ai/
│           │       └── chat.ts  # POST /api/ai/chat (currently 501)
│           ├── lib/             # (planned) LLM router, tools, etc.
│           ├── meeting/         # (planned) transcript processing
│           └── heartbeat/       # (planned) autonomous daemon
│
├── apps/mobile/             # Expo 54 / React Native — SEPARATE npm workspace
│   ├── package.json             # Uses npm (NOT pnpm)
│   ├── app.json
│   ├── eas.json
│   ├── app/                     # Expo Router (NativeTabs)
│   │   └── (tabs)/(levi)/      # Levi chat tab with animated drawer
│   └── src/
│       ├── components/levi/     # Chat UI components (6 files, complete)
│       ├── screens/levi/        # Task/Meeting/Alert stubs
│       └── context/             # LeviChatContext, LeviMenuContext
│
├── packages/
│   ├── design-tokens/           # CSS vars (web) + raw values (native)
│   ├── shared/                  # Generated Supabase types
│   │   └── src/
│   │       ├── types/           # Supabase types (auto-generated)
│   │       ├── constants/
│   │       └── utils/
│   │
│   ├── supabase-client/         # Supabase client factory for agent
│   │   └── src/
│   │       ├── browser.ts
│   │       └── server.ts
│   │
│   └── permissions/             # Shared permission constants (@levelset/permissions)
│       └── src/
│           ├── constants.ts
│           └── index.ts
│
├── supabase/
│   └── migrations/              # SQL migrations (YYYYMMDD_description.sql)
│
└── docs/                        # Mintlify documentation (docs.levelset.io)
```

> **Note:** `apps/mobile/` is at the repo root as a separate npm workspace. It is NOT part of the pnpm workspace and uses `npm` for package management. Do not run `pnpm` commands inside it.

### Service Hosting

| Service | Host | Why |
|---------|------|-----|
| **Dashboard** | Vercel | Already deployed, Next.js optimized, preview deploys |
| **Levi Agent** | Fly.io | Global edge, WebSocket support, long-running, low latency for real-time |
| **Background Jobs** | Inngest | Serverless jobs, retries, monitoring |
| **Mobile App** | EAS Build | Expo native builds, OTA updates |
| **Database** | Supabase | Already in use, pg_cron available |

### Why Fly.io for Agent

- **Global edge network** - Lower latency for real-time meeting participation
- **WebSocket support** - Native, no proxy issues
- **Long-running processes** - No execution time limits
- **`min_machines_running`** - Keep warm to avoid cold starts during meetings
- **Familiar** - Team has Fly experience

### API Gateway Pattern

Dashboard proxies AI requests to agent service via Vercel rewrites:

```json
// apps/dashboard/vercel.json
{
  "rewrites": [
    {
      "source": "/api/ai/:path*",
      "destination": "https://agent.levelset.io/api/:path*"
    },
    {
      "source": "/ws/:path*",
      "destination": "https://agent.levelset.io/ws/:path*"
    }
  ]
}
```

Mobile connects directly to agent for WebSocket (lower latency):
```
wss://agent.levelset.io/ws/meeting/{session_id}
```

### Real-Time Meeting Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Expo/Dashboard)                     │
│                                                                     │
│  Audio capture → WebSocket stream to Agent                         │
│  Receives: transcript updates, Levi responses, action items        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (audio chunks)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT (Fly.io)                              │
│                                                                     │
│  WebSocket Handler                                                  │
│       │                                                             │
│       ├──→ Pipe audio to AssemblyAI Real-time API                  │
│       │         │                                                   │
│       │         ▼                                                   │
│       │    Transcript chunks (every ~250ms)                        │
│       │         │                                                   │
│       │         ▼                                                   │
│       │    Meeting Processor (continuous)                          │
│       │         │                                                   │
│       │         ├──→ Lightweight NLP (entity, action item detect)  │
│       │         ├──→ Intervention Decision Engine                  │
│       │         └──→ If warranted: Claude for response             │
│       │                                                             │
│       └──→ Send updates back to client via WebSocket               │
│            • Live transcript                                        │
│            • Detected action items                                  │
│            • Levi's responses/questions                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Code Sharing

| Package | Dashboard | Mobile | Agent |
|---------|-----------|--------|-------|
| `@levelset/shared` | ✓ | ✗* | ✓ |
| `@levelset/supabase-client` | ✗ | ✗ | ✓ |
| `@levelset/permissions` | ✓ | ✗* | ✓ |
| `@levelset/design-tokens` | ✓ | ✗* | ✗ |

> *Mobile is a separate npm workspace and does not consume pnpm workspace packages directly. Shared code for mobile should go in `packages/` and be published or linked separately.

### Heartbeat Daemon

Fly.io doesn't have native cron, so we use pg_cron to trigger:

```sql
-- Supabase pg_cron job
SELECT cron.schedule(
  'levi-heartbeat',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    'https://agent.levelset.io/api/heartbeat/trigger',
    '{}',
    headers := '{"Authorization": "Bearer ${HEARTBEAT_SECRET}"}'
  )
  $$
);
```

Alternative: Inngest scheduled function:
```typescript
// Inngest function that runs every 30 minutes
export const heartbeat = inngest.createFunction(
  { id: 'levi-heartbeat' },
  { cron: '*/30 * * * *' },
  async ({ step }) => {
    // Process all orgs with heartbeat enabled
  }
);
```

### Long-Running Operations (Inngest)

For async meeting processing (when not real-time) and batch jobs:

```
User uploads pre-recorded audio
     ↓
Dashboard calls POST /api/ai/meetings/transcribe
     ↓
Agent emits event to Inngest: "meeting/uploaded"
     ↓
Returns immediately: { jobId, status: "processing" }
     ↓
Inngest job runs (submits to AssemblyAI async, polls, processes)
     ↓
On completion: Agent updates DB, sends WebSocket notification
     ↓
User sees "Transcript ready!" in real-time
```

### Environment & Secrets

| Secret | Dashboard | Agent | Mobile |
|--------|-----------|-------|--------|
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ (`EXPO_PUBLIC_`) |
| `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✗ | ✓ (`EXPO_PUBLIC_`) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✓ | ✓ | ✗ |
| `ANTHROPIC_API_KEY` | ✗ | ✓ | ✗ |
| `OPENROUTER_API_KEY` | ✗ | ✓ | ✗ |
| `ASSEMBLYAI_API_KEY` | ✗ | ✓ | ✗ |
| `INNGEST_EVENT_KEY` | ✓ | ✓ | ✗ |
| `AGENT_SERVICE_SECRET` | ✓ | ✓ | ✗ |
| `HEARTBEAT_SECRET` | ✗ | ✓ | ✗ |
| `EXPO_PUBLIC_AGENT_URL` | ✗ | ✗ | ✓ |

**LLM Keys:**
- `ANTHROPIC_API_KEY` — Direct Anthropic access for critical path only (Claude Opus 4.6 for meeting interventions)
- `OPENROUTER_API_KEY` — Routes to MiniMax M2.5 (primary), Claude Sonnet 4.5 (escalation), Gemini 2.5 Flash (batch) with automatic fallback

### Fly.io Configuration

```toml
# apps/agent/fly.toml
app = "levelset-agent"
primary_region = "ord"  # Chicago - central US

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false    # Keep running for WebSocket
  auto_start_machines = true
  min_machines_running = 1      # Avoid cold starts during meetings
  processes = ["app"]

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

[checks]
  [checks.health]
    port = 8080
    type = "http"
    interval = "15s"
    timeout = "5s"
    path = "/health"
```

### CI/CD Pipelines

**Dashboard (Vercel - automatic)**
- Push to `main` → production deploy
- PR → preview deployment

**Agent Service (Fly.io)**
```yaml
# .github/workflows/agent.yml
name: Deploy Agent
on:
  push:
    branches: [main]
    paths:
      - 'apps/agent/**'
      - 'packages/shared/**'
      - 'packages/ai-tools/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: apps/agent
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Mobile (EAS Build)**
```yaml
# Manual — run `eas build` from apps/mobile/
# Mobile is a separate npm workspace, not part of the pnpm monorepo CI
```

### Local Development

```bash
# Monorepo commands (from repo root, uses pnpm)
pnpm dev                    # All apps in parallel
pnpm dev:dashboard          # Dashboard only (localhost:3000)
pnpm dev:agent              # Agent only
pnpm build                  # Build all (turbo-cached)
pnpm typecheck              # Type-check all
pnpm db:gen-types           # Regenerate Supabase TS types

# Agent-specific
pnpm --filter agent dev     # Run agent with hot reload
pnpm --filter agent tunnel  # Expose local agent via ngrok (for mobile testing)

# Mobile (from apps/mobile/ — uses npm, NOT pnpm)
cd apps/mobile
npm start                   # Expo dev server
npm run ios                 # iOS simulator
```

### Implementation Status

See **Section 11: Phased Implementation** for detailed checklist and the **Implementation Progress** table at the top of this document for current status.

**Completed:**
1. Monorepo setup, agent deployed to Fly.io
2. Mobile chat UI (built ahead of schedule)

**Next up:**
3. Core chat pipeline (LLM integration, tools, streaming, persistence)
4. Document intelligence (PageIndex + hybrid RAG)
5. Meeting system (Listen → Participate modes)
6. Memory, learning, autonomy
7. Voice, polish, self-hosting evaluation

### Infrastructure Costs

| Service | Monthly Cost | Notes |
|---------|--------------|-------|
| Vercel Pro | $20 | Dashboard hosting |
| Fly.io (1 shared CPU, always-on) | $5-15 | Agent service |
| Inngest | $0-25 | Background jobs |
| Supabase Pro | $25 | Database + auth |
| EAS Build | $0-99 | Mobile builds |
| AssemblyAI Real-time (~20 hrs/mo) | $10 | Meeting transcription |
| OpenRouter | Pass-through | LLM costs billed per token (see Section 13) |
| **Total infrastructure** | **$60-194** |
| **+ LLM costs per org** | **$5-20/org/mo** | With MiniMax M2.5 primary tier |

---

## Sources

**Architecture & Patterns:**
- [OpenClaw Architecture](https://github.com/openclaw/openclaw) - Gateway, heartbeat, session isolation patterns
- [OpenClaw Guide - Milvus](https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md)
- [Writing Tools for Agents - Anthropic](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Agentic RAG - Weaviate](https://weaviate.io/blog/what-is-agentic-rag) - Tool orchestration patterns

**LLM Models & Routing:**
- [MiniMax M2.5 on OpenRouter](https://openrouter.ai/minimax/minimax-m2.5) - Primary model, open-weight, BFCL leader
- [MiniMax M2.5 Announcement](https://www.minimax.io/news/minimax-m25) - Benchmarks, architecture details
- [Berkeley Function Calling Leaderboard (BFCL)](https://gorilla.cs.berkeley.edu/leaderboard.html) - Tool calling benchmarks
- [OpenRouter API](https://openrouter.ai/docs) - Multi-model routing with automatic fallback
- [Anthropic Claude API](https://docs.anthropic.com) - Direct API for critical-path Claude Opus/Sonnet
- [Google Gemini API](https://ai.google.dev/gemini-api/docs) - Gemini 2.5 Flash for batch/large context

**RAG & Document Intelligence:**
- [PageIndex RAG](https://pageindex.ai/blog/pageindex-intro) - Reasoning-based document retrieval

**Infrastructure:**
- [Fly.io Documentation](https://fly.io/docs) - Agent service hosting
- [Inngest Documentation](https://www.inngest.com/docs) - Background job orchestration
- [AssemblyAI Real-time API](https://www.assemblyai.com/docs/speech-to-text/streaming) - Real-time transcription streaming
- [ElevenLabs API](https://elevenlabs.io/docs) - Text-to-speech for voice responses
