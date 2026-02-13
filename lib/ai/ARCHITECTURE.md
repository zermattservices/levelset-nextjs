# Levi - Levelset AI Architecture

> An autonomous AI team member modeled after the [OpenClaw](https://github.com/openclaw/openclaw) agent architecture, sandboxed per organization.

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

**Tiered Routing via OpenRouter**

OpenRouter provides a unified API for multiple LLM providers with automatic fallback and cost optimization.

| Tier | Models | Use Case | Latency Priority |
|------|--------|----------|------------------|
| **Critical** | Claude 3.5 Sonnet (direct Anthropic) | Real-time meeting interventions, complex tool orchestration | Lowest latency required |
| **Standard** | Claude 3.5 Sonnet (via OpenRouter) | User chat, tool calls, summaries | Normal |
| **Fast** | Claude 3.5 Haiku, Gemini Flash | Meeting processor NLP, simple queries | Fast response |
| **Batch** | Llama 3.1 70B, Mistral Large | Heartbeat checks, batch analytics, learning engine | Cost optimized |

**Routing Logic:**

```typescript
// lib/ai/llm-router.ts
type TaskType =
  | 'meeting_intervention'    // Real-time, latency critical
  | 'user_chat'               // Interactive, needs quality
  | 'tool_orchestration'      // Complex reasoning
  | 'meeting_processor'       // Continuous NLP, high volume
  | 'heartbeat_check'         // Batch, cost sensitive
  | 'summary_generation'      // Quality matters, not latency
  | 'action_item_extraction'  // Structured output
  | 'simple_query';           // FAQ-style questions

const routeToModel = (task: TaskType) => {
  switch (task) {
    // Direct Anthropic - bypass OpenRouter for lowest latency
    case 'meeting_intervention':
      return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' };

    // OpenRouter - quality + fallback
    case 'user_chat':
    case 'tool_orchestration':
    case 'summary_generation':
      return {
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        fallback: ['openai/gpt-4o', 'google/gemini-pro-1.5']
      };

    // OpenRouter - fast + cheap
    case 'meeting_processor':
    case 'action_item_extraction':
    case 'simple_query':
      return {
        provider: 'openrouter',
        model: 'anthropic/claude-3-haiku',
        fallback: ['google/gemini-flash-1.5', 'meta-llama/llama-3.1-8b-instruct']
      };

    // OpenRouter - batch + cheapest
    case 'heartbeat_check':
      return {
        provider: 'openrouter',
        model: 'meta-llama/llama-3.1-70b-instruct',
        fallback: ['mistralai/mistral-large']
      };
  }
};
```

**Why OpenRouter:**
- **Single API** - One integration for 100+ models
- **Automatic fallback** - If Claude is down, routes to GPT-4 or Gemini
- **Cost tracking** - Built-in usage monitoring across all models
- **No vendor lock-in** - Switch models without code changes

**Cost Impact (estimated per org, 500 queries/day):**

| Scenario | Monthly LLM Cost |
|----------|------------------|
| All Claude Sonnet (direct) | $45-150 |
| Tiered routing (OpenRouter) | $15-50 |
| **Savings** | **60-70%** |

**Environment Variables:**
```
ANTHROPIC_API_KEY=sk-ant-...     # Direct for critical path
OPENROUTER_API_KEY=sk-or-...     # Routed for everything else
```

### Hybrid RAG

| Data Type | System | Why |
|-----------|--------|-----|
| Structured (employees, ratings, discipline) | **pgvector** | SQL joins, RLS, real-time, free |
| Documents (transcripts, SOPs, policies) | **PageIndex** | Reasoning-based, handles cross-refs, 98.7% accuracy |

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

### Phase 1: Infrastructure & Monorepo (Weeks 1-2)
- Initialize pnpm workspaces + Turborepo
- Move current code to `apps/dashboard`
- Extract `packages/shared`, `packages/permissions`, `packages/supabase-client`
- Create `apps/agent` skeleton with Hono
- Deploy agent to Fly.io
- Verify Vercel still deploys dashboard
- Set up Vercel rewrites to proxy `/api/ai/*` to agent

**Deliverables:** Monorepo structure with dashboard + agent deployed independently

### Phase 2: Agentic Foundation (Weeks 3-5)
- Database migrations for core tables (levi_config, ai_conversations, ai_messages)
- Levi Gateway API on agent
- Session manager (user chat sessions)
- LLM client abstraction (Claude)
- Basic tools: employee, ratings, discipline, evaluation
- Chat UI: AI page + FAB modal on dashboard
- WebSocket connection for real-time chat
- Conversation persistence
- Bilingual support (EN/ES)

**Deliverables:** Functional chat assistant with structured data tools

### Phase 3: Document Intelligence (Weeks 6-7)
- PageIndex integration
- Document and meeting tools
- Hybrid retrieval (pgvector for structured, PageIndex for documents)
- Operational overview document indexing

**Deliverables:** AI can intelligently search documents and transcripts

### Phase 4: Meeting System - Listen Mode (Weeks 8-10)
- Audio recording component (Expo + Dashboard)
- AssemblyAI real-time streaming integration
- WebSocket: Client → Agent → AssemblyAI pipeline
- Meeting processor (continuous transcript processing)
- Entity extraction (employee name matching)
- Action item detection (pattern-based)
- Post-meeting summary generation
- Meeting transcripts stored with action items
- Listen mode: Silent observation + direct address response

**Deliverables:** Levi participates in meetings (Listen mode)

### Phase 5: Meeting System - Participate Mode (Weeks 11-13)
- Voice Activity Detection (VAD) for pause detection
- Intervention decision engine
- Clarifying question generation
- Action item confirmation flow
- Data conflict detection
- Meeting presets (team_sync, one_on_one, training, etc.)
- Real-time action item creation/updates
- Text sidebar UI for interventions

**Deliverables:** Levi actively participates in meetings with intelligent interventions

### Phase 6: Memory & Learning (Weeks 14-15)
- Memory tables (levi_org_memory, levi_user_memory, levi_feedback)
- Feedback collection UI (thumbs up/down, corrections)
- Learning engine (batch processing)
- Memory injection in queries
- Preference adaptation
- Org terminology learning

**Deliverables:** Levi remembers and improves over time

### Phase 7: Autonomy & Proactive Operations (Weeks 16-18)
- Autonomy config tables
- Action tools (reminder, notify, escalate)
- Pending approvals workflow
- Channel router (in-app, email, SMS)
- Heartbeat daemon (pg_cron or Inngest scheduled)
- Escalation engine
- Proactive recommendation engine

**Deliverables:** Levi operates autonomously with configurable trust levels

### Phase 8: Voice & Mobile (Weeks 19-22)
- Create `apps/mobile` with Expo
- Mobile auth flow with Supabase
- Mobile chat interface
- Mobile meeting recording
- TTS integration (ElevenLabs) for voice responses
- Voice output during meetings
- Dashboard widgets for insights

**Deliverables:** Full mobile app + voice interaction

### Phase 9: Polish & Advanced Features (Weeks 23+)
- Voice input processing
- Advanced intervention tuning per org/manager
- Analytics dashboard for Levi usage
- Performance optimization
- Documentation

---

## 12. File Structure

```
lib/ai/
├── ARCHITECTURE.md           # This document
├── gateway.ts                # Central control plane
├── session-manager.ts        # Session lifecycle
├── llm/
│   ├── router.ts             # Task → model routing logic
│   ├── anthropic.ts          # Direct Anthropic client (critical path)
│   ├── openrouter.ts         # OpenRouter client (routed queries)
│   └── types.ts              # Shared types
├── agent.ts                  # ReAct orchestration
├── context-builder.ts        # Permission-aware context
├── prompts.ts                # System prompts
├── memory/
│   ├── store.ts              # Memory CRUD
│   └── learning.ts           # Adaptive learning
├── heartbeat/
│   ├── daemon.ts             # Heartbeat execution
│   ├── checks/               # Individual check implementations
│   └── actions/              # Autonomous action handlers
├── channels/
│   ├── router.ts             # Channel routing logic
│   ├── email.ts              # SendGrid/Resend
│   ├── sms.ts                # Twilio
│   └── push.ts               # Supabase Realtime
├── tools/
│   ├── index.ts              # Tool registry
│   ├── data/                 # Data access tools
│   ├── document/             # Document tools
│   ├── workflow/             # Workflow tools
│   └── action/               # Autonomy tools
├── pageindex/
│   └── client.ts             # PageIndex API wrapper
└── embeddings.ts             # pgvector operations
```

---

## 13. Cost Estimates

### Per Organization (500 queries/day)

**Without OpenRouter Tiering:**
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Claude 3.5 Sonnet (all queries) | ~15M tokens | $45-150 |
| PageIndex | ~300 queries | $10-30 |
| OpenAI Embeddings | ~2M tokens | $0.04 |
| AssemblyAI | ~20 hours | $7.40 |
| SendGrid | ~1000 emails | $15 |
| Twilio SMS | ~100 messages | $8 |
| **Total/org** | | **$85-210** |

**With OpenRouter Tiered Routing:**
| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Claude Sonnet (direct, critical) | ~2M tokens | $6-20 |
| Claude Sonnet (OpenRouter, standard) | ~5M tokens | $15-50 |
| Haiku/Gemini Flash (fast tier) | ~5M tokens | $1-3 |
| Llama 3.1 70B (batch tier) | ~3M tokens | $2-5 |
| PageIndex | ~300 queries | $10-30 |
| OpenAI Embeddings | ~2M tokens | $0.04 |
| AssemblyAI | ~20 hours | $7.40 |
| SendGrid | ~1000 emails | $15 |
| Twilio SMS | ~100 messages | $8 |
| **Total/org** | | **$65-140** |

### Cost Savings Summary

| Scenario | LLM Cost | Savings |
|----------|----------|---------|
| All Claude Sonnet | $45-150 | - |
| OpenRouter tiered | $24-78 | **45-50%** |

OpenRouter also provides:
- Built-in cost tracking dashboard
- Per-model usage breakdown
- Automatic fallback (no failed requests = no retries)

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
levelset/
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # pnpm workspace definition
├── turbo.json                   # Turborepo pipeline config
├── .github/workflows/           # CI/CD per service
│
├── apps/
│   ├── dashboard/               # Next.js (current code) → Vercel
│   │   ├── package.json
│   │   ├── vercel.json
│   │   ├── pages/
│   │   └── components/
│   │
│   ├── mobile/                  # Expo React Native → EAS
│   │   ├── package.json
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── app/                 # Expo Router
│   │
│   └── agent/                   # Levi Agent → Fly.io
│       ├── package.json
│       ├── Dockerfile
│       ├── fly.toml
│       └── src/
│           ├── index.ts         # Hono server
│           ├── gateway.ts       # Levi Gateway
│           ├── websocket.ts     # Real-time chat + meeting streams
│           ├── meeting/
│           │   ├── processor.ts # Continuous transcript processing
│           │   ├── intervention.ts # Decide when to speak
│           │   └── vad.ts       # Voice activity detection
│           └── heartbeat/       # Autonomous daemon
│
├── packages/
│   ├── shared/                  # Types, constants, utils
│   │   └── src/
│   │       ├── types/           # Supabase types
│   │       ├── constants/
│   │       └── utils/
│   │
│   ├── supabase-client/         # Supabase wrapper
│   │   └── src/
│   │       ├── browser.ts
│   │       └── server.ts
│   │
│   ├── permissions/             # Permission system
│   │   └── src/
│   │       ├── constants.ts
│   │       ├── defaults.ts
│   │       └── service.ts
│   │
│   └── ai-tools/                # LLM tool definitions
│       └── src/
│           ├── employee-tool.ts
│           ├── ratings-tool.ts
│           └── index.ts
│
└── supabase/
    └── migrations/              # Single source of truth
```

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
| `@levelset/shared` | ✓ | ✓ | ✓ |
| `@levelset/supabase-client` | ✓ | ✓ | ✓ |
| `@levelset/permissions` | ✓ | ✓ | ✓ |
| `@levelset/ai-tools` | ✗ | ✗ | ✓ |

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
| `SUPABASE_URL` | ✓ | ✓ | ✓ |
| `SUPABASE_ANON_KEY` | ✓ | ✗ | ✓ |
| `SUPABASE_SERVICE_KEY` | ✓ | ✓ | ✗ |
| `ANTHROPIC_API_KEY` | ✗ | ✓ | ✗ |
| `OPENROUTER_API_KEY` | ✗ | ✓ | ✗ |
| `ASSEMBLYAI_API_KEY` | ✗ | ✓ | ✗ |
| `INNGEST_EVENT_KEY` | ✓ | ✓ | ✗ |
| `AGENT_SERVICE_SECRET` | ✓ | ✓ | ✗ |
| `HEARTBEAT_SECRET` | ✗ | ✓ | ✗ |

**LLM Keys:**
- `ANTHROPIC_API_KEY` - Direct Anthropic access for latency-critical paths (meeting interventions)
- `OPENROUTER_API_KEY` - Routed access for standard/fast/batch tiers with automatic fallback

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
# .github/workflows/mobile.yml
on:
  push:
    branches: [main]
    paths:
      - 'apps/mobile/**'
      - 'packages/shared/**'
```

### Local Development

```bash
# Development commands
pnpm dev                    # All services
pnpm dev:dashboard          # Dashboard only (localhost:3000)
pnpm dev:agent              # Agent only (localhost:3001)
pnpm dev:mobile             # Expo DevTools

# Database
pnpm db:gen-types           # Generate Supabase types
pnpm db:migrate             # Push migrations

# Agent-specific
pnpm --filter agent dev     # Run agent with hot reload
pnpm --filter agent tunnel  # Expose local agent via ngrok (for mobile testing)
```

### Migration Strategy

See **Section 8: Phased Implementation** for detailed timeline. High-level:

1. **Weeks 1-2**: Monorepo setup, agent deployed to Fly.io
2. **Weeks 3-7**: Core chat + document intelligence
3. **Weeks 8-13**: Meeting system (Listen → Participate modes)
4. **Weeks 14-18**: Memory, learning, autonomy
5. **Weeks 19+**: Mobile app, voice, polish

### Infrastructure Costs

| Service | Monthly Cost |
|---------|--------------|
| Vercel Pro | $20 |
| Fly.io (1 shared CPU, always-on) | $5-15 |
| Inngest | $0-25 |
| Supabase Pro | $25 |
| EAS Build | $0-99 |
| AssemblyAI Real-time (~20 hrs/mo) | $10 |
| **Total** | **$60-194** |

---

## Sources

- [OpenClaw Architecture](https://github.com/openclaw/openclaw) - Gateway, heartbeat, session isolation patterns
- [OpenClaw Guide - Milvus](https://milvus.io/blog/openclaw-formerly-clawdbot-moltbot-explained-a-complete-guide-to-the-autonomous-ai-agent.md)
- [PageIndex RAG](https://pageindex.ai/blog/pageindex-intro) - Reasoning-based document retrieval
- [Agentic RAG - Weaviate](https://weaviate.io/blog/what-is-agentic-rag) - Tool orchestration patterns
- [Writing Tools for Agents - Anthropic](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [OpenRouter API](https://openrouter.ai/docs) - Multi-model routing with automatic fallback
- [Inngest Documentation](https://www.inngest.com/docs) - Background job orchestration
- [Fly.io Documentation](https://fly.io/docs) - Agent service hosting
- [AssemblyAI Real-time API](https://www.assemblyai.com/docs/speech-to-text/streaming) - Real-time transcription streaming
- [ElevenLabs API](https://elevenlabs.io/docs) - Text-to-speech for voice responses
