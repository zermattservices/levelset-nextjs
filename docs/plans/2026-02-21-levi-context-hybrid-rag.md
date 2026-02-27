# Levi Context & Hybrid RAG Architecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give Levi deep understanding of Levelset's configurable business systems, data relationships, and platform architecture through comprehensive context documents and a hybrid RAG pipeline (pgvector + PageIndex).

**Architecture:** Tiered context injection — a core domain summary is always present in the system prompt (Tier 1), semantically relevant chunks are retrieved via pgvector embeddings (Tier 2), and document-level reasoning is provided by PageIndex for complex questions (Tier 3). All documents processed through `global_documents` and `documents` pipelines get both pgvector embeddings and PageIndex indexing.

**Tech Stack:** Vercel AI SDK, pgvector (Supabase), OpenAI text-embedding-3-small, PageIndex API, Hono.js agent, Supabase Postgres

---

## Critical Domain Corrections

All of Levelset's business systems are **per-org configurable**, not universal features:

| System | How It's Configured | Key Tables |
|--------|-------------------|------------|
| **Ratings** | Universal capability, but positions + criteria are per-org | `org_positions`, `position_criteria`, `rating_thresholds` (per-location) |
| **Certification** | Optional feature flag: `org_feature_toggles.enable_certified_status` | `certification_audit`, `employees.certified_status` |
| **Evaluations** | Optional feature flag: `org_feature_toggles.enable_evaluations` | `evaluations` |
| **PIP** | Optional feature flag: `org_feature_toggles.enable_pip_logic` | Linked to certification |
| **Discipline** | Per-org rubric (types + point values) | `infractions_rubric`, `disc_actions_rubric` (org-wide or per-location) |
| **Pay** | Per-org rules (availability/zone/certification toggles per role) | `org_pay_config`, `org_pay_rates` |
| **Roles** | Per-org definitions with hierarchy levels | `org_roles` (hierarchy_level, is_leader, is_trainer) |
| **Positions** | Per-org definitions with zones | `org_positions` (FOH/BOH/General, scheduling_enabled) |
| **Forms** | Per-org templates with JSON Schema | `form_templates`, `form_groups` |
| **Levi AI** | Per-org enable flag | `levi_config.enabled` |

Feature flags live in two tables: `org_feature_toggles` (behavioral toggles) and `org_features` (feature access matrix with key-value pairs).

**"PEA" is NOT a term used in Levelset.** The rating system is called "Positional Excellence" or "PE" or simply "ratings."

---

## Sprint 1: Context Documents + Database Foundation

### Task 1.1: Author `levelset-domain-model.md`

**Files:**
- Create: `global-context/levelset-domain-model.md`

**Source material to read before authoring:**
- `apps/agent/src/lib/org-context.ts` — what org config Levi already receives
- `apps/agent/src/tools/data/*.ts` — what each tool queries
- `supabase/migrations/20251218_create_pay_settings_tables.sql` — pay structure
- `supabase/migrations/*certification*` — certification system
- `supabase/migrations/*infraction*` — discipline structure
- `scripts/seed-demo-organization.ts` — org setup flow

**Content must cover (all framed as per-org configurable):**

1. **Rating System (Positional Excellence)**
   - Each org defines positions (`org_positions`) with up to 5 rating criteria (`position_criteria`)
   - Employees rated 1.0–3.0 per criterion, averaged per position
   - Rolling averages stored in `daily_position_averages` JSONB
   - Color thresholds configurable per location (`rating_thresholds`): green >= X, yellow >= Y, red < Y
   - Default thresholds: green >= 2.75, yellow >= 1.75

2. **Certification System (optional per-org)**
   - Enabled via `org_feature_toggles.enable_certified_status`
   - Lifecycle: Not Certified → Pending (all positions above green threshold) → Certified (passed evaluation) → PIP (fell below while certified)
   - Tied to evaluations (`enable_evaluations`) and PIP logic (`enable_pip_logic`)
   - `certification_audit` tracks daily status changes
   - Affects pay when `org_pay_config.has_certification_rules = true`

