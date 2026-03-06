/**
 * Shared DeepL translation helper
 * Server-side utility for translating text to Spanish via DeepL API.
 * Used by API routes and backfill scripts.
 */

const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

/**
 * Translate an array of English strings to Spanish.
 * Returns original texts on failure (non-blocking).
 * Filters empty strings automatically.
 */
export async function translateToSpanish(texts: string[]): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.warn('[deepl] DEEPL_API_KEY not configured, returning originals');
    return texts;
  }

  // Track non-empty texts and their original positions
  const entries: { text: string; index: number }[] = [];
  texts.forEach((text, index) => {
    if (text && text.trim()) {
      entries.push({ text: text.trim(), index });
    }
  });

  if (entries.length === 0) {
    return texts.map(() => '');
  }

  try {
    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: entries.map((e) => e.text),
        target_lang: 'ES',
        source_lang: 'EN',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[deepl] API error:', response.status, errorText);
      return texts; // Return originals on failure
    }

    const data = await response.json();
    const results = texts.map(() => '');
    data.translations.forEach((t: { text: string }, idx: number) => {
      results[entries[idx].index] = t.text;
    });
    return results;
  } catch (error) {
    console.error('[deepl] Translation failed:', error);
    return texts; // Return originals on failure
  }
}
