# Form Import Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to import forms from PDFs (drag-and-drop) or any web form platform (paste URL), using Claude AI to parse the form structure and create a Levelset form template.

**Architecture:** A single `POST /api/forms/import` endpoint handles both sources. PDFs are sent to Claude's vision API; URLs are fetched server-side and the HTML is sent as text. Claude returns structured `FormField[]` output via tool_use, which is converted to JSON Schema + UI Schema using the existing `fieldsToJsonSchema()` utility, then saved as a form_template. For evaluation forms with scoring info in PDFs, the AI also extracts weights, rating scales, and section structure. User lands in the existing form editor to review.

**Tech Stack:** Next.js API route, Anthropic Claude API (tool_use for structured output), MUI Dialog, existing form infrastructure (schema-builder, field-palette, dialogStyles)

**Field Type System:** The editor uses a unified `select` field type with a `settings.dataSource` property to handle both custom dropdowns and predefined Levelset data sources (employees, leaders, positions, infractions, disc_actions). There is also a `text_block` field type for inline rich text content. The AI prompt should use `select` for all dropdown-style fields and set `dataSource` when the field clearly maps to a Levelset data source.

---

## Task 1: Create the Claude AI Prompt Module

**Files:**
- Create: `apps/dashboard/lib/forms/import-prompt.ts`

This module defines the system prompt and tool schema for Claude to parse forms. It's the core of the feature's accuracy.

**Step 1: Create the prompt module**

```typescript
// apps/dashboard/lib/forms/import-prompt.ts

/**
 * AI Form Import Prompt
 *
 * Defines the system prompt and tool schema for Claude to parse
 * forms from PDFs and HTML into Levelset's FormField[] format.
 */

import type { DataSource } from '@/lib/forms/field-palette';

export interface ParsedFormField {
  type: string;
  label: string;
  labelEs: string;
  description?: string;
  descriptionEs?: string;
  required: boolean;
  options?: { value: string; label: string; labelEs?: string }[];
  settings: {
    min?: number;
    max?: number;
    rows?: number;
    weight?: number;
    scoringType?: 'rating_1_3' | 'rating_1_5' | 'true_false' | 'percentage';
    sectionName?: string;
    sectionNameEs?: string;
    /** For select fields with predefined data sources */
    dataSource?: DataSource;
    /** For leader data source: max hierarchy level to include */
    maxHierarchyLevel?: number;
    /** For text_block: rich text HTML content */
    content?: string;
    contentEs?: string;
  };
  sectionId?: string;
}

export interface ParsedFormResult {
  fields: ParsedFormField[];
  suggestedName?: string;
  suggestedNameEs?: string;
  suggestedDescription?: string;
  suggestedDescriptionEs?: string;
  evaluationSections?: {
    id: string;
    name: string;
    nameEs?: string;
    order: number;
  }[];
}

/**
 * Available field types with descriptions for the AI prompt.
 */
const FIELD_TYPE_DESCRIPTIONS = `
## Available Field Types

### Basic Fields
- **text**: Single-line text input. Use for short answers, names, titles.
- **textarea**: Multi-line text input. Use for long answers, comments, notes, paragraphs.
- **number**: Numeric input. Supports optional min/max range. Use for quantities, counts, numeric scores.
- **date**: Date picker. Use for dates (hire date, incident date, etc.).

### Selection Fields
- **select**: Dropdown menu. Use when user picks ONE option from a list.
  - For generic dropdowns with custom options, just use type "select" with an options array.
  - For fields that clearly reference organizational data (see Data Sources below), use type "select" AND set settings.dataSource to the appropriate source. Do NOT include an options array when using a data source.
- **radio**: Radio buttons with predefined options. Same as select but all options visible at once.
- **checkbox**: Checkboxes for multiple selections. Use when user can pick MULTIPLE options.
- **true_false**: Yes/No or True/False toggle. Use for binary questions.

### Advanced Fields
- **rating_1_3**: Star rating scale from 1 to 3. Use for simple quality ratings (poor/average/good).
- **rating_1_5**: Star rating scale from 1 to 5. Use for detailed quality ratings.
- **percentage**: Numeric input constrained to 0-100. Use for completion rates, scores as percentages.
- **signature**: Signature capture pad. Use for signature lines, sign-off fields.
- **file_upload**: File upload widget. Use for document or photo attachments.

### Section / Layout
- **section**: Section header (not a data field). Use to group related fields under a heading. When you detect a section header or category heading in the form, create a section field. Fields that follow this section should reference it via sectionId.
- **text_block**: Static text content block (not a data field). Use for instructions, disclaimers, explanatory text, or any block of text that should be displayed on the form but doesn't collect data. Set settings.content to the HTML content and settings.contentEs for the Spanish version.

## Data Sources (for select fields only)

When a field clearly asks for organizational data, use type "select" with settings.dataSource set to one of these values:

