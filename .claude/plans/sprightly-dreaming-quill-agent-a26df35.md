# Documents Module Implementation Plan

## Overview

This plan covers the full implementation of a Documents module for the Levelset dashboard at `/documents`. The module provides an org-scoped document hub where Levelset Admins can upload, organize, and manage documents (PDFs, DOCX, Markdown, images, URLs). Behind the scenes, uploaded documents are digested into clean markdown text stored in `document_digests`, which will later feed into the Phase 3 RAG pipeline (vector embeddings + PageIndex integration for the Levi AI agent).

The implementation follows all existing Levelset patterns: Pages Router page wrapper + component, CSS Modules with design token variables, intent-based API routes using `createServerSupabaseClient()`, org-scoped queries, `formidable` for multipart uploads, permission constants in `P`, and i18n in both EN and ES.

---

## Phase 1: Database Schema & Storage

### Step 1.1: Create Migration File

**File:** `supabase/migrations/20260221_create_documents_tables.sql`

Create four tables following the pattern established by `20260220_create_form_management_tables.sql`:

#### `document_folders`
```sql
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_folders_org ON document_folders(org_id);
CREATE INDEX idx_document_folders_parent ON document_folders(parent_folder_id);
```

Key design notes:
- `parent_folder_id` is nullable -- null means root level
- No implicit root folder row needed; null parent_folder_id IS the root
- `ON DELETE CASCADE` on parent means deleting a folder deletes its children (API should enforce "only if empty" but DB has safety net)

#### `documents`
```sql
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' 
    CHECK (category IN ('employee_handbook', 'leadership_resource', 'development_resource', 'organization_info', 'benefits', 'other')),
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  source_url TEXT,
  uploaded_by UUID REFERENCES app_users(id),
  replaced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
```

Key design notes:
- `folder_id` ON DELETE SET NULL -- if a folder is deleted, documents float to root rather than being destroyed
- `source_url` for URL-sourced documents (where the content was scraped from)
- `file_type` stores MIME type string (e.g., `application/pdf`, `text/markdown`)
- `file_size` is BIGINT to handle large files

#### `document_digests`
```sql
CREATE TABLE IF NOT EXISTS document_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  content_md TEXT,
  content_hash TEXT,
  extraction_method TEXT NOT NULL DEFAULT 'text_extract'
    CHECK (extraction_method IN ('text_extract', 'ocr', 'web_scrape', 'pdf_extract', 'docx_extract')),
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extraction_error TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  previous_content_md TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_digests_document ON document_digests(document_id);
CREATE INDEX idx_document_digests_org ON document_digests(org_id);
CREATE INDEX idx_document_digests_status ON document_digests(extraction_status);
CREATE UNIQUE INDEX idx_document_digests_doc_version ON document_digests(document_id, version);
```

Key design notes:
- `content_hash` enables dedup and change detection for re-indexing
- `version` + `previous_content_md` track changes when a document is replaced
- `UNIQUE(document_id, version)` prevents duplicate version numbers
- This table directly feeds Phase 3: `content_md` will be chunked and embedded via pgvector

#### `document_versions`
```sql
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  content_diff_summary TEXT,
  replaced_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE UNIQUE INDEX idx_document_versions_doc_num ON document_versions(document_id, version_number);
```

#### RLS Policies

Follow the exact pattern from `form_groups` / `form_templates`:

```sql
-- document_folders
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_folders_select" ON document_folders
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_folders_insert" ON document_folders
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_folders_update" ON document_folders
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_folders_delete" ON document_folders
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- document_digests
ALTER TABLE document_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_digests_select" ON document_digests
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_digests_insert" ON document_digests
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_digests_update" ON document_digests
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_versions_select" ON document_versions
  FOR SELECT TO authenticated
  USING (document_id IN (
    SELECT id FROM documents WHERE org_id IN (
      SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
    )
  ));
```

### Step 1.2: Create Storage Bucket

The `org_documents` bucket needs to be created in the Supabase dashboard or via a migration using `storage.buckets`:

```sql
-- In the same migration file or via Supabase dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('org_documents', 'org_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "org_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'org_documents');

CREATE POLICY "org_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org_documents');

CREATE POLICY "org_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'org_documents');
```