3. **Discipline System (per-org configurable)**
   - Each org defines infraction types + point values in `infractions_rubric`
   - Can be org-wide or location-specific (`location_id` nullable)
   - Points accumulate over 90-day rolling window
   - Escalation thresholds in `disc_actions_rubric` (e.g., 5pts = Warning, 10pts = Written)
   - `recommended_disc_actions` auto-generated at thresholds
   - Signature requirements configurable per infraction type

4. **Pay System (per-org configurable)**
   - `org_pay_config`: per role, toggles for availability rules, zone rules, certification rules
   - `org_pay_rates`: actual hourly rates for each (role, zone, availability, is_certified) combination
   - `employees.calculated_pay` auto-calculated by trigger

5. **Roles (per-org configurable)**
   - `org_roles`: role_name, hierarchy_level (0 = Operator/Owner, highest rank), is_leader, is_trainer
   - Default set: Operator, Executive, Director, Team Lead, Trainer, Team Member, New Hire
   - Orgs can customize names, hierarchy, and add roles via `custom_roles` JSONB in `org_feature_toggles`

6. **Positions (per-org configurable)**
   - `org_positions`: name, zone (FOH/BOH/General), scheduling_enabled, is_active
   - Each position has rating criteria defining the "Big 5" dimensions

7. **Forms System**
   - `form_templates` with JSON Schema definitions, per-org
   - Types: positional_excellence (rating), infraction (discipline), evaluation, custom
   - `form_connectors` for conditional logic (e.g., `no_discipline_30d`, `avg_rating_gte`)

8. **Employee Lifecycle**
   - Hire (hire_date) → Active → Rated across positions → Optionally certified → Disciplined if needed → Terminated (termination_date, termination_reason)
   - Key fields: role, is_foh, is_boh, is_leader, is_trainer, availability, certified_status, calculated_pay, last_points_total

**Step 1:** Read all source files listed above
**Step 2:** Author the document with accurate per-org framing
**Step 3:** Commit: `docs: author levelset-domain-model.md context document`

---

### Task 1.2: Author `levelset-data-relationships.md`

**Files:**
- Create: `global-context/levelset-data-relationships.md`

**Source material to read:**
- `supabase/migrations/` — all migration files for table schemas
- `apps/agent/src/tools/data/*.ts` — tool query patterns
- `packages/shared/src/types/supabase.ts` — generated types

**Content must cover:**

1. **Multi-tenant hierarchy**: `orgs` → `locations` → `employees` (all scoped by `org_id`)
2. **Employee as central hub**: connections to ratings, infractions, disc_actions, evaluations, daily_position_averages, certification_audit
3. **Rating data chain**: `ratings` → `org_positions` → `position_criteria` → `rating_thresholds` → `daily_position_averages`
4. **Discipline data chain**: `infractions` → `infraction_documents` → `disc_actions` → `recommended_disc_actions` → `infractions_rubric` + `disc_actions_rubric`
5. **Auth/permissions chain**: `auth.users` → `app_users` → `permission_profiles` → `permission_profile_access` → `permission_sub_items` → `permission_modules`
6. **Configuration chain**: `orgs` → `org_feature_toggles` + `org_features` + `org_roles` + `org_positions` + `org_pay_config` + `org_pay_rates` + `infractions_rubric` + `disc_actions_rubric`
7. **Levi's tool-to-table map**: For each of the 8 tools, document exactly which tables/joins it queries
8. **Form chain**: `form_groups` → `form_templates` → `form_submissions` → `form_connectors`
9. **Document chain**: `document_folders` → `documents` → `document_digests` → `document_versions` (+ global variants)

**Step 1:** Read source files, trace actual queries in tool executors
**Step 2:** Author with entity-relationship descriptions and tool mapping
**Step 3:** Commit: `docs: author levelset-data-relationships.md context document`

---

### Task 1.3: Author `levelset-platform-architecture.md`

**Files:**
- Create: `global-context/levelset-platform-architecture.md`

**Content must cover:**