- **employees**: Use when the field asks for an employee name, team member, or "who" in the context of selecting a person from the organization.
- **leaders**: Use when the field asks for a supervisor, manager, leader, evaluator, or "who is conducting" this form. Optionally set settings.maxHierarchyLevel (default 2) to control which roles are included.
- **positions**: Use when the field asks for a job position, role, or station.
- **infractions**: Use ONLY when the field asks for a type of infraction or violation from a discipline rubric.
- **disc_actions**: Use ONLY when the field asks for a disciplinary action type.

When using a data source, do NOT include an options array — the options are loaded dynamically from the organization's data.
`;

/**
 * Build the system prompt for form parsing.
 */
export function buildSystemPrompt(options: {
  sourceType: 'pdf' | 'url';
  formType: string;
  includeScoring: boolean;
}): string {
  const { sourceType, formType, includeScoring } = options;

  let prompt = `You are an expert form parser for Levelset, a restaurant/hospitality employee management platform. Your job is to analyze ${sourceType === 'pdf' ? 'a PDF document containing a form' : 'the HTML of a web page containing a form'} and extract its structure into a precise list of form fields.

## CRITICAL RULES

1. **Accuracy is paramount.** Every field in the source form MUST be represented. Do not skip fields. Do not invent fields that don't exist.
2. **Field type selection matters.** Choose the most appropriate field type from the list below. When in doubt between text and textarea, prefer text for short labels and textarea for anything expecting paragraphs.
3. **Bilingual output required.** For every label, provide both English (label) and Spanish (labelEs) translations. If the source is in Spanish, still provide the English translation. If the source is in English, provide accurate Spanish translations.
4. **Preserve form structure.** If the form has sections, groups, or categories, create section fields and assign sectionId to child fields.
5. **Detect required fields.** If a field is marked as required (asterisk, "required" label, bold emphasis), set required: true.
6. **Preserve options exactly.** For select/radio/checkbox fields with custom options, extract all options with their exact labels. Generate snake_case values from the labels.
7. **Section headers are fields too.** When you see a heading that groups other fields (like "Employee Information" or "Performance Ratings"), create a section field for it. Set the sectionName in settings to the heading text.
8. **Use data sources for organizational fields.** If a field clearly asks for an employee, leader/supervisor, position, infraction type, or discipline action, use type "select" with settings.dataSource instead of a generic text or select field. Do NOT include an options array when using a data source.
9. **Use text_block for static content.** If you see instructions, disclaimers, or explanatory text blocks on the form (not field labels/descriptions), create a text_block field with settings.content containing the HTML-formatted content.

${FIELD_TYPE_DESCRIPTIONS}`;

  if (includeScoring && formType === 'evaluation') {
    prompt += `

## Scoring Extraction (Evaluation Forms)

This form is being imported as an **evaluation** form type. Look for scoring information:

1. **Weights/Points**: If fields have point values, weights, or maximum scores assigned, capture them in settings.weight.
2. **Rating Scales**: If a field uses a rating scale (1-3, 1-5), use the appropriate rating field type AND set settings.scoringType to match ('rating_1_3' or 'rating_1_5').
3. **True/False Scoring**: If a yes/no question has points assigned, use true_false type and set settings.scoringType to 'true_false'.
4. **Percentage Fields**: If a field represents a percentage score, use percentage type and set settings.scoringType to 'percentage'.
5. **Sections**: If scoring is grouped into sections (e.g., "Leadership - 30 points", "Technical Skills - 20 points"), create evaluation sections. Each section needs an id (sec_snake_case_name), name, nameEs, and order.
6. **Section Assignment**: For scored fields, set sectionId to the section's field ID (not the evaluation section id).

If no scoring information is present in the form, that's fine — just parse the fields without scoring.`;
  }

  prompt += `

## Output Format

Use the extract_form_fields tool to return the parsed form structure. Every field you return MUST have:
- type: one of the field types listed above
- label: English label
- labelEs: Spanish translation of the label
- required: boolean

For select/radio/checkbox fields with custom options, include the options array with value (snake_case) and label pairs.
For select fields with a data source, set settings.dataSource and do NOT include options.
For section fields, set settings.sectionName and settings.sectionNameEs.
For text_block fields, set settings.content (HTML) and settings.contentEs (Spanish HTML).

Also return:
- suggestedName: A concise English name for this form (if you can infer it from the title/header)
- suggestedNameEs: Spanish translation of the suggested name
- suggestedDescription: Brief English description of the form's purpose
- suggestedDescriptionEs: Spanish translation

${includeScoring && formType === 'evaluation' ? '- evaluationSections: Array of scoring sections if scoring structure was detected' : ''}`;

  return prompt;
}

/**
 * The tool schema for Claude's structured output.
 * This defines the exact shape of the response we expect.
 */
