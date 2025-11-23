import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePay, shouldCalculatePay } from '@/lib/pay-calculator';

interface NewEmployeeUpdate {
  id: string; // employee id from database
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
    let createdCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;

    // Process new employees with user overrides
    if (new_employees && Array.isArray(new_employees)) {
      for (const empUpdate of new_employees as NewEmployeeUpdate[]) {
        const updateData: Partial<Employee> = {};
        
        if (empUpdate.role !== undefined) updateData.role = empUpdate.role;
        if (empUpdate.is_foh !== undefined) updateData.is_foh = empUpdate.is_foh;
        if (empUpdate.is_boh !== undefined) updateData.is_boh = empUpdate.is_boh;
        if (empUpdate.availability !== undefined) updateData.availability = empUpdate.availability;

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from('employees')
            .update(updateData)
            .eq('id', empUpdate.id);

          if (error) {
            console.error(`Error updating new employee ${empUpdate.id}:`, error);
          } else {
            updatedCount++;
            
            // Recalculate pay if needed
            if (shouldCalculatePay(locationId)) {
              const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('id', empUpdate.id)
                .single();
              
              if (employee) {
                const calculatedPay = calculatePay(employee as Employee);
                if (calculatedPay !== null) {
                  await supabase
                    .from('employees')
                    .update({ calculated_pay: calculatedPay })
                    .eq('id', empUpdate.id);
                }
              }
            }
          }
        } else {
          createdCount++;
        }
      }
    } else {
      // Count new employees from sync data if no overrides provided
      createdCount = syncData.new_employees?.length || 0;
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

