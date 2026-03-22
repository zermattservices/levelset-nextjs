/**
 * Core certification evaluation logic
 * Implements state machine for certification status transitions.
 *
 * Status transitions create evaluation_requests rows (instead of the legacy
 * "evaluations" table) using certification_evaluation_rules to determine which
 * form template and trigger source to use.
 */

import { createClient } from '@supabase/supabase-js';
import type { Employee, CertificationStatus } from './supabase.types';
import {
  allPositionsQualified,
  isEligibleLocation,
  getFourthFullWeekThursday,
  getThirdFullWeekFriday,
  getNextPEAAuditDay,
  getNextThirdFullWeekFriday,
  sameDay,
} from './certification-utils';
import { getRatingThresholds } from './rating-thresholds';
import {
  fetchEmployeePositionAverages,
  type PositionAverages,
} from './fetch-position-averages';

type AuditRunType = 'FOURTH_THURSDAY' | 'THIRD_FRIDAY';

/** A certification_evaluation_rule row with the role names resolved. */
interface CertRule {
  id: string;
  org_id: string;
  location_id: string;
  form_template_id: string;
  target_role_ids: string[];
  trigger_on: string[]; // e.g. ['certification_pending', 'certification_pip']
  is_active: boolean;
  /** Resolved role names for target_role_ids */
  target_role_names: string[];
}

interface EvaluationResult {
  employeeId: string;
  employeeName: string;
  statusBefore: CertificationStatus;
  statusAfter: CertificationStatus;
  positionAverages: Record<string, number>;
  allQualified: boolean;
  notes?: string;
}


/**
 * Evaluate certifications for all employees in a location.
 * The behaviour changes depending on the audit run type (4th Thursday vs 3rd Friday).
 */
export async function evaluateCertifications(
  locationId: string,
  referenceDate: Date,
  supabaseUrl: string,
  supabaseKey: string,
  runType: AuditRunType = 'FOURTH_THURSDAY'
): Promise<EvaluationResult[]> {
  if (!isEligibleLocation(locationId)) {
    console.log(`Location ${locationId} is not eligible for certification tracking`);
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Load active certification_evaluation_rules for this location
  const certRules = await fetchCertRules(supabase, locationId);
  if (certRules.length === 0) {
    console.log(`No active certification evaluation rules for location ${locationId}`);
  }

  if (runType === 'THIRD_FRIDAY') {
    return evaluateThirdFridayPendingCheck(locationId, referenceDate, supabase, certRules);
  }

  return evaluateFourthThursdayAudit(locationId, referenceDate, supabase, certRules);
}

/**
 * Save evaluation result to database
 */
async function saveEvaluationResult(
  result: EvaluationResult,
  auditDate: Date,
  supabase: any
): Promise<void> {
  try {
    // Get employee's org_id and location_id
    const { data: employee } = await supabase
      .from('employees')
      .select('org_id, location_id')
      .eq('id', result.employeeId)
      .single();
    
    if (!employee) {
      console.error(`Employee not found: ${result.employeeId}`);
      return;
    }
    
    // Insert audit record
    const { error: auditError } = await supabase
      .from('certification_audit')
      .insert({
        employee_id: result.employeeId,
        employee_name: result.employeeName,
        org_id: employee.org_id,
        location_id: employee.location_id,
        audit_date: auditDate.toISOString().split('T')[0],
        status_before: result.statusBefore,
        status_after: result.statusAfter,
        all_positions_qualified: result.allQualified,
        position_averages: result.positionAverages,
        notes: result.notes,
      });
    
    if (auditError) {
      console.error('Error inserting audit record:', auditError);
      return;
    }
    
    // Update employee status if it changed
    if (result.statusBefore !== result.statusAfter) {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ certified_status: result.statusAfter })
        .eq('id', result.employeeId);
      
      if (updateError) {
        console.error('Error updating employee status:', updateError);
      } else {
        console.log(`Updated ${result.employeeName}: ${result.statusBefore} -> ${result.statusAfter}`);
      }
    }
  } catch (error) {
    console.error('Error saving evaluation result:', error);
  }
}

/**
 * Run evaluation for current month (if today is PEA Audit Day)
 */