export const FORM_PARSER_TOOL = {
  name: 'extract_form_fields',
  description: 'Extract the form structure as a list of typed fields with labels, options, and settings.',
  input_schema: {
    type: 'object' as const,
    properties: {
      suggestedName: {
        type: 'string',
        description: 'Suggested English name for the form',
      },
      suggestedNameEs: {
        type: 'string',
        description: 'Suggested Spanish name for the form',
      },
      suggestedDescription: {
        type: 'string',
        description: 'Brief English description of the form purpose',
      },
      suggestedDescriptionEs: {
        type: 'string',
        description: 'Brief Spanish description of the form purpose',
      },
      fields: {
        type: 'array',
        description: 'All form fields in order',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'text', 'textarea', 'number', 'date',
                'select', 'radio', 'checkbox', 'true_false',
                'rating_1_3', 'rating_1_5', 'percentage',
                'signature', 'file_upload', 'section', 'text_block',
              ],
              description: 'The field type',
            },
            label: {
              type: 'string',
              description: 'English label for the field',
            },
            labelEs: {
              type: 'string',
              description: 'Spanish label for the field',
            },
            description: {
              type: 'string',
              description: 'Optional English description or help text',
            },
            descriptionEs: {
              type: 'string',
              description: 'Optional Spanish description or help text',
            },
            required: {
              type: 'boolean',
              description: 'Whether this field is required',
            },
            options: {
              type: 'array',
              description: 'Options for select/radio/checkbox fields with custom options. Do NOT include when using a data source.',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string', description: 'snake_case option value' },
                  label: { type: 'string', description: 'English option label' },
                  labelEs: { type: 'string', description: 'Spanish option label' },
                },
                required: ['value', 'label'],
              },
            },
            settings: {
              type: 'object',
              description: 'Type-specific settings',
              properties: {
                min: { type: 'number', description: 'Minimum value (number fields)' },
                max: { type: 'number', description: 'Maximum value (number fields)' },
                rows: { type: 'number', description: 'Number of rows (textarea)' },
                weight: { type: 'number', description: 'Scoring weight (evaluation fields)' },
                scoringType: {
                  type: 'string',
                  enum: ['rating_1_3', 'rating_1_5', 'true_false', 'percentage'],
                  description: 'Scoring type for evaluation fields',
                },
                sectionName: { type: 'string', description: 'Section heading (section fields)' },
                sectionNameEs: { type: 'string', description: 'Spanish section heading' },
                dataSource: {
                  type: 'string',
                  enum: ['employees', 'leaders', 'positions', 'infractions', 'disc_actions'],
                  description: 'Data source for select fields that reference organizational data. Only set for select fields. Do not set for custom-option selects.',
                },
                maxHierarchyLevel: {
                  type: 'number',
                  description: 'Max role hierarchy level for leaders data source (default 2). Only used when dataSource is "leaders".',
                },
                content: { type: 'string', description: 'HTML content for text_block fields (English)' },
                contentEs: { type: 'string', description: 'HTML content for text_block fields (Spanish)' },
              },
            },
            sectionId: {
              type: 'string',
              description: 'ID of the parent section field (use the section field label in snake_case prefixed with "section_")',
            },
          },
          required: ['type', 'label', 'labelEs', 'required'],
        },
      },
      evaluationSections: {
        type: 'array',
        description: 'Scoring sections for evaluation forms (only if scoring structure detected)',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Section ID in format sec_snake_case' },
            name: { type: 'string', description: 'English section name' },
            nameEs: { type: 'string', description: 'Spanish section name' },
            order: { type: 'number', description: 'Display order (0-indexed)' },
          },
          required: ['id', 'name', 'order'],
        },
      },
    },
    required: ['fields'],
  },
};
```

**Step 2: Verify the module compiles**

Run: `cd /Users/andrewdyar/levelset-nextjs && npx tsc --noEmit apps/dashboard/lib/forms/import-prompt.ts --skipLibCheck --esModuleInterop --module esnext --moduleResolution bundler --target esnext`

Expected: No errors (or just path resolution warnings which are fine since Next.js handles those).

**Step 3: Commit**

```bash
git add apps/dashboard/lib/forms/import-prompt.ts
git commit -m "feat(forms): add AI prompt module for form import parsing"
```

---

## Task 2: Create the Import API Route

**Files:**
- Create: `apps/dashboard/pages/api/forms/import.ts`
- Reference: `apps/dashboard/pages/api/forms/index.ts` (auth pattern)
- Reference: `apps/dashboard/lib/forms/schema-builder.ts` (fieldsToJsonSchema, generateFieldId)
- Reference: `apps/dashboard/lib/forms/import-prompt.ts` (prompt + tool schema)
- Reference: `apps/dashboard/lib/supabase-server.ts` (createServerSupabaseClient)
- Reference: `apps/dashboard/lib/forms/slugify.ts` (generateUniqueSlug)

This API route accepts either a PDF file or a URL, calls Claude to parse it, converts the result to JSON Schema, and creates a form_template.

**Step 1: Install the Anthropic SDK**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard add @anthropic-ai/sdk`

Expected: Package added to apps/dashboard/package.json

**Step 2: Create the import API route**