File path convention: `{org_id}/{folder_id_or_root}/{document_id}/{timestamp}_{sanitized_filename}`

This matches the pattern from `infraction_documents` at `apps/dashboard/pages/api/infractions/[id]/documents.ts` line 139: `${infraction.org_id}/${infractionId}/${timestamp}_${sanitized}`.

---

## Phase 2: Permission System

### Step 2.1: Update Permission Constants

**File:** `apps/dashboard/lib/permissions/constants.ts`

Add to `PERMISSION_MODULES`:
```typescript
DOCUMENTS: 'documents',
```

Add to `P`:
```typescript
// Documents
DOC_VIEW: 'documents.view_documents',
DOC_UPLOAD: 'documents.upload_documents',
DOC_EDIT: 'documents.edit_documents',
DOC_DELETE: 'documents.delete_documents',
DOC_MANAGE_FOLDERS: 'documents.manage_folders',
```

Add to `MODULE_METADATA`:
```typescript
[PERMISSION_MODULES.DOCUMENTS]: {
  name: 'Documents',
  description: 'Organization document hub for uploading and managing files',
  order: 13,
},
```

Add to `SUB_ITEM_METADATA`:
```typescript
[P.DOC_VIEW]: {
  name: 'View Documents',
  description: 'Access to view the documents page and browse files',
  order: 1,
  module: PERMISSION_MODULES.DOCUMENTS,
},
[P.DOC_UPLOAD]: {
  name: 'Upload Documents',
  description: 'Ability to upload new documents to the organization hub',
  order: 2,
  module: PERMISSION_MODULES.DOCUMENTS,
},
[P.DOC_EDIT]: {
  name: 'Edit Documents',
  description: 'Ability to edit document metadata and move between folders',
  order: 3,
  module: PERMISSION_MODULES.DOCUMENTS,
},
[P.DOC_DELETE]: {
  name: 'Delete Documents',
  description: 'Ability to delete documents from the organization hub',
  order: 4,
  module: PERMISSION_MODULES.DOCUMENTS,
},
[P.DOC_MANAGE_FOLDERS]: {
  name: 'Manage Folders',
  description: 'Ability to create, rename, and delete document folders',
  order: 5,
  module: PERMISSION_MODULES.DOCUMENTS,
},
```

### Step 2.2: Run Seed Script

After constants are updated, run:
```bash
npx tsx scripts/seed-permission-modules.ts
```

The existing seed script at `scripts/seed-permission-modules.ts` already iterates over all entries in `PERMISSION_MODULES` and `P`, so no changes to the script itself are needed. It uses upsert with `onConflict: 'key'` for modules and `onConflict: 'module_id,key'` for sub-items.

---

## Phase 3: Navigation Updates

### Step 3.1: Add Documents to HR Menu + Enable Two-Column

**File:** `apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsx`

**Change 1:** Add import for the folder icon:
```typescript
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
```

**Change 2:** Add Documents menu item to `menuItems.hr` array (after the existing 4 items):
```typescript
{
  label: 'Documents',
  description: 'Organization document hub',
  href: '/documents',
  icon: <FolderOutlinedIcon sx={{ fontSize: 22 }} />,
  levelsetAdminOnly: true,
},
```

**Change 3:** Update the `isTwoColumn` logic on line 145:
```typescript
// Before:
const isTwoColumn = menuType === 'operations';

// After:
const isTwoColumn = menuType === 'operations' || menuType === 'hr';
```

The CSS for two-column layout already exists in `NavSubmenu.module.css` (lines 43-47: `.itemsGrid.twoColumnGrid` with `grid-template-columns: auto auto`). No CSS changes needed.

With Documents added, the HR menu will have 5 items, which makes a 2-column grid (3 top, 2 bottom) look balanced.

---

## Phase 4: Types & Shared Code

### Step 4.1: Create Document Types

**File:** `apps/dashboard/lib/documents/types.ts`

Following the pattern from `apps/dashboard/lib/forms/types.ts`:

