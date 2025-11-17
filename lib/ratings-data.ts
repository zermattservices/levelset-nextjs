/**
 * Ratings data fetching and aggregation functions
 * Handles complex queries for PEA scoreboard data from Supabase
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Rating, EmployeeRatingAggregate, LeaderRatingAggregate, PositionBig5Labels } from './supabase.types';

// Position lists matching actual database values
export const FOH_POSITIONS = [
  'iPOS',
  'Host',
  'OMD',
  'Runner',
  'Bagging',
  'Drinks 1/3',
  'Drinks 2',
  '3H Week FOH',
  'Trainer FOH',
  'Leadership FOH'
];

export const BOH_POSITIONS = [
  'Breader',
  'Secondary',
  'Fries',
  'Primary',
  'Machines',
  'Prep',
  '3H Week BOH',
  'Trainer BOH',
  'Leadership BOH'
];

/**
 * Remove "FOH" or "BOH" from position names for display
 */
export function cleanPositionName(positionName: string): string {
  // Remove " FOH" or " BOH" from 3H Week, Trainer, and Leadership positions
  if (positionName.includes('3H Week') || positionName.includes('Trainer') || positionName.includes('Leadership')) {
    return positionName.replace(/ (FOH|BOH)$/i, '');
  }
  return positionName;
}

/**
 * Get positions list filtered by area
 */
export function getPositionsByArea(area: 'FOH' | 'BOH'): string[] {
  return area === 'FOH' ? FOH_POSITIONS : BOH_POSITIONS;
}

/**
 * Fetch Overview data - ALL employees (from roster) with their ratings across positions
 * Shows averages per position (last 4 ratings) with expandable rows for last 4 individual ratings
 * Includes employees without ratings (matching original Google Sheets behavior)
 */