export async function runMonthlyEvaluation(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; message: string; results?: EvaluationResult[] }> {
  const today = new Date();
  const fourthThursday = getFourthFullWeekThursday(today.getFullYear(), today.getMonth() + 1);
  const thirdFriday = getThirdFullWeekFriday(today.getFullYear(), today.getMonth() + 1);

  let runType: AuditRunType | null = null;
  let referenceDate: Date | null = null;

  if (sameDay(today, thirdFriday)) {
    runType = 'THIRD_FRIDAY';
    referenceDate = thirdFriday;
  } else if (sameDay(today, fourthThursday)) {
    runType = 'FOURTH_THURSDAY';
    referenceDate = fourthThursday;
  }

  if (!runType || !referenceDate) {
    const nextAudit = getNextPEAAuditDay(today);
    const nextPendingCheck = getNextThirdFullWeekFriday(today);
    return {
      success: false,
      message: `Today is not a certification evaluation day. Next 3rd-Friday check: ${nextPendingCheck.toLocaleDateString()}, next 4th-Thursday audit: ${nextAudit.toLocaleDateString()}`,
    };
  }

  const supabaseCredentialsMissing = !supabaseUrl || !supabaseKey;
  if (supabaseCredentialsMissing) {
    console.error('[Cron] Missing Supabase credentials');
    return {
      success: false,
      message: 'Server configuration error: Missing Supabase credentials',
    };
  }

  const budaLocationId = process.env.NEXT_PUBLIC_BUDA_LOCATION_ID;
  const westBudaLocationId = process.env.NEXT_PUBLIC_WEST_BUDA_LOCATION_ID;
  const allResults: EvaluationResult[] = [];

  if (budaLocationId) {
    const budaResults = await evaluateCertifications(
      budaLocationId,
      referenceDate,
      supabaseUrl,
      supabaseKey,
      runType
    );
    allResults.push(...budaResults);
  }

  if (westBudaLocationId) {
    const westBudaResults = await evaluateCertifications(
      westBudaLocationId,
      referenceDate,
      supabaseUrl,
      supabaseKey,
      runType
    );
    allResults.push(...westBudaResults);
  }

  const statusChanges = allResults.filter((r) => r.statusBefore !== r.statusAfter);
  const descriptor =
    runType === 'THIRD_FRIDAY' ? '3rd-Friday pending check' : '4th-Thursday audit';

  return {
    success: true,
    message: `${descriptor} evaluated ${allResults.length} employees. ${statusChanges.length} status changes.`,
    results: allResults,
  };
}

// ===== Helper Logic =====

async function evaluateFourthThursdayAudit(
  locationId: string,
  auditDate: Date,
  supabase: any,
  certRules: CertRule[]
): Promise<EvaluationResult[]> {
  const employees = await fetchCertEligibleEmployees(supabase, locationId, certRules);
  if (employees.length === 0) {
    return [];
  }

  // Fetch location-specific thresholds
  const thresholds = await getRatingThresholds(locationId);
  const certificationThreshold = thresholds.green_threshold;

  const averagesMap = await buildPositionAverageMap(supabase, employees);
  const results: EvaluationResult[] = [];

  for (const employee of employees) {
    const currentStatus: CertificationStatus = employee.certified_status || 'Not Certified';
    const positions = averagesMap.get(employee.id)?.positions || {};
    const hasPositions = Object.keys(positions).length > 0;
    const allQualified = hasPositions && allPositionsQualified(positions, certificationThreshold);

    let newStatus: CertificationStatus = currentStatus;
    let notes: string | undefined;

    if (currentStatus === 'Not Certified') {
      if (allQualified) {
        newStatus = 'Pending';
        notes = 'Qualified for evaluation; moved to Pending.';
        await createEvaluationRequests(supabase, employee, certRules, 'certification_pending');
      }
    } else if (currentStatus === 'Pending') {
      if (!allQualified) {
        newStatus = 'Not Certified';
        notes = 'Lost qualification during evaluation week; evaluation cancelled.';
        await cancelActiveEvaluationRequests(supabase, employee.id);
      }
    } else if (currentStatus === 'Certified') {
      if (!allQualified) {
        newStatus = 'PIP';
        notes = 'Ratings below 2.75; moved to PIP.';
        await createEvaluationRequests(supabase, employee, certRules, 'certification_pip');
      }
    } else if (currentStatus === 'PIP') {
      if (allQualified) {
        newStatus = 'Certified';
        notes = 'Improved while on PIP; returned to Certified.';
      } else {
        newStatus = 'Not Certified';
        notes = 'Did not improve while on PIP; moved to Not Certified.';
      }
    }

    if (newStatus !== currentStatus) {
      const result: EvaluationResult = {
        employeeId: employee.id,
        employeeName: employee.full_name || `${employee.first_name} ${employee.last_name || ''}`.trim(),
        statusBefore: currentStatus,
        statusAfter: newStatus,
        positionAverages: positions,
        allQualified,
        notes,
      };

      results.push(result);
      await saveEvaluationResult(result, auditDate, supabase);
    }
  }

  return results;
}