```typescript
/**
 * Documents Module - Type Definitions
 */

export type DocumentCategory =
  | 'employee_handbook'
  | 'leadership_resource'
  | 'development_resource'
  | 'organization_info'
  | 'benefits'
  | 'other';

export type ExtractionMethod =
  | 'text_extract'
  | 'ocr'
  | 'web_scrape'
  | 'pdf_extract'
  | 'docx_extract';

export type ExtractionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface DocumentFolder {
  id: string;
  org_id: string;
  name: string;
  parent_folder_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  document_count?: number;
  subfolder_count?: number;
}

export interface Document {
  id: string;
  org_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  category: DocumentCategory;
  file_type: string;
  file_size: number;
  file_path: string;
  original_filename: string;
  source_url: string | null;
  uploaded_by: string | null;
  replaced_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  uploaded_by_name?: string;
  digest_status?: ExtractionStatus;
  download_url?: string;
}

export interface DocumentDigest {
  id: string;
  document_id: string;
  org_id: string;
  content_md: string | null;
  content_hash: string | null;
  extraction_method: ExtractionMethod;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  version: number;
  previous_content_md: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  content_diff_summary: string | null;
  replaced_by: string | null;
  created_at: string;
}

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; labelEs: string }[] = [
  { value: 'employee_handbook', label: 'Employee Handbook', labelEs: 'Manual del Empleado' },
  { value: 'leadership_resource', label: 'Leadership Resource', labelEs: 'Recurso de Liderazgo' },
  { value: 'development_resource', label: 'Development Resource', labelEs: 'Recurso de Desarrollo' },
  { value: 'organization_info', label: 'Organization Info', labelEs: 'Informacion de la Organizacion' },
  { value: 'benefits', label: 'Benefits', labelEs: 'Beneficios' },
  { value: 'other', label: 'Other', labelEs: 'Otro' },
];

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/markdown',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.md', '.txt', '.png', '.jpeg', '.jpg', '.webp'];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
```

---

## Phase 5: API Routes

All API routes follow the pattern from `apps/dashboard/pages/api/forms/index.ts`:
- Use `createServerSupabaseClient()` for service-role access
- Auth via `supabase.auth.getUser(req.headers.authorization)`
- Look up `app_users` to get `org_id` and `role`
- Levelset Admin check for write operations
- All queries scoped by `org_id`

### Step 5.1: Auth Helper Extraction

To avoid repeating the auth boilerplate in every route, create a shared helper:

**File:** `apps/dashboard/lib/documents/auth.ts`

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