```typescript
// apps/dashboard/pages/api/forms/import.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';
import { fieldsToJsonSchema, generateFieldId } from '@/lib/forms/schema-builder';
import type { FormField } from '@/lib/forms/schema-builder';
import {
  buildSystemPrompt,
  FORM_PARSER_TOOL,
  type ParsedFormResult,
} from '@/lib/forms/import-prompt';
import Anthropic from '@anthropic-ai/sdk';

// Increase body size limit for PDF uploads (default is 1mb)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // ── Auth (same pattern as /api/forms/index.ts) ──
  const {
    data: { user },
  } = await supabase.auth.getUser(
    req.headers.authorization?.replace('Bearer ', '') || ''
  );

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at');

  if (!appUsers || appUsers.length === 0) {
    return res.status(403).json({ error: 'No user profile found' });
  }

  const appUser =
    appUsers.find((u) => u.role === 'Levelset Admin') || appUsers[0];

  if (appUser.role !== 'Levelset Admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  const orgId = appUser.org_id;

  // ── Parse request body ──
  const {
    source_type,
    url,
    file_data,
    file_media_type,
    name,
    description,
    group_id,
    form_type,
  } = req.body;

  if (!source_type || !group_id || !form_type) {
    return res.status(400).json({
      error: 'source_type, group_id, and form_type are required',
    });
  }

  if (source_type === 'url' && !url) {
    return res.status(400).json({ error: 'URL is required for URL import' });
  }

  if (source_type === 'pdf' && !file_data) {
    return res.status(400).json({ error: 'file_data is required for PDF import' });
  }

  // Validate form_type
  const validTypes = ['rating', 'discipline', 'evaluation', 'custom'];
  if (!validTypes.includes(form_type)) {
    return res.status(400).json({ error: 'Invalid form_type' });
  }

  // Verify group belongs to this org
  const { data: group } = await supabase
    .from('form_groups')
    .select('id, org_id, slug')
    .eq('id', group_id)
    .eq('org_id', orgId)
    .single();

  if (!group) {
    return res.status(404).json({ error: 'Form group not found' });
  }

  // Validate form_type matches system group slug
  const slugToType: Record<string, string> = {
    positional_excellence: 'rating',
    discipline: 'discipline',
    evaluations: 'evaluation',
  };
  const expectedType = slugToType[group.slug];
  if (expectedType && form_type !== expectedType) {
    return res.status(400).json({
      error: `The "${group.slug}" group requires form type "${expectedType}"`,
    });
  }

  try {
    // ── Build Claude messages ──
    const systemPrompt = buildSystemPrompt({
      sourceType: source_type,
      formType: form_type,
      includeScoring: source_type === 'pdf' && form_type === 'evaluation',
    });

    const userContent: Anthropic.Messages.ContentBlockParam[] = [];

    if (source_type === 'pdf') {
      // Send PDF as a document to Claude's vision API
      userContent.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: file_media_type || 'application/pdf',
          data: file_data,
        },
      });
      userContent.push({
        type: 'text',
        text: 'Parse this PDF form and extract all fields using the extract_form_fields tool. Be thorough — capture every field, option, and section header.',
      });
    } else {
      // Fetch URL HTML
      let html: string;
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Levelset Form Importer)',
            'Accept': 'text/html',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          return res.status(400).json({
            error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          });
        }

        html = await response.text();
      } catch (fetchError: any) {
        return res.status(400).json({
          error: `Failed to fetch URL: ${fetchError.message}`,
        });
      }

      // Truncate very large HTML to avoid token limits
      const maxHtmlLength = 100_000;
      const truncatedHtml =
        html.length > maxHtmlLength
          ? html.substring(0, maxHtmlLength) + '\n<!-- truncated -->'
          : html;

      userContent.push({
        type: 'text',
        text: `Parse this web form HTML and extract all form fields using the extract_form_fields tool. Be thorough — capture every field, option, and section header.\n\n<html>\n${truncatedHtml}\n</html>`,
      });
    }

    // ── Call Claude API ──
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      tools: [FORM_PARSER_TOOL],
      tool_choice: { type: 'tool', name: 'extract_form_fields' },
      messages: [{ role: 'user', content: userContent }],
    });

    // Extract tool use result
    const toolUseBlock = response.content.find(
      (block) => block.type === 'tool_use'
    );

    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return res.status(500).json({
        error: 'AI failed to parse the form. Please try again.',
      });
    }

    const parsed = toolUseBlock.input as ParsedFormResult;

    if (!parsed.fields || parsed.fields.length === 0) {
      return res.status(400).json({
        error: 'No form fields were detected. Please check the source and try again.',
      });
    }

    // ── Convert parsed fields to FormField[] with generated IDs ──
    // First pass: create section fields and build a mapping from AI sectionIds to real IDs
    const sectionIdMap: Record<string, string> = {};
    const formFields: FormField[] = [];

    for (const parsedField of parsed.fields) {
      const fieldId = generateFieldId();

      if (parsedField.type === 'section') {
        // Track section ID mapping for child fields
        // The AI returns sectionId references based on the section's label
        const aiSectionKey = parsedField.sectionId || parsedField.label.toLowerCase().replace(/\s+/g, '_');
        sectionIdMap[aiSectionKey] = fieldId;
        // Also map by a "section_" prefix version
        sectionIdMap[`section_${aiSectionKey}`] = fieldId;
      }

      const field: FormField = {
        id: fieldId,
        type: parsedField.type,
        label: parsedField.label,
        labelEs: parsedField.labelEs || '',
        description: parsedField.description,
        descriptionEs: parsedField.descriptionEs,
        required: parsedField.required ?? false,
        settings: {
          ...(parsedField.settings || {}),
        },
      };

      // Add section settings
      if (parsedField.type === 'section') {
        field.settings.sectionName = parsedField.settings?.sectionName || parsedField.label;
        field.settings.sectionNameEs = parsedField.settings?.sectionNameEs || parsedField.labelEs;
      }

      // Add text_block content settings
      if (parsedField.type === 'text_block') {
        field.settings.content = parsedField.settings?.content || '';
        field.settings.contentEs = parsedField.settings?.contentEs || '';
      }

      // Add data source for select fields with organizational data
      if (parsedField.type === 'select' && parsedField.settings?.dataSource) {
        field.settings.dataSource = parsedField.settings.dataSource;
        // Preserve maxHierarchyLevel for leaders
        if (parsedField.settings.dataSource === 'leaders' && parsedField.settings.maxHierarchyLevel !== undefined) {
          field.settings.maxHierarchyLevel = parsedField.settings.maxHierarchyLevel;
        }
      }

      // Add options for selection fields (only for custom-option selects, not data source selects)
      if (parsedField.options && parsedField.options.length > 0 && !parsedField.settings?.dataSource) {
        field.options = parsedField.options;
      }

      formFields.push(field);
    }

    // Second pass: resolve sectionId references
    for (const field of formFields) {
      const parsedField = parsed.fields[formFields.indexOf(field)];
      if (parsedField.sectionId && parsedField.type !== 'section') {
        // Try to find the section by the AI-provided sectionId
        const resolvedId =
          sectionIdMap[parsedField.sectionId] ||
          sectionIdMap[parsedField.sectionId.replace(/^section_/, '')] ||
          undefined;
        if (resolvedId) {
          field.sectionId = resolvedId;
        }
      }
    }

    // ── Convert to JSON Schema + UI Schema ──
    const { schema, uiSchema } = fieldsToJsonSchema(formFields);

    // ── Build evaluation settings if applicable ──
    let settings: Record<string, any> = {};

    if (form_type === 'evaluation' && parsed.evaluationSections && parsed.evaluationSections.length > 0) {
      const sections = parsed.evaluationSections.map((sec, idx) => ({
        id: sec.id,
        name: sec.name,
        name_es: sec.nameEs || '',
        order: sec.order ?? idx,
        is_predefined: false,
      }));

      // Build questions map from fields with scoring info
      const questions: Record<string, any> = {};
      for (const field of formFields) {
        if (field.settings.weight || field.settings.scoringType) {
          questions[field.id] = {
            section_id: field.sectionId || undefined,
            weight: field.settings.weight || 1,
            scoring_type: field.settings.scoringType || field.type,
          };
        }
      }

      settings = {
        evaluation: {
          sections,
          questions,
        },
      };
    }

    // ── Determine form name ──
    const formName = name || parsed.suggestedName || 'Imported Form';
    const formDescription = description || parsed.suggestedDescription || null;

    // ── Generate slug and create template ──
    const slug = await generateUniqueSlug(supabase, orgId, formName);

    const { data: template, error: insertError } = await supabase
      .from('form_templates')
      .insert({
        org_id: orgId,
        group_id,
        name: formName,
        name_es: parsed.suggestedNameEs || null,
        slug,
        description: formDescription,
        description_es: parsed.suggestedDescriptionEs || null,
        form_type,
        schema,
        ui_schema: uiSchema,
        settings,
        is_active: true,
        is_system: false,
        created_by: appUser.id,
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({
      ...template,
      fieldCount: formFields.length,
      hasScoringData: Object.keys(settings).length > 0,
    });
  } catch (error: any) {
    console.error('Form import error:', error);
    return res.status(500).json({
      error: error.message || 'An unexpected error occurred during import',
    });
  }
}
```

