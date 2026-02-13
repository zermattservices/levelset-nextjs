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

### Org Memory Store

Unlike OpenClaw's local markdown files, Levi stores memory in Supabase, scoped per org:

```sql
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
  memory_type TEXT NOT NULL,  -- 'preference', 'pattern', 'feedback'
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, memory_type, key)
);

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

## 3. Autonomy & Escalation System

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

### Proactive Recommendation Engine

Beyond following rules, Levi can recommend escalations:

```typescript
interface ProactiveRecommendation {
  type: 'escalation' | 'intervention' | 'recognition' | 'scheduling';
  priority: 'suggestion' | 'recommendation' | 'urgent';
  context: {
    employee_id?: string;
    pattern_detected?: string;
    supporting_data?: any;
  };
  recommended_action: string;
  reasoning: string;  // Explain why Levi suggests this
}

// Example recommendations Levi might surface:
// "I noticed Maria's ratings dropped 20% this month and she has 2 overdue action items.
//  Recommend scheduling a 1-on-1 to check in. Should I help set that up?"

// "John completed his last 5 action items ahead of schedule and his ratings are up 15%.
//  This might be a good time for a positive recognition. Want me to draft something?"
```

---

## 4. Meeting Participation System

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

## 5. Technology Stack

### LLM Strategy

**Primary**: Claude 3.5 Sonnet
- Complex reasoning, tool orchestration, real-time chat
- 200K context for meeting transcripts

**Future Tiering**: Kimi K2.5
- Simple queries, batch analytics
- 80% cost reduction for suitable tasks

**Model Abstraction Layer**: `lib/ai/llm-client.ts`
- Swap models without changing tool code
- Route queries based on complexity

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

## 6. Database Schema

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

## 7. Feature-Level Tools

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

## 8. Phased Implementation

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

## 9. File Structure

```
lib/ai/
├── ARCHITECTURE.md           # This document
├── gateway.ts                # Central control plane
├── session-manager.ts        # Session lifecycle
├── llm-client.ts             # Model abstraction
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

## 10. Cost Estimates

### Per Organization (500 queries/day)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Claude 3.5 Sonnet | ~15M tokens | $45-150 |
| PageIndex | ~300 queries | $10-30 |
| OpenAI Embeddings | ~2M tokens | $0.04 |
| AssemblyAI | ~20 hours | $7.40 |
| SendGrid | ~1000 emails | $15 |
| Twilio SMS | ~100 messages | $8 |
| **Total/org** | | **$85-210** |

### With Kimi K2.5 Tiering

| Scenario | Cost Reduction |
|----------|----------------|
| 50% queries to Kimi | ~35% LLM savings |
| Heartbeat only to Kimi | ~20% savings |

---

## 11. Security & Compliance

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

## 12. Repository & Hosting Architecture

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
| `ASSEMBLYAI_API_KEY` | ✗ | ✓ | ✗ |
| `INNGEST_EVENT_KEY` | ✓ | ✓ | ✗ |
| `AGENT_SERVICE_SECRET` | ✓ | ✓ | ✗ |
| `HEARTBEAT_SECRET` | ✗ | ✓ | ✗ |

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
- [Kimi K2.5](https://artificialanalysis.ai/models/kimi-k2-5) - Cost optimization option
- [Inngest Documentation](https://www.inngest.com/docs) - Background job orchestration
- [Fly.io Documentation](https://fly.io/docs) - Agent service hosting
- [AssemblyAI Real-time API](https://www.assemblyai.com/docs/speech-to-text/streaming) - Real-time transcription streaming
- [ElevenLabs API](https://elevenlabs.io/docs) - Text-to-speech for voice responses