export async function fetchOverviewData(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<EmployeeRatingAggregate[]> {
  const positions = getPositionsByArea(area);
  const fohBohField = area === 'FOH' ? 'is_foh' : 'is_boh';

  // First, get ALL employees from roster who are marked as FOH or BOH
  const { data: allEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name')
    .eq('location_id', locationId)
    .eq('active', true)
    .eq(fohBohField, true)
    .order('full_name');

  if (empError || !allEmployees) {
    console.error('Error fetching employees:', empError);
    return [];
  }

  // Get all ratings for this area with employee names
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(full_name)
    `)
    .eq('location_id', locationId)
    .in('position', positions)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching overview ratings:', error);
    // Continue with empty ratings - show all employees even if ratings fail
  }

  // Group ratings by employee_id
  const ratingsMap = new Map<string, Rating[]>();
  
  if (ratings) {
    ratings.forEach((rating: any) => {
      const employeeName = rating.employee?.full_name || 
                          `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim();
      const raterName = rating.rater?.full_name || 'Unknown';
      
      const ratingWithNames: Rating = {
        ...rating,
        employee_name: employeeName,
        rater_name: raterName
      };

      if (!ratingsMap.has(rating.employee_id)) {
        ratingsMap.set(rating.employee_id, []);
      }
      ratingsMap.get(rating.employee_id)!.push(ratingWithNames);
    });
  }

  // Calculate aggregates for ALL employees (including those without ratings)
  const aggregates: EmployeeRatingAggregate[] = [];

  allEmployees.forEach(employee => {
    const employeeId = employee.id;
    const employeeName = employee.full_name || 
                        `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    const empRatings = ratingsMap.get(employeeId) || [];
    
    // Calculate average per position (last 4 ratings)
    const positionAverages: Record<string, number | null> = {};
    positions.forEach(position => {
      const posRatings = empRatings
        .filter(r => r.position === position)
        .slice(0, 4); // last 4
      
      if (posRatings.length > 0) {
        const avgs: number[] = [];
        posRatings.forEach(r => {
          if (r.rating_avg !== null) {
            avgs.push(r.rating_avg);
          } else {
            // Calculate avg from rating_1-5 if rating_avg is null
            const individualRatings = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5]
              .filter(v => v !== null) as number[];
            if (individualRatings.length > 0) {
              const calculatedAvg = individualRatings.reduce((sum, v) => sum + v, 0) / individualRatings.length;
              avgs.push(calculatedAvg);
            }
          }
        });
        
        positionAverages[position] = avgs.length > 0
          ? avgs.reduce((sum, avg) => sum + avg, 0) / avgs.length
          : null;
      } else {
        positionAverages[position] = null;
      }
    });

    // Calculate overall average (average of last 4 ratings across all positions)
    const last4Ratings = empRatings.slice(0, 4);
    let overall_avg: number | null = null;
    
    if (last4Ratings.length > 0) {
      const avgs: number[] = [];
      last4Ratings.forEach(r => {
        if (r.rating_avg !== null) {
          avgs.push(r.rating_avg);
        } else {
          // Calculate avg from rating_1-5 if rating_avg is null
          const individualRatings = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5]
            .filter(v => v !== null) as number[];
          if (individualRatings.length > 0) {
            const calculatedAvg = individualRatings.reduce((sum, v) => sum + v, 0) / individualRatings.length;
            avgs.push(calculatedAvg);
          }
        }
      });
      
      overall_avg = avgs.length > 0
        ? avgs.reduce((sum, avg) => sum + avg, 0) / avgs.length
        : null;
    }

    // 90-day count
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const total_count_90d = empRatings.filter(r => 
      new Date(r.created_at) >= ninetyDaysAgo
    ).length;

    // Last rating date
    const last_rating_date = empRatings.length > 0 
      ? empRatings[0].created_at 
      : null;

    // Recent ratings for expandable rows (last 4 across all positions)
    const recent_ratings = empRatings.slice(0, 4);

    aggregates.push({
      employee_id: employeeId,
      employee_name: employeeName,
      last_rating_date,
      positions: positionAverages,
      overall_avg,
      total_count_90d,
      recent_ratings
    });
  });

  // Sort by employee name
  return aggregates.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

/**
 * Fetch Position-specific data
 * Shows ALL eligible employees for a position (not just those with ratings)
 * Filtering rules match original Google Sheets:
 * - Regular positions: All FOH/BOH employees
 * - Trainer positions: Only trainers (is_trainer=true)
 */
export async function fetchPositionData(
  supabase: SupabaseClient,
  locationId: string,
  position: string
): Promise<EmployeeRatingAggregate[]> {
  // Determine filtering rules based on position
  const isTrainerPosition = position.includes('Trainer');
  const isLeaderPosition = position.includes('Leadership') || position.includes('3H Week');
  const isFOH = FOH_POSITIONS.includes(position);
  const isBOH = BOH_POSITIONS.includes(position);
  const fohBohField = isFOH ? 'is_foh' : 'is_boh';

  // Build employee filter
  let employeeQuery = supabase
    .from('employees')
    .select('id, full_name, first_name, last_name')
    .eq('location_id', locationId)
    .eq('active', true)
    .eq(fohBohField, true);

  // Additional filters for special positions
  if (isTrainerPosition) {
    employeeQuery = employeeQuery.eq('is_trainer', true);
  } else if (isLeaderPosition) {
    employeeQuery = employeeQuery.eq('is_leader', true);
  }

  const { data: allEmployees, error: empError } = await employeeQuery.order('full_name');

  if (empError || !allEmployees) {
    console.error('Error fetching employees for position:', empError);
    return [];
  }

  // Get all ratings for this position with employee names
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(full_name)
    `)
    .eq('location_id', locationId)
    .eq('position', position)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching position ratings:', error);
    // Continue with empty ratings
  }

  // Group ratings by employee_id
  const ratingsMap = new Map<string, Rating[]>();
  
  if (ratings) {
    ratings.forEach((rating: any) => {
      const employeeName = rating.employee?.full_name || 
                          `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim();
      const raterName = rating.rater?.full_name || 'Unknown';
      
      const ratingWithNames: Rating = {
        ...rating,
        employee_name: employeeName,
        rater_name: raterName
      };

      if (!ratingsMap.has(rating.employee_id)) {
        ratingsMap.set(rating.employee_id, []);
      }
      ratingsMap.get(rating.employee_id)!.push(ratingWithNames);
    });
  }

  // Calculate aggregates for ALL employees (including those without ratings)
  const aggregates: EmployeeRatingAggregate[] = [];

  allEmployees.forEach(employee => {
    const employeeId = employee.id;
    const employeeName = employee.full_name || 
                        `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
    const empRatings = ratingsMap.get(employeeId) || [];
    
    // Last 4 ratings for this position
    const last4 = empRatings.slice(0, 4);
    
    // Calculate average from last 4
    const avgs: number[] = [];
    last4.forEach(r => {
      if (r.rating_avg !== null) {
        avgs.push(r.rating_avg);
      } else {
        // Calculate avg from rating_1-5 if rating_avg is null
        const individualRatings = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5]
          .filter(v => v !== null) as number[];
        if (individualRatings.length > 0) {
          const calculatedAvg = individualRatings.reduce((sum, v) => sum + v, 0) / individualRatings.length;
          avgs.push(calculatedAvg);
        }
      }
    });
    
    const overall_avg = avgs.length > 0
      ? avgs.reduce((sum, avg) => sum + avg, 0) / avgs.length
      : null;

    // 90-day count
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const total_count_90d = empRatings.filter(r => 
      new Date(r.created_at) >= ninetyDaysAgo
    ).length;

    // Last rating date
    const last_rating_date = empRatings.length > 0 
      ? empRatings[0].created_at 
      : null;

    aggregates.push({
      employee_id: employeeId,
      employee_name: employeeName,
      last_rating_date,
      positions: { [position]: overall_avg },
      overall_avg,
      total_count_90d,
      recent_ratings: last4
    });
  });

  // Sort by employee name
  return aggregates.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

