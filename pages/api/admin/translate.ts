import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Translation API endpoint using DeepL
 * 
 * POST /api/admin/translate
 * Body: { texts: string[], targetLang: 'ES' | 'EN' }
 * Returns: { translations: string[] }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { texts, targetLang } = req.body;

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'texts array is required' });
  }

  if (!targetLang || !['ES', 'EN'].includes(targetLang)) {
    return res.status(400).json({ error: 'targetLang must be ES or EN' });
  }

  const apiKey = process.env.DEEPL_API_KEY;
  
  if (!apiKey) {
    // Fallback: return original texts with a note (for development without API key)
    console.warn('[translate] DEEPL_API_KEY not configured, returning original texts');
    return res.status(200).json({ 
      translations: texts,
      warning: 'Translation API not configured. Please set DEEPL_API_KEY environment variable.'
    });
  }

  try {
    // Filter out empty strings and track their indices
    const nonEmptyTexts: { text: string; index: number }[] = [];
    texts.forEach((text, index) => {
      if (text && text.trim()) {
        nonEmptyTexts.push({ text: text.trim(), index });
      }
    });

    if (nonEmptyTexts.length === 0) {
      return res.status(200).json({ translations: texts.map(() => '') });
    }

    // DeepL API call
    const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: nonEmptyTexts.map(t => t.text),
        target_lang: targetLang,
        source_lang: targetLang === 'ES' ? 'EN' : 'ES',
      }),
    });

    if (!deeplResponse.ok) {
      const errorText = await deeplResponse.text();
      console.error('[translate] DeepL API error:', deeplResponse.status, errorText);
      
      // If quota exceeded or auth error, return original texts
      if (deeplResponse.status === 403 || deeplResponse.status === 456) {
        return res.status(200).json({ 
          translations: texts,
          warning: 'Translation quota exceeded or invalid API key.'
        });
      }
      
      throw new Error(`DeepL API error: ${deeplResponse.status}`);
    }

    const deeplData = await deeplResponse.json();
    
    // Map translations back to original indices
    const translations = texts.map(() => '');
    deeplData.translations.forEach((t: { text: string }, idx: number) => {
      const originalIndex = nonEmptyTexts[idx].index;
      translations[originalIndex] = t.text;
    });

    return res.status(200).json({ translations });
  } catch (error: any) {
    console.error('[translate] Error:', error);
    return res.status(500).json({ error: error.message || 'Translation failed' });
  }
}
