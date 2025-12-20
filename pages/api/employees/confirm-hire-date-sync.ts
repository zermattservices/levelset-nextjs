import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePayForLocation, shouldCalculatePay } from '@/lib/pay-calculator';

interface UnmatchedMapping {
  payroll_name: string;
  employee_id: string | null; // null means create new employee
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { notification_id, unmatched_mappings, employee_edits, kept_employees } = req.body;

    if (!notification_id) {
      return res.status(400).json({ error: 'notification_id is required' });
    }

    // Get the notification to access sync data
    const { data: notification, error: notificationError } = await supabase
      .from('payroll_sync_notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notificationError || !notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const syncData = notification.sync_data as {
      new_employees: any[];
      modified_employees: any[];
      terminated_employees: any[];
      unmatched_employees: any[];
    };

    const locationId = notification.location_id;
    const orgId = notification.org_id;
    let createdCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;

    // Process unmatched employees based on user mappings
    const mappings = unmatched_mappings as Record<string, string | null> || {};
    
    // Get all employees for lookups
    const { data: allEmployees } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locationId);

    for (const unmatched of syncData.unmatched_employees || []) {
      const payrollName = unmatched.payroll_name;
      const employeeId = mappings[payrollName];

      if (employeeId) {
        // User selected an existing employee - update it
        const employee = (allEmployees || []).find(emp => emp.id === employeeId);
        if (employee) {
          const updateData: Partial<Employee> = {
            payroll_name: payrollName,
            hire_date: unmatched.hire_date || null,
          };

          // Apply user edits if any
          const edits = (employee_edits || []).find((e: any) => e.id === employeeId);
          if (edits) {
            if (edits.role) updateData.role = edits.role;
            if (edits.is_foh !== undefined) updateData.is_foh = edits.is_foh;
            if (edits.is_boh !== undefined) updateData.is_boh = edits.is_boh;
            if (edits.availability) updateData.availability = edits.availability;
          }

          const { error: updateError } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', employeeId);

          if (updateError) {
            console.error(`Error updating employee ${employeeId}:`, updateError);
          } else {
            updatedCount++;
          }
        }
      } else {
        // No mapping selected - create new employee
        const edits = (employee_edits || []).find((e: any) => 
          e.payroll_name === payrollName || 
          (e.first_name === unmatched.parsed_first_name && e.last_name === unmatched.parsed_last_name)
        );

        const { data: location } = await supabase
          .from('locations')
          .select('has_synced_before')
          .eq('id', locationId)
          .single();
        
        const defaultRole = location?.has_synced_before ? 'New Hire' : 'Team Member';

        const employeeData: Partial<Employee> = {
          first_name: edits?.first_name || unmatched.parsed_first_name || '',
          last_name: edits?.last_name || unmatched.parsed_last_name || '',
          payroll_name: payrollName,
          hire_date: unmatched.hire_date || null,
          role: edits?.role || defaultRole,
          is_foh: edits?.is_foh !== undefined ? edits.is_foh : false,
          is_boh: edits?.is_boh !== undefined ? edits.is_boh : false,
          availability: edits?.availability || 'Available',
          certified_status: 'Not Certified',
          active: true,
          location_id: locationId,
          org_id: orgId,
        };

        const { data: createdEmployee, error: createError } = await supabase
          .from('employees')
          .insert(employeeData)
          .select()
          .single();

        if (createError) {
          console.error(`Error creating new employee ${payrollName}:`, createError);
        } else {
          createdCount++;

          // Calculate pay if needed
          if (createdEmployee && shouldCalculatePay(locationId)) {
            const calculatedPay = calculatePayForLocation(createdEmployee as Employee, locationId);
            if (calculatedPay !== null) {
              await supabase
                .from('employees')
                .update({ calculated_pay: calculatedPay })
                .eq('id', createdEmployee.id);
            }
          }
        }
      }
    }

    // Process auto-matched modified employees (update hire_date only, no UI display)
    for (const modified of syncData.modified_employees || []) {
      const updateData: Partial<Employee> = {
        hire_date: modified.hire_date || null,
      };

      // If payroll_name is provided, update it
      if (modified.payroll_name) {
        updateData.payroll_name = modified.payroll_name;
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', modified.id);

      if (updateError) {
        console.error(`Error updating modified employee ${modified.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    // Process terminated employees (deactivate those not in kept_employees)
    const keptIds = new Set((kept_employees || []).map((id: string) => id));
    const terminatedEmployees = (syncData.terminated_employees || []).filter(
      (emp: any) => !keptIds.has(emp.id)
    );

    if (terminatedEmployees.length > 0) {
      const terminatedIds = terminatedEmployees.map((emp: any) => emp.id);
      const { error: deactivateError } = await supabase
        .from('employees')
        .update({ active: false })
        .in('id', terminatedIds);

      if (deactivateError) {
        console.error('Error deactivating terminated employees:', deactivateError);
      } else {
        deactivatedCount = terminatedEmployees.length;
      }
    }

    // Mark notification as viewed
    await supabase
      .from('payroll_sync_notifications')
      .update({ viewed: true })
      .eq('id', notification_id);

    return res.status(200).json({
      success: true,
      stats: {
        created: createdCount,
        updated: updatedCount,
        deactivated: deactivatedCount,
      },
    });
  } catch (error) {
    console.error('Error in confirm-hire-date-sync:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