1. **Dashboard** (Next.js Pages Router): Manager web app. Manages employees, ratings, discipline, evaluations, scheduling, documents, permissions, forms, reviews. Client-side data fetching. MUI v7 UI.
2. **Mobile App** (Expo/React Native): Leader field app. Levi AI chat, form submission (ratings, infractions), employee lookup. JWT auth via Supabase. Dark mode support.
3. **PWA Kiosks** (`/api/mobile/[token]/`): Static-token-authenticated tablet forms at physical locations. LIVE IN PRODUCTION — never modify. Unauthenticated.
4. **Agent (Levi)** (Hono.js on Fly.io): AI assistant. 8 structured data tools, SSE streaming, tool call visuals. MiniMax M2.5 primary, Claude Sonnet escalation. Org-sandboxed, max 3 tool iterations.
5. **Forms Engine**: `form_templates` (JSON Schema + UI Schema) → `form_submissions`. Supports rating, discipline, evaluation, custom types. Form connectors for conditional logic.
6. **Documents Hub**: Upload, version, extract content. Org-scoped + global. Extraction: PDF/DOCX/text/OCR/web scrape → markdown.
7. **Native vs PWA API routes**: Two parallel sets — PWA (`/api/mobile/[token]/`) is unauthenticated, Native (`/api/native/forms/`) is JWT-authenticated with permission checks.

**Step 1:** Read CLAUDE.md, ARCHITECTURE.md, route files
**Step 2:** Author with platform interconnection descriptions
**Step 3:** Commit: `docs: author levelset-platform-architecture.md context document`

---

### Task 1.4: Author `levelset-glossary.md`

**Files:**
- Create: `global-context/levelset-glossary.md`

**Content — terminology reference organized by domain:**

- **Ratings**: Positional Excellence / PE, Big 5 (5 rating criteria), Green/Yellow/Red (color thresholds), rolling average, daily position average
- **Certification** (when enabled): Not Certified, Pending, Certified, PIP (Performance Improvement Plan), audit day, evaluation
- **Discipline**: Infraction, points, 90-day rolling window, escalation ladder (Documented Warning, Written Warning, Suspension, Termination), acknowledgement, recommended action
- **Pay**: Availability (Limited/Available), zone pay (FOH/BOH differentiation), certification pay, calculated pay
- **Roles**: Operator (level 0, highest), hierarchy level, leader, trainer
- **Positions**: FOH (Front of House), BOH (Back of House), General zone, scheduling-enabled
- **Platform**: Form template, form connector, form submission, widget, setup template, mobile token
- **Org Structure**: Organization (org), location, location_number, multi-unit
- **Feature Flags**: `org_feature_toggles` (behavioral), `org_features` (access matrix)

**Step 1:** Compile from org-context.ts, seed scripts, form connectors, prompts.ts
**Step 2:** Author as alphabetical reference grouped by domain
**Step 3:** Commit: `docs: author levelset-glossary.md context document`

---

### Task 1.5: Create Database Migration

**Files:**
- Create: `supabase/migrations/20260221_add_context_rag_infrastructure.sql`

**Step 1:** Write migration SQL:

```sql
-- 1. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Context chunks table (stores embedded content from all documents)
CREATE TABLE context_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('global_document', 'org_document', 'core_context')),
  global_document_digest_id UUID REFERENCES global_document_digests(id) ON DELETE CASCADE,
  document_digest_id UUID REFERENCES document_digests(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding extensions.vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_context_chunks_embedding ON context_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_context_chunks_source ON context_chunks(source_type, org_id);
CREATE INDEX idx_context_chunks_global_digest ON context_chunks(global_document_digest_id) WHERE global_document_digest_id IS NOT NULL;
CREATE INDEX idx_context_chunks_org_digest ON context_chunks(document_digest_id) WHERE document_digest_id IS NOT NULL;

-- 3. Core context table (always-injected Tier 1 summaries)
CREATE TABLE levi_core_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  token_count INTEGER,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PageIndex tracking on global_document_digests
ALTER TABLE global_document_digests
  ADD COLUMN IF NOT EXISTS pageindex_tree_id TEXT,
  ADD COLUMN IF NOT EXISTS pageindex_indexed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pageindex_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));

-- 5. PageIndex tracking on document_digests
ALTER TABLE document_digests
  ADD COLUMN IF NOT EXISTS pageindex_tree_id TEXT,
  ADD COLUMN IF NOT EXISTS pageindex_indexed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pageindex_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));
```

**Step 2:** Apply migration via Supabase MCP tool
**Step 3:** Regenerate types: `pnpm db:gen-types`
**Step 4:** Commit: `feat: add pgvector, context_chunks, and levi_core_context tables`