export async function getAuthenticatedUser(req: NextApiRequest) {
  const supabase = createServerSupabaseClient();
  
  const { data: { user } } = await supabase.auth.getUser(
    req.headers.authorization?.replace('Bearer ', '') || ''
  );

  if (!user) return { supabase, user: null, appUser: null, orgId: null };

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role, full_name')
    .eq('auth_user_id', user.id)
    .order('created_at');

  const appUser = appUsers?.find(u => u.role === 'Levelset Admin') || appUsers?.[0];
  
  return {
    supabase,
    user,
    appUser: appUser || null,
    orgId: appUser?.org_id || null,
  };
}
```

### Step 5.2: Documents List/Create API

**File:** `apps/dashboard/pages/api/documents/index.ts`

- **GET**: List documents for org with optional filters (`folder_id`, `category`, `search`)
  - Left-join `app_users` to get `uploaded_by_name`
  - Left-join `document_digests` (latest version) to get `digest_status`
  - Generate signed download URLs
  - Support `?folder_id=<uuid>` for folder navigation (null/omitted = root)
  - Support `?category=<category>` filter
  - Support `?search=<term>` for name search (ilike)
- **POST intent='create'**: Create document metadata record after file is already in storage
  - Required: `name`, `file_path`, `file_type`, `file_size`, `original_filename`
  - Optional: `folder_id`, `description`, `category`, `source_url`
  - Creates initial `document_digests` record with `extraction_status: 'pending'`
  - Returns created document

### Step 5.3: Single Document API

**File:** `apps/dashboard/pages/api/documents/[id].ts`

Follow pattern from `apps/dashboard/pages/api/forms/[id].ts`:

- **GET**: Document details with digest info and signed URL
- **PATCH**: Update metadata (name, description, category, folder_id)
- **DELETE**: 
  1. Delete storage file
  2. Delete document record (cascades to digests and versions)
  3. Return success

### Step 5.4: File Upload API

**File:** `apps/dashboard/pages/api/documents/upload.ts`

Follow the exact pattern from `apps/dashboard/pages/api/infractions/[id]/documents.ts`:

```typescript
export const config = {
  api: {
    bodyParser: false,
  },
};
```

- Use `formidable` with `maxFileSize: 25 * 1024 * 1024` (25MB)
- Validate MIME types against `ALLOWED_FILE_TYPES`
- Sanitize filename with the existing pattern: `name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)`
- Storage path: `{org_id}/{folder_id || 'root'}/{document_id}/{timestamp}_{sanitized}`
- Since we need document_id in the path but haven't created the record yet, either:
  - **Option A (recommended)**: Generate a UUID client-side and pass it, then create the DB record with that ID
  - **Option B**: Upload to a temp path, create DB record, then move -- more complex
  - Going with **Option A**: accept optional `document_id` in form fields, or generate one server-side with `gen_random_uuid()` equivalent in JS (`crypto.randomUUID()`)
- After upload succeeds, insert the `documents` record and the initial `document_digests` record
- Return: `{ document: { id, file_path, name, ... } }`

### Step 5.5: Folders API

**File:** `apps/dashboard/pages/api/documents/folders.ts`

- **GET**: List folders for org, optionally filtered by `parent_folder_id`
  - Include counts: documents in folder, subfolder count
- **POST**: Create folder
  - Required: `name`
  - Optional: `parent_folder_id`
  - Validate parent folder belongs to same org if provided
- **PUT**: Rename folder
  - Required: `id`, `name`
- **DELETE**: Delete folder
  - Only if empty (no documents AND no subfolders)
  - Return 409 if not empty with helpful message

### Step 5.6: Document Replace API

**File:** `apps/dashboard/pages/api/documents/[id]/replace.ts`

- **POST** with `bodyParser: false` (multipart upload)
- Steps:
  1. Fetch current document record
  2. Create `document_versions` entry with current file_path, file_size
  3. Upload new file to storage
  4. Update `documents` record with new file_path, file_size, `replaced_at: now()`
  5. Create new `document_digests` entry with `version: current + 1`, `previous_content_md` from old digest
  6. Optionally delete old storage file (or keep for version history)

### Step 5.7: Digest API

**File:** `apps/dashboard/pages/api/documents/[id]/digest.ts`

- **GET**: Return current digest for document (latest version)
- **POST**: Trigger re-digestion (set status to 'pending', call process endpoint)

### Step 5.8: Document Processing API

**File:** `apps/dashboard/pages/api/documents/process.ts`

This is the behind-the-scenes content extraction endpoint:

- **POST**: `{ document_id }`
- Fetches document record and its file from storage
- Routes to extraction method based on `file_type`:
  - `text/plain`, `text/markdown`: Direct read of file buffer as UTF-8
  - `application/pdf`: Use `pdf-parse` (npm package, needs to be added to dependencies)
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`: Use `mammoth` (npm package, needs to be added)
  - `image/*`: For Phase 1, set status to 'pending' with a note that OCR is not yet implemented. Phase 3 will add OCR via a cloud service.
  - URL-sourced (check `source_url`): Fetch the URL, extract clean markdown. For Phase 1, use a simple approach: fetch HTML, strip tags, clean up. Phase 3 will integrate proper extraction.
- Updates `document_digests` with:
  - `content_md`: extracted text
  - `content_hash`: SHA-256 of content_md
  - `extraction_status`: 'completed' or 'failed'
  - `extraction_error`: error message if failed

**New dependencies to add to `apps/dashboard/package.json`:**
```json
"pdf-parse": "^1.1.1",
"mammoth": "^1.8.0"
```

And dev dependencies:
```json
"@types/pdf-parse": "^1.1.4"
```

**Important:** The process endpoint should be called asynchronously after upload. For Phase 1, it can be called synchronously from the upload handler for `.txt` and `.md` files (trivial extraction), and kicked off as a separate API call for PDFs and DOCX. Full async processing (queue-based) is a Phase 3 concern.