/**
 * Fetch Leadership data - leaders who give ratings
 * Shows averages across positions they've rated (last 10 ratings)
 */
export async function fetchLeadershipData(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<LeaderRatingAggregate[]> {
  const positions = getPositionsByArea(area);

  // Get all ratings for this area with leader names
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(full_name, first_name, last_name)
    `)
    .eq('location_id', locationId)
    .in('position', positions)
    .order('created_at', { ascending: false });

  if (error || !ratings) {
    console.error('Error fetching leadership ratings:', error);
    return [];
  }

  // Group by rater_user_id
  const leaderMap = new Map<string, Rating[]>();
  
  ratings.forEach((rating: any) => {
    const employeeName = rating.employee?.full_name || 
                        `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim();
    const raterName = rating.rater?.full_name || 
                     `${rating.rater?.first_name || ''} ${rating.rater?.last_name || ''}`.trim() ||
                     'Unknown';
    
    const ratingWithNames: Rating = {
      ...rating,
      employee_name: employeeName,
      rater_name: raterName
    };

    if (!leaderMap.has(rating.rater_user_id)) {
      leaderMap.set(rating.rater_user_id, []);
    }
    leaderMap.get(rating.rater_user_id)!.push(ratingWithNames);
  });

  // Calculate aggregates for each leader
  const aggregates: LeaderRatingAggregate[] = [];

  leaderMap.forEach((leaderRatings, leaderId) => {
    const leaderName = leaderRatings[0]?.rater_name || 'Unknown';
    
    // Calculate average per position (last 10 ratings)
    const positionAverages: Record<string, number | null> = {};
    positions.forEach(position => {
      const posRatings = leaderRatings
        .filter(r => r.position === position)
        .slice(0, 10); // last 10
      
      if (posRatings.length > 0) {
        // Calculate average from individual ratings if rating_avg is null
        const avgs: number[] = [];
        posRatings.forEach(r => {
          if (r.rating_avg !== null) {
            avgs.push(r.rating_avg);
          } else {
            // Calculate avg from rating_1-5 if rating_avg is null
            const individualRatings = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5]
              .filter(v => v !== null) as number[];
            if (individualRatings.length > 0) {
              const calculatedAvg = individualRatings.reduce((sum, v) => sum + v, 0) / individualRatings.length;
              avgs.push(calculatedAvg);
            }
          }
        });
        
        positionAverages[position] = avgs.length > 0
          ? avgs.reduce((sum, avg) => sum + avg, 0) / avgs.length
          : null;
      } else {
        positionAverages[position] = null;
      }
    });

    // Calculate overall average (average of all ratings they've given)
    const avgs: number[] = [];
    leaderRatings.slice(0, 10).forEach(r => {
      if (r.rating_avg !== null) {
        avgs.push(r.rating_avg);
      } else {
        // Calculate avg from rating_1-5 if rating_avg is null
        const individualRatings = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5]
          .filter(v => v !== null) as number[];
        if (individualRatings.length > 0) {
          const calculatedAvg = individualRatings.reduce((sum, v) => sum + v, 0) / individualRatings.length;
          avgs.push(calculatedAvg);
        }
      }
    });
    
    const overall_avg = avgs.length > 0
      ? avgs.reduce((sum, avg) => sum + avg, 0) / avgs.length
      : null;

    // 90-day count
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const total_count_90d = leaderRatings.filter(r => 
      new Date(r.created_at) >= ninetyDaysAgo
    ).length;

    // Last rating date
    const last_rating_date = leaderRatings.length > 0 
      ? leaderRatings[0].created_at 
      : null;

    // Recent ratings for expandable rows (last 10)
    const recent_ratings = leaderRatings.slice(0, 10);

    aggregates.push({
      leader_id: leaderId,
      leader_name: leaderName,
      last_rating_date,
      positions: positionAverages,
      overall_avg,
      total_count_90d,
      recent_ratings
    });
  });

  // Sort by leader name
  return aggregates.sort((a, b) => a.leader_name.localeCompare(b.leader_name));
}