---

### Task 1.6: Populate Core Context (Tier 1)

**Files:**
- Create: `scripts/seed-core-context.ts`

Write a script that condenses the 4 context documents into ~600-800 token summaries and inserts them into `levi_core_context`. Keys: `domain_summary`, `data_relationships`, `platform_overview`, `glossary_highlights`.

**Step 1:** Write seed script that reads the context documents and creates condensed summaries
**Step 2:** Run: `npx tsx scripts/seed-core-context.ts`
**Step 3:** Verify records in `levi_core_context` table
**Step 4:** Commit: `feat: seed levi_core_context with Tier 1 summaries`

---

### Task 1.7: Upload Context Documents as Global Documents

Use the existing global documents API to upload the 4 context documents, triggering the extraction pipeline to store them in `global_document_digests.content_md`.

**Step 1:** Upload via API or manual Supabase insert
**Step 2:** Trigger processing via `POST /api/global-documents/process`
**Step 3:** Verify `extraction_status = 'completed'` and `content_md` populated
**Step 4:** Commit: `chore: upload context documents as global documents`

---

## Sprint 2: Embedding Pipeline

### Task 2.1: Implement Document Chunking

**Files:**
- Create: `apps/dashboard/lib/document-indexing.ts`

```typescript
export interface DocumentChunk {
  chunkIndex: number;
  heading: string | null;
  content: string;
  tokenCount: number;
}

export function chunkDocument(contentMd: string): DocumentChunk[]
// Split by ## and ### headings
// Target 200-500 tokens per chunk
// Include parent heading as prefix for context
// Split further if chunk exceeds 500 tokens
```

**Step 1:** Write chunking function with heading-based splitting
**Step 2:** Write unit test: chunk a sample markdown document, verify chunks have correct headings and sizes
**Step 3:** Run test, verify pass
**Step 4:** Commit: `feat: implement markdown document chunking for embeddings`

---

### Task 2.2: Implement Embedding Generation

**Files:**
- Create: `apps/agent/src/lib/embeddings.ts`

```typescript
// Uses OpenAI text-embedding-3-small (1536 dimensions)
export async function generateEmbedding(text: string): Promise<number[]>
export async function generateEmbeddings(texts: string[]): Promise<number[][]>
```

**Step 1:** Implement using OpenAI API (direct or via OpenRouter)
**Step 2:** Test with a sample string, verify 1536-dimension vector returned
**Step 3:** Commit: `feat: implement embedding generation via OpenAI text-embedding-3-small`

---

### Task 2.3: Implement pgvector Search

**Files:**
- Modify: `apps/agent/src/lib/embeddings.ts`

```typescript
export interface ContextChunk {
  id: string;
  heading: string | null;
  content: string;
  tokenCount: number;
  similarity: number;
  sourceType: string;
}

export async function searchSimilarChunks(
  queryEmbedding: number[],
  orgId: string | null,
  limit?: number,       // default 5
  threshold?: number    // default 0.7
): Promise<ContextChunk[]>
// Uses pgvector cosine similarity: 1 - (embedding <=> query_embedding)
// Filters: source_type IN ('global_document', 'core_context') + org_id match for org docs
```

**Step 1:** Implement search function using Supabase RPC or raw SQL
**Step 2:** Commit: `feat: implement pgvector similarity search for context chunks`

---

### Task 2.4: Implement Chunk Indexing Function

**Files:**
- Modify: `apps/dashboard/lib/document-indexing.ts`

```typescript
export async function indexDocumentChunks(
  digestId: string,
  sourceType: 'global_document' | 'org_document',
  orgId: string | null,
  contentMd: string
): Promise<void>
// 1. Chunk the document
// 2. Generate embeddings for all chunks (batch)
// 3. Delete existing chunks for this digest (re-index support)
// 4. Insert chunks + embeddings into context_chunks
// 5. Update digest embedding_status = 'completed'
```

**Step 1:** Implement combining chunking + embedding + storage
**Step 2:** Test by indexing one of the context documents
**Step 3:** Verify chunks in `context_chunks` table with embeddings
**Step 4:** Commit: `feat: implement document chunk indexing pipeline`

---

