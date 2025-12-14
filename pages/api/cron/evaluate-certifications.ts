/**
 * Cron job API endpoint for automated PEA Audit Day certifications evaluation
 * This runs daily, but it will only execute evaluations on PEA Audit Days (4th Thursday and 3rd Friday)
 * 
 * Setup in Vercel:
 * 1. Add environment variable: CRON_SECRET=<your-secret-key>
 * 2. Create cron job in vercel.json or use Vercel Cron Jobs UI
 *    Schedule: 0 8 * * * (Every day at 8am UTC)
 * 3. Include Authorization header with cron secret
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { runMonthlyEvaluation } from '@/lib/evaluate-certifications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Only run in production environment to avoid duplicate evaluations
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv !== 'production') {
    console.log(`[Cron] Skipping evaluation - not in production environment (current: ${vercelEnv})`);
    return res.status(200).json({
      success: false,
      message: `Skipped - running in ${vercelEnv} environment. Only production runs evaluations.`,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron job attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('[Cron] Starting certification evaluation check...');
    
    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[Cron] Missing Supabase credentials');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      });
    }
    
    // Run the monthly evaluation
    const result = await runMonthlyEvaluation(supabaseUrl, supabaseKey);
    
    if (!result.success) {
      console.log(`[Cron] ${result.message}`);
      return res.status(200).json({
        success: false,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Log successful evaluation
    console.log(`[Cron] ${result.message}`);
    
    // Return detailed results
    return res.status(200).json({
      success: true,
      message: result.message,
      evaluatedCount: result.results?.length || 0,
      statusChanges: result.results?.filter(r => r.statusBefore !== r.statusAfter) || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Error running certification evaluation:', error);
    return res.status(500).json({
      error: 'Failed to run certification evaluation',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
