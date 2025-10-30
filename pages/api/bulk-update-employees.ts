import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Bulk update employees API endpoint
 * 
 * Usage:
 * POST /api/bulk-update-employees
 * Body: {
 *   updates: [
 *     { id: "uuid", hire_date: "2024-01-15", payroll_name: "John Doe" },
 *     { id: "uuid", hire_date: "2024-02-20", payroll_name: "Jane Smith" },
 *     ...
 *   ]
 * }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ 
        error: 'Invalid request body. Expected { updates: [...] }' 
      });
    }

    console.log(`📝 Processing ${updates.length} employee updates...`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process updates one by one
    for (const update of updates) {
      const { id, hire_date, payroll_name, ...rest } = update;

      if (!id) {
        results.failed++;
        results.errors.push({ update, error: 'Missing employee id' });
        continue;
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (hire_date !== undefined) updateData.hire_date = hire_date;
      if (payroll_name !== undefined) updateData.payroll_name = payroll_name;
      
      // Allow other fields to be updated too
      Object.keys(rest).forEach(key => {
        updateData[key] = rest[key];
      });

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id);

      if (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
        console.error(`❌ Failed to update ${id}:`, error.message);
      } else {
        results.success++;
        console.log(`✅ Updated ${id}`);
      }
    }

    console.log(`\n✨ Complete! Success: ${results.success}, Failed: ${results.failed}`);

    return res.status(200).json({
      message: 'Bulk update completed',
      results
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

