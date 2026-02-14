import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePayForLocation, shouldCalculatePay } from '@/lib/pay-calculator';

interface HotSchedulesEmployee {
  id?: number | string;
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
  birthDate?: number; // milliseconds timestamp
  hireDate?: number; // milliseconds timestamp
  [key: string]: any;
}

// Helper function to decode milliseconds timestamp to YYYY-MM-DD date string
function decodeDate(timestamp?: number): string | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
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
    const locationId = req.body.location_id as string | undefined;
    const orgId = req.body.org_id as string | undefined;

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'Invalid request body. Expected array of employees.' });
    }

    // Step 1: Get location_id and org_id (from request or extract from data)
    let finalLocationId: string;
    let finalOrgId: string;
    let locationNumber: string;

    if (locationId && orgId) {
      // Use provided location_id and org_id
      finalLocationId = locationId;
      finalOrgId = orgId;
      
      // Get location number for storage filename
      const { data: locationData } = await supabase
        .from('locations')
        .select('location_number')
        .eq('id', locationId)
        .single();
      locationNumber = locationData?.location_number || 'unknown';
    } else {
      // Fallback: Extract location number from HotSchedules data (legacy support)
      const locationEmployee = employees.find(emp => {
        if (emp.type !== 5) return false;
        if (emp.name?.startsWith('x')) return false; // lowercase x
        const match = emp.name?.match(/\b\d{5}\b/); // 5 consecutive digits
        return match !== null;
      });

      if (!locationEmployee || !locationEmployee.name) {
        return res.status(400).json({ error: 'Could not find location number in HotSchedules data. Expected employee with type: 5 and 5-digit location number in name, or provide location_id and org_id in request.' });
      }

      const locationNumberMatch = locationEmployee.name.match(/\b\d{5}\b/);
      locationNumber = locationNumberMatch?.[0] || '';

      if (!locationNumber) {
        return res.status(400).json({ error: 'Could not extract location number from employee name.' });
      }

      // Look up location_id and org_id from locations table
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

      finalLocationId = locationData.id;
      finalOrgId = locationData.org_id;
    }

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
      .eq('location_id', finalLocationId);

    if (existingError) {
      console.error('Error fetching existing employees:', existingError);
      return res.status(500).json({ error: 'Failed to fetch existing employees', details: existingError.message });
    }

    // Create maps for matching: by hs_id (primary), email (secondary), and name (fallback)
    const existingEmployeesByHsId = new Map<number, Employee>();
    const existingEmployeesByEmail = new Map<string, Employee>();
    const existingEmployeesByName = new Map<string, Employee>();
    (existingEmployees || []).forEach(emp => {
      if (emp.hs_id) {
        existingEmployeesByHsId.set(Number(emp.hs_id), emp);
      }
      if (emp.email) {
        existingEmployeesByEmail.set(emp.email.toLowerCase(), emp);
      }
      // Create name key for fallback matching (normalize: lowercase, no extra spaces)
      const firstName = (emp.first_name || '').toLowerCase().trim();
      const lastName = (emp.last_name || '').toLowerCase().trim();
      if (firstName && lastName) {
        // Store by "firstname lastname" format
        const nameKey = `${firstName} ${lastName}`;
        if (!existingEmployeesByName.has(nameKey)) {
          existingEmployeesByName.set(nameKey, emp);
        }
      }
    });

    // Step 5: Identify changes WITHOUT creating/updating employees
    // Employees will only be created/updated when user confirms in the modal
    const hsIdsInSync = new Set<number>();
    const newEmployees: any[] = [];
    const modifiedEmployees: any[] = [];
    let skippedCount = 0;

    console.log(`[Sync] Starting to identify changes for ${activeVisibleEmployees.length} employees`);

    for (const hsEmployee of activeVisibleEmployees) {
      if (!hsEmployee.email) {
        skippedCount++;
        console.log(`[Sync] Skipping employee ${hsEmployee.name || hsEmployee.id} - no email`);
        continue;
      }

      const hsId = hsEmployee.id ? Number(hsEmployee.id) : null;
      const emailLower = hsEmployee.email.toLowerCase();
      
      // Decode dates from milliseconds
      const birthDate = decodeDate(hsEmployee.birthDate);
      const hireDate = decodeDate(hsEmployee.hireDate);
      
      // Match by hs_id first, then email, then name
      let existingEmployee: Employee | undefined;
      let matchedBy: 'hs_id' | 'email' | 'name' | null = null;
      
      if (hsId) {
        existingEmployee = existingEmployeesByHsId.get(hsId);
        if (existingEmployee) matchedBy = 'hs_id';
        hsIdsInSync.add(hsId);
      }
      if (!existingEmployee) {
        existingEmployee = existingEmployeesByEmail.get(emailLower);
        if (existingEmployee) matchedBy = 'email';
      }
      // Fallback to name matching if no hs_id or email match
      if (!existingEmployee && hsEmployee.firstname && hsEmployee.lastname) {
        const firstName = hsEmployee.firstname.toLowerCase().trim();
        const lastName = hsEmployee.lastname.toLowerCase().trim();
        const nameKey = `${firstName} ${lastName}`;
        existingEmployee = existingEmployeesByName.get(nameKey);
        if (existingEmployee) {
          matchedBy = 'name';
          console.log(`[Sync] Matched by name: ${nameKey} -> ${existingEmployee.id}`);
        }
      }

      const phoneNumber = hsEmployee.phone || hsEmployee.contactNumber?.formatted || null;

      if (existingEmployee) {
        // Track as modified employee (will be updated in confirm-sync if needed)
        modifiedEmployees.push({
          id: existingEmployee.id,
          hs_id: hsId,
          email: hsEmployee.email,
          first_name: hsEmployee.firstname || existingEmployee.first_name,
          last_name: hsEmployee.lastname || existingEmployee.last_name,
          phone: phoneNumber,
          birth_date: birthDate,
          hire_date: hireDate,
        });
        console.log(`[Sync] Identified modified employee: ${hsEmployee.email}`);
      } else {
        // Track as new employee (will be created in confirm-sync)
        newEmployees.push({
          hs_id: hsId,
          email: hsEmployee.email,
          first_name: hsEmployee.firstname || '',
          last_name: hsEmployee.lastname || '',
          phone: phoneNumber,
          birth_date: birthDate,
          hire_date: hireDate,
        });
        if (hsId) hsIdsInSync.add(hsId);
        console.log(`[Sync] Identified new employee: ${hsEmployee.email}`);
      }
    }

    console.log(`[Sync] Change identification complete - New: ${newEmployees.length}, Modified: ${modifiedEmployees.length}, Skipped: ${skippedCount}`);

    // Step 6: Identify terminated employees (in DB but not in sync, by hs_id)
    const terminatedEmployees = (existingEmployees || [])
      .filter(emp => {
        if (!emp.hs_id) return false; // Only consider employees with hs_id
        return !hsIdsInSync.has(Number(emp.hs_id));
      })
      .map(emp => ({
        id: emp.id,
        hs_id: emp.hs_id,
        email: emp.email,
        first_name: emp.first_name,
        last_name: emp.last_name,
      }));

    // Step 7: Upload raw HotSchedules data to Supabase storage (for reference)
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const fileName = `employees_${locationNumber}_${timestamp}.json`;
    
    const jsonData = JSON.stringify(activeVisibleEmployees, null, 2);
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

    // Step 8: Create sync notification record
    const syncData = {
      new_employees: newEmployees,
      modified_employees: modifiedEmployees,
      terminated_employees: terminatedEmployees,
    };

    const { data: notification, error: notificationError } = await supabase
      .from('hs_sync_notifications')
      .insert({
        location_id: finalLocationId,
        org_id: finalOrgId,
        sync_data: syncData,
        viewed: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating sync notification:', notificationError);
      // Don't fail the request if notification creation fails
    }

    // Step 9: Update has_synced_before flag on location
    const { error: updateLocationError } = await supabase
      .from('locations')
      .update({ has_synced_before: true })
      .eq('id', finalLocationId);

    if (updateLocationError) {
      console.error('Error updating has_synced_before flag:', updateLocationError);
      // Don't fail the request if flag update fails
    }

    return res.status(200).json({
      success: true,
      location_number: locationNumber,
      location_id: finalLocationId,
      notification_id: notification?.id || null,
      stats: {
        new: newEmployees.length,
        modified: modifiedEmployees.length,
        terminated: terminatedEmployees.length,
      },
      storage_file: uploadError ? null : fileName,
      debug: {
        total_received: employees.length,
        after_filter: activeVisibleEmployees.length,
        existing_count: existingEmployees?.length || 0,
        skipped: skippedCount,
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