**Step 3: Add ANTHROPIC_API_KEY to environment**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Add to `.env.example`:
```
# Form Import (AI parsing)
ANTHROPIC_API_KEY=           # Claude API key for form import feature
```

**Step 4: Commit**

```bash
git add apps/dashboard/pages/api/forms/import.ts
git commit -m "feat(forms): add form import API route with Claude AI parsing"
```

---

## Task 3: Create the Import Form Dialog Component

**Files:**
- Create: `apps/dashboard/components/forms/ImportFormDialog.tsx`
- Create: `apps/dashboard/components/forms/ImportFormDialog.module.css`
- Reference: `apps/dashboard/components/forms/CreateFormDialog.tsx` (dialog pattern)
- Reference: `apps/dashboard/components/forms/dialogStyles.ts` (shared styles)

**Step 1: Create the CSS Module**

```css
/* apps/dashboard/components/forms/ImportFormDialog.module.css */

.tabContent {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.dropZone {
  border: 2px dashed var(--ls-color-muted-border);
  border-radius: 12px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--ls-color-neutral-foreground);
  min-height: 120px;
}

.dropZone:hover,
.dropZoneActive {
  border-color: var(--ls-color-brand);
  background: var(--ls-color-brand-soft);
}

.dropZoneIcon {
  color: var(--ls-color-muted);
  font-size: 32px !important;
}

.dropZoneText {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  color: var(--ls-color-muted);
  text-align: center;
  margin: 0;
}

.dropZoneBrowse {
  color: var(--ls-color-brand);
  font-weight: 600;
  cursor: pointer;
}

.dropZoneHint {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-muted);
  margin: 0;
}

.filePreview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--ls-color-neutral-foreground);
  border-radius: 8px;
  border: 1px solid var(--ls-color-muted-border);
}

.fileInfo {
  flex: 1;
  min-width: 0;
}

.fileName {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ls-color-text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fileSize {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-muted);
  margin: 0;
}

.processingState {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
}

.processingText {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  color: var(--ls-color-muted);
  margin: 0;
}
```