---

## Phase 6: Dashboard Page

### Step 6.1: Page Wrapper

**File:** `apps/dashboard/pages/documents.tsx`

Following the exact pattern from `apps/dashboard/pages/form-management.tsx`:

```typescript
import * as React from 'react';
import { DocumentsPage } from '@/components/pages/DocumentsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function DocumentsPageWrapper() {
  return (
    <AppProviders>
      <DocumentsPage />
    </AppProviders>
  );
}

export default DocumentsPageWrapper;
```

### Step 6.2: Main Page Component

**File:** `apps/dashboard/components/pages/DocumentsPage.tsx`

Follow the structure from `FormManagementPage.tsx`:

```
<Head> with title
<div className root> using same Plasmic grid
  <MenuNavigation>
  <div contentWrapper>
    <div contentInner>
      {!isLevelsetAdmin ? (
        <ComingSoonState icon={FolderOutlinedIcon} />
      ) : (
        <>
          <PageHeader with breadcrumbs + action buttons>
          <Toolbar: search + category filters + view toggle>
          <Content area>
            <FolderCards at top>
            <DocumentsDataGrid below>
          </Content area>
        </>
      )}
    </div>
  </div>
</div>

{/* Dialogs */}
<UploadDocumentDialog>
<CreateFolderDialog>
<DocumentDetailDrawer>
```

**Key state:**
```typescript
// Navigation
const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Documents' }]);

// Data
const [folders, setFolders] = useState<DocumentFolder[]>([]);
const [documents, setDocuments] = useState<Document[]>([]);
const [loading, setLoading] = useState(true);

// Filters
const [searchQuery, setSearchQuery] = useState('');
const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | null>(null);
const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

// Dialogs
const [uploadOpen, setUploadOpen] = useState(false);
const [createFolderOpen, setCreateFolderOpen] = useState(false);
const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
```

**Data fetching pattern** (same as FormManagementPage):
```typescript
const getAccessToken = React.useCallback(async (): Promise<string | null> => {
  const { createSupabaseClient } = await import('@/util/supabase/component');
  const supabase = createSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}, []);

const fetchData = React.useCallback(async () => {
  const token = await getAccessToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  
  const params = new URLSearchParams();
  if (currentFolderId) params.set('folder_id', currentFolderId);
  if (categoryFilter) params.set('category', categoryFilter);
  if (searchQuery) params.set('search', searchQuery);
  
  const [foldersRes, docsRes] = await Promise.all([
    fetch(`/api/documents/folders?parent_folder_id=${currentFolderId || ''}`, { headers }),
    fetch(`/api/documents?${params.toString()}`, { headers }),
  ]);
  
  // ... handle responses
}, [getAccessToken, currentFolderId, categoryFilter, searchQuery]);
```

### Step 6.3: Sub-Components

These should live alongside the page component or in a `components/documents/` directory:

#### `components/documents/DocumentsToolbar.tsx`
- Search input (MUI TextField)
- Category filter chips (MUI Chip with `onClick`)
- View toggle (list/grid) icon buttons
- Upload button (MUI Button, primary)
- Create folder button (MUI Button, outlined)

#### `components/documents/FolderCard.tsx`
- Card with folder icon, name, item count
- Click navigates into folder (updates `currentFolderId`)
- Right-click/menu for rename, delete

#### `components/documents/DocumentsDataGrid.tsx`
- MUI DataGrid Pro table
- Columns: Name (with file type icon), Category (Chip), Type, Size (formatted), Uploaded By, Date
- Row click opens DocumentDetailDrawer
- Sorting by all columns

#### `components/documents/UploadDocumentDialog.tsx`
- MUI Dialog
- Tab-like toggle: "File Upload" | "URL Import"
- File upload: drag-drop zone + file picker
- URL import: text input for URL
- Category selector (dropdown)
- Name field (auto-populated from filename)
- Optional description
- Target folder (current folder, shown but editable)
- Upload progress indicator

#### `components/documents/CreateFolderDialog.tsx`
- Simple MUI Dialog
- Name text field
- Parent shown as current folder context

