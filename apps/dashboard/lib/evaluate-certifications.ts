/**
 * Core certification evaluation logic
 * Implements state machine for certification status transitions
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

interface EvaluationResult {
  employeeId: string;
  employeeName: string;
  statusBefore: CertificationStatus;
  statusAfter: CertificationStatus;
  positionAverages: Record<string, number>;
  allQualified: boolean;
  notes?: string;
}

const ACTIVE_EVALUATION_STATUSES = ['Planned', 'Scheduled'];

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

  if (runType === 'THIRD_FRIDAY') {
    return evaluateThirdFridayPendingCheck(locationId, referenceDate, supabase);
  }

  return evaluateFourthThursdayAudit(locationId, referenceDate, supabase);
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
  supabase: any
): Promise<EvaluationResult[]> {
  const employees = await fetchTeamMembers(supabase, locationId);
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
        await createPendingEvaluationRecord(supabase, employee, auditDate, true);
      }
    } else if (currentStatus === 'Pending') {
      if (!allQualified) {
        newStatus = 'Not Certified';
        notes = 'Lost qualification during evaluation week; evaluation cancelled.';
        await cancelActiveEvaluationRecord(supabase, employee.id, 'Not Certified');
      } else {
        await updatePendingEvaluationRatingStatus(supabase, employee.id, true);
      }
    } else if (currentStatus === 'Certified') {
      if (!allQualified) {
        newStatus = 'PIP';
        notes = 'Ratings below 2.75; moved to PIP.';
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
  supabase: any
): Promise<EvaluationResult[]> {
  const employees = await fetchTeamMembers(supabase, locationId, ['Pending']);
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
      await updatePendingEvaluationRatingStatus(supabase, employee.id, true);
      continue;
    }

    await cancelActiveEvaluationRecord(supabase, employee.id, 'Not Certified');

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

async function fetchTeamMembers(
  supabase: any,
  locationId: string,
  statuses?: CertificationStatus[]
): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select('*')
    .eq('location_id', locationId)
    .eq('active', true)
    .eq('role', 'Team Member');

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

function addMonths(date: Date, months: number): Date {
  const clone = new Date(date);
  clone.setMonth(clone.getMonth() + months);
  return clone;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long' });
}

async function createPendingEvaluationRecord(
  supabase: any,
  employee: Employee,
  auditDate: Date,
  ratingStatus: boolean
): Promise<void> {
  try {
    const evaluationMonthDate = addMonths(auditDate, 1);
    const monthLabel = formatMonthLabel(evaluationMonthDate);

    const { error } = await supabase.from('evaluations').insert({
      employee_id: employee.id,
      employee_name: employee.full_name,
      location_id: employee.location_id,
      org_id: employee.org_id,
      leader_id: null,
      leader_name: null,
      evaluation_date: null,
      month: monthLabel,
      role: employee.role,
      status: 'Planned',
      rating_status: ratingStatus,
      state_before: 'Pending',
      state_after: null,
      notes: null,
    });

    if (error) {
      console.error(`Error creating evaluation for ${employee.full_name}:`, error);
    }
  } catch (error) {
    console.error('Unexpected error creating evaluation record:', error);
  }
}

async function updatePendingEvaluationRatingStatus(
  supabase: any,
  employeeId: string,
  ratingStatus: boolean
): Promise<void> {
  const evaluation = await findActiveEvaluationRecord(supabase, employeeId);
  if (!evaluation) {
    return;
  }

  await updateEvaluationRecord(supabase, evaluation.id, { rating_status: ratingStatus });
}

async function cancelActiveEvaluationRecord(
  supabase: any,
  employeeId: string,
  stateAfter: CertificationStatus
): Promise<void> {
  const evaluation = await findActiveEvaluationRecord(supabase, employeeId);
  if (!evaluation) {
    return;
  }

  await updateEvaluationRecord(supabase, evaluation.id, {
    status: 'Cancelled',
    rating_status: false,
    state_after: stateAfter,
  });
}

async function findActiveEvaluationRecord(
  supabase: any,
  employeeId: string
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('id')
    .eq('employee_id', employeeId)
    .in('status', ACTIVE_EVALUATION_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active evaluation:', error);
    return null;
  }

  return data ?? null;
}

async function updateEvaluationRecord(
  supabase: any,
  evaluationId: string,
  updates: Record<string, any>
): Promise<void> {
  const { error } = await supabase
    .from('evaluations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', evaluationId);

  if (error) {
    console.error('Error updating evaluation record:', error);
  }
}
