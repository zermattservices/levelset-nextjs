/**
 * Calculate employee position averages from ratings table
 * Used for certification evaluation
 */

import { createClient } from '@supabase/supabase-js';
import type { Employee, Rating } from './supabase.types';

export interface PositionAverages {
  employeeId: string;
  employeeName: string;
  positions: Record<string, number>; // position -> average
}

/**
 * Calculate rolling-4 position averages for employees from ratings table
 * @param employees - List of employees to calculate averages for
 * @param supabase - Supabase client
 * @returns Array of PositionAverages objects
 */
export async function fetchEmployeePositionAverages(
  employees: Employee[],
  supabase: any
): Promise<PositionAverages[]> {
  const result: PositionAverages[] = [];
  
  // For each employee, calculate their rolling-4 averages per position
  for (const employee of employees) {
    const employeeName = employee.full_name || `${employee.first_name} ${employee.last_name || ''}`.trim();
    
    // Fetch all ratings for this employee with pagination to bypass PostgREST limit
    let ratings: Rating[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error(`[fetchEmployeePositionAverages] Error fetching ratings for ${employee.id}:`, error);
        break;
      }

      if (data && data.length > 0) {
        ratings = ratings.concat(data);
        hasMore = data.length === limit;
        offset += limit;
      } else {
        hasMore = false;
      }
    }
    
    if (ratings.length === 0) {
      // No ratings found for this employee
      continue;
    }
    
    // Group ratings by position and calculate rolling-4 average
    const positionRatingsMap = new Map<string, Rating[]>();
    
    ratings.forEach((rating: Rating) => {
      const position = rating.position;
      if (!position) return;
      
      if (!positionRatingsMap.has(position)) {
        positionRatingsMap.set(position, []);
      }
      positionRatingsMap.get(position)!.push(rating);
    });
    
    // Calculate average of last 4 ratings for each position
    const positionAverages: Record<string, number> = {};
    
    positionRatingsMap.forEach((positionRatings, position) => {
      // Take the last 4 ratings (most recent)
      const last4 = positionRatings.slice(0, 4);
      
      if (last4.length === 0) return;
      
      // Calculate average of rating_avg for these 4 ratings
      const validRatings = last4
        .map(r => r.rating_avg)
        .filter(avg => avg !== null && avg !== undefined) as number[];
      
      if (validRatings.length === 0) return;
      
      const average = validRatings.reduce((sum, avg) => sum + avg, 0) / validRatings.length;
      positionAverages[position] = average;
    });
    
    // Only add if employee has position averages
    if (Object.keys(positionAverages).length > 0) {
      result.push({
        employeeId: employee.id,
        employeeName,
        positions: positionAverages,
      });
    }
  }
  
  return result;
}

/**
 * Get position averages for a single employee
 * @param employee - The employee to get averages for
 * @param supabase - Supabase client
 * @returns PositionAverages object or null
 */
export async function getEmployeePositionAverages(
  employee: Employee,
  supabase: any
): Promise<PositionAverages | null> {
  const averages = await fetchEmployeePositionAverages([employee], supabase);
  return averages.length > 0 ? averages[0] : null;
}