**Step 2: Create the dialog component**

```typescript
// apps/dashboard/components/forms/ImportFormDialog.tsx

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import {
  StyledTextField,
  StyledSelect,
  inputLabelSx,
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
  menuItemSx,
  alertSx,
  fontFamily,
} from './dialogStyles';
import sty from './ImportFormDialog.module.css';
import type { FormGroup, FormType } from '@/lib/forms/types';

interface ImportFormDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (slug: string) => void;
  groups: FormGroup[];
  getAccessToken: () => Promise<string | null>;
}

const FORM_TYPE_OPTIONS: { value: FormType; label: string }[] = [
  { value: 'custom', label: 'Custom' },
  { value: 'rating', label: 'Rating' },
  { value: 'discipline', label: 'Discipline' },
  { value: 'evaluation', label: 'Evaluation' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportFormDialog({
  open,
  onClose,
  onImported,
  groups,
  getAccessToken,
}: ImportFormDialogProps) {
  const [activeTab, setActiveTab] = React.useState(0); // 0 = PDF, 1 = URL
  const [formName, setFormName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [groupId, setGroupId] = React.useState('');
  const [formType, setFormType] = React.useState<FormType>('custom');
  const [url, setUrl] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [processingMessage, setProcessingMessage] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setActiveTab(0);
      setFormName('');
      setDescription('');
      setGroupId('');
      setFormType('custom');
      setUrl('');
      setFile(null);
      setError('');
      setImporting(false);
      setProcessingMessage('');
    }
  }, [open]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a PDF file.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file.');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be under 10 MB.');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleImport = async () => {
    setError('');

    // Validate required fields
    if (!groupId) {
      setError('Please select a form group.');
      return;
    }
    if (activeTab === 0 && !file) {
      setError('Please upload a PDF file.');
      return;
    }
    if (activeTab === 1 && !url.trim()) {
      setError('Please enter a URL.');
      return;
    }

    setImporting(true);
    setProcessingMessage('Analyzing form structure...');

    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let body: Record<string, any>;

      if (activeTab === 0 && file) {
        // Convert PDF to base64
        setProcessingMessage('Reading PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        setProcessingMessage('Parsing form with AI...');
        body = {
          source_type: 'pdf',
          file_data: base64,
          file_media_type: 'application/pdf',
          name: formName || undefined,
          description: description || undefined,
          group_id: groupId,
          form_type: formType,
        };
      } else {
        setProcessingMessage('Fetching form page...');
        body = {
          source_type: 'url',
          url: url.trim(),
          name: formName || undefined,
          description: description || undefined,
          group_id: groupId,
          form_type: formType,
        };
      }

      const res = await fetch('/api/forms/import', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      // Success — redirect to editor
      setProcessingMessage('Form created! Opening editor...');
      onImported(data.slug || data.id);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setImporting(false);
      setProcessingMessage('');
    }
  };

  const canImport =
    groupId &&
    ((activeTab === 0 && file) || (activeTab === 1 && url.trim())) &&
    !importing;

  return (
    <Dialog
      open={open}
      onClose={importing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Import Form
        <IconButton
          size="small"
          onClick={onClose}
          disabled={importing}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        {error && (
          <Alert severity="error" sx={alertSx}>
            {error}
          </Alert>
        )}

        {importing ? (
          <div className={sty.processingState}>
            <CircularProgress size={40} sx={{ color: 'var(--ls-color-brand)' }} />
            <p className={sty.processingText}>{processingMessage}</p>
            <LinearProgress
              sx={{
                width: '100%',
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'var(--ls-color-brand)',
                },
              }}
            />
          </div>
        ) : (
          <>
            {/* Source tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                minHeight: 36,
                '& .MuiTabs-indicator': {
                  backgroundColor: 'var(--ls-color-brand)',
                },
                '& .MuiTab-root': {
                  fontFamily,
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: 36,
                  padding: '6px 16px',
                  color: 'var(--ls-color-muted)',
                  '&.Mui-selected': {
                    color: 'var(--ls-color-brand)',
                    fontWeight: 600,
                  },
                },
              }}
            >
              <Tab
                icon={<PictureAsPdfOutlinedIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label="Upload PDF"
              />
              <Tab
                icon={<LinkOutlinedIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label="Paste URL"
              />
            </Tabs>

            <div className={sty.tabContent}>
              {/* PDF Upload */}
              {activeTab === 0 && (
                <>
                  {!file ? (
                    <div
                      className={`${sty.dropZone} ${dragActive ? sty.dropZoneActive : ''}`}
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadFileOutlinedIcon className={sty.dropZoneIcon} />
                      <p className={sty.dropZoneText}>
                        Drag & drop a PDF here, or{' '}
                        <span className={sty.dropZoneBrowse}>browse</span>
                      </p>
                      <p className={sty.dropZoneHint}>PDF only, max 10 MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div className={sty.filePreview}>
                      <InsertDriveFileOutlinedIcon
                        sx={{ fontSize: 28, color: 'var(--ls-color-brand)' }}
                      />
                      <div className={sty.fileInfo}>
                        <p className={sty.fileName}>{file.name}</p>
                        <p className={sty.fileSize}>{formatFileSize(file.size)}</p>
                      </div>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </div>
                  )}
                </>
              )}

              {/* URL Input */}
              {activeTab === 1 && (
                <StyledTextField
                  size="small"
                  label="Form URL"
                  placeholder="https://forms.google.com/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  fullWidth
                  InputLabelProps={{ sx: inputLabelSx }}
                />
              )}
            </div>

            {/* Shared fields */}
            <FormControl fullWidth size="small">
              <InputLabel sx={inputLabelSx}>Form Group *</InputLabel>
              <StyledSelect
                value={groupId}
                onChange={(e) => setGroupId(e.target.value as string)}
                label="Form Group *"
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id} sx={menuItemSx}>
                    {g.name}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel sx={inputLabelSx}>Form Type *</InputLabel>
              <StyledSelect
                value={formType}
                onChange={(e) => setFormType(e.target.value as FormType)}
                label="Form Type *"
              >
                {FORM_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
                    {opt.label}
                  </MenuItem>
                ))}
              </StyledSelect>
            </FormControl>

            <StyledTextField
              size="small"
              label="Form Name (optional)"
              placeholder="Leave blank to use AI-suggested name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              InputLabelProps={{ sx: inputLabelSx }}
            />

            <StyledTextField
              size="small"
              label="Description (optional)"
              placeholder="Leave blank to use AI-suggested description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              InputLabelProps={{ shrink: true, sx: inputLabelSx }}
            />
          </>
        )}
      </DialogContent>

      {!importing && (
        <DialogActions sx={dialogActionsSx}>
          <Button onClick={onClose} sx={cancelButtonSx}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!canImport}
            startIcon={
              <UploadFileOutlinedIcon sx={{ fontSize: 16 }} />
            }
            sx={primaryButtonSx}
          >
            Import
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
```