### Task 2.5: Hook Embedding into Document Processing

**Files:**
- Modify: `apps/dashboard/pages/api/documents/process.ts`
- Modify: `apps/dashboard/pages/api/global-documents/process.ts`

After extraction succeeds (content_md populated), trigger chunk indexing:

```typescript
// After successful extraction, trigger embedding (non-blocking)
indexDocumentChunks(digestId, sourceType, orgId, contentMd)
  .catch(err => console.error('Embedding indexing failed:', err));
```

**Step 1:** Add post-extraction hook to org documents process endpoint
**Step 2:** Add same hook to global documents process endpoint
**Step 3:** Test by processing a document and verifying chunks appear
**Step 4:** Commit: `feat: trigger embedding indexing after document extraction`

---

### Task 2.6: Create Batch Reindex Endpoint

**Files:**
- Create: `apps/dashboard/pages/api/documents/reindex.ts`

POST endpoint (Levelset Admin only) that:
1. Finds all `document_digests` and `global_document_digests` where `embedding_status != 'completed'` and `extraction_status = 'completed'`
2. Processes each through the chunk indexing pipeline
3. Returns progress summary

**Step 1:** Implement endpoint with Levelset Admin check
**Step 2:** Run against existing documents
**Step 3:** Verify all documents have chunks in `context_chunks`
**Step 4:** Commit: `feat: add batch document reindex endpoint`

---

## Sprint 3: PageIndex Integration

### Task 3.1: Research PageIndex API

**Files:** None (research only)

**Step 1:** Read PageIndex API docs at https://docs.pageindex.ai/
**Step 2:** Determine: API key setup, indexing endpoint, query endpoint, response format, pricing tier
**Step 3:** Get API key and set as `PAGEINDEX_API_KEY` env var
**Step 4:** Test a manual API call with one of the context documents

---

### Task 3.2: Implement PageIndex Client

**Files:**
- Create: `apps/agent/src/lib/pageindex/client.ts`

```typescript
export class PageIndexClient {
  constructor(private apiKey: string)

  async indexDocument(
    content: string,
    metadata?: { orgId?: string; documentId?: string; name?: string }
  ): Promise<string>  // returns tree_id

  async query(treeId: string, question: string): Promise<PageIndexResult>

  async queryMultiple(treeIds: string[], question: string): Promise<PageIndexResult>
}

export interface PageIndexResult {
  answer: string;
  sources: Array<{ page: number; text: string }>;
  confidence: number;
}
```

**Step 1:** Implement based on PageIndex API docs
**Step 2:** Test indexing one context document, verify tree_id returned
**Step 3:** Test querying the indexed document
**Step 4:** Commit: `feat: implement PageIndex API client`

---

### Task 3.3: Hook PageIndex into Document Processing

**Files:**
- Modify: `apps/dashboard/pages/api/documents/process.ts`
- Modify: `apps/dashboard/pages/api/global-documents/process.ts`

Add PageIndex indexing alongside embedding (parallel, non-blocking):

```typescript
// After extraction, trigger both embedding and PageIndex (parallel)
await Promise.allSettled([
  indexDocumentChunks(digestId, sourceType, orgId, contentMd),
  indexDocumentInPageIndex(digestId, sourceType, contentMd, metadata)
]);
```

**Step 1:** Add PageIndex indexing function that calls client + updates digest columns
**Step 2:** Add to both org and global document processing
**Step 3:** Test by processing a document, verify `pageindex_indexed = true` and `pageindex_tree_id` populated
**Step 4:** Commit: `feat: trigger PageIndex indexing after document extraction`

---

### Task 3.4: Batch Index Existing Documents in PageIndex

**Files:**
- Modify: `apps/dashboard/pages/api/documents/reindex.ts`

Extend the batch reindex endpoint to also process PageIndex indexing for documents where `pageindex_indexed = false`.

**Step 1:** Add PageIndex batch processing to reindex endpoint
**Step 2:** Run against existing documents
**Step 3:** Verify all processed documents have tree_ids
**Step 4:** Commit: `feat: add PageIndex to batch reindex pipeline`

---

## Sprint 4: Agent Context Retrieval + Integration

### Task 4.1: Implement Context Retriever

