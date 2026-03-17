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
    scored?: boolean;
    maxValue?: number;
    sectionName?: string;
    sectionNameEs?: string;
    /** For select fields with predefined data sources */
    dataSource?: DataSource;
    /** For employee selects: filter by role names */
    roleFilter?: string[];
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
- **numeric_score**: Numeric input with a configurable maximum. Use for scores where the answer is a number out of a max value (e.g., 3.5 / 5). Set settings.maxValue to define the denominator.
- **signature**: Signature capture pad. Use for signature lines, sign-off fields.
- **file_upload**: File upload widget. Use for document or photo attachments.

### Section / Layout
- **section**: Section header (not a data field). Use to group related fields under a heading. When you detect a section header or category heading in the form, create a section field. Fields that follow this section should reference it via sectionId.
- **text_block**: Static text content block (not a data field). Use for instructions, disclaimers, explanatory text, or any block of text that should be displayed on the form but doesn't collect data. Set settings.content to the HTML content and settings.contentEs for the Spanish version.

## Data Sources (for select fields only)

When a field clearly asks for organizational data, use type "select" with settings.dataSource set to one of these values:

- **employees**: Use when the field asks for an employee name, team member, supervisor, manager, leader, evaluator, reviewer, trainer, or "who" in the context of selecting a person from the organization. Common patterns: a field labeled "Name", "Employee Name", "Team Member", "Trainer", "Evaluator" on an evaluation or review form — these are almost always employee selects, NOT text inputs. The role filter can be configured in the editor after import.
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
  orgRoles?: string[];
}): string {
  const { sourceType, formType, includeScoring, orgRoles } = options;

  let prompt = `You are an expert form parser for Levelset, a restaurant/hospitality employee management platform. Your job is to analyze ${sourceType === 'pdf' ? 'a PDF document containing a form' : 'the HTML of a web page containing a form'} and extract its structure into a precise list of form fields.

## CRITICAL RULES

1. **Accuracy is paramount.** Every field in the source form MUST be represented. Do not skip fields. Do not invent fields that don't exist.
2. **Field type selection matters.** Choose the most appropriate field type from the list below. When in doubt between text and textarea, prefer text for short labels and textarea for anything expecting paragraphs.
3. **Bilingual output required.** For every label, provide both English (label) and Spanish (labelEs) translations. If the source is in Spanish, still provide the English translation. If the source is in English, provide accurate Spanish translations.
4. **Preserve form structure and ordering.** If the form has sections, groups, or categories, create section fields and assign sectionId to child fields. CRITICAL: Output fields in the exact order they appear in the source document — section header first, then all fields belonging to that section, then the next section header, and so on. Do NOT output all sections first followed by fields.
5. **Detect required fields.** If a field is marked as required (asterisk, "required" label, bold emphasis), set required: true.
6. **Preserve options exactly.** For select/radio/checkbox fields with custom options, extract all options with their exact labels. Generate snake_case values from the labels.
7. **Section headers are fields too.** When you see a heading that groups other fields (like "Employee Information" or "Performance Ratings"), create a section field for it. Set the sectionName in settings to the heading text. Section header fields MUST appear immediately before the fields they contain.
8. **Use data sources for organizational fields.** If a field clearly asks for an employee, leader/supervisor, position, infraction type, or discipline action, use type "select" with settings.dataSource instead of a generic text or select field. Do NOT include an options array when using a data source.
9. **Use text_block for static content.** If you see instructions, disclaimers, or explanatory text blocks on the form (not field labels/descriptions), create a text_block field with settings.content containing the HTML-formatted content.
10. **ALWAYS extract help text / descriptions.** If a field has descriptive text, instructions, or explanatory text below or next to its label, this MUST be captured in the description field (English) and descriptionEs field (Spanish). This is critical — do not skip help text. Common patterns: italic text under a question label, smaller text explaining what the field is about, bullet points describing criteria. For example, if a field says "Hospitality" with text below saying "Serving with warmth, care, and others first mindset", the description should be "Serving with warmth, care, and others first mindset".

${FIELD_TYPE_DESCRIPTIONS}

${orgRoles && orgRoles.length > 0 ? `### Role Filter for Employee Selects

The organization has these employee roles: ${orgRoles.map((r: string) => `"${r}"`).join(', ')}

When a field uses dataSource "employees", you should infer which role(s) to filter to based on the form's context. Set \`settings.roleFilter\` to an array of matching role names. Examples:
- A form titled "Trainer Evaluation" with a "Name" field → roleFilter: ["Trainer"]
- A form titled "Team Lead Review" with an "Employee" field → roleFilter: ["Team Lead"]
- A generic "Employee Name" field on a general form → no roleFilter (show all employees)

Only set roleFilter when you can confidently infer the role from the form title, section context, or field label. Use the exact role names from the list above.
` : ''}

## CRITICAL: Field Ordering and Section Structure

The output field order MUST exactly match the order fields appear in the source document. This is the single most important structural requirement.

### Ordering Rules

1. **Top-level items** (sections, standalone text blocks, standalone fields) must appear in document order.
2. **Section children** must appear immediately after their section header in the array, in the exact order they appear within that section in the document.
3. **Text blocks inside sections** (like description text that appears right after a section header) are children of that section. They should have a sectionId pointing to their section and appear before the data fields in that section.
4. **Text blocks outside sections** (like a strategy description between the employee info section and the first part) are top-level. They should NOT have a sectionId.

### Complete Structural Example

For a form with: Employee Info section (Name, Date), then a standalone description paragraph, then Part 1 section (description + 3 rated questions):

\`\`\`
1. { type: "section", label: "Employee Information", settings: { sectionName: "Employee Information" } }
2. { type: "select", label: "Name", sectionId: "section_employee_information", settings: { dataSource: "employees" } }
3. { type: "date", label: "Date", sectionId: "section_employee_information" }
4. { type: "text_block", label: "Strategy Description", settings: { content: "<p>...</p>" } }  ← NO sectionId, top-level
5. { type: "section", label: "Part 1 - Team Culture", settings: { sectionName: "Part 1 - Team Culture" } }
6. { type: "text_block", label: "Part 1 Description", sectionId: "section_part_1_-_team_culture", settings: { content: "<p><em>...</em></p>" } }  ← child of Part 1
7. { type: "rating_1_3", label: "Hospitality", sectionId: "section_part_1_-_team_culture", settings: { scored: true, weight: 3 } }
8. { type: "rating_1_3", label: "Hustle", sectionId: "section_part_1_-_team_culture", settings: { scored: true, weight: 3 } }
\`\`\`

Notice: item 4 is between two sections and has no sectionId. Items 6-8 are children of item 5 and have its sectionId.`;

  if (includeScoring && formType === 'evaluation') {
    prompt += `

## Scoring Extraction (Evaluation Forms) — CRITICAL

This form is being imported as an **evaluation** form type. You MUST carefully analyze the scoring structure.

### How Evaluation Scoring Works in Our System

Our evaluation system uses **sections** as containers with **per-field scoring**. Each scored question has \`settings.scored: true\` and a \`settings.weight\` (points). Scoring type is auto-derived from the field type — you do NOT set a separate scoringType. Sections aggregate points from their scored children.

### Step-by-Step Scoring Analysis

1. **Identify sections**: Look for labeled parts/sections that group questions (e.g., "Part 1 - Team Culture"). Create a \`section\` type field for each. Fields within that section should appear after the section in the array.

2. **Identify the rating scale**: Look for column headers like "(1) = Below Standard, (2) = Meet Standard, (3) = Exceeding Standard":
   - 3-point scale → use field type \`rating_1_3\`
   - 5-point scale → use field type \`rating_1_5\`

3. **Each rated row is a scored field**: Every row with checkboxes/rating marks is a scored question. Set:
   - \`type\`: the rating type (e.g., \`rating_1_3\`)
   - \`settings.scored\`: \`true\`
   - \`settings.weight\`: the points this question is worth

4. **Calculate weights from totals**: If the form says "SCORE: __ OUT OF 9 POINTS" for 3 questions, each question's weight = 3 (since 3 questions × 3 points each = 9).

5. **Yes/No verification questions**: Questions with YES/NO checkboxes that are NOT rated/scored should be \`true_false\` type WITHOUT \`settings.scored\`. These are verification items, not scored items.

6. **Score summary fields (SKIP THESE)**: Lines like "TOTAL SCORE: ___" are computed summaries — do NOT create fields for these.

7. **Free text areas**: Fields like "3 Areas to Focus On" are \`textarea\` fields, not scored.

### Example: A form with "Part 1 - Team Culture" containing 3 questions rated 1-3

Fields (in order):
- { type: "section", label: "Part 1 - Team Culture", settings: { sectionName: "Part 1 - Team Culture" } }
- { type: "rating_1_3", label: "Hospitality", settings: { scored: true, weight: 3 }, required: true }
- { type: "rating_1_3", label: "Hustle", settings: { scored: true, weight: 3 }, required: true }`;
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

${includeScoring && formType === 'evaluation' ? '- Scored fields should have settings.scored=true and settings.weight set. Sections contain their scored fields as children.' : ''}`;

  return prompt;
}

/**
 * The tool schema for structured output via OpenRouter (OpenAI function calling format).
 * This defines the exact shape of the response we expect.
 */
export const FORM_PARSER_TOOL = {
  type: 'function' as const,
  function: {
    name: 'extract_form_fields',
    description: 'Extract the form structure as a list of typed fields with labels, options, and settings.',
    parameters: {
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
                'rating_1_3', 'rating_1_5', 'numeric_score',
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
                weight: { type: 'number', description: 'Scoring weight in points (evaluation fields)' },
                scored: { type: 'boolean', description: 'Whether this field contributes to the evaluation score' },
                maxValue: { type: 'number', description: 'Maximum input value for numeric_score fields (the denominator)' },
                sectionName: { type: 'string', description: 'Section heading (section fields)' },
                sectionNameEs: { type: 'string', description: 'Spanish section heading' },
                dataSource: {
                  type: 'string',
                  enum: ['employees', 'positions', 'infractions', 'disc_actions'],
                  description: 'Data source for select fields that reference organizational data. Only set for select fields. Do not set for custom-option selects.',
                },
                roleFilter: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of role names to filter the employee list. Only set when dataSource is "employees" and you can infer the relevant role(s) from context.',
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
    },
    required: ['fields'],
    },
  },
};