**Step 3: Commit**

```bash
git add apps/dashboard/components/forms/ImportFormDialog.tsx apps/dashboard/components/forms/ImportFormDialog.module.css
git commit -m "feat(forms): add ImportFormDialog component with PDF drag-drop and URL paste"
```

---

## Task 4: Wire Import Dialog into FormManagementPage

**Files:**
- Modify: `apps/dashboard/components/forms/FormManagementToolbar.tsx` (add onImportForm prop + button)
- Modify: `apps/dashboard/components/pages/FormManagementPage.tsx` (add import state + dialog)

**Step 1: Add onImportForm prop to toolbar**

In `apps/dashboard/components/forms/FormManagementToolbar.tsx`:

1. Add `onImportForm: () => void;` to `FormManagementToolbarProps` (after line 20)
2. Add `onImportForm` to the destructured props (after line 36)
3. Add an "Import Form" button before the "Create Group" button in the actions div (before line 58)

The new button should use the `outlined` variant to match "Create Group":

```typescript
<Button
  variant="outlined"
  size="small"
  startIcon={<UploadFileOutlinedIcon sx={{ fontSize: 16 }} />}
  onClick={onImportForm}
  sx={{
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'none',
    borderColor: 'var(--ls-color-muted-border)',
    color: 'var(--ls-color-text-primary)',
    borderRadius: '8px',
    padding: '6px 14px',
    '&:hover': {
      borderColor: 'var(--ls-color-border)',
      backgroundColor: 'var(--ls-color-neutral-foreground)',
    },
  }}
>
  Import Form
</Button>
```

