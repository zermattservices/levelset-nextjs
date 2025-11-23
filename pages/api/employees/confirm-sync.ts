import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePay, shouldCalculatePay } from '@/lib/pay-calculator';

interface NewEmployeeUpdate {
  id?: string; // employee id from database (for existing employees)
  email?: string; // email for matching new employees
  hs_id?: number; // hs_id for matching new employees
  role?: string;
  is_foh?: boolean;
  is_boh?: boolean;
  availability?: 'Available' | 'Limited';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { notification_id, new_employees, kept_employees } = req.body;

    if (!notification_id) {
      return res.status(400).json({ error: 'notification_id is required' });
    }

    // Get the notification to access sync data
    const { data: notification, error: notificationError } = await supabase
      .from('hs_sync_notifications')
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
    };

    const locationId = notification.location_id;
    const orgId = notification.org_id;
    let createdCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;

    // Process new employees - CREATE them first, then apply user overrides
    if (new_employees && Array.isArray(new_employees)) {
      // Create new employees from sync data
      for (const newEmpData of syncData.new_employees || []) {
        // Find user edits for this employee (match by email or hs_id)
        let userEdit: NewEmployeeUpdate | undefined;
        for (const edit of new_employees as any[]) {
          if ((edit.email && edit.email === newEmpData.email) || 
              (edit.hs_id && edit.hs_id === newEmpData.hs_id)) {
            userEdit = edit;
            break;
          }
        }

        // Determine default role based on has_synced_before (we'll need to check this)
        const { data: location } = await supabase
          .from('locations')
          .select('has_synced_before')
          .eq('id', locationId)
          .single();
        
        const defaultRole = location?.has_synced_before ? 'New Hire' : 'Team Member';

        // Create the employee with defaults
        const employeeData: Partial<Employee> = {
          first_name: newEmpData.first_name || '',
          last_name: newEmpData.last_name || '',
          email: newEmpData.email,
          phone: newEmpData.phone || null,
          hs_id: newEmpData.hs_id || null,
          birth_date: newEmpData.birth_date || null,
          hire_date: newEmpData.hire_date || null,
          role: userEdit?.role || defaultRole,
          is_foh: userEdit?.is_foh !== undefined ? userEdit.is_foh : false,
          is_boh: userEdit?.is_boh !== undefined ? userEdit.is_boh : false,
          availability: userEdit?.availability || 'Available',
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
          console.error(`Error creating new employee ${newEmpData.email}:`, createError);
          continue;
        }

        createdCount++;

        // Calculate pay if needed
        if (createdEmployee && shouldCalculatePay(locationId)) {
          const calculatedPay = calculatePay(createdEmployee as Employee);
          if (calculatedPay !== null) {
            await supabase
              .from('employees')
              .update({ calculated_pay: calculatedPay })
              .eq('id', createdEmployee.id);
          }
        }
      }
    } else {
      // No user edits, create all new employees with defaults
      for (const newEmpData of syncData.new_employees || []) {
        const { data: location } = await supabase
          .from('locations')
          .select('has_synced_before')
          .eq('id', locationId)
          .single();
        
        const defaultRole = location?.has_synced_before ? 'New Hire' : 'Team Member';

        const employeeData: Partial<Employee> = {
          first_name: newEmpData.first_name || '',
          last_name: newEmpData.last_name || '',
          email: newEmpData.email,
          phone: newEmpData.phone || null,
          hs_id: newEmpData.hs_id || null,
          birth_date: newEmpData.birth_date || null,
          hire_date: newEmpData.hire_date || null,
          role: defaultRole,
          is_foh: false,
          is_boh: false,
          availability: 'Available',
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
          console.error(`Error creating new employee ${newEmpData.email}:`, createError);
          continue;
        }

        createdCount++;

        if (createdEmployee && shouldCalculatePay(locationId)) {
          const calculatedPay = calculatePay(createdEmployee as Employee);
          if (calculatedPay !== null) {
            await supabase
              .from('employees')
              .update({ calculated_pay: calculatedPay })
              .eq('id', createdEmployee.id);
          }
        }
      }
    }

    // Process modified employees (if any user overrides provided)
    // For now, modified employees are just tracked but not updated here
    // This is a placeholder for future functionality

    // Process terminated employees (deactivate those not in kept_employees)
    const keptHsIds = new Set((kept_employees || []).map((id: number) => Number(id)));
    const terminatedEmployees = (syncData.terminated_employees || []).filter(
      (emp: any) => !keptHsIds.has(Number(emp.hs_id))
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
      .from('hs_sync_notifications')
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
    console.error('Error in confirm-sync:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

