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
  'Team Lead FOH'
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
  'Team Lead BOH'
];

/**
 * Remove "FOH" or "BOH" from position names for display
 */
export function cleanPositionName(positionName: string): string {
  // Remove " FOH" or " BOH" from 3H Week, Trainer, Team Lead, and Leadership positions
  if (positionName.includes('3H Week') || positionName.includes('Trainer') || positionName.includes('Team Lead') || positionName.includes('Leadership')) {
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
 * Get org_id and all location_ids for an organization from a single location_id
 */
async function getOrgLocations(
  supabase: SupabaseClient,
  locationId: string
): Promise<{ orgId: string; locationIds: string[] } | null> {
  // Get org_id from the provided location
  const { data: locationData, error: locError } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();

  if (locError || !locationData?.org_id) {
    console.error('Error fetching location org_id:', locError);
    return null;
  }

  const orgId = locationData.org_id;

  // Get all locations for this org
  const { data: allLocations, error: allLocError } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', orgId);

  if (allLocError || !allLocations) {
    console.error('Error fetching org locations:', allLocError);
    return null;
  }

  return {
    orgId,
    locationIds: allLocations.map(l => l.id)
  };
}

/**
 * Consolidated employee info for grouping employees across locations
 */
interface ConsolidatedEmployee {
  primaryId: string;
  name: string;
  allIds: string[];
  firstName?: string;
  lastName?: string;
}

/**
 * Build a map of consolidated employees for a specific location's roster.
 * Only includes employees who are on the specified location's roster, but tracks
 * their consolidated IDs so ratings from other locations can be included.
 * 
 * @param rosterLocationId - The location to get the roster from (employees shown in table)
 * @param allLocationIds - All locations in the org (for fetching consolidated employee info)
 * @returns Map where key = consolidated identity (primary employee ID), value = consolidated employee info
 */
async function buildConsolidatedEmployeeMap(
  supabase: SupabaseClient,
  orgId: string,
  rosterLocationId: string,
  allLocationIds: string[],
  area: 'FOH' | 'BOH'
): Promise<Map<string, ConsolidatedEmployee>> {
  const fohBohField = area === 'FOH' ? 'is_foh' : 'is_boh';

  // Fetch employees from the CURRENT location only (the roster)
  const { data: rosterEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, consolidated_employee_id, location_id')
    .eq('location_id', rosterLocationId)
    .eq('active', true)
    .eq(fohBohField, true)
    .order('full_name');

  if (empError || !rosterEmployees) {
    console.error('Error fetching employees for consolidation:', empError);
    return new Map();
  }

  // Build consolidated employee map from roster employees only
  // Key = the "primary" employee ID (either their own ID or their consolidated_employee_id)
  const consolidatedMap = new Map<string, ConsolidatedEmployee>();

  // For each roster employee, determine their consolidated identity
  for (const emp of rosterEmployees) {
    const consolidatedId = emp.consolidated_employee_id;
    // The primary ID is either the consolidated_employee_id (if pointing to someone else) or their own ID
    const primaryId = (consolidatedId && consolidatedId !== emp.id) ? consolidatedId : emp.id;
    
    if (!consolidatedMap.has(primaryId)) {
      // Create new entry for this consolidated identity
      consolidatedMap.set(primaryId, {
        primaryId: primaryId,
        name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        firstName: emp.first_name,
        lastName: emp.last_name,
        allIds: [emp.id]
      });
      
      // If this employee points to a different consolidated ID, add that ID too
      if (consolidatedId && consolidatedId !== emp.id) {
        consolidatedMap.get(primaryId)!.allIds.push(consolidatedId);
      }
    } else {
      // Add this employee's ID to existing entry
      const existing = consolidatedMap.get(primaryId)!;
      if (!existing.allIds.includes(emp.id)) {
        existing.allIds.push(emp.id);
      }
    }
  }

  // For each consolidated identity, fetch all linked employee IDs from ALL locations
  // This ensures we capture ratings from other locations for these employees
  const primaryIds = Array.from(consolidatedMap.keys());
  for (let i = 0; i < primaryIds.length; i++) {
    const primaryId = primaryIds[i];
    const consolidated = consolidatedMap.get(primaryId)!;
    
    // Find all employees across all locations that share this consolidated identity
    const { data: linkedEmployees } = await supabase
      .from('employees')
      .select('id, consolidated_employee_id')
      .in('location_id', allLocationIds)
      .or(`id.eq.${primaryId},consolidated_employee_id.eq.${primaryId}`);

    if (linkedEmployees) {
      linkedEmployees.forEach(linked => {
        if (!consolidated.allIds.includes(linked.id)) {
          consolidated.allIds.push(linked.id);
        }
      });
    }
  }

  return consolidatedMap;
}

/**
 * Build a map of consolidated leaders (raters) for a specific location's roster.
 * Only includes employees whose roles are configured to submit ratings in position_role_permissions.
 * 
 * @param rosterLocationId - The location to get the roster from (leaders shown in table)
 * @param allLocationIds - All locations in the org (for fetching consolidated employee info)
 * @param allowedRoles - Set of role names that are allowed to submit ratings (from position_role_permissions)
 */
async function buildConsolidatedLeaderMap(
  supabase: SupabaseClient,
  orgId: string,
  rosterLocationId: string,
  allLocationIds: string[],
  allowedRoles: Set<string> | null
): Promise<Map<string, ConsolidatedEmployee>> {
  // Fetch employees from the CURRENT location only (the roster)
  const { data: rosterEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, consolidated_employee_id, location_id, role')
    .eq('location_id', rosterLocationId)
    .eq('active', true)
    .order('full_name');

  if (empError || !rosterEmployees) {
    console.error('Error fetching employees for leader consolidation:', empError);
    return new Map();
  }

  // Build consolidated leader map from roster employees only
  // Filter to only include employees whose roles are configured to submit ratings
  const consolidatedMap = new Map<string, ConsolidatedEmployee>();

  // For each roster employee, determine their consolidated identity
  for (const emp of rosterEmployees) {
    // Skip employees whose roles are not configured to submit ratings
    if (allowedRoles && allowedRoles.size > 0) {
      if (!emp.role || !allowedRoles.has(emp.role)) {
        continue;
      }
    }
    
    const consolidatedId = emp.consolidated_employee_id;
    const primaryId = (consolidatedId && consolidatedId !== emp.id) ? consolidatedId : emp.id;
    
    if (!consolidatedMap.has(primaryId)) {
      consolidatedMap.set(primaryId, {
        primaryId: primaryId,
        name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        firstName: emp.first_name,
        lastName: emp.last_name,
        allIds: [emp.id]
      });
      
      if (consolidatedId && consolidatedId !== emp.id) {
        consolidatedMap.get(primaryId)!.allIds.push(consolidatedId);
      }
    } else {
      const existing = consolidatedMap.get(primaryId)!;
      if (!existing.allIds.includes(emp.id)) {
        existing.allIds.push(emp.id);
      }
    }
  }

  // For each consolidated identity, fetch all linked employee IDs from ALL locations
  const leaderPrimaryIds = Array.from(consolidatedMap.keys());
  for (let i = 0; i < leaderPrimaryIds.length; i++) {
    const primaryId = leaderPrimaryIds[i];
    const consolidated = consolidatedMap.get(primaryId)!;
    
    const { data: linkedEmployees } = await supabase
      .from('employees')
      .select('id, consolidated_employee_id')
      .in('location_id', allLocationIds)
      .or(`id.eq.${primaryId},consolidated_employee_id.eq.${primaryId}`);

    if (linkedEmployees) {
      linkedEmployees.forEach(linked => {
        if (!consolidated.allIds.includes(linked.id)) {
          consolidated.allIds.push(linked.id);
        }
      });
    }
  }

  return consolidatedMap;
}

/**
 * Fetch Overview data - ALL employees (from roster) with their ratings across positions
 * Shows averages per position (last 4 ratings) with expandable rows for last 4 individual ratings
 * Includes employees without ratings (matching original Google Sheets behavior)
 * 
 * Now fetches from ALL locations in the organization and consolidates employees who work
 * at multiple locations using the consolidated_employee_id field.
 */
export async function fetchOverviewData(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<EmployeeRatingAggregate[]> {
  // Get org info and all locations for the org
  const orgInfo = await getOrgLocations(supabase, locationId);
  if (!orgInfo) {
    console.error('Could not get org locations');
    return [];
  }
  const { orgId, locationIds } = orgInfo;

  // Get dynamic positions for this location/org
  const positions = await fetchPositionsList(supabase, locationId, area);

  // Build consolidated employee map (roster from current location, ratings from all locations)
  const consolidatedEmployeeMap = await buildConsolidatedEmployeeMap(
    supabase,
    orgId,
    locationId,  // Roster from current location only
    locationIds, // All locations for rating consolidation
    area
  );

  if (consolidatedEmployeeMap.size === 0) {
    return [];
  }

  // Get all ratings from ALL org locations for this area (with pagination)
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
      .in('location_id', locationIds)
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

  // Build a reverse lookup: employee_id -> consolidated primary ID
  const employeeToConsolidated = new Map<string, string>();
  consolidatedEmployeeMap.forEach((consolidated, primaryId) => {
    consolidated.allIds.forEach(empId => {
      employeeToConsolidated.set(empId, primaryId);
    });
  });

  // Group ratings by consolidated employee ID (combining ratings from all their employee records)
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

      // Look up the consolidated primary ID for this employee
      const consolidatedId = employeeToConsolidated.get(rating.employee_id);
      if (consolidatedId) {
        if (!ratingsMap.has(consolidatedId)) {
          ratingsMap.set(consolidatedId, []);
        }
        ratingsMap.get(consolidatedId)!.push(ratingWithNames);
      }
    });
  }

  // Sort ratings within each group by date (most recent first)
  ratingsMap.forEach((empRatings) => {
    empRatings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  // Calculate aggregates for ALL consolidated employees (including those without ratings)
  const aggregates: EmployeeRatingAggregate[] = [];

  consolidatedEmployeeMap.forEach((consolidated, primaryId) => {
    const employeeName = consolidated.name;
    const empRatings = ratingsMap.get(primaryId) || [];
    
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

    // 90-day count (from all locations)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const total_count_90d = empRatings.filter(r => 
      new Date(r.created_at) >= ninetyDaysAgo
    ).length;

    // Last rating date (most recent from any location)
    const last_rating_date = empRatings.length > 0 
      ? empRatings[0].created_at 
      : null;

    // Recent ratings for expandable rows (last 4 across all positions from any location)
    const recent_ratings = empRatings.slice(0, 4);

    aggregates.push({
      employee_id: primaryId,
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
 * 
 * Now fetches from ALL locations in the organization and consolidates employees who work
 * at multiple locations using the consolidated_employee_id field.
 */
export async function fetchPositionData(
  supabase: SupabaseClient,
  locationId: string,
  position: string
): Promise<EmployeeRatingAggregate[]> {
  // Get org info and all locations for the org
  const orgInfo = await getOrgLocations(supabase, locationId);
  if (!orgInfo) {
    console.error('Could not get org locations');
    return [];
  }
  const { orgId, locationIds } = orgInfo;

  // Determine filtering rules based on position
  const isTrainerPosition = position.toLowerCase().includes('trainer');
  const isLeaderPosition = position.toLowerCase().includes('leadership') || position.toLowerCase().includes('team lead') || position.toLowerCase().includes('3h week') || position.toLowerCase().includes('hope');
  
  // Determine FOH/BOH - first try org_positions, then fallback to hardcoded lists
  let isFOH = FOH_POSITIONS.includes(position);
  let isBOH = BOH_POSITIONS.includes(position);
  
  // Try to get zone from org_positions
  const { data: orgPosition } = await supabase
    .from('org_positions')
    .select('zone')
    .eq('org_id', orgId)
    .ilike('name', position)
    .maybeSingle();

  if (orgPosition?.zone) {
    isFOH = orgPosition.zone === 'FOH';
    isBOH = orgPosition.zone === 'BOH';
  }
  
  const fohBohField = isFOH ? 'is_foh' : 'is_boh';
  const area: 'FOH' | 'BOH' = isFOH ? 'FOH' : 'BOH';

  // Build consolidated employee map for this area (roster from current location, ratings from all)
  // For special positions, we'll filter further after building the map
  let consolidatedEmployeeMap = await buildConsolidatedEmployeeMap(
    supabase,
    orgId,
    locationId,  // Roster from current location only
    locationIds, // All locations for rating consolidation
    area
  );

  // For trainer/leader positions, we need to filter the consolidated map
  if (isTrainerPosition || isLeaderPosition) {
    // Fetch employees with the additional filter to know which consolidated IDs to keep
    const filterField = isTrainerPosition ? 'is_trainer' : 'is_leader';
    const { data: specialEmployees } = await supabase
      .from('employees')
      .select('id, consolidated_employee_id')
      .in('location_id', locationIds)
      .eq('active', true)
      .eq(fohBohField, true)
      .eq(filterField, true);

    if (specialEmployees) {
      // Build set of consolidated IDs that should be included
      const validConsolidatedIds = new Set<string>();
      specialEmployees.forEach(emp => {
        const consolidatedId = emp.consolidated_employee_id && emp.consolidated_employee_id !== emp.id 
          ? emp.consolidated_employee_id 
          : emp.id;
        validConsolidatedIds.add(consolidatedId);
      });

      // Filter the consolidated map to only include valid entries
      const filteredMap = new Map<string, ConsolidatedEmployee>();
      consolidatedEmployeeMap.forEach((value, key) => {
        if (validConsolidatedIds.has(key)) {
          filteredMap.set(key, value);
        }
      });
      consolidatedEmployeeMap = filteredMap;
    }
  }

  if (consolidatedEmployeeMap.size === 0) {
    return [];
  }

  // Build a reverse lookup: employee_id -> consolidated primary ID
  const employeeToConsolidated = new Map<string, string>();
  consolidatedEmployeeMap.forEach((consolidated, primaryId) => {
    consolidated.allIds.forEach(empId => {
      employeeToConsolidated.set(empId, primaryId);
    });
  });

  // Get all ratings for this position from ALL org locations
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(full_name)
    `)
    .in('location_id', locationIds)
    .eq('position', position)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching position ratings:', error);
    // Continue with empty ratings
  }

  // Group ratings by consolidated employee ID
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

      // Look up the consolidated primary ID for this employee
      const consolidatedId = employeeToConsolidated.get(rating.employee_id);
      if (consolidatedId) {
        if (!ratingsMap.has(consolidatedId)) {
          ratingsMap.set(consolidatedId, []);
        }
        ratingsMap.get(consolidatedId)!.push(ratingWithNames);
      }
    });
  }

  // Sort ratings within each group by date (most recent first)
  ratingsMap.forEach((empRatings) => {
    empRatings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  // Calculate aggregates for ALL consolidated employees (including those without ratings)
  const aggregates: EmployeeRatingAggregate[] = [];

  consolidatedEmployeeMap.forEach((consolidated, primaryId) => {
    const employeeName = consolidated.name;
    const empRatings = ratingsMap.get(primaryId) || [];
    
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

    // 90-day count (from all locations)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const total_count_90d = empRatings.filter(r => 
      new Date(r.created_at) >= ninetyDaysAgo
    ).length;

    // Last rating date (most recent from any location)
    const last_rating_date = empRatings.length > 0 
      ? empRatings[0].created_at 
      : null;

    aggregates.push({
      employee_id: primaryId,
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
 * 
 * Now fetches from ALL locations in the organization and consolidates leaders who work
 * at multiple locations using the consolidated_employee_id field.
 */
export async function fetchLeadershipData(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH'
): Promise<LeaderRatingAggregate[]> {
  // Get org info and all locations for the org
  const orgInfo = await getOrgLocations(supabase, locationId);
  if (!orgInfo) {
    console.error('Could not get org locations');
    return [];
  }
  const { orgId, locationIds } = orgInfo;

  // Get dynamic positions for this location/org
  const positions = await fetchPositionsList(supabase, locationId, area);

  // Fetch position_role_permissions to get allowed rater roles
  // Get ALL roles that can rate ANY position (for roster filtering)
  // and area-specific roles (for rating filtering)
  let allAllowedRoles: Set<string> | null = null;
  let areaAllowedRoles: Set<string> | null = null;
  
  const { data: permissionsData } = await supabase
    .from('position_role_permissions')
    .select('role_name, org_positions!inner(name, zone)')
    .eq('org_positions.org_id', orgId);

  if (permissionsData && permissionsData.length > 0) {
    allAllowedRoles = new Set<string>();
    areaAllowedRoles = new Set<string>();
    
    permissionsData.forEach((p: any) => {
      const positionZone = p.org_positions?.zone;
      // Add to all allowed roles (for roster - show leaders who can rate any position)
      allAllowedRoles!.add(p.role_name);
      // Add to area-specific roles (for filtering ratings by area)
      if (positionZone === area) {
        areaAllowedRoles!.add(p.role_name);
      }
    });
  }

  // Build consolidated leader map (roster from current location, ratings from all locations)
  // Filter to only include employees whose roles are configured to submit ratings
  const consolidatedLeaderMap = await buildConsolidatedLeaderMap(
    supabase,
    orgId,
    locationId,  // Roster from current location only
    locationIds, // All locations for rating consolidation
    allAllowedRoles // Only include employees whose roles can submit ratings
  );

  // Build a reverse lookup: employee_id -> consolidated primary ID
  const employeeToConsolidated = new Map<string, string>();
  consolidatedLeaderMap.forEach((consolidated, primaryId) => {
    consolidated.allIds.forEach(empId => {
      employeeToConsolidated.set(empId, primaryId);
    });
  });

  // Get all ratings for this area from ALL org locations with leader names and roles
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name),
      rater:employees!ratings_rater_user_id_fkey(id, full_name, first_name, last_name, role, consolidated_employee_id)
    `)
    .in('location_id', locationIds)
    .in('position', positions)
    .order('created_at', { ascending: false });

  if (error || !ratings) {
    console.error('Error fetching leadership ratings:', error);
    return [];
  }

  // Group by consolidated rater ID, filtering by allowed roles if configured
  // ONLY include ratings from leaders who are on the current location's roster
  const leaderMap = new Map<string, Rating[]>();
  const leaderNames = new Map<string, string>(); // Track the primary name for each consolidated leader
  
  ratings.forEach((rating: any) => {
    // Filter by area-specific allowed rater roles if configured
    const raterRole = rating.rater?.role;
    if (areaAllowedRoles && areaAllowedRoles.size > 0) {
      if (!raterRole || !areaAllowedRoles.has(raterRole)) {
        return; // Skip this rating - rater's role is not configured for rating this area
      }
    }

    // Get the consolidated ID for this rater - ONLY include if rater is on current location's roster
    const consolidatedRaterId = employeeToConsolidated.get(rating.rater_user_id);
    if (!consolidatedRaterId) {
      // Rater is not on the current location's roster - skip this rating
      return;
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

    if (!leaderMap.has(consolidatedRaterId)) {
      leaderMap.set(consolidatedRaterId, []);
      // Store the name from the consolidated map
      const consolidatedInfo = consolidatedLeaderMap.get(consolidatedRaterId);
      leaderNames.set(consolidatedRaterId, consolidatedInfo?.name || raterName);
    }
    leaderMap.get(consolidatedRaterId)!.push(ratingWithNames);
  });

  // Sort ratings within each group by date (most recent first)
  leaderMap.forEach((leaderRatings) => {
    leaderRatings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  // Calculate aggregates for each consolidated leader
  const aggregates: LeaderRatingAggregate[] = [];

  leaderMap.forEach((leaderRatings, consolidatedLeaderId) => {
    const leaderName = leaderNames.get(consolidatedLeaderId) || leaderRatings[0]?.rater_name || 'Unknown';
    
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

    // 90-day count (from all locations)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const total_count_90d = leaderRatings.filter(r => 
      new Date(r.created_at) >= ninetyDaysAgo
    ).length;

    // Last rating date (most recent from any location)
    const last_rating_date = leaderRatings.length > 0 
      ? leaderRatings[0].created_at 
      : null;

    // Recent ratings for expandable rows (last 10 from any location)
    const recent_ratings = leaderRatings.slice(0, 10);

    aggregates.push({
      leader_id: consolidatedLeaderId,
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
    // Use limit(1) instead of maybeSingle() because some positions exist in both FOH and BOH
    // with the same name (e.g., "Leadership", "Trainer", "H.O.P.E. Week")
    const { data: orgPositions } = await supabase
      .from('org_positions')
      .select('id, zone')
      .eq('org_id', locationData.org_id)
      .ilike('name', position)
      .limit(1);
    
    const orgPosition = orgPositions?.[0];

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
          zone: (orgPosition.zone as 'FOH' | 'BOH') || 'FOH',
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

/**
 * Leaderboard employee entry interface
 */
export interface LeaderboardEntry {
  employee_id: string;
  employee_name: string;
  role: string | null;
  hire_date: string | null;
  tenure_months: number | null;
  overall_rating: number | null;
  total_ratings: number;
  last_rating_date: string | null;
  ratings_needed: number; // 0 if has 1+ ratings, otherwise how many more needed
}

/**
 * Calculate tenure in months from hire_date
 */
function calculateTenureMonths(hireDate: string | null): number | null {
  if (!hireDate) return null;
  const hire = new Date(hireDate);
  const now = new Date();
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
  return Math.max(0, months);
}

/**
 * Format tenure for display (e.g., "1 year 6 mo")
 */
export function formatTenure(months: number | null): string {
  if (months === null || months < 0) return '—';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${remainingMonths} mo`;
  } else if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  } else {
    return `${years} ${years === 1 ? 'year' : 'years'} ${remainingMonths} mo`;
  }
}

/**
 * Fetch Leaderboard data - ALL active employees ranked by their overall rating
 * 
 * Ranking algorithm:
 * 1. Get all ratings in the date range for the selected area (FOH/BOH)
 * 2. Group by employee, then by position
 * 3. For each position: take the last 4 ratings (rolling 4), calculate average
 * 4. Average all position averages = employee's overall rating
 * 5. Require at least 5 ratings total to show a score
 * 
 * Uses consolidated employee IDs to aggregate ratings across locations.
 */
export async function fetchLeaderboardData(
  supabase: SupabaseClient,
  locationId: string,
  area: 'FOH' | 'BOH',
  startDate: Date,
  endDate: Date
): Promise<LeaderboardEntry[]> {
  // Get org info and all locations for the org
  const orgInfo = await getOrgLocations(supabase, locationId);
  if (!orgInfo) {
    console.error('Could not get org locations');
    return [];
  }
  const { orgId, locationIds } = orgInfo;

  // Get dynamic positions for this location/org
  const positions = await fetchPositionsList(supabase, locationId, area);

  const fohBohField = area === 'FOH' ? 'is_foh' : 'is_boh';

  // Fetch ALL active employees from the current location's roster
  const { data: rosterEmployees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, consolidated_employee_id, role, hire_date')
    .eq('location_id', locationId)
    .eq('active', true)
    .eq(fohBohField, true)
    .order('full_name');

  if (empError || !rosterEmployees) {
    console.error('Error fetching employees for leaderboard:', empError);
    return [];
  }

  // Build consolidated employee map
  const consolidatedMap = new Map<string, {
    primaryId: string;
    name: string;
    role: string | null;
    hire_date: string | null;
    allIds: string[];
  }>();

  for (const emp of rosterEmployees) {
    const consolidatedId = emp.consolidated_employee_id;
    const primaryId = (consolidatedId && consolidatedId !== emp.id) ? consolidatedId : emp.id;
    
    if (!consolidatedMap.has(primaryId)) {
      consolidatedMap.set(primaryId, {
        primaryId: primaryId,
        name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        role: emp.role,
        hire_date: emp.hire_date,
        allIds: [emp.id]
      });
      
      if (consolidatedId && consolidatedId !== emp.id) {
        consolidatedMap.get(primaryId)!.allIds.push(consolidatedId);
      }
    } else {
      const existing = consolidatedMap.get(primaryId)!;
      if (!existing.allIds.includes(emp.id)) {
        existing.allIds.push(emp.id);
      }
    }
  }

  // Fetch all linked employee IDs from ALL locations for each consolidated identity
  const primaryIds = Array.from(consolidatedMap.keys());
  for (const primaryId of primaryIds) {
    const consolidated = consolidatedMap.get(primaryId)!;
    
    const { data: linkedEmployees } = await supabase
      .from('employees')
      .select('id, consolidated_employee_id')
      .in('location_id', locationIds)
      .or(`id.eq.${primaryId},consolidated_employee_id.eq.${primaryId}`);

    if (linkedEmployees) {
      linkedEmployees.forEach(linked => {
        if (!consolidated.allIds.includes(linked.id)) {
          consolidated.allIds.push(linked.id);
        }
      });
    }
  }

  // Build reverse lookup
  const employeeToConsolidated = new Map<string, string>();
  consolidatedMap.forEach((consolidated, primaryId) => {
    consolidated.allIds.forEach(empId => {
      employeeToConsolidated.set(empId, primaryId);
    });
  });

  // Format dates for query
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Fetch all ratings in the date range from ALL org locations
  let ratings: any[] = [];
  let offset = 0;
  const limit = 25000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .in('location_id', locationIds)
      .in('position', positions)
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching leaderboard ratings:', error);
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

  // Group ratings by consolidated employee ID
  const ratingsMap = new Map<string, any[]>();
  
  ratings.forEach((rating: any) => {
    const consolidatedId = employeeToConsolidated.get(rating.employee_id);
    if (consolidatedId) {
      if (!ratingsMap.has(consolidatedId)) {
        ratingsMap.set(consolidatedId, []);
      }
      ratingsMap.get(consolidatedId)!.push(rating);
    }
  });

  // Sort ratings within each group by date (most recent first)
  ratingsMap.forEach((empRatings) => {
    empRatings.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

  // Calculate leaderboard entries for ALL employees
  const entries: LeaderboardEntry[] = [];

  consolidatedMap.forEach((consolidated, primaryId) => {
    const empRatings = ratingsMap.get(primaryId) || [];
    const totalRatings = empRatings.length;
    const ratingsNeeded = Math.max(0, 1 - totalRatings);

    // Calculate overall rating using rolling 4 average per position
    let overallRating: number | null = null;

    if (totalRatings >= 1) {
      // Group by position
      const positionGroups = new Map<string, any[]>();
      empRatings.forEach((r: any) => {
        if (!positionGroups.has(r.position)) {
          positionGroups.set(r.position, []);
        }
        positionGroups.get(r.position)!.push(r);
      });

      // Calculate rolling 4 average for each position
      const positionAverages: number[] = [];
      positionGroups.forEach((posRatings) => {
        // Sort by date (most recent first) and take last 4
        posRatings.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const last4 = posRatings.slice(0, 4);
        
        const avgs: number[] = [];
        last4.forEach((r: any) => {
          if (r.rating_avg !== null) {
            avgs.push(r.rating_avg);
          } else {
            const individualRatings = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5]
              .filter((v: number | null) => v !== null) as number[];
            if (individualRatings.length > 0) {
              const calculatedAvg = individualRatings.reduce((sum, v) => sum + v, 0) / individualRatings.length;
              avgs.push(calculatedAvg);
            }
          }
        });

        if (avgs.length > 0) {
          const posAvg = avgs.reduce((sum, v) => sum + v, 0) / avgs.length;
          positionAverages.push(posAvg);
        }
      });

      // Average all position averages
      if (positionAverages.length > 0) {
        overallRating = positionAverages.reduce((sum, v) => sum + v, 0) / positionAverages.length;
      }
    }

    // Get last rating date
    const lastRatingDate = empRatings.length > 0 ? empRatings[0].created_at : null;

    // Calculate tenure
    const tenureMonths = calculateTenureMonths(consolidated.hire_date);

    entries.push({
      employee_id: primaryId,
      employee_name: consolidated.name,
      role: consolidated.role,
      hire_date: consolidated.hire_date,
      tenure_months: tenureMonths,
      overall_rating: overallRating,
      total_ratings: totalRatings,
      last_rating_date: lastRatingDate,
      ratings_needed: ratingsNeeded
    });
  });

  // Sort: First by whether they have enough ratings (5+), then by overall rating descending
  entries.sort((a, b) => {
    // Employees with 5+ ratings come first
    if (a.ratings_needed === 0 && b.ratings_needed > 0) return -1;
    if (a.ratings_needed > 0 && b.ratings_needed === 0) return 1;
    
    // Among those with scores, sort by overall rating descending
    if (a.overall_rating !== null && b.overall_rating !== null) {
      return b.overall_rating - a.overall_rating;
    }
    if (a.overall_rating !== null) return -1;
    if (b.overall_rating !== null) return 1;
    
    // Among those without scores, sort by total ratings descending
    if (a.total_ratings !== b.total_ratings) {
      return b.total_ratings - a.total_ratings;
    }
    
    // Finally, sort by name
    return a.employee_name.localeCompare(b.employee_name);
  });

  return entries;
}

