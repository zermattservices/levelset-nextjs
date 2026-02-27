/**
 * POST /api/onboarding/analyze-documents
 *
 * Triggers Levi AI analysis of uploaded documents using OpenRouter.
 * Extracts discipline policies, infractions, and actions from document text.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const ANALYSIS_MODEL = 'anthropic/claude-sonnet-4.5';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'Complete account setup first' });
  }

  const { documentIds } = req.body;

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({ error: 'documentIds array is required' });
  }

  try {
    // Create analysis record
    const { data: analysis, error: createError } = await supabase
      .from('onboarding_levi_analysis')
      .insert({
        org_id: appUser.org_id,
        document_ids: documentIds,
        status: 'processing',
        model: ANALYSIS_MODEL,
      })
      .select('id')
      .single();

    if (createError || !analysis) {
      throw new Error(createError?.message || 'Failed to create analysis record');
    }

    // Start analysis in background (non-blocking response)
    runAnalysis(supabase, analysis.id, appUser.org_id, documentIds).catch(err => {
      console.error('Background analysis failed:', err);
    });

    return res.status(200).json({
      analysisId: analysis.id,
      status: 'processing',
    });
  } catch (err: any) {
    console.error('analyze-documents error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

/**
 * Wait for document extraction to complete (up to maxWait ms).
 * Polls every pollInterval ms until all digests have extraction_status
 * of 'completed' or 'failed', or the timeout is reached.
 */
async function waitForExtraction(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  documentIds: string[],
  orgId: string,
  maxWait = 45000,
  pollInterval = 2000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const { data: digests } = await supabase
      .from('document_digests')
      .select('document_id, extraction_status')
      .in('document_id', documentIds)
      .eq('org_id', orgId);

    if (!digests || digests.length === 0) {
      // No digests exist yet — wait for them
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      continue;
    }

    const allDone = digests.every(
      d => d.extraction_status === 'completed' || d.extraction_status === 'failed'
    );

    if (allDone) return;

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

async function runAnalysis(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  analysisId: string,
  orgId: string,
  documentIds: string[]
) {
  try {
    // Wait for document text extraction to finish before querying content
    await waitForExtraction(supabase, documentIds, orgId);

    // Fetch document content from document_digests — scoped to org
    const { data: digests } = await supabase
      .from('document_digests')
      .select('document_id, content_md')
      .in('document_id', documentIds)
      .eq('org_id', orgId);

    const documentText = (digests || [])
      .map(d => d.content_md)
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!documentText.trim()) {
      // No text extracted — mark as complete with empty results
      console.warn('[analyze-documents] No document text available after extraction');
      await supabase
        .from('onboarding_levi_analysis')
        .update({
          status: 'completed',
          extracted_infractions: [],
          extracted_actions: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', analysisId);
      return;
    }

    // Call OpenRouter for analysis
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not set — skipping analysis');
      await supabase
        .from('onboarding_levi_analysis')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', analysisId);
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: ANALYSIS_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes organizational documents to extract discipline policies.
Extract two things from the provided documents:

1. **Infractions**: Behaviors or violations that should be tracked as discipline infractions. For each, provide:
   - name: a short label (e.g., "Cash Theft", "Public Display of Affection", "Insubordination")
   - description: a brief explanation of what this infraction covers
   - points: always set to 0 (the organization will assign their own point values)

2. **Actions**: Disciplinary consequences mentioned in the documents (e.g., "Written Warning", "Suspension", "Termination"). For each, provide:
   - name: the name of the disciplinary action
   - pointsThreshold: always set to 0 (the organization will set their own thresholds)

Be thorough — extract ALL infractions mentioned in the documents, even if they are listed as bullet points or examples. Group closely related items into a single infraction with a clear name. For example, all forms of "cash theft" (taking money, not ringing sales, giving too much change) should be one infraction called "Cash Theft".

Return your response as valid JSON with this exact structure:
{
  "infractions": [{"name": "string", "points": 0, "description": "string"}],
  "actions": [{"name": "string", "pointsThreshold": 0}]
}

If no discipline information is found, return empty arrays.`,
          },
          {
            role: 'user',
            content: `Analyze the following organizational documents and extract ALL discipline infractions and actions:\n\n${documentText.slice(0, 50000)}`,
          },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[analyze-documents] OpenRouter error:', response.status, errorBody);
      throw new Error(`OpenRouter API returned ${response.status}: ${errorBody.slice(0, 200)}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let parsed: { infractions: any[]; actions: any[] } = { infractions: [], actions: [] };
    try {
      // Try to extract JSON from the response (may be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse analysis response:', content);
    }

    // Mark infractions as fromLevi, ensure points = 0
    const infractions = (parsed.infractions || []).map((i: any) => ({
      ...i,
      points: 0,
      fromLevi: true,
    }));
    const actions = (parsed.actions || []).map((a: any) => ({
      ...a,
      pointsThreshold: 0,
      fromLevi: true,
    }));

    await supabase
      .from('onboarding_levi_analysis')
      .update({
        status: 'completed',
        extracted_infractions: infractions,
        extracted_actions: actions,
        raw_response: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);
  } catch (err: any) {
    console.error('Analysis failed:', err);
    await supabase
      .from('onboarding_levi_analysis')
      .update({
        status: 'failed',
        raw_response: err.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId);
  }
}
