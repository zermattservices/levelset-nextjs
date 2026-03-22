/**
 * Generate an AI summary for an evaluation submission.
 *
 * Calls OpenRouter (Gemini 2.5 Flash) with a fully flattened representation
 * of the completed evaluation — sections, paragraph text, field descriptions,
 * scored questions with answers, boolean checklist items, and free-text responses.
 *
 * Best-effort — failures return null and don't block submission.
 */

import type { FormField } from './schema-builder';

interface SectionScoreSummary {
  sectionName: string;
  earned: number;
  max: number;
  percentage: number;
}

/** Scale label for scored field types */
function getScaleLabel(field: FormField, rawValue: any): string {
  if (field.type === 'rating_1_5') return `${rawValue} / 5`;
  if (field.type === 'rating_1_3') return `${rawValue} / 3`;
  if (field.type === 'numeric_score') return `${rawValue} / ${field.settings.maxValue ?? 10}`;
  if (field.type === 'true_false') return rawValue ? 'Yes' : 'No';
  return String(rawValue);
}

/**
 * Flatten the entire completed form into a human-readable document.
 *
 * Preserves sections, paragraph/text blocks, field descriptions/help text,
 * scored questions with ratings, boolean checklist items, and free-text answers.
 */
function flattenForm(fields: FormField[], responseData: Record<string, any>): string {
  const lines: string[] = [];

  // Build a map of section ID → section field
  const sectionMap = new Map<string, FormField>();
  const topLevelFields: FormField[] = [];

  for (const field of fields) {
    if (field.type === 'section') {
      sectionMap.set(field.id, field);
    } else if (!field.sectionId) {
      topLevelFields.push(field);
    }
  }

  // Group fields by section
  const sectionChildren = new Map<string, FormField[]>();
  for (const field of fields) {
    if (field.sectionId && field.type !== 'section') {
      const children = sectionChildren.get(field.sectionId) || [];
      children.push(field);
      sectionChildren.set(field.sectionId, children);
    }
  }

  // Render a single field
  function renderField(field: FormField, indent: string): void {
    // Skip system fields (employee name picker, date)
    if (field.settings.isSystemField) return;
    // Skip signature fields (base64 data)
    if (field.type === 'signature') return;

    const val = responseData[field.id];

    // Text block / paragraph — render the template content
    if (field.type === 'text_block') {
      if (field.settings.content) {
        lines.push(`${indent}${field.settings.content}`);
      }
      return;
    }

    // Build the field line
    const label = field.label || field.id;
    const description = field.description ? ` (${field.description})` : '';

    if (field.settings.scored) {
      // Scored question — show rating with scale
      const answer = val != null ? getScaleLabel(field, val) : 'Not answered';
      const weight = field.settings.weight ? ` [${field.settings.weight} pts possible]` : '';
      lines.push(`${indent}${label}${description}: ${answer}${weight}`);
    } else if (field.type === 'true_false' || field.type === 'yes_no' || typeof val === 'boolean') {
      // Boolean / checklist item
      lines.push(`${indent}${label}${description}: ${val ? 'Yes' : 'No'}`);
    } else if (['text', 'textarea', 'long_text'].includes(field.type)) {
      // Free text
      const text = typeof val === 'string' ? val.trim() : '';
      if (text) {
        lines.push(`${indent}${label}${description}: "${text}"`);
      } else {
        lines.push(`${indent}${label}${description}: [No response]`);
      }
    } else if (field.type === 'select' || field.type === 'radio') {
      // Selection — try to resolve option label
      if (field.options && val != null) {
        const option = field.options.find((o) => o.value === String(val));
        lines.push(`${indent}${label}${description}: ${option?.label || val}`);
      } else if (val != null) {
        lines.push(`${indent}${label}${description}: ${val}`);
      }
    } else if (val != null && val !== '') {
      lines.push(`${indent}${label}${description}: ${val}`);
    }
  }

  // Render sections in order
  for (const field of fields) {
    if (field.type === 'section') {
      const sectionName = field.settings.sectionName || field.label || 'Section';
      lines.push('');
      lines.push(`=== ${sectionName} ===`);
      if (field.description) {
        lines.push(field.description);
      }

      const children = sectionChildren.get(field.id) || [];
      for (const child of children) {
        renderField(child, '  ');
      }
    }
  }

  // Render top-level fields (not in any section)
  if (topLevelFields.length > 0) {
    lines.push('');
    lines.push('=== Other Fields ===');
    for (const field of topLevelFields) {
      renderField(field, '  ');
    }
  }

  return lines.join('\n');
}

export async function generateEvalSummary(opts: {
  employeeName: string | null;
  formName: string;
  overallScore: number;
  sectionScores: SectionScoreSummary[];
  fields: FormField[];
  responseData: Record<string, any>;
}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const scoredSummary = opts.sectionScores
      .map((s) => `  ${s.sectionName}: ${s.earned.toFixed(1)}/${s.max.toFixed(1)} (${Math.round(s.percentage)}%)`)
      .join('\n');

    const formContent = flattenForm(opts.fields, opts.responseData);

    const prompt = `You are summarizing an employee evaluation for a restaurant manager. Write a concise 2-4 sentence summary paragraph.

Evaluation: ${opts.formName}
Employee: ${opts.employeeName || 'Unknown'}
Overall Score: ${Math.round(opts.overallScore)}%

Section Scores:
${scoredSummary}

Full Evaluation Content:
${formContent}

Write a brief, professional summary that highlights the overall performance, strongest and weakest areas, any notable checklist items (especially promotion recommendations), and any meaningful free-text feedback. Do not use bullet points or headers — write it as a natural paragraph. Do not repeat the exact percentage numbers for every section.`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://levelset.io',
        'X-Title': 'Levelset',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      console.error('[eval-summary] OpenRouter error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const summary = data.choices?.[0]?.message?.content?.trim();
    return summary || null;
  } catch (err) {
    console.error('[eval-summary] Failed to generate summary:', err);
    return null;
  }
}