/**
 * Fetch distinct positions from ratings table
 * Dynamically gets positions that have actual data
 */
export async function fetchPositionsList(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<string[]> {
  const expectedPositions = getPositionsByArea(area);

  const { data, error } = await supabase
    .from('ratings')
    .select('position')
    .eq('location_id', locationId)
    .in('position', expectedPositions);

  if (error || !data) {
    console.error('Error fetching positions list:', error);
    return expectedPositions; // fallback to full list
  }

  // Get unique positions
  const uniqueSet = new Set(data.map(r => r.position));
  const uniquePositions = Array.from(uniqueSet);
  
  // Return in the order defined in expectedPositions (maintain order)
  return expectedPositions.filter(pos => uniquePositions.includes(pos));
}

/**
 * Fetch Big 5 labels for a position
 */
export async function fetchBig5Labels(
  supabase: SupabaseClient,
  locationId: string,
  position: string
): Promise<PositionBig5Labels | null> {
  const { data, error } = await supabase
    .from('position_big5_labels')
    .select('*')
    .eq('location_id', locationId)
    .eq('position', position)
    .single();

  if (error || !data) {
    console.error('Error fetching Big 5 labels:', error);
    return null;
  }

  return data as PositionBig5Labels;
}

/**
 * Calculate color class based on rating value
 * Matches current Google Sheets color scheme
 * @deprecated Use getRatingColor from lib/rating-thresholds with location-specific thresholds
 */
export function getRatingColor(rating: number | null | undefined): 'green' | 'yellow' | 'red' | 'none' {
  if (rating === null || rating === undefined) return 'none';
  if (rating >= 2.75) return 'green';
  if (rating >= 1.75) return 'yellow';
  if (rating >= 1.0) return 'red';
  return 'none';
}

/**
 * Calculate color class based on rating value with custom thresholds
 */
export function getRatingColorWithThresholds(
  rating: number | null | undefined,
  thresholds: { yellow_threshold: number; green_threshold: number }
): 'green' | 'yellow' | 'red' | 'none' {
  if (rating === null || rating === undefined) return 'none';
  if (rating >= thresholds.green_threshold) return 'green';
  if (rating >= thresholds.yellow_threshold) return 'yellow';
  if (rating >= 1.0) return 'red';
  return 'none';
}

/**
 * Format rating for display
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '—';
  return rating.toFixed(2);
}

/**
 * Format date for display
 */
export function formatRatingDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
}