#### `components/documents/DocumentDetailDrawer.tsx`
- MUI Drawer (right side) or Dialog
- Shows: name, description, category, file type, file size, uploaded by, dates
- Digest status indicator (pending/processing/completed/failed)
- Actions: Download, Replace, Edit, Delete
- Edit mode for name, description, category
- Version history list

#### `components/documents/BreadcrumbNav.tsx`
- Simple breadcrumb trail: Home > Folder A > Subfolder B
- Each segment is clickable to navigate up

### Step 6.4: Page Styles

**File:** `apps/dashboard/components/pages/DocumentsPage.module.css`

Copy the base structure from `FormManagementPage.module.css` (root grid, menuNavigation, contentWrapper, contentInner, pageHeader, comingSoon states, empty states) and add:

- `.breadcrumbContainer` - flex row, gap 8px, items center
- `.breadcrumbItem` - clickable text, Satoshi 14px
- `.breadcrumbSeparator` - chevron right
- `.toolbarRow` - flex row, space-between, items center
- `.filterChips` - flex row, gap 8px
- `.foldersGrid` - CSS grid, 4 columns responsive
- `.folderCard` - border, border-radius 12px, padding, hover effect
- `.uploadDropzone` - dashed border, centered content, drag-active state
- `.viewToggle` - icon button group

All colors use design token CSS variables (e.g., `var(--ls-color-brand-base)`, `var(--ls-color-muted-border)`). No hardcoded hex values.

---

## Phase 7: i18n

### Step 7.1: English Translations

**File:** `apps/dashboard/locales/en/common.json`

Add a `"documents"` section (following the `"formManagement"` pattern):

```json
"documents": {
  "pageTitle": "Documents",
  "comingSoon": "Documents",
  "comingSoonDescription": "Upload and manage organization documents. This feature is currently being developed.",
  "comingSoonBadge": "Coming Soon",
  "uploadButton": "Upload Document",
  "uploadFromUrl": "Import from URL",
  "createFolder": "Create Folder",
  "search": "Search documents...",
  "noDocuments": "No documents yet",
  "noDocumentsDescription": "Upload your first document to get started. Documents can be organized into folders and categorized for easy access.",
  "noFolders": "No folders",
  "categories": {
    "employee_handbook": "Employee Handbook",
    "leadership_resource": "Leadership Resource",
    "development_resource": "Development Resource",
    "organization_info": "Organization Info",
    "benefits": "Benefits",
    "other": "Other",
    "all": "All Categories"
  },
  "table": {
    "name": "Name",
    "category": "Category",
    "type": "Type",
    "size": "Size",
    "uploadedBy": "Uploaded By",
    "date": "Date",
    "status": "Status"
  },
  "upload": {
    "title": "Upload Document",
    "dragDrop": "Drag and drop files here, or click to browse",
    "supportedTypes": "Supported: PDF, DOCX, Markdown, Text, PNG, JPEG, WebP",
    "maxSize": "Maximum file size: 25MB",
    "urlPlaceholder": "Enter document URL...",
    "nameLabel": "Document Name",
    "descriptionLabel": "Description (optional)",
    "categoryLabel": "Category",
    "folderLabel": "Folder",
    "uploading": "Uploading...",
    "processing": "Processing document..."
  },
  "folder": {
    "createTitle": "Create Folder",
    "nameLabel": "Folder Name",
    "namePlaceholder": "Enter folder name",
    "renameTitle": "Rename Folder",
    "deleteTitle": "Delete Folder",
    "deleteConfirm": "Are you sure you want to delete this folder? It must be empty.",
    "notEmpty": "This folder is not empty. Move or delete all contents first."
  },
  "detail": {
    "title": "Document Details",
    "download": "Download",
    "replace": "Replace File",
    "edit": "Edit",
    "delete": "Delete",
    "deleteConfirm": "Are you sure you want to delete this document? This cannot be undone.",
    "digestStatus": "Processing Status",
    "digestPending": "Pending",
    "digestProcessing": "Processing...",
    "digestCompleted": "Completed",
    "digestFailed": "Failed",
    "versionHistory": "Version History",
    "noVersions": "No previous versions"
  },
  "breadcrumb": {
    "root": "Documents"
  },
  "snackbar": {
    "uploaded": "Document uploaded successfully",
    "deleted": "Document deleted",
    "updated": "Document updated",
    "folderCreated": "Folder created",
    "folderDeleted": "Folder deleted",
    "folderRenamed": "Folder renamed",
    "replaced": "Document replaced",
    "uploadFailed": "Upload failed",
    "deleteFailed": "Failed to delete"
  }
}
```

