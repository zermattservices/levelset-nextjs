/**
 * Upload global context markdown files into Supabase global_documents and global_document_digests.
 *
 * Usage:
 *   npx tsx scripts/upload-context-docs.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface DocEntry {
  id: string;
  filename: string;
  filepath: string;
}

const DOCS: DocEntry[] = [
  {
    id: '00000000-0000-0000-0001-000000000001',
    filename: 'levelset-domain-model.md',
    filepath: path.resolve(__dirname, '../global-context/levelset-domain-model.md'),
  },
  {
    id: '00000000-0000-0000-0001-000000000002',
    filename: 'levelset-data-relationships.md',
    filepath: path.resolve(__dirname, '../global-context/levelset-data-relationships.md'),
  },
  {
    id: '00000000-0000-0000-0001-000000000003',
    filename: 'levelset-platform-architecture.md',
    filepath: path.resolve(__dirname, '../global-context/levelset-platform-architecture.md'),
  },
  {
    id: '00000000-0000-0000-0001-000000000004',
    filename: 'levelset-glossary.md',
    filepath: path.resolve(__dirname, '../global-context/levelset-glossary.md'),
  },
];

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

async function main() {
  console.log('Uploading global context documents...\n');

  for (const doc of DOCS) {
    const content = fs.readFileSync(doc.filepath, 'utf8');
    const contentHash = sha256(content);
    const wordCount = countWords(content);
    const byteSize = Buffer.byteLength(content, 'utf8');

    console.log(`Processing: ${doc.filename}`);
    console.log(`  Words: ${wordCount}, Bytes: ${byteSize}, Hash: ${contentHash.slice(0, 12)}...`);

    // 1. Update global_documents with raw_content and file_size
    const { error: docError } = await supabase
      .from('global_documents')
      .update({
        raw_content: content,
        file_size: byteSize,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    if (docError) {
      console.error(`  ERROR updating global_documents: ${docError.message}`);
      continue;
    }
    console.log(`  Updated global_documents row.`);

    // 2. Delete any existing digest for this document, then insert fresh
    await supabase
      .from('global_document_digests')
      .delete()
      .eq('document_id', doc.id);

    const { error: digestError } = await supabase
      .from('global_document_digests')
      .insert({
        document_id: doc.id,
        content_md: content,
        content_hash: contentHash,
        extraction_status: 'completed',
        extraction_method: 'text_extract',
        metadata: { word_count: wordCount, byte_size: byteSize },
      });

    if (digestError) {
      console.error(`  ERROR inserting global_document_digests: ${digestError.message}`);
      continue;
    }
    console.log(`  Inserted global_document_digests row.`);
    console.log('');
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