async function evaluateThirdFridayPendingCheck(
  locationId: string,
  checkDate: Date,
  supabase: any,
  certRules: CertRule[]
): Promise<EvaluationResult[]> {
  const employees = await fetchCertEligibleEmployees(supabase, locationId, certRules, ['Pending']);
  if (employees.length === 0) {
    return [];
  }

  // Fetch location-specific thresholds
  const thresholds = await getRatingThresholds(locationId);
  const certificationThreshold = thresholds.green_threshold;

  const averagesMap = await buildPositionAverageMap(supabase, employees);
  const results: EvaluationResult[] = [];

  for (const employee of employees) {
    const positions = averagesMap.get(employee.id)?.positions || {};
    const hasPositions = Object.keys(positions).length > 0;
    const allQualified = hasPositions && allPositionsQualified(positions, certificationThreshold);

    if (allQualified) {
      continue;
    }

    await cancelActiveEvaluationRequests(supabase, employee.id);

    const result: EvaluationResult = {
      employeeId: employee.id,
      employeeName: employee.full_name || `${employee.first_name} ${employee.last_name || ''}`.trim(),
      statusBefore: 'Pending',
      statusAfter: 'Not Certified',
      positionAverages: positions,
      allQualified,
      notes: 'Failed pre-evaluation rating check; evaluation cancelled.',
    };

    results.push(result);
    await saveEvaluationResult(result, checkDate, supabase);
  }

  return results;
}

/**
 * Fetch employees eligible for certification evaluation.
 * Uses certification_evaluation_rules.target_role_ids (resolved to role names)
 * to determine which employees to evaluate, instead of hardcoded 'Team Member'.
 */
async function fetchCertEligibleEmployees(
  supabase: any,
  locationId: string,
  certRules: CertRule[],
  statuses?: CertificationStatus[]
): Promise<Employee[]> {
  // Collect all target role names from rules
  const targetRoleNames = new Set<string>();
  for (const rule of certRules) {
    for (const name of rule.target_role_names) {
      targetRoleNames.add(name);
    }
  }

  if (targetRoleNames.size === 0) {
    console.log(`No target roles defined in certification rules for location ${locationId}`);
    return [];
  }

  let query = supabase
    .from('employees')
    .select('*')
    .eq('location_id', locationId)
    .eq('active', true)
    .in('role', Array.from(targetRoleNames));

  if (statuses && statuses.length > 0) {
    query = query.in('certified_status', statuses);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching employees:', error);
    return [];
  }

  return data as Employee[];
}

