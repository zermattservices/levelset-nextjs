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

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Form import is not configured. Missing ANTHROPIC_API_KEY.' });
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

  if (!['pdf', 'url'].includes(source_type)) {
    return res.status(400).json({ error: 'source_type must be "pdf" or "url"' });
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