**Files:**
- Create: `apps/agent/src/lib/context-retriever.ts`

```typescript
export interface RetrievedContext {
  coreContext: string;       // Tier 1 — always present (~600-800 tokens)
  semanticChunks: string[];  // Tier 2 — pgvector results (~300-800 tokens)
  documentContext?: string;  // Tier 3 — PageIndex results (~200-500 tokens)
  totalTokens: number;
}

export async function retrieveContext(
  userMessage: string,
  orgId: string,
  locationId?: string
): Promise<RetrievedContext>
```

**Retrieval logic (tiers 1+2 always, tier 3 conditional):**
1. **Tier 1** (cached 30 min): Load active records from `levi_core_context` via tenant cache
2. **Tier 2** (parallel with tier 1): Embed user message → `searchSimilarChunks()` → top 3-5 chunks (global + org)
3. **Tier 3** (conditional): If any Tier 2 chunk has `source_type = 'global_document'` or `'org_document'` with high similarity, query PageIndex with relevant tree_ids

**Step 1:** Implement with all 3 tiers
**Step 2:** Test with sample queries: "How do ratings work?" should return domain model chunks
**Step 3:** Commit: `feat: implement 3-tier context retriever for Levi`

---

### Task 4.2: Modify System Prompt Builder

**Files:**
- Modify: `apps/agent/src/lib/prompts.ts`

Extend from 3 sections to 5:

```
Section 1: Identity & Guidelines (existing)
Section 2: Core Domain Context (NEW — Tier 1, always present)
Section 3: Org Context (existing — from org-context.ts)
Section 4: Retrieved Context (NEW — Tier 2+3, query-specific)
Section 5: User & Session (existing)
```

```typescript
// Updated signature:
export function buildSystemPrompt({
  userName,
  style,
  orgContext?,
  coreContext?,       // NEW: Tier 1 from levi_core_context
  retrievedContext?   // NEW: Tier 2+3 from context-retriever
}): string
```

**Step 1:** Add `coreContext` section after identity/guidelines
**Step 2:** Add `retrievedContext` section after org context, prefixed with "Relevant context for this query:"
**Step 3:** Verify prompt structure with sample data
**Step 4:** Commit: `feat: extend system prompt builder with context injection sections`

---

### Task 4.3: Integrate Retrieval into Chat Route

**Files:**
- Modify: `apps/agent/src/routes/ai/chat.ts`

Add context retrieval in parallel with existing org context loading:

```typescript
// Current:
const [conversation, orgContext] = await Promise.all([...]);

// New:
const [conversation, orgContext, retrievedContext] = await Promise.all([
  getOrCreateConversation(...),
  loadOrgContext(orgId, locationId),
  retrieveContext(userMessage, orgId, locationId)  // NEW
]);

// Pass to prompt builder:
const systemPrompt = buildSystemPrompt({
  userName,
  style,
  orgContext,
  coreContext: retrievedContext.coreContext,
  retrievedContext: [
    ...retrievedContext.semanticChunks,
    retrievedContext.documentContext
  ].filter(Boolean).join('\n\n')
});
```

**Step 1:** Add `retrieveContext()` to parallel loading
**Step 2:** Pass results to `buildSystemPrompt()`
**Step 3:** Add graceful fallback if retrieval fails (log warning, continue without)
**Step 4:** Commit: `feat: integrate context retrieval into chat route`

---

### Task 4.4: Add Context Cache Tier

**Files:**
- Modify: `apps/agent/src/lib/tenant-cache.ts`

Add a `CONTEXT` TTL tier (30 min) for core context caching:

```typescript
// Add to CacheTTL enum or config:
CONTEXT: 30 * 60 * 1000  // 30 minutes
```

**Step 1:** Add CONTEXT scope to cache configuration
**Step 2:** Use in context-retriever.ts for Tier 1 caching
**Step 3:** Commit: `feat: add CONTEXT cache tier for core domain context`

---

## Sprint 5: Verification + Polish

### Task 5.1: End-to-End Testing — Core Context (Tier 1)

Test that Levi always has domain knowledge without tool calls:

- Ask: "What is Positional Excellence?" → Should explain the rating system
- Ask: "How are roles organized?" → Should explain hierarchy levels
- Ask: "What zones are there?" → Should explain FOH/BOH
- Ask: "What features can orgs configure?" → Should describe feature toggles

