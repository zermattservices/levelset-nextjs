import type { RecommendedAction } from './supabase.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecommendationCalculationResult {
  employee_id: string;
  employee_name: string;
  current_points: number;
  recommended_action_id: string;
  recommended_action_name: string;
  points_threshold: number;
  threshold_exceeded_by: number;
  has_existing_action: boolean;
}

/**
 * Calculate recommended disciplinary actions for employees based on their point totals
 * Only returns the highest threshold crossed that hasn't been acted upon
 */
export async function calculateRecommendedActions(
  supabase: SupabaseClient,
  orgId: string,
  locationId: string
): Promise<RecommendationCalculationResult[]> {
  try {
    // Fetch discipline data (employees with points)
    let employeePoints: Array<{
      employee_id: string;
      full_name: string;
      current_points: number;
    }> = [];

    // Try the view first, then fallback to manual query
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('v_employee_infraction_rollup')
        .select('employee_id, full_name, current_points')
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .gt('current_points', 0);

      if (!viewError && viewData) {
        employeePoints = viewData.map((entry: any) => ({
          employee_id: entry.employee_id || entry.id,
          full_name: entry.full_name || 'Unknown',
          current_points: entry.current_points || 0,
        }));
      } else {
        throw new Error('View not available');
      }
    } catch {
      // Fallback: fetch employees and calculate points manually
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, org_id, location_id')
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .eq('active', true);

      if (empError) throw empError;

      if (employees && employees.length > 0) {
        const employeeIds = employees.map(emp => emp.id);

        const { data: infractions, error: infError } = await supabase
          .from('infractions')
          .select('employee_id, points')
          .in('employee_id', employeeIds)
          .eq('org_id', orgId)
          .eq('location_id', locationId);

        if (infError) {
          console.warn('Error fetching infractions:', infError);
        }

        // Calculate points for each employee
        employeePoints = employees.map(emp => {
          const empInfractions = infractions?.filter(inf => inf.employee_id === emp.id) || [];
          const current_points = empInfractions.reduce((sum, inf) => sum + (inf.points || 0), 0);
          return {
            employee_id: emp.id,
            full_name: emp.full_name || 'Unknown',
            current_points,
          };
        }).filter(emp => emp.current_points > 0);
      }
    }

    // Fetch discipline action thresholds
    const { data: thresholds, error: thresholdsError } = await supabase
      .from('disc_actions_rubric')
      .select('id, action, points_threshold')
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .order('points_threshold', { ascending: true });

    if (thresholdsError) throw thresholdsError;
    if (!thresholds || thresholds.length === 0) return [];

    // Fetch existing disciplinary actions to check if recommendations have been acted upon
    const employeeIds = employeePoints.map(emp => emp.employee_id);
    const { data: existingActions, error: actionsError } = await supabase
      .from('disc_actions')
      .select('employee_id, action_id')
      .in('employee_id', employeeIds)
      .eq('org_id', orgId)
      .eq('location_id', locationId);

    if (actionsError) {
      console.warn('Error fetching existing actions:', actionsError);
    }

    // Create a map of employee_id -> set of action_ids they already have
    const existingActionsMap = new Map<string, Set<string>>();
    existingActions?.forEach(action => {
      if (action.action_id) {
        if (!existingActionsMap.has(action.employee_id)) {
          existingActionsMap.set(action.employee_id, new Set());
        }
        existingActionsMap.get(action.employee_id)!.add(action.action_id);
      }
    });

    // Calculate recommendations: find highest threshold crossed that hasn't been acted upon
    const recommendations: RecommendationCalculationResult[] = [];

    for (const employee of employeePoints) {
      const existingActionIds = existingActionsMap.get(employee.employee_id) || new Set();

      // Find all thresholds the employee has crossed
      const crossedThresholds = thresholds
        .filter(threshold => employee.current_points >= threshold.points_threshold)
        .sort((a, b) => b.points_threshold - a.points_threshold); // Highest first

      // Find the highest threshold that hasn't been acted upon
      const recommendedThreshold = crossedThresholds.find(
        threshold => !existingActionIds.has(threshold.id)
      );

      if (recommendedThreshold) {
        recommendations.push({
          employee_id: employee.employee_id,
          employee_name: employee.full_name,
          current_points: employee.current_points,
          recommended_action_id: recommendedThreshold.id,
          recommended_action_name: recommendedThreshold.action,
          points_threshold: recommendedThreshold.points_threshold,
          threshold_exceeded_by: employee.current_points - recommendedThreshold.points_threshold,
          has_existing_action: false,
        });
      }
    }

    return recommendations.sort((a, b) => b.current_points - a.current_points); // Sort by points descending
  } catch (error) {
    console.error('Error calculating recommended actions:', error);
    return [];
  }
}

/**
 * Create recommended actions in the database
 */
export async function createRecommendedActions(
  supabase: SupabaseClient,
  recommendations: RecommendationCalculationResult[],
  orgId: string,
  locationId: string,
  createdBy?: string
): Promise<void> {
  if (recommendations.length === 0) return;

  try {
    // Check which recommendations already exist (not acknowledged or acted upon)
    const employeeIds = recommendations.map(r => r.employee_id);
    const actionIds = recommendations.map(r => r.recommended_action_id);

    const { data: existing, error: checkError } = await supabase
      .from('recommended_actions')
      .select('employee_id, action_id')
      .in('employee_id', employeeIds)
      .in('action_id', actionIds)
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .is('acknowledged_at', null)
      .is('action_taken_at', null);

    if (checkError) throw checkError;

    const existingSet = new Set(
      existing?.map(e => `${e.employee_id}:${e.action_id}`) || []
    );

    // Only create recommendations that don't already exist
    const toCreate = recommendations.filter(
      r => !existingSet.has(`${r.employee_id}:${r.recommended_action_id}`)
    );

    if (toCreate.length === 0) return;

    const records = toCreate.map(rec => ({
      employee_id: rec.employee_id,
      org_id: orgId,
      location_id: locationId,
      action_id: rec.recommended_action_id,
      points_threshold: rec.points_threshold,
      employee_points: rec.current_points,
      created_by: createdBy || null,
    }));

    const { error: insertError } = await supabase
      .from('recommended_actions')
      .insert(records);

    if (insertError) throw insertError;
  } catch (error) {
    console.error('Error creating recommended actions:', error);
    throw error;
  }
}
