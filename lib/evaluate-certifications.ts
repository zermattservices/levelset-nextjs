/**
 * Core certification evaluation logic
 * Implements state machine for certification status transitions
 */

import { createClient } from '@supabase/supabase-js';
import type { Employee, CertificationStatus, CertificationAudit } from './supabase.types';
import { 
  allPositionsQualified, 
  isEligibleLocation,
  getPEAAuditDay,
} from './certification-utils';
import { 
  fetchEmployeePositionAverages,
  type PositionAverages,
} from './fetch-position-averages';

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
 * Evaluate certifications for all employees in a location
 * @param locationId - The location to evaluate
 * @param auditDate - The audit date (PEA Audit Day)
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service role key
 * @returns Array of evaluation results
 */
export async function evaluateCertifications(
  locationId: string,
  auditDate: Date,
  supabaseUrl: string,
  supabaseKey: string
): Promise<EvaluationResult[]> {
  // Check if this location is eligible for certification tracking
  if (!isEligibleLocation(locationId)) {
    console.log(`Location ${locationId} is not eligible for certification tracking`);
    return [];
  }
  
  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // Fetch active employees for this location
  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('*')
    .eq('location_id', locationId)
    .eq('active', true);
  
  if (employeesError || !employees) {
    console.error('Error fetching employees:', employeesError);
    return [];
  }
  
  // Calculate position averages from ratings table
  const positionAveragesData = await fetchEmployeePositionAverages(employees as Employee[], supabase);
  
  // Create a map for quick lookup
  const averagesMap = new Map<string, PositionAverages>();
  positionAveragesData.forEach(avg => {
    averagesMap.set(avg.employeeId, avg);
  });
  
  // Process each employee
  const results: EvaluationResult[] = [];
  
  for (const employee of employees as Employee[]) {
    const result = await evaluateEmployee(
      employee,
      averagesMap.get(employee.id),
      auditDate,
      supabase
    );
    
    if (result) {
      results.push(result);
      
      // Save audit record and update employee status
      await saveEvaluationResult(result, auditDate, supabase);
    }
  }
  
  return results;
}

/**
 * Evaluate a single employee's certification status
 */
async function evaluateEmployee(
  employee: Employee,
  positionAverages: PositionAverages | undefined,
  auditDate: Date,
  supabase: any
): Promise<EvaluationResult | null> {
  const currentStatus = employee.certified_status || 'Not Certified';
  let newStatus: CertificationStatus = currentStatus;
  let notes: string | undefined;
  
  const positions = positionAverages?.positions || {};
  const allQualified = Object.keys(positions).length > 0 && allPositionsQualified(positions);
  
  // Fetch last 2 audit records for this employee
  const { data: previousAudits } = await supabase
    .from('certification_audit')
    .select('*')
    .eq('employee_id', employee.id)
    .order('audit_date', { ascending: false })
    .limit(2);
  
  const lastAudit = previousAudits?.[0] as CertificationAudit | undefined;
  const secondLastAudit = previousAudits?.[1] as CertificationAudit | undefined;
  
  // Apply state machine logic
  switch (currentStatus) {
    case 'Not Certified':
      newStatus = evaluateNotCertified(allQualified, lastAudit);
      if (newStatus === 'Pending') {
        notes = 'Employee qualified with all positions >= 2.85 for two consecutive months. Evaluation pending.';
      }
      break;
      
    case 'Pending':
      // Pending status is manually changed to Certified after evaluation
      // But if they drop below threshold, return to Not Certified
      if (!allQualified) {
        newStatus = 'Not Certified';
        notes = 'Position averages dropped below 2.85 while in Pending status.';
      }
      break;
      
    case 'Certified':
      newStatus = evaluateCertified(allQualified, lastAudit, currentStatus);
      if (newStatus === 'PIP') {
        notes = 'Employee below 2.85 threshold for two consecutive months. Placed on PIP.';
      } else if (newStatus === 'Certified' && !allQualified) {
        notes = 'WARNING: At least one position below 2.85. Will be placed on PIP next month if not improved.';
      }
      break;
      
    case 'PIP':
      newStatus = evaluatePIP(allQualified);
      if (newStatus === 'Certified') {
        notes = 'Employee improved all positions to >= 2.85. Returned to Certified status.';
      } else if (newStatus === 'Not Certified') {
        notes = 'Employee did not improve within PIP period. Status changed to Not Certified.';
      }
      break;
  }
  
  return {
    employeeId: employee.id,
    employeeName: employee.full_name || `${employee.first_name} ${employee.last_name || ''}`.trim(),
    statusBefore: currentStatus,
    statusAfter: newStatus,
    positionAverages: positions,
    allQualified,
    notes,
  };
}

