import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { fetchEmployeePositionAverages } from '@/lib/fetch-position-averages';
import { allPositionsQualified } from '@/lib/certification-utils';
import { getRatingThresholds } from '@/lib/rating-thresholds';
import type { Employee } from '@/lib/supabase.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location_id } = req.query;

  if (!location_id || typeof location_id !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid location_id' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Fetch all employees for the location
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', location_id)
      .eq('active', true);

    if (employeesError) {
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      return res.status(200).json({ ratingStatusMap: {} });
    }

    // Get rating thresholds for the location
    const thresholds = await getRatingThresholds(location_id);
    const greenThreshold = thresholds.green_threshold;

    // Fetch position averages for all employees
    const positionAveragesData = await fetchEmployeePositionAverages(
      employees as Employee[],
      supabase
    );

    // Create a map of employee_id -> rating status
    const ratingStatusMap: Record<string, boolean> = {};
    const averagesMap = new Map(
      positionAveragesData.map(avg => [avg.employeeId, avg.positions])
    );

    employees.forEach((employee: Employee) => {
      const positionAverages = averagesMap.get(employee.id) || {};
      const meetsThreshold =
        Object.keys(positionAverages).length > 0 &&
        allPositionsQualified(positionAverages, greenThreshold);
      ratingStatusMap[employee.id] = meetsThreshold;
    });

    return res.status(200).json({ ratingStatusMap });
  } catch (error) {
    console.error('[rating-status] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