**Step 1:** Send test messages via mobile app or API
**Step 2:** Verify responses show domain understanding without tool calls
**Step 3:** Document results

---

### Task 5.2: End-to-End Testing — Semantic Retrieval (Tier 2)

Test that pgvector retrieval adds relevant context:

- Ask: "How does discipline escalation work?" → Should retrieve discipline chunks
- Ask: "What tables does the get_employee_profile tool use?" → Should retrieve data relationship chunks
- Ask: "How does the mobile app connect to the dashboard?" → Should retrieve platform architecture chunks

**Step 1:** Send test queries and verify relevant chunks are retrieved
**Step 2:** Check system prompt includes retrieved context sections
**Step 3:** Document results

---

### Task 5.3: End-to-End Testing — PageIndex (Tier 3)

Test document-level reasoning:

- Ask: "What does the Operational Requirements Guide say about [topic]?" → Should query PageIndex
- Upload an org-specific document, ask about its contents → Should be retrievable

**Step 1:** Verify PageIndex queries return relevant answers
**Step 2:** Verify org-specific documents are accessible only to that org's users
**Step 3:** Document results

---

### Task 5.4: Token + Latency Monitoring

**Step 1:** Log total system prompt token count for 20+ queries
**Step 2:** Verify average stays under 3000 tokens
**Step 3:** Measure retrieval latency (target: < 200ms, runs in parallel)
**Step 4:** Check usage log for any cost anomalies from embedding calls

---

### Task 5.5: Update ARCHITECTURE.md

**Files:**
- Modify: `apps/dashboard/lib/ai/ARCHITECTURE.md`

Update Phase 3 status:
- [x] PageIndex integration
- [x] Hybrid retrieval (pgvector for chunked context, PageIndex for documents)
- [x] Core context injection (Tier 1)
- [x] Semantic context retrieval (Tier 2)

**Step 1:** Update the implementation progress table
**Step 2:** Commit: `docs: update ARCHITECTURE.md with Phase 3 completion`

---

## Environment Variables (New)

| Variable | Where | Purpose |
|----------|-------|---------|
| `OPENAI_API_KEY` | Agent + Dashboard | Embedding generation (text-embedding-3-small) |
| `PAGEINDEX_API_KEY` | Agent + Dashboard | PageIndex document indexing and queries |

---

## Files Summary

### Create

| File | Sprint | Purpose |
|------|--------|---------|
| `global-context/levelset-domain-model.md` | 1 | Business domain context document |
| `global-context/levelset-data-relationships.md` | 1 | Entity relationship context document |
| `global-context/levelset-platform-architecture.md` | 1 | Platform architecture context document |
| `global-context/levelset-glossary.md` | 1 | Terminology glossary context document |
| `supabase/migrations/20260221_add_context_rag_infrastructure.sql` | 1 | pgvector + tables + columns |
| `scripts/seed-core-context.ts` | 1 | Populate Tier 1 core context |
| `apps/dashboard/lib/document-indexing.ts` | 2 | Chunking + embedding pipeline |
| `apps/agent/src/lib/embeddings.ts` | 2 | Embedding generation + pgvector search |
| `apps/dashboard/pages/api/documents/reindex.ts` | 2 | Batch reindex endpoint |
| `apps/agent/src/lib/pageindex/client.ts` | 3 | PageIndex API wrapper |
| `apps/agent/src/lib/context-retriever.ts` | 4 | 3-tier context orchestration |

### Modify

| File | Sprint | Change |
|------|--------|--------|
| `apps/dashboard/pages/api/documents/process.ts` | 2, 3 | Post-extraction embedding + PageIndex hooks |
| `apps/dashboard/pages/api/global-documents/process.ts` | 2, 3 | Same hooks |
| `apps/agent/src/lib/prompts.ts` | 4 | 5-section prompt builder |
| `apps/agent/src/routes/ai/chat.ts` | 4 | Parallel context retrieval |
| `apps/agent/src/lib/tenant-cache.ts` | 4 | CONTEXT TTL tier |
| `apps/dashboard/lib/ai/ARCHITECTURE.md` | 5 | Phase 3 status update |