Add import at top: `import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';`

**Step 2: Add import dialog state to FormManagementPage**

In `apps/dashboard/components/pages/FormManagementPage.tsx`:

1. Add import: `import { ImportFormDialog } from '@/components/forms/ImportFormDialog';`
2. Add state (after line 43): `const [importFormOpen, setImportFormOpen] = React.useState(false);`
3. Add `onImportForm` prop to `<FormManagementToolbar>` (line 266-273):
   ```typescript
   onImportForm={() => setImportFormOpen(true)}
   ```
4. Add `<ImportFormDialog>` after `<CreateGroupDialog>` (after line 346):
   ```typescript
   <ImportFormDialog
     open={importFormOpen}
     onClose={() => setImportFormOpen(false)}
     onImported={(slug) => {
       setImportFormOpen(false);
       setSnackbar({ open: true, message: 'Form imported successfully', severity: 'success' });
       router.push(`/form-management/${slug}`);
     }}
     groups={groups}
     getAccessToken={getAccessToken}
   />
   ```

**Step 3: Verify the build**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard build`

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add apps/dashboard/components/forms/FormManagementToolbar.tsx apps/dashboard/components/pages/FormManagementPage.tsx
git commit -m "feat(forms): wire import dialog into form management page"
```

---

## Task 5: Add Environment Variable to Vercel

**Step 1: Document the required environment variable**

The `ANTHROPIC_API_KEY` environment variable needs to be added to the Vercel dashboard project settings for the dashboard app. This cannot be done via code — it must be done manually in the Vercel UI.

Add to `.env.example` (if not already done in Task 2):
```
# Form Import (AI parsing)
ANTHROPIC_API_KEY=           # Claude API key for form import feature
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add ANTHROPIC_API_KEY to env example"
```

---

## Task 6: Manual Testing Checklist

Test the following scenarios in the browser:

1. **PDF Import — Simple Form**
   - Upload a simple PDF form (e.g., a contact form with name, email, phone, message)
   - Verify: All fields detected, correct types assigned, Spanish labels generated
   - Verify: Redirect to form editor with fields visible

2. **PDF Import — Evaluation with Scoring**
   - Upload a PDF review/evaluation form that has point values or rating scales
   - Set form type to "Evaluation"
   - Verify: Scoring weights and types extracted into evaluation settings
   - Verify: Sections created if the form has categorized scoring

3. **URL Import — Google Form**
   - Create a test Google Form with various field types (text, select, checkbox, radio, date)
   - Share the form and paste the URL
   - Verify: Fields parsed correctly from the HTML
   - Verify: Options preserved for select/radio/checkbox fields

4. **URL Import — JotForm**
   - Create a test JotForm with similar field types
   - Paste the public form URL
   - Verify: Fields parsed correctly

5. **Error Cases**
   - Upload a non-PDF file -> error message
   - Enter an invalid URL -> error message
   - Submit without selecting a group -> validation error
   - Enter a URL that returns 404 -> appropriate error

6. **Data Source Detection**
   - Import a PDF form that asks for "Employee Name", "Supervisor", "Position"
   - Verify: AI creates `select` fields with `dataSource` set to `employees`, `leaders`, `positions` respectively
   - Verify: No options array is included for data source fields
   - Verify: In the editor, the data source dropdown shows the correct source selected

7. **Text Block Detection**
   - Import a PDF form that contains instructions or disclaimer text
   - Verify: AI creates `text_block` fields with `content` containing the text
   - Verify: In the editor, the text block renders inline with the TipTap editor

8. **Section Structure**
   - Import a form with clear section headings
   - Verify: Section fields are created and child fields reference them via sectionId
   - Verify: Required fields are marked correctly
   - Verify: Options are preserved for selection fields

---

## Architecture Notes

### Why Claude API Direct (not via Agent)?
- Agent is for mobile chat, not form parsing
- Direct API call with tool_use gives structured, validated output
- No additional deployment dependency
- Can use Claude Sonnet 4 for best accuracy-to-cost ratio

### Why tool_use for Structured Output?
- Guarantees the response matches our FormField[] shape
- No need to parse freeform text or JSON from markdown
- Claude follows the schema exactly — field types are constrained to our enum
- Error handling is simpler (either tool_use block exists or it doesn't)

### Cost Estimate
- ~$0.01-0.05 per import (Claude Sonnet 4 pricing)
- PDF with vision: slightly more tokens due to image processing
- No storage cost — PDFs are base64-encoded in memory, not stored

### Future Extensions
- Add Google Forms OAuth integration for richer field metadata
- Add JotForm API key integration for direct API import
- Support image/screenshot import (already works via Claude vision)
- Support competitor form screenshots (OneClickApp, ConnectTeam) via PDF/screenshot import
- Batch import (multiple forms at once)
