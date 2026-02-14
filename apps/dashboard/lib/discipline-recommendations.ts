import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee } from "./supabase.types";

export interface RecommendedAction {
  employee_id: string;
  employee_name: string;
  employee_role: string;
  current_points: number;
  recommended_action: string;
  action_id: string;
  points_threshold: number;
  threshold_exceeded_by: number;
  has_existing_action: boolean;
  employee?: Employee; // Full employee object
}

/**
 * Calculate disciplinary action recommendations for employees
 * Only recommends the highest threshold crossed that hasn't been acted upon
 */
export async function calculateRecommendations(
  orgId: string,
  locationId: string
): Promise<RecommendedAction[]> {
  const supabase = createSupabaseClient();
  const recommendations: RecommendedAction[] = [];

  try {
    // Fetch active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .eq('active', true);

    if (empError) throw empError;
    if (!employees || employees.length === 0) return [];

    // Fetch discipline action rubric (thresholds)
    const { data: rubric, error: rubricError } = await supabase
      .from('disc_actions_rubric')
      .select('*')
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .order('points_threshold', { ascending: true });

    if (rubricError) throw rubricError;
    if (!rubric || rubric.length === 0) return [];

    // Fetch infractions from last 90 days
    const employeeIds = employees.map(emp => emp.id);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: infractions, error: infError } = await supabase
      .from('infractions')
      .select('employee_id, points, infraction_date')
      .in('employee_id', employeeIds)
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .gte('infraction_date', ninetyDaysAgo);

    if (infError) {
      console.warn('Error fetching infractions:', infError);
    }

    // Fetch existing disciplinary actions to check what's already been done
    const { data: existingActions, error: actionsError } = await supabase
      .from('disc_actions')
      .select('employee_id, action_id, action, action_date')
      .in('employee_id', employeeIds)
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .order('action_date', { ascending: false });

    if (actionsError) {
      console.warn('Error fetching existing actions:', actionsError);
    }

    // Calculate points and recommendations for each employee
    for (const employee of employees) {
      const empInfractions = infractions?.filter(inf => inf.employee_id === employee.id) || [];
      const current_points = empInfractions.reduce((sum, inf) => sum + (inf.points || 0), 0);

      // Skip employees with 0 points
      if (current_points <= 0) continue;

      // Find all thresholds this employee has crossed
      const crossedThresholds = rubric
        .filter(action => current_points >= action.points_threshold)
        .sort((a, b) => b.points_threshold - a.points_threshold); // Highest first

      if (crossedThresholds.length === 0) continue;

      // Get the highest threshold crossed
      const highestThreshold = crossedThresholds[0];

      // Check if this action has already been recorded for this employee
      const hasExistingAction = existingActions?.some(
        action => 
          action.employee_id === employee.id &&
          (action.action_id === highestThreshold.id || action.action === highestThreshold.action)
      ) || false;

      // If action already exists, don't recommend it
      if (hasExistingAction) continue;

      recommendations.push({
        employee_id: employee.id,
        employee_name: employee.full_name || 'Unknown',
        employee_role: employee.role || 'Team Member',
        current_points,
        recommended_action: highestThreshold.action,
        action_id: highestThreshold.id,
        points_threshold: highestThreshold.points_threshold,
        threshold_exceeded_by: current_points - highestThreshold.points_threshold,
        has_existing_action: hasExistingAction,
        employee: employee as Employee,
      });
    }

    // Sort by points (highest first)
    return recommendations.sort((a, b) => b.current_points - a.current_points);
  } catch (err) {
    console.error('Error calculating recommendations:', err);
    return [];
  }
}