### Step 7.2: Spanish Translations

**File:** `apps/dashboard/locales/es/common.json`

Add equivalent `"documents"` section with Spanish translations:

```json
"documents": {
  "pageTitle": "Documentos",
  "comingSoon": "Documentos",
  "comingSoonDescription": "Sube y administra documentos de la organizacion. Esta funcion esta actualmente en desarrollo.",
  "comingSoonBadge": "Proximamente",
  "uploadButton": "Subir Documento",
  "uploadFromUrl": "Importar desde URL",
  "createFolder": "Crear Carpeta",
  "search": "Buscar documentos...",
  ...
}
```

(Full Spanish translations for all keys matching the English structure above.)

---

## Phase 8: New Dependencies

### Step 8.1: Install Processing Libraries

From repo root:
```bash
pnpm --filter dashboard add pdf-parse mammoth
pnpm --filter dashboard add -D @types/pdf-parse
```

`mammoth` has built-in TypeScript types. `pdf-parse` needs `@types/pdf-parse`.

These are only used server-side in the API route (`pages/api/documents/process.ts`) so they will be tree-shaken from the client bundle.

---

## Implementation Sequence

Recommended order of implementation:

1. **Migration + Storage bucket** (Step 1.1, 1.2) -- must be applied to Supabase first
2. **Permission constants** (Step 2.1) -- no DB dependency, just code
3. **Types file** (Step 4.1) -- needed by all subsequent code
4. **Auth helper** (Step 5.1) -- shared by all API routes
5. **Folders API** (Step 5.5) -- needed before documents can reference folders
6. **Upload API** (Step 5.4) -- file upload to storage
7. **Documents list/create API** (Step 5.2) -- CRUD foundation
8. **Single document API** (Step 5.3) -- detail view support
9. **Process API** (Step 5.8) -- text extraction for .txt/.md first
10. **Digest API** (Step 5.7) -- view/trigger digestion
11. **Replace API** (Step 5.6) -- version management
12. **Navigation update** (Step 3.1) -- add menu item
13. **Page wrapper** (Step 6.1) -- thin wrapper
14. **Page component** (Step 6.2) -- main UI
15. **Sub-components** (Step 6.3) -- toolbar, cards, grid, dialogs
16. **Styles** (Step 6.4) -- CSS modules
17. **i18n** (Step 7.1, 7.2) -- translations
18. **Install deps** (Step 8.1) -- pdf-parse, mammoth
19. **Seed permissions** (Step 2.2) -- run script against DB
20. **Regenerate types** -- `pnpm db:gen-types` to update Supabase types

---

## Verification Checklist

1. `pnpm typecheck` -- all turbo tasks pass
2. `pnpm --filter dashboard build` -- production build succeeds
3. Apply migration to Supabase (`pcplqsnilhrhupntibuv`)
4. Run `npx tsx scripts/seed-permission-modules.ts` -- new DOCUMENTS module seeded
5. Navigate to `/documents` as Levelset Admin -- see the page with empty state
6. HR nav menu shows Documents item, menu is 2-column
7. Non-admin user sees "Coming Soon" on the nav item and on the page itself
8. Create a folder -- appears in folder grid
9. Upload a `.txt` document -- file in storage, document record created, digest processes to "completed"
10. Upload a `.pdf` document -- file in storage, digest processes (requires pdf-parse)
11. View document detail -- metadata, download link, digest status all display
12. Move document to folder -- folder_id updates
13. Delete document -- storage file removed, DB record deleted
14. Delete empty folder -- succeeds; delete non-empty folder -- returns 409

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| pdf-parse or mammoth fails on certain files | Wrap extraction in try/catch, set `extraction_status: 'failed'` with error message. User can still see/download the file. |
| Large file uploads timeout on Vercel | 25MB limit is within Vercel's 50MB body limit. Consider streaming for Phase 3. |
| URL scraping blocked by target site | Return graceful error. Phase 3 will add headless browser as fallback. |
| Storage bucket not created | Include bucket creation in migration SQL. Verify bucket exists in Supabase dashboard. |
| Two-column HR menu looks cramped on narrow screens | The existing CSS uses `grid-template-columns: auto auto` which wraps naturally. Test at 768px breakpoint. |

