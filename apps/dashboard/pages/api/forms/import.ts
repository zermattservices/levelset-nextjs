// apps/dashboard/pages/api/forms/import.ts

import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';
import { fieldsToJsonSchema, generateFieldId } from '@/lib/forms/schema-builder';
import type { FormField } from '@/lib/forms/schema-builder';
import {
  buildSystemPrompt,
  FORM_PARSER_TOOL,
  type ParsedFormResult,
} from '@/lib/forms/import-prompt';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

// Increase body size limit for PDF uploads (default is 1mb)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function importHandler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'Form import is not configured. Missing OPENROUTER_API_KEY.' });
  }

  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  // Look up app_user for created_by
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle();

  // ── Parse request body ──
  const {
    source_type,
    url,
    file_data,
    name,
    description,
    group_id,
  } = req.body;
  let { form_type } = req.body;

  if (!source_type || !group_id) {
    return res.status(400).json({
      error: 'source_type and group_id are required',
    });
  }

  if (!['pdf', 'url'].includes(source_type)) {
    return res.status(400).json({ error: 'source_type must be "pdf" or "url"' });
  }

  if (source_type === 'url' && !url) {
    return res.status(400).json({ error: 'URL is required for URL import' });
  }

  if (source_type === 'pdf' && !file_data) {
    return res.status(400).json({ error: 'file_data is required for PDF import' });
  }

  // Verify group belongs to this org
  const { data: group } = await supabase
    .from('form_groups')
    .select('id, org_id, slug, is_system')
    .eq('id', group_id)
    .eq('org_id', orgId)
    .single();

  if (!group) {
    return res.status(404).json({ error: 'Form group not found' });
  }

  // PE and Discipline system groups are locked — cannot import into them
  const lockedSlugs = ['positional_excellence', 'discipline'];
  if (lockedSlugs.includes(group.slug)) {
    return res.status(400).json({ error: 'Cannot add forms to this system group' });
  }

  // Auto-derive form_type from group slug, fall back to 'custom'
  const slugToType: Record<string, string> = {
    evaluations: 'evaluation',
  };
  const derivedType = slugToType[group.slug] || 'custom';
  if (!form_type) {
    form_type = derivedType;
  }

  const validTypes = ['rating', 'discipline', 'evaluation', 'custom'];
  if (!validTypes.includes(form_type)) {
    return res.status(400).json({ error: 'Invalid form_type' });
  }

  if (slugToType[group.slug] && form_type !== derivedType) {
    return res.status(400).json({
      error: `The "${group.slug}" group requires form type "${derivedType}"`,
    });
  }

  try {
    // ── Build messages for OpenRouter ──
    const systemPrompt = buildSystemPrompt({
      sourceType: source_type,
      formType: form_type,
      includeScoring: source_type === 'pdf' && form_type === 'evaluation',
    });

    const userContent: any[] = [];

    if (source_type === 'pdf') {
      // Send PDF as a file content block (OpenRouter format)
      userContent.push({
        type: 'file',
        file: {
          filename: 'form.pdf',
          file_data: `data:application/pdf;base64,${file_data}`,
        },
      });
      userContent.push({
        type: 'text',
        text: 'Parse this PDF form and extract all fields using the extract_form_fields tool. Be thorough — capture every field, option, and section header.',
      });
    } else {
      // Validate URL to prevent SSRF
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
      }
      const hostname = parsedUrl.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname === '169.254.169.254' ||
        hostname.endsWith('.internal')
      ) {
        return res.status(400).json({ error: 'Internal URLs are not allowed' });
      }

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

    // ── Call Claude via OpenRouter ──
    const openrouterResponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://levelset.io',
        'X-Title': 'Levelset Form Import',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.5',
        max_tokens: 8192,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        tools: [FORM_PARSER_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_form_fields' } },
      }),
    });

    if (!openrouterResponse.ok) {
      const errBody = await openrouterResponse.text();
      console.error('OpenRouter API error:', openrouterResponse.status, errBody);
      return res.status(500).json({
        error: 'AI service is temporarily unavailable. Please try again.',
      });
    }

    const aiResult = await openrouterResponse.json();

    // Extract tool call result from OpenAI-format response
    const message = aiResult.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (!toolCall || toolCall.function?.name !== 'extract_form_fields') {
      return res.status(500).json({
        error: 'AI failed to parse the form. Please try again.',
      });
    }

    let parsed: ParsedFormResult;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return res.status(500).json({
        error: 'AI returned invalid data. Please try again.',
      });
    }

    if (!parsed.fields || parsed.fields.length === 0) {
      return res.status(400).json({
        error: 'No form fields were detected. Please check the source and try again.',
      });
    }

    // ── Convert parsed fields to FormField[] with generated IDs ──
    const sectionIdMap: Record<string, string> = {};
    const formFields: FormField[] = [];

    for (const parsedField of parsed.fields) {
      const fieldId = generateFieldId();

      if (parsedField.type === 'section') {
        const aiSectionKey = parsedField.sectionId || parsedField.label.toLowerCase().replace(/\s+/g, '_');
        sectionIdMap[aiSectionKey] = fieldId;
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
      }

      // Add options for selection fields (only for custom-option selects, not data source selects)
      if (parsedField.options && parsedField.options.length > 0 && !parsedField.settings?.dataSource) {
        field.options = parsedField.options;
      }

      formFields.push(field);
    }

    // Second pass: resolve sectionId references and build section children arrays
    // Initialize children arrays on all section fields
    for (const field of formFields) {
      if (field.type === 'section') {
        field.children = [];
      }
    }

    for (let i = 0; i < formFields.length; i++) {
      const field = formFields[i];
      const parsedField = parsed.fields[i];
      if (parsedField.sectionId && parsedField.type !== 'section') {
        const resolvedId =
          sectionIdMap[parsedField.sectionId] ||
          sectionIdMap[parsedField.sectionId.replace(/^section_/, '')] ||
          undefined;
        if (resolvedId) {
          field.sectionId = resolvedId;
          // Add to parent section's children array
          const parentSection = formFields.find((f) => f.id === resolvedId);
          if (parentSection && parentSection.children) {
            parentSection.children.push(field.id);
          }
        }
      }
    }

    // ── Convert to JSON Schema + UI Schema ──
    const { schema, uiSchema } = fieldsToJsonSchema(formFields);

    // ── Build evaluation settings if applicable ──
    let settings: Record<string, any> = {};

    // Scoring is now embedded in the fields via settings.scored and settings.weight.
    // No separate evaluation settings needed — the schema/uiSchema carries everything.

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
        created_by: appUser?.id || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Form template insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save the imported form. Please try again.' });
    }

    return res.status(201).json({
      ...template,
      fieldCount: formFields.length,
      hasScoringData: Object.keys(settings).length > 0,
    });
  } catch (error: any) {
    console.error('Form import error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred during import. Please try again.',
    });
  }
}

export default withPermissionAndContext(P.FM_CREATE_FORMS, importHandler);
