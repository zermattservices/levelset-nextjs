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
