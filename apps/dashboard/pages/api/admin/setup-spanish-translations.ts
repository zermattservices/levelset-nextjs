import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251116_add_spanish_translations.sql');
    
    if (!fs.existsSync(migrationPath)) {
      return res.status(404).json({ error: 'Migration file not found' });
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split SQL into statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results: Array<{ statement: string; success: boolean; error?: string }> = [];

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      const fullStatement = statement + ';';
      
      // Use Supabase REST API to execute SQL
      // Note: ALTER TABLE requires direct database access, so we'll use the REST API's query endpoint
      // This may not work for DDL statements, but we'll try
      try {
        // For DDL statements like ALTER TABLE, we need to use the Postgres connection directly
        // The Supabase JS client doesn't support executing raw DDL via REST API
        // We'll need to use the Management API or a database function
        
        // Try using rpc if there's a function, otherwise we'll need manual execution
        const { error } = await supabase.rpc('exec_sql', { sql: fullStatement });
        
        if (error) {
          // If exec_sql doesn't exist, we can't execute DDL via REST API
          results.push({
            statement: fullStatement.substring(0, 100),
            success: false,
            error: error.message || 'Cannot execute DDL via REST API. Please run migration manually in Supabase SQL Editor.',
          });
        } else {
          results.push({
            statement: fullStatement.substring(0, 100),
            success: true,
          });
        }
      } catch (err) {
        results.push({
          statement: fullStatement.substring(0, 100),
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Check if any succeeded
    const allFailed = results.every(r => !r.success);
    
    if (allFailed) {
      return res.status(400).json({
        error: 'Could not execute migration via API',
        message: 'DDL statements (ALTER TABLE) cannot be executed via REST API. Please run the migration manually in Supabase SQL Editor.',
        sql: sql,
        results,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Migration executed (some statements may have failed)',
      results,
    });
  } catch (error) {
    console.error('Error executing migration:', error);
    return res.status(500).json({
      error: 'Failed to execute migration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

