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
 * Get positions list filtered by area
 */
export function getPositionsByArea(area: 'FOH' | 'BOH'): string[] {
  return area === 'FOH' ? FOH_POSITIONS : BOH_POSITIONS;
}

/**
 * Fetch Overview data - employees with ratings across all positions
 * Shows averages per position (last 4 ratings) with expandable rows for last 4 individual ratings
 */
export async function fetchOverviewData(
  supabase: SupabaseClient,
  orgId: string,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<EmployeeRatingAggregate[]> {
  const positions = getPositionsByArea(area);

  // Get all ratings for this area with employee names
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(full_name)
    `)
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .in('position', positions)
    .order('created_at', { ascending: false });

  if (error || !ratings) {
    console.error('Error fetching overview ratings:', error);
    return [];
  }

  // Group by employee_id
  const employeeMap = new Map<string, Rating[]>();
  
  ratings.forEach((rating: any) => {
    const employeeName = rating.employee?.full_name || 
                        `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim();
    const raterName = rating.rater?.full_name || 'Unknown';
    
    const ratingWithNames: Rating = {
      ...rating,
      employee_name: employeeName,
      rater_name: raterName
    };

    if (!employeeMap.has(rating.employee_id)) {
      employeeMap.set(rating.employee_id, []);
    }
    employeeMap.get(rating.employee_id)!.push(ratingWithNames);
  });

  // Calculate aggregates for each employee
  const aggregates: EmployeeRatingAggregate[] = [];

  employeeMap.forEach((empRatings, employeeId) => {
    const employeeName = empRatings[0]?.employee_name || 'Unknown';
    
    // Calculate average per position (last 4 ratings)
    const positionAverages: Record<string, number | null> = {};
    positions.forEach(position => {
      const posRatings = empRatings
        .filter(r => r.position === position)
        .slice(0, 4); // last 4
      
      if (posRatings.length > 0) {
        const validAvgs = posRatings
          .map(r => r.rating_avg)
          .filter(avg => avg !== null) as number[];
        
        positionAverages[position] = validAvgs.length > 0
          ? validAvgs.reduce((sum, avg) => sum + avg, 0) / validAvgs.length
          : null;
      } else {
        positionAverages[position] = null;
      }
    });

    // Calculate overall average (average of position averages)
    const posAvgs = Object.values(positionAverages).filter(v => v !== null) as number[];
    const overall_avg = posAvgs.length > 0
      ? posAvgs.reduce((sum, avg) => sum + avg, 0) / posAvgs.length
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
 * Shows all employees with their Big 5 breakdown for a specific position
 */
export async function fetchPositionData(
  supabase: SupabaseClient,
  orgId: string,
  locationId: string,
  position: string
): Promise<EmployeeRatingAggregate[]> {
  // Get all ratings for this position with employee names
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(full_name)
    `)
    .eq('org_id', orgId)
    .eq('location_id', locationId)
    .eq('position', position)
    .order('created_at', { ascending: false });

  if (error || !ratings) {
    console.error('Error fetching position ratings:', error);
    return [];
  }

  // Group by employee_id
  const employeeMap = new Map<string, Rating[]>();
  
  ratings.forEach((rating: any) => {
    const employeeName = rating.employee?.full_name || 
                        `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim();
    const raterName = rating.rater?.full_name || 'Unknown';
    
    const ratingWithNames: Rating = {
      ...rating,
      employee_name: employeeName,
      rater_name: raterName
    };

    if (!employeeMap.has(rating.employee_id)) {
      employeeMap.set(rating.employee_id, []);
    }
    employeeMap.get(rating.employee_id)!.push(ratingWithNames);
  });

  // Calculate aggregates
  const aggregates: EmployeeRatingAggregate[] = [];

  employeeMap.forEach((empRatings, employeeId) => {
    const employeeName = empRatings[0]?.employee_name || 'Unknown';
    
    // Last 4 ratings for this position
    const last4 = empRatings.slice(0, 4);
    
    // Calculate average from last 4
    const validAvgs = last4
      .map(r => r.rating_avg)
      .filter(avg => avg !== null) as number[];
    
    const overall_avg = validAvgs.length > 0
      ? validAvgs.reduce((sum, avg) => sum + avg, 0) / validAvgs.length
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
  orgId: string,
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
    .eq('org_id', orgId)
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
        const validAvgs = posRatings
          .map(r => r.rating_avg)
          .filter(avg => avg !== null) as number[];
        
        positionAverages[position] = validAvgs.length > 0
          ? validAvgs.reduce((sum, avg) => sum + avg, 0) / validAvgs.length
          : null;
      } else {
        positionAverages[position] = null;
      }
    });

    // Calculate overall average (average of all ratings they've given)
    const last10Avgs = leaderRatings
      .slice(0, 10)
      .map(r => r.rating_avg)
      .filter(avg => avg !== null) as number[];
    
    const overall_avg = last10Avgs.length > 0
      ? last10Avgs.reduce((sum, avg) => sum + avg, 0) / last10Avgs.length
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
  orgId: string,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<string[]> {
  const expectedPositions = getPositionsByArea(area);

  const { data, error } = await supabase
    .from('ratings')
    .select('position')
    .eq('org_id', orgId)
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
  orgId: string,
  locationId: string,
  position: string
): Promise<PositionBig5Labels | null> {
  const { data, error } = await supabase
    .from('position_big5_labels')
    .select('*')
    .eq('org_id', orgId)
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
 */
export function getRatingColor(rating: number | null | undefined): 'green' | 'yellow' | 'red' | 'none' {
  if (rating === null || rating === undefined) return 'none';
  if (rating >= 2.75) return 'green';
  if (rating >= 1.75) return 'yellow';
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