---

## Files Summary

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/migrations/20260221_create_documents_tables.sql` | DB schema for 4 tables + RLS + storage bucket |
| `apps/dashboard/lib/documents/types.ts` | TypeScript interfaces and constants |
| `apps/dashboard/lib/documents/auth.ts` | Shared auth helper for API routes |
| `apps/dashboard/pages/documents.tsx` | Page wrapper (thin) |
| `apps/dashboard/components/pages/DocumentsPage.tsx` | Main page component |
| `apps/dashboard/components/pages/DocumentsPage.module.css` | Page styles |
| `apps/dashboard/components/documents/DocumentsToolbar.tsx` | Search, filters, action buttons |
| `apps/dashboard/components/documents/FolderCard.tsx` | Folder card component |
| `apps/dashboard/components/documents/DocumentsDataGrid.tsx` | DataGrid Pro table |
| `apps/dashboard/components/documents/UploadDocumentDialog.tsx` | Upload dialog with drag-drop |
| `apps/dashboard/components/documents/CreateFolderDialog.tsx` | Create folder dialog |
| `apps/dashboard/components/documents/DocumentDetailDrawer.tsx` | Document detail side drawer |
| `apps/dashboard/components/documents/BreadcrumbNav.tsx` | Breadcrumb navigation |
| `apps/dashboard/pages/api/documents/index.ts` | List/create documents |
| `apps/dashboard/pages/api/documents/[id].ts` | Single document CRUD |
| `apps/dashboard/pages/api/documents/upload.ts` | Multipart file upload |
| `apps/dashboard/pages/api/documents/folders.ts` | Folder CRUD |
| `apps/dashboard/pages/api/documents/[id]/replace.ts` | Replace document file |
| `apps/dashboard/pages/api/documents/[id]/digest.ts` | View/trigger digestion |
| `apps/dashboard/pages/api/documents/process.ts` | Content extraction processing |

### Files to Modify
| File | Change |
|------|--------|
| `apps/dashboard/lib/permissions/constants.ts` | Add DOCUMENTS module + 5 permission keys to P, MODULE_METADATA, SUB_ITEM_METADATA |
| `apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsx` | Add Documents to HR menu items, change `isTwoColumn` to include 'hr' |
| `apps/dashboard/locales/en/common.json` | Add `documents` translation section |
| `apps/dashboard/locales/es/common.json` | Add `documents` translation section (Spanish) |
| `apps/dashboard/package.json` | Add `pdf-parse`, `mammoth`, `@types/pdf-parse` |

### Key Reference Files (patterns to follow)
| File | Pattern Used |
|------|-------------|
| `apps/dashboard/pages/form-management.tsx` | Page wrapper pattern |
| `apps/dashboard/components/pages/FormManagementPage.tsx` | Page component pattern (admin check, coming soon, data fetching) |
| `apps/dashboard/components/pages/FormManagementPage.module.css` | CSS Module styling pattern |
| `apps/dashboard/pages/api/forms/index.ts` | API route auth + CRUD pattern |
| `apps/dashboard/pages/api/forms/groups.ts` | Folder-like CRUD pattern |
| `apps/dashboard/pages/api/infractions/[id]/documents.ts` | File upload with formidable pattern |
| `apps/dashboard/lib/forms/types.ts` | Type definitions pattern |
| `supabase/migrations/20260220_create_form_management_tables.sql` | Migration pattern (tables, indexes, RLS) |
| `scripts/seed-permission-modules.ts` | Permission seeding (no changes needed to script) |