/**
 * Evaluate transition from Not Certified
 */
function evaluateNotCertified(
  allQualified: boolean,
  lastAudit: CertificationAudit | undefined
): CertificationStatus {
  // If not qualified this month, stay Not Certified
  if (!allQualified) {
    return 'Not Certified';
  }
  
  // If qualified this month AND qualified last month, move to Pending
  if (lastAudit && lastAudit.all_positions_qualified) {
    return 'Pending';
  }
  
  // Qualified this month but no history or wasn't qualified last month
  return 'Not Certified';
}

/**
 * Evaluate transition from Certified
 */
function evaluateCertified(
  allQualified: boolean,
  lastAudit: CertificationAudit | undefined,
  currentStatus: CertificationStatus
): CertificationStatus {
  // If still qualified, stay Certified
  if (allQualified) {
    return 'Certified';
  }
  
  // Not qualified this month - check if there was a warning last month
  if (lastAudit && lastAudit.status_after === 'Certified' && !lastAudit.all_positions_qualified) {
    // Had warning last month and still below threshold -> PIP
    return 'PIP';
  }
  
  // First month below threshold - issue warning but stay Certified
  return 'Certified';
}

/**
 * Evaluate transition from PIP
 */
function evaluatePIP(allQualified: boolean): CertificationStatus {
  // If improved to all qualified, return to Certified
  if (allQualified) {
    return 'Certified';
  }
  
  // PIP period ends after one audit cycle
  // If still not qualified, move to Not Certified
  return 'Not Certified';
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
  const auditDay = getPEAAuditDay(today.getFullYear(), today.getMonth() + 1);
  
  // Check if today is the audit day
  const isAuditDay = (
    today.getFullYear() === auditDay.getFullYear() &&
    today.getMonth() === auditDay.getMonth() &&
    today.getDate() === auditDay.getDate()
  );
  
  if (!isAuditDay) {
    return {
      success: false,
      message: `Today is not PEA Audit Day. Next audit day is ${auditDay.toLocaleDateString()}`,
    };
  }
  
  // Run evaluations for both Buda and West Buda
  const budaLocationId = process.env.NEXT_PUBLIC_BUDA_LOCATION_ID;
  const westBudaLocationId = process.env.NEXT_PUBLIC_WEST_BUDA_LOCATION_ID;
  
  const allResults: EvaluationResult[] = [];
  
  if (budaLocationId) {
    const budaResults = await evaluateCertifications(
      budaLocationId,
      auditDay,
      supabaseUrl,
      supabaseKey
    );
    allResults.push(...budaResults);
  }
  
  if (westBudaLocationId) {
    const westBudaResults = await evaluateCertifications(
      westBudaLocationId,
      auditDay,
      supabaseUrl,
      supabaseKey
    );
    allResults.push(...westBudaResults);
  }
  
  const statusChanges = allResults.filter(r => r.statusBefore !== r.statusAfter);
  
  return {
    success: true,
    message: `Evaluated ${allResults.length} employees. ${statusChanges.length} status changes.`,
    results: allResults,
  };
}