async function buildPositionAverageMap(
  supabase: any,
  employees: Employee[],
  useDailyAverages: boolean = true
): Promise<Map<string, PositionAverages>> {
  const map = new Map<string, PositionAverages>();
  if (employees.length === 0) {
    return map;
  }

  // If using daily averages, fetch from database
  if (useDailyAverages) {
    const today = new Date().toISOString().split('T')[0];
    const employeeIds = employees.map(e => e.id);
    
    const { data: dailyAverages, error } = await supabase
      .from('daily_position_averages')
      .select('employee_id, position_averages')
      .in('employee_id', employeeIds)
      .eq('calculation_date', today);
    
    if (!error && dailyAverages && dailyAverages.length > 0) {
      dailyAverages.forEach((avg: any) => {
        const employee = employees.find(e => e.id === avg.employee_id);
        if (employee) {
          map.set(avg.employee_id, {
            employeeId: avg.employee_id,
            employeeName: employee.full_name || `${employee.first_name} ${employee.last_name || ''}`.trim(),
            positions: avg.position_averages,
          });
        }
      });
      // Only return if we got averages for all employees, otherwise fall through to on-demand
      if (map.size === employees.length) {
        return map;
      }
    }
    // Fallback to on-demand calculation if daily averages not available
  }

  // On-demand calculation (existing logic)
  const averages = await fetchEmployeePositionAverages(employees, supabase);
  averages.forEach((avg) => {
    map.set(avg.employeeId, avg);
  });

  return map;
}


/**
 * Create evaluation_requests for an employee based on matching certification rules.
 * Finds rules whose trigger_on includes the given triggerSource and whose
 * target roles include the employee's role.
 */
async function createEvaluationRequests(
  supabase: any,
  employee: Employee,
  certRules: CertRule[],
  triggerSource: 'certification_pending' | 'certification_pip'
): Promise<void> {
  const matchingRules = certRules.filter(
    (rule) =>
      rule.trigger_on.includes(triggerSource) &&
      rule.target_role_names.includes(employee.role)
  );

  if (matchingRules.length === 0) {
    console.log(
      `No certification rules match trigger=${triggerSource} role=${employee.role} for employee ${employee.full_name}`
    );
    return;
  }

  for (const rule of matchingRules) {
    try {
      // Check for existing pending request to avoid duplicates
      const { data: existing } = await supabase
        .from('evaluation_requests')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('form_template_id', rule.form_template_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        console.log(
          `Skipping duplicate evaluation request for ${employee.full_name} (form ${rule.form_template_id})`
        );
        continue;
      }

      const { error } = await supabase.from('evaluation_requests').insert({
        org_id: employee.org_id,
        location_id: employee.location_id,
        employee_id: employee.id,
        form_template_id: rule.form_template_id,
        trigger_source: triggerSource,
        status: 'pending',
      });

      if (error) {
        console.error(
          `Error creating evaluation request for ${employee.full_name}:`,
          error
        );
      } else {
        console.log(
          `Created evaluation request: ${employee.full_name} (${triggerSource}, form ${rule.form_template_id})`
        );
      }
    } catch (error) {
      console.error('Unexpected error creating evaluation request:', error);
    }
  }
}

/**
 * Cancel all pending evaluation_requests for an employee.
 */
async function cancelActiveEvaluationRequests(
  supabase: any,
  employeeId: string
): Promise<void> {
  const { error } = await supabase
    .from('evaluation_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error cancelling evaluation requests:', error);
  }
}

/**
 * Fetch and resolve certification_evaluation_rules for a location.
 * Joins org_roles to map target_role_ids → role names.
 */
async function fetchCertRules(
  supabase: any,
  locationId: string
): Promise<CertRule[]> {
  const { data: rules, error } = await supabase
    .from('certification_evaluation_rules')
    .select('id, org_id, location_id, form_template_id, target_role_ids, trigger_on, is_active')
    .eq('location_id', locationId)
    .eq('is_active', true);

  if (error || !rules || rules.length === 0) {
    if (error) console.error('Error fetching certification rules:', error);
    return [];
  }

  // Collect all role IDs across rules
  const allRoleIds = new Set<string>();
  for (const rule of rules) {
    for (const id of rule.target_role_ids ?? []) allRoleIds.add(id);
  }

  // Resolve role IDs → names
  const roleIdToName = new Map<string, string>();
  if (allRoleIds.size > 0) {
    const { data: roles } = await supabase
      .from('org_roles')
      .select('id, role_name')
      .in('id', Array.from(allRoleIds));

    for (const r of roles ?? []) {
      roleIdToName.set(r.id, r.role_name);
    }
  }

  return rules.map((rule: any) => ({
    ...rule,
    target_role_names: (rule.target_role_ids ?? [])
      .map((id: string) => roleIdToName.get(id))
      .filter(Boolean) as string[],
  }));
}
