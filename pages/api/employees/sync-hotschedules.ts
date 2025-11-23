import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePay, shouldCalculatePay } from '@/lib/pay-calculator';

interface HotSchedulesEmployee {
  id?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  contactNumber?: {
    formatted?: string;
    [key: string]: any;
  };
  active?: boolean;
  visible?: boolean;
  type?: number;
  [key: string]: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for POST requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const supabase = createServerSupabaseClient();
    const employees: HotSchedulesEmployee[] = req.body.employees || req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'Invalid request body. Expected array of employees.' });
    }

    // Step 1: Extract location number from HotSchedules data
    const locationEmployee = employees.find(emp => {
      if (emp.type !== 5) return false;
      if (emp.name?.startsWith('x')) return false; // lowercase x
      const match = emp.name?.match(/\b\d{5}\b/); // 5 consecutive digits
      return match !== null;
    });

    if (!locationEmployee || !locationEmployee.name) {
      return res.status(400).json({ error: 'Could not find location number in HotSchedules data. Expected employee with type: 5 and 5-digit location number in name.' });
    }

    const locationNumberMatch = locationEmployee.name.match(/\b\d{5}\b/);
    const locationNumber = locationNumberMatch?.[0];

    if (!locationNumber) {
      return res.status(400).json({ error: 'Could not extract location number from employee name.' });
    }

    // Step 2: Look up location_id and org_id from locations table
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .select('id, org_id')
      .eq('location_number', locationNumber)
      .single();

    if (locationError || !locationData) {
      return res.status(404).json({ 
        error: `Location not found for location number: ${locationNumber}`,
        details: locationError?.message 
      });
    }

    const locationId = locationData.id;
    const orgId = locationData.org_id;

    // Step 3: Filter and transform HotSchedules employees
    console.log(`[Sync] Total employees received: ${employees.length}`);
    const activeVisibleEmployees = employees.filter(emp => 
      emp.visible === true && emp.active === true && emp.email
    );
    console.log(`[Sync] Employees after filter (visible=true, active=true, has email): ${activeVisibleEmployees.length}`);
    
    // Debug: Log why employees are being filtered out
    if (activeVisibleEmployees.length === 0 && employees.length > 0) {
      const sample = employees.slice(0, 5);
      console.log('[Sync] Sample of received employees:', JSON.stringify(sample.map(emp => ({
        name: emp.name,
        visible: emp.visible,
        active: emp.active,
        hasEmail: !!emp.email,
        email: emp.email
      })), null, 2));
    }

    // Step 4: Get all existing employees for this location
    const { data: existingEmployees, error: existingError } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locationId);

    if (existingError) {
      console.error('Error fetching existing employees:', existingError);
      return res.status(500).json({ error: 'Failed to fetch existing employees', details: existingError.message });
    }

    const existingEmployeesMap = new Map<string, Employee>();
    (existingEmployees || []).forEach(emp => {
      if (emp.email) {
        existingEmployeesMap.set(emp.email.toLowerCase(), emp);
      }
    });

    // Step 5: Process employees
    const processedEmployees: any[] = [];
    const emailsInSync = new Set<string>();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log(`[Sync] Starting to process ${activeVisibleEmployees.length} employees`);

    for (const hsEmployee of activeVisibleEmployees) {
      if (!hsEmployee.email) {
        skippedCount++;
        console.log(`[Sync] Skipping employee ${hsEmployee.name || hsEmployee.id} - no email`);
        continue; // Skip if no email
      }

      const emailLower = hsEmployee.email.toLowerCase();
      emailsInSync.add(emailLower);

      const existingEmployee = existingEmployeesMap.get(emailLower);

      if (existingEmployee) {
        // Update existing employee
        const phoneNumber = hsEmployee.phone || hsEmployee.contactNumber?.formatted || existingEmployee.phone;
        const updateData: Partial<Employee> = {
          first_name: hsEmployee.firstname || existingEmployee.first_name,
          last_name: hsEmployee.lastname || existingEmployee.last_name,
          email: hsEmployee.email,
          phone: phoneNumber || null,
          active: true,
        };

        // Preserve existing values for role, is_foh, is_boh, availability, certified_status
        if (existingEmployee.role) updateData.role = existingEmployee.role;
        if (existingEmployee.is_foh !== undefined) updateData.is_foh = existingEmployee.is_foh;
        if (existingEmployee.is_boh !== undefined) updateData.is_boh = existingEmployee.is_boh;
        if (existingEmployee.availability) updateData.availability = existingEmployee.availability;
        if (existingEmployee.certified_status) updateData.certified_status = existingEmployee.certified_status;

        const { error: updateError } = await supabase
          .from('employees')
          .update(updateData)
          .eq('id', existingEmployee.id);

        if (updateError) {
          console.error(`[Sync] Error updating employee ${existingEmployee.id} (${hsEmployee.email}):`, updateError);
          errorCount++;
          continue;
        }

        updatedCount++;
        processedEmployees.push({ ...existingEmployee, ...updateData });
        console.log(`[Sync] Updated employee: ${hsEmployee.email}`);
      } else {
        // Create new employee
        const phoneNumber = hsEmployee.phone || hsEmployee.contactNumber?.formatted || null;
        const newEmployeeData: Partial<Employee> = {
          first_name: hsEmployee.firstname || '',
          last_name: hsEmployee.lastname || '',
          email: hsEmployee.email,
          phone: phoneNumber,
          role: 'Team Member', // Default role
          is_foh: false, // Default
          is_boh: false, // Default
          availability: 'Available', // Default
          certified_status: 'Not Certified', // Default
          active: true,
          location_id: locationId,
          org_id: orgId,
        };

        const { data: newEmployee, error: createError } = await supabase
          .from('employees')
          .insert(newEmployeeData)
          .select()
          .single();

        if (createError) {
          console.error(`[Sync] Error creating employee ${hsEmployee.email}:`, createError);
          console.error(`[Sync] Employee data:`, JSON.stringify(newEmployeeData, null, 2));
          errorCount++;
          continue;
        }

        // Calculate pay if needed
        if (newEmployee && shouldCalculatePay(locationId)) {
          const calculatedPay = calculatePay(newEmployee as Employee);
          if (calculatedPay !== null) {
            await supabase
              .from('employees')
              .update({ calculated_pay: calculatedPay })
              .eq('id', newEmployee.id);
            newEmployee.calculated_pay = calculatedPay;
          }
        }

        createdCount++;
        processedEmployees.push(newEmployee);
        console.log(`[Sync] Created employee: ${hsEmployee.email}`);
      }
    }

    console.log(`[Sync] Processing complete - Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    // Step 6: Mark missing employees as inactive
    const employeesToDeactivate = (existingEmployees || []).filter(emp => {
      if (!emp.email) return false;
      return !emailsInSync.has(emp.email.toLowerCase());
    });

    let deactivatedCount = 0;
    if (employeesToDeactivate.length > 0) {
      const idsToDeactivate = employeesToDeactivate.map(emp => emp.id);
      const { error: deactivateError } = await supabase
        .from('employees')
        .update({ active: false })
        .in('id', idsToDeactivate);

      if (deactivateError) {
        console.error('Error deactivating employees:', deactivateError);
      } else {
        deactivatedCount = employeesToDeactivate.length;
      }
    }

    // Step 7: Upload to Supabase storage
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const fileName = `employees_${locationNumber}_${timestamp}.json`;
    
    const jsonData = JSON.stringify(processedEmployees, null, 2);
    const { error: uploadError } = await supabase.storage
      .from('hs_script_updates')
      .upload(fileName, jsonData, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError);
      // Don't fail the request if storage upload fails, just log it
    }

    return res.status(200).json({
      success: true,
      location_number: locationNumber,
      location_id: locationId,
      stats: {
        created: createdCount,
        updated: updatedCount,
        deactivated: deactivatedCount,
        total_processed: processedEmployees.length,
      },
      storage_file: uploadError ? null : fileName,
      debug: {
        total_received: employees.length,
        after_filter: activeVisibleEmployees.length,
        existing_count: existingEmployees?.length || 0,
        skipped: skippedCount,
        errors: errorCount,
      },
    });

  } catch (error) {
    console.error('Error in sync-hotschedules:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

