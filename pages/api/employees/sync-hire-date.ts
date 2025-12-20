import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import * as XLSX from 'xlsx';
import type { Employee } from '@/lib/supabase.types';
import { parseEmployeeName } from '@/lib/utils/name-parser';
import { matchEmployee } from '@/lib/utils/employee-matcher';

interface SpreadsheetRow {
  'Employee Name': string;
  'Location': string;
  'Job': string;
  'Location Hire Date': string; // MM/DD/YYYY format
  'Operator Hire Date': string;
}

// Map HR/Payroll job titles to Levelset roles
function mapJobToRole(job: string): string {
  if (!job) return 'Team Member';
  
  const jobLower = job.toLowerCase().trim();
  
  // Operator/Owner
  if (jobLower.includes('operator') || jobLower.includes('owner') || jobLower.includes('franchisee')) {
    return 'Operator';
  }
  
  // Executive
  if (jobLower.includes('executive') || jobLower.includes('exec')) {
    return 'Executive';
  }
  
  // Director
  if (jobLower.includes('director') || jobLower.includes('manager') || jobLower.includes('kitchen manager') || jobLower.includes('front of house manager') || jobLower.includes('foh manager') || jobLower.includes('boh manager')) {
    return 'Director';
  }
  
  // Team Lead / Shift Leader
  if (jobLower.includes('team lead') || jobLower.includes('shift lead') || jobLower.includes('shift leader') || jobLower.includes('team leader') || jobLower.includes('supervisor')) {
    return 'Team Lead';
  }
  
  // Trainer
  if (jobLower.includes('trainer') || jobLower.includes('training')) {
    return 'Trainer';
  }
  
  // Team Member (default for various positions)
  return 'Team Member';
}

