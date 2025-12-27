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
  // Get dynamic positions for this location
  const positions = await fetchPositionsList(supabase, locationId, area);
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

  // Get all ratings for this area with employee names (with pagination to bypass PostgREST limit)
  let ratings: any[] = [];
  let offset = 0;
  const limit = 25000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('ratings')
      .select(`
        *,
        employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
        rater:employees!ratings_rater_user_id_fkey(full_name)
      `)
      .eq('location_id', locationId)
      .in('position', positions)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching overview ratings:', error);
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
  const isTrainerPosition = position.toLowerCase().includes('trainer');
  const isLeaderPosition = position.toLowerCase().includes('leadership') || position.toLowerCase().includes('3h week') || position.toLowerCase().includes('hope');
  
  // Determine FOH/BOH - first try org_positions, then fallback to hardcoded lists
  let isFOH = FOH_POSITIONS.includes(position);
  let isBOH = BOH_POSITIONS.includes(position);
  
  // Try to get zone from org_positions
  const { data: locationData } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();

  if (locationData?.org_id) {
    const { data: orgPosition } = await supabase
      .from('org_positions')
      .select('zone')
      .eq('org_id', locationData.org_id)
      .ilike('name', position)
      .maybeSingle();

    if (orgPosition?.zone) {
      isFOH = orgPosition.zone === 'FOH';
      isBOH = orgPosition.zone === 'BOH';
    }
  }
  
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
 * Only shows leaders whose role is configured in position_role_permissions
 */
export async function fetchLeadershipData(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<LeaderRatingAggregate[]> {
  // Get dynamic positions for this location
  const positions = await fetchPositionsList(supabase, locationId, area);

  // Get location's org_id
  const { data: locationData } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();

  const orgId = locationData?.org_id;

  // Fetch position_role_permissions to get allowed rater roles
  let allowedRaterRoles: Set<string> | null = null;
  if (orgId) {
    const { data: permissionsData } = await supabase
      .from('position_role_permissions')
      .select('role_name, org_positions!inner(name, zone)')
      .eq('org_positions.org_id', orgId);

    if (permissionsData && permissionsData.length > 0) {
      // Get roles that can rate positions in the current area
      allowedRaterRoles = new Set<string>();
      permissionsData.forEach((p: any) => {
        const positionZone = p.org_positions?.zone;
        // Include role if it can rate any position in this area
        if (positionZone === area) {
          allowedRaterRoles!.add(p.role_name);
        }
      });
    }
  }

  // Get all ratings for this area with leader names and roles
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(id, full_name, first_name, last_name, role)
    `)
    .eq('location_id', locationId)
    .in('position', positions)
    .order('created_at', { ascending: false });

  if (error || !ratings) {
    console.error('Error fetching leadership ratings:', error);
    return [];
  }

  // Group by rater_user_id, filtering by allowed roles if configured
  const leaderMap = new Map<string, Rating[]>();
  
  ratings.forEach((rating: any) => {
    // Filter by allowed rater roles if configured
    const raterRole = rating.rater?.role;
    if (allowedRaterRoles && allowedRaterRoles.size > 0) {
      if (!raterRole || !allowedRaterRoles.has(raterRole)) {
        return; // Skip this rating - rater's role is not configured for rating
      }
    }

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
 * Fetch positions from org_positions table for an organization
 * Falls back to hardcoded list if no org-level positions are configured
 */
export async function fetchPositionsList(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<string[]> {
  // First, get the org_id for this location
  const { data: locationData } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();

  if (locationData?.org_id) {
    // Fetch positions from org_positions table
    const { data: orgPositions, error: orgError } = await supabase
      .from('org_positions')
      .select('name, zone')
      .eq('org_id', locationData.org_id)
      .eq('zone', area)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!orgError && orgPositions && orgPositions.length > 0) {
      return orgPositions.map(p => p.name);
    }
  }

  // Fallback: use hardcoded positions filtered by those that have ratings
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
  // First, try to get labels from org-level position_criteria
  const { data: locationData } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();

  if (locationData?.org_id) {
    // Try org-level positions first
    const { data: orgPosition } = await supabase
      .from('org_positions')
      .select('id')
      .eq('org_id', locationData.org_id)
      .ilike('name', position)
      .maybeSingle();

    if (orgPosition) {
      const { data: criteriaData } = await supabase
        .from('position_criteria')
        .select('name, criteria_order')
        .eq('position_id', orgPosition.id)
        .order('criteria_order', { ascending: true });

      if (criteriaData && criteriaData.length > 0) {
        // Map criteria to label_1 through label_5 format
        const labels: PositionBig5Labels = {
          id: orgPosition.id,
          org_id: locationData.org_id,
          location_id: locationId,
          position: position,
          zone: 'FOH', // This will be set correctly from org_positions if needed
          label_1: criteriaData.find(c => c.criteria_order === 1)?.name || null,
          label_2: criteriaData.find(c => c.criteria_order === 2)?.name || null,
          label_3: criteriaData.find(c => c.criteria_order === 3)?.name || null,
          label_4: criteriaData.find(c => c.criteria_order === 4)?.name || null,
          label_5: criteriaData.find(c => c.criteria_order === 5)?.name || null,
          created_at: null,
          updated_at: null,
        };
        return labels;
      }
    }
  }

  // Fallback: legacy position_big5_labels table
  const { data, error } = await supabase
    .from('position_big5_labels')
    .select('*')
    .eq('location_id', locationId)
    .eq('position', position)
    .single();

  if (error || !data) {
    // Only log if it's not a "no rows" error
    if (error && !error.message?.includes('No rows')) {
      console.error('Error fetching Big 5 labels:', error);
    }
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

