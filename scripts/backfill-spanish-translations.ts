/**
 * Backfill Spanish translations for all reference tables
 *
 * Queries each table for rows where the English column has content
 * but the _es column is NULL, batches them through DeepL, and updates.
 *
 * Usage: npx tsx scripts/backfill-spanish-translations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const deeplApiKey = process.env.DEEPL_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}
if (!deeplApiKey) {
  console.error('Missing DEEPL_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// DeepL helper (direct call, not via API route)
// ---------------------------------------------------------------------------

async function translateBatch(texts: string[]): Promise<string[]> {
  const response = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${deeplApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      target_lang: 'ES',
      source_lang: 'EN',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepL ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.translations.map((t: { text: string }) => t.text);
}

// ---------------------------------------------------------------------------
// Generic backfill for a single column pair
// ---------------------------------------------------------------------------

interface ColumnPair {
  en: string;
  es: string;
}

async function backfillTable(
  table: string,
  columns: ColumnPair[],
  extraFilter?: (query: any) => any
) {
  console.log(`\n--- ${table} ---`);

  for (const { en, es } of columns) {
    // Fetch rows where English has content but Spanish is NULL
    let query = supabase
      .from(table)
      .select(`id, ${en}, ${es}`)
      .not(en, 'is', null)
      .is(es, null)
      .neq(en, '');

    if (extraFilter) query = extraFilter(query);

    const { data: rows, error } = await query;
    if (error) {
      console.error(`  [${en} -> ${es}] Query error:`, error.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`  [${en} -> ${es}] All translated`);
      continue;
    }

    console.log(`  [${en} -> ${es}] ${rows.length} rows to translate`);

    // Process in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const texts = batch.map((r: any) => r[en] as string);

      try {
        const translations = await translateBatch(texts);

        // Update each row
        for (let j = 0; j < batch.length; j++) {
          const { error: updateError } = await supabase
            .from(table)
            .update({ [es]: translations[j] })
            .eq('id', batch[j].id);

          if (updateError) {
            console.error(`    Row ${batch[j].id} update failed:`, updateError.message);
          }
        }

        console.log(`    Batch ${i / BATCH_SIZE + 1}: translated ${batch.length} rows`);
      } catch (err: any) {
        console.error(`    Batch ${i / BATCH_SIZE + 1} failed:`, err.message);
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < rows.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Backfill position_big5_labels (has 6 column pairs)
// ---------------------------------------------------------------------------

async function backfillBig5Labels() {
  console.log(`\n--- position_big5_labels ---`);

  const columns: ColumnPair[] = [
    { en: 'position', es: 'position_es' },
    { en: 'label_1', es: 'label_1_es' },
    { en: 'label_2', es: 'label_2_es' },
    { en: 'label_3', es: 'label_3_es' },
    { en: 'label_4', es: 'label_4_es' },
    { en: 'label_5', es: 'label_5_es' },
  ];

  for (const { en, es } of columns) {
    let query = supabase
      .from('position_big5_labels')
      .select(`id, ${en}, ${es}`)
      .not(en, 'is', null)
      .is(es, null)
      .neq(en, '');

    const { data: rows, error } = await query;
    if (error) {
      console.error(`  [${en} -> ${es}] Query error:`, error.message);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`  [${en} -> ${es}] All translated`);
      continue;
    }

    console.log(`  [${en} -> ${es}] ${rows.length} rows to translate`);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const texts = batch.map((r: any) => r[en] as string);

      try {
        const translations = await translateBatch(texts);

        for (let j = 0; j < batch.length; j++) {
          const { error: updateError } = await supabase
            .from('position_big5_labels')
            .update({ [es]: translations[j] })
            .eq('id', batch[j].id);

          if (updateError) {
            console.error(`    Row ${batch[j].id} update failed:`, updateError.message);
          }
        }

        console.log(`    Batch ${i / BATCH_SIZE + 1}: translated ${batch.length} rows`);
      } catch (err: any) {
        console.error(`    Batch ${i / BATCH_SIZE + 1} failed:`, err.message);
      }

      if (i + BATCH_SIZE < rows.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Starting Spanish translation backfill...\n');

  // 1. org_positions: name -> name_es, description -> description_es
  await backfillTable('org_positions', [
    { en: 'name', es: 'name_es' },
    { en: 'description', es: 'description_es' },
  ]);

  // 2. position_criteria: name -> name_es, description -> description_es
  await backfillTable('position_criteria', [
    { en: 'name', es: 'name_es' },
    { en: 'description', es: 'description_es' },
  ]);

  // 3. position_big5_labels (6 columns)
  await backfillBig5Labels();

  // 4. infractions_rubric: action -> action_es
  await backfillTable('infractions_rubric', [
    { en: 'action', es: 'action_es' },
  ]);

  // 5. disc_actions: action -> action_es (new column)
  await backfillTable('disc_actions', [
    { en: 'action', es: 'action_es' },
  ]);

  console.log('\nBackfill complete!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