// Convert MM/DD/YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  try {
    // Handle MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { fileData, location_id, org_id, unmatched_mappings } = req.body;

    if (!fileData || !location_id || !org_id) {
      return res.status(400).json({ error: 'fileData, location_id, and org_id are required' });
    }

    // Parse Excel file
    // fileData is base64 string
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: SpreadsheetRow[] = XLSX.utils.sheet_to_json(worksheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Spreadsheet is empty' });
    }

    // Get all existing employees for this location
    const { data: existingEmployees, error: existingError } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', location_id)
      .eq('active', true);

    if (existingError) {
      console.error('Error fetching existing employees:', existingError);
      return res.status(500).json({ error: 'Failed to fetch existing employees', details: existingError.message });
    }

    // Process spreadsheet rows
    const payrollNamesInSpreadsheet = new Set<string>();
    const newEmployees: any[] = [];
    const modifiedEmployees: any[] = [];
    const unmatchedEmployees: any[] = [];
    const suggestedEmployeeIds = new Set<string>(); // Track which employees have been suggested

    // Map of spreadsheet payroll_name -> employee_id (from user selections)
    const userMappings = new Map<string, string>();
    if (unmatched_mappings && typeof unmatched_mappings === 'object') {
      Object.entries(unmatched_mappings).forEach(([payrollName, employeeId]) => {
        if (employeeId && typeof employeeId === 'string') {
          userMappings.set(payrollName, employeeId);
        }
      });
    }

    for (const row of rows) {
      const payrollName = row['Employee Name']?.trim();
      if (!payrollName) continue;

      const hireDate = parseDate(row['Location Hire Date']);
      const jobTitle = row['Job']?.trim() || '';
      const mappedRole = mapJobToRole(jobTitle);
      payrollNamesInSpreadsheet.add(payrollName);

      // Check if employee exists with matching payroll_name
      const existingByPayrollName = (existingEmployees || []).find(
        emp => emp.payroll_name && emp.payroll_name.toLowerCase() === payrollName.toLowerCase()
      );

      if (existingByPayrollName) {
        // Fully synced - check if hire_date needs updating
        if (hireDate && existingByPayrollName.hire_date !== hireDate) {
          modifiedEmployees.push({
            id: existingByPayrollName.id,
            payroll_name: payrollName,
            hire_date: hireDate,
          });
        }
        // Otherwise, fully synced, no action needed
        continue;
      }

      // Try to match using fuzzy logic (only if no user mapping provided)
      const mappedEmployeeId = userMappings.get(payrollName);
      if (mappedEmployeeId) {
        const mappedEmployee = (existingEmployees || []).find(emp => emp.id === mappedEmployeeId);
        if (mappedEmployee) {
          // User selected a mapping - will be handled in confirm endpoint
          // For now, add to unmatched so UI can show it
          unmatchedEmployees.push({
            payroll_name: payrollName,
            hire_date: hireDate,
            job_title: jobTitle,
            mapped_role: mappedRole,
            mapped_employee_id: mappedEmployeeId,
            parsed_first_name: parseEmployeeName(payrollName).firstName,
            parsed_last_name: parseEmployeeName(payrollName).lastName,
          });
          continue;
        }
      }

      // Try fuzzy matching
      const parsedName = parseEmployeeName(payrollName);
      const matchResult = matchEmployee(parsedName, existingEmployees || []);

      if (matchResult.employee && matchResult.confidence !== 'none' && matchResult.confidence !== 'low') {
        // If employee already has payroll_name set, NEVER override it via fuzzy matching
        // The only way to update payroll_name is through exact match (handled above)
        // or through user confirmation in unmatched employees accordion
        if (matchResult.employee.payroll_name) {
          // Employee already has payroll_name - skip fuzzy matching
          // Their payroll_name should never be overridden automatically
          // They will only appear in modified if exact match found above
        } else {
          // Employee doesn't have payroll_name - needs user confirmation
          // Check if this employee has already been suggested for another payroll name
          // If so, compare match scores to keep the best match
          const existingSuggestionIndex = unmatchedEmployees.findIndex(
            (u: any) => u.suggested_match_id === matchResult.employee.id
          );
          
          if (existingSuggestionIndex >= 0) {
            // Employee already suggested - check if this match is better
            const existingMatch = matchEmployee(
              parseEmployeeName(unmatchedEmployees[existingSuggestionIndex].payroll_name),
              [matchResult.employee]
            );
            
            // If current match is better (higher score), replace the existing suggestion
            if (matchResult.score > existingMatch.score) {
              // Remove suggestion from existing entry
              unmatchedEmployees[existingSuggestionIndex].suggested_match_id = null;
              unmatchedEmployees[existingSuggestionIndex].suggested_match_name = null;
              
              // Add suggestion to current entry
              unmatchedEmployees.push({
                payroll_name: payrollName,
                hire_date: hireDate,
                job_title: jobTitle,
                mapped_role: mappedRole,
                parsed_first_name: parsedName.firstName,
                parsed_last_name: parsedName.lastName,
                suggested_match_id: matchResult.employee.id,
                suggested_match_name: matchResult.employee.full_name,
              });
            } else {
              // Existing match is better, don't suggest for this one
              unmatchedEmployees.push({
                payroll_name: payrollName,
                hire_date: hireDate,
                job_title: jobTitle,
                mapped_role: mappedRole,
                parsed_first_name: parsedName.firstName,
                parsed_last_name: parsedName.lastName,
                suggested_match_id: null,
                suggested_match_name: null,
              });
            }
          } else {
            // Employee not yet suggested - add suggestion
            unmatchedEmployees.push({
              payroll_name: payrollName,
              hire_date: hireDate,
              job_title: jobTitle,
              mapped_role: mappedRole,
              parsed_first_name: parsedName.firstName,
              parsed_last_name: parsedName.lastName,
              suggested_match_id: matchResult.employee.id,
              suggested_match_name: matchResult.employee.full_name,
            });
          }
        }
      } else {
        // No match found - needs user selection
        unmatchedEmployees.push({
          payroll_name: payrollName,
          hire_date: hireDate,
          job_title: jobTitle,
          mapped_role: mappedRole,
          parsed_first_name: parsedName.firstName,
          parsed_last_name: parsedName.lastName,
          suggested_match_id: null,
          suggested_match_name: null,
        });
      }
    }

    // Identify terminated employees (in DB with payroll_name but not in spreadsheet)
    const terminatedEmployees = (existingEmployees || [])
      .filter(emp => {
        if (!emp.payroll_name) return false;
        return !payrollNamesInSpreadsheet.has(emp.payroll_name);
      })
      .map(emp => ({
        id: emp.id,
        payroll_name: emp.payroll_name,
        first_name: emp.first_name,
        last_name: emp.last_name,
      }));

    // Create sync notification (employees are NOT modified yet)
    // unmatched_employees will be processed in UI - user selects mappings
    // After user confirms, unmatched without mappings become new, unmatched with mappings become modified
    const syncData = {
      new_employees: [], // Will be populated from unmatched_employees without mappings on confirm
      modified_employees: modifiedEmployees, // Auto-matched employees
      terminated_employees: terminatedEmployees,
      unmatched_employees: unmatchedEmployees, // Needs user selection
    };

    const { data: notification, error: notificationError } = await supabase
      .from('payroll_sync_notifications')
      .insert({
        location_id,
        org_id,
        sync_data: syncData,
        viewed: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating sync notification:', notificationError);
      return res.status(500).json({ error: 'Failed to create sync notification', details: notificationError.message });
    }

    return res.status(200).json({
      success: true,
      notification_id: notification.id,
      stats: {
        new: newEmployees.length,
        modified: modifiedEmployees.length,
        terminated: terminatedEmployees.length,
        unmatched: unmatchedEmployees.length,
      },
    });

  } catch (error) {
    console.error('Error in sync-hire-date:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

