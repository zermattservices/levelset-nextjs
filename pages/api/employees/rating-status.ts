import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { allPositionsQualified } from '@/lib/certification-utils';
import { getRatingThresholds } from '@/lib/rating-thresholds';
import type { Employee, Rating } from '@/lib/supabase.types';

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
      .select('id')
      .eq('location_id', location_id)
      .eq('active', true);

    if (employeesError) {
      throw employeesError;
    }

    if (!employees || employees.length === 0) {
      return res.status(200).json({ ratingStatusMap: {} });
    }

    const employeeIds = employees.map(emp => emp.id);

    // Get rating thresholds for the location
    const thresholds = await getRatingThresholds(location_id);
    const greenThreshold = thresholds.green_threshold;

    // Fetch ALL ratings for ALL employees in a single query (optimized)
    const { data: allRatings, error: ratingsError } = await supabase
      .from('ratings')
      .select('employee_id, position, rating_avg, created_at')
      .in('employee_id', employeeIds)
      .not('rating_avg', 'is', null)
      .order('created_at', { ascending: false });

    if (ratingsError) {
      throw ratingsError;
    }

    // Group ratings by employee_id and position, then calculate rolling-4 averages
    const employeeRatingsMap = new Map<string, Map<string, Rating[]>>();

    // Initialize maps for all employees
    employeeIds.forEach(id => {
      employeeRatingsMap.set(id, new Map());
    });

    // Group ratings by employee and position
    (allRatings || []).forEach((rating: Rating) => {
      const empId = rating.employee_id;
      const position = rating.position;
      
      if (!empId || !position) return;

      let positionMap = employeeRatingsMap.get(empId);
      if (!positionMap) {
        positionMap = new Map();
        employeeRatingsMap.set(empId, positionMap);
      }

      if (!positionMap.has(position)) {
        positionMap.set(position, []);
      }
      positionMap.get(position)!.push(rating);
    });

    // Sort ratings within each position by created_at descending (most recent first)
    employeeRatingsMap.forEach((positionMap) => {
      positionMap.forEach((ratings) => {
        ratings.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      });
    });

    // Calculate position averages for each employee
    const ratingStatusMap: Record<string, boolean> = {};

    employeeRatingsMap.forEach((positionMap, employeeId) => {
      const positionAverages: Record<string, number> = {};

      positionMap.forEach((ratings, position) => {
        // Take the last 4 ratings (most recent)
        const last4 = ratings.slice(0, 4);
        
        if (last4.length === 0) return;

        // Calculate average of rating_avg for these 4 ratings
        const validRatings = last4
          .map(r => r.rating_avg)
          .filter(avg => avg !== null && avg !== undefined) as number[];

        if (validRatings.length === 0) return;

        const average = validRatings.reduce((sum, avg) => sum + avg, 0) / validRatings.length;
        positionAverages[position] = average;
      });

      // Determine if employee meets threshold
      const meetsThreshold =
        Object.keys(positionAverages).length > 0 &&
        allPositionsQualified(positionAverages, greenThreshold);
      
      // Debug logging for specific employee (Paola Ruiz)
      if (employeeId === '89afee38-30e0-4436-b83a-e114432fcb6f') {
        console.log('[rating-status] Paola Ruiz debug:', {
          employeeId,
          positionAverages,
          positionCount: Object.keys(positionAverages).length,
          greenThreshold,
          meetsThreshold,
          allPositions: Object.entries(positionAverages).map(([pos, avg]) => ({
            position: pos,
            average: avg,
            meets: avg >= greenThreshold
          }))
        });
      }
      
      ratingStatusMap[employeeId] = meetsThreshold;
    });

    // Ensure all employees have an entry (default to false if no ratings)
    employeeIds.forEach(id => {
      if (!(id in ratingStatusMap)) {
        ratingStatusMap[id] = false;
      }
    });

    return res.status(200).json({ ratingStatusMap });
  } catch (error) {
    console.error('[rating-status] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

