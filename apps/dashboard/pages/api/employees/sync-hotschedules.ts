import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePayForLocation, shouldCalculatePay } from '@/lib/pay-calculator';
import type {
  HotSchedulesShift,
  HotSchedulesJob,
  HotSchedulesRole,
  HotSchedulesBootstrap,
  HotSchedulesForecastDaily,
  HotSchedulesTimeOff,
  HotSchedulesTimeOffStatus,
  HotSchedulesAvailability,
  SchedulingSyncAnalysis,
} from '@/lib/hotschedules.types';

// Increase body size limit for large HS payloads (900+ shifts)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

    // New scheduling data fields (optional — backwards compatible)
    const shifts: HotSchedulesShift[] = req.body.shifts || [];
    const jobs: HotSchedulesJob[] = req.body.jobs || [];
    const roles: HotSchedulesRole[] = req.body.roles || [];
    const bootstrap: HotSchedulesBootstrap | undefined = req.body.bootstrap;
    const forecasts = req.body.forecasts || {};
    const slsProjected = req.body.slsProjected || [];
    const timeOff: HotSchedulesTimeOff[] = req.body.timeOff || [];
    const timeOffStatuses: HotSchedulesTimeOffStatus[] = req.body.timeOffStatuses || [];
    const availability: HotSchedulesAvailability[] = req.body.availability || [];
    const weekStartDate: string | undefined = req.body.weekStartDate;

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

    // Step 7b: Upload raw scheduling data to storage (if present)
    if (shifts.length > 0 || jobs.length > 0) {
      try {
        const scheduleFileName = `schedule_${locationNumber}_${timestamp}.json`;
        const scheduleData = JSON.stringify({ shifts, jobs, roles, bootstrap, weekStartDate }, null, 2);
        await supabase.storage
          .from('hs_script_updates')
          .upload(scheduleFileName, scheduleData, { contentType: 'application/json', upsert: false });
        console.log(`[Sync] Uploaded scheduling data: ${scheduleFileName}`);
      } catch (e) {
        console.error('Error uploading scheduling data:', e);
      }
    }

    // Step 7c: Upload raw forecast data to storage (if present)
    if (forecasts.daily?.length > 0 || slsProjected.length > 0) {
      try {
        const forecastFileName = `forecast_${locationNumber}_${timestamp}.json`;
        const forecastData = JSON.stringify({ forecasts, slsProjected }, null, 2);
        await supabase.storage
          .from('hs_script_updates')
          .upload(forecastFileName, forecastData, { contentType: 'application/json', upsert: false });
        console.log(`[Sync] Uploaded forecast data: ${forecastFileName}`);
      } catch (e) {
        console.error('Error uploading forecast data:', e);
      }
    }

    // Step 7d: Upload raw availability/time-off data to storage (if present)
    if (timeOff.length > 0 || availability.length > 0) {
      try {
        const availFileName = `availability_${locationNumber}_${timestamp}.json`;
        const availData = JSON.stringify({ timeOff, timeOffStatuses, availability }, null, 2);
        await supabase.storage
          .from('hs_script_updates')
          .upload(availFileName, availData, { contentType: 'application/json', upsert: false });
        console.log(`[Sync] Uploaded availability data: ${availFileName}`);
      } catch (e) {
        console.error('Error uploading availability data:', e);
      }
    }

    // Step 7e: Analyze scheduling data for notification
    let schedulingAnalysis: SchedulingSyncAnalysis | undefined;
    if (shifts.length > 0 && weekStartDate) {
      schedulingAnalysis = await analyzeSchedulingData(
        supabase,
        shifts,
        jobs,
        roles,
        weekStartDate,
        finalLocationId,
        existingEmployees || [],
      );
    }

    // Step 8: Create sync notification record
    const syncData: Record<string, any> = {
      new_employees: newEmployees,
      modified_employees: modifiedEmployees,
      terminated_employees: terminatedEmployees,
      has_scheduling_data: shifts.length > 0,
      week_start_date: weekStartDate || null,
      scheduling: schedulingAnalysis || null,
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
        shifts_received: shifts.length || undefined,
        jobs_received: jobs.length || undefined,
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

/**
 * Analyze scheduling data to produce a summary for the sync notification.
 * Filters shifts to the target week, identifies HS jobs used, checks for
 * existing position mappings, and groups shifts by employee.
 */
async function analyzeSchedulingData(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  shifts: HotSchedulesShift[],
  jobs: HotSchedulesJob[],
  roles: HotSchedulesRole[],
  weekStartDate: string,
  locationId: string,
  existingEmployees: Employee[],
): Promise<SchedulingSyncAnalysis> {
  // Build lookup maps
  const jobMap = new Map<number, HotSchedulesJob>();
  jobs.forEach(j => jobMap.set(j.id, j));

  const roleMap = new Map<number, HotSchedulesRole>();
  roles.forEach(r => roleMap.set(r.id, r));

  const employeeByHsId = new Map<number, Employee>();
  existingEmployees.forEach(emp => {
    if (emp.hs_id) employeeByHsId.set(Number(emp.hs_id), emp);
  });

  // Filter shifts to target week only (weekStartDate to weekStartDate + 6 days)
  const weekStart = new Date(weekStartDate + 'T00:00:00');
  const weekEnd = new Date(weekStartDate + 'T00:00:00');
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekShifts = shifts.filter(s => {
    const shiftDate = new Date(s.startDate + 'T00:00:00');
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  console.log(`[Sync] Scheduling analysis: ${weekShifts.length} shifts in target week (${weekStartDate})`);

  // Calculate end time from startTime + duration
  function calcEndTime(startTime: string, durationMinutes: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  // Calculate break minutes from mbpBreaks array
  function calcBreakMinutes(mbpBreaks: any[]): number {
    if (!mbpBreaks || !Array.isArray(mbpBreaks)) return 0;
    return mbpBreaks.reduce((total: number, b: any) => total + (b.duration || 0), 0);
  }

  // Identify unique HS jobs used in this week's shifts
  const jobIdsUsed = new Set<number>();
  weekShifts.forEach(s => jobIdsUsed.add(s.jobId));

  const hsJobsUsed = Array.from(jobIdsUsed).map(jobId => {
    const job = jobMap.get(jobId);
    const role = job ? roleMap.get(job.defaultScheduleId) : undefined;
    const shiftCount = weekShifts.filter(s => s.jobId === jobId).length;
    return {
      hs_job_id: jobId,
      hs_job_name: job?.jobName || `Unknown Job (${jobId})`,
      hs_role_id: role?.id || job?.defaultScheduleId || 0,
      hs_role_name: role?.name || 'Unknown',
      shift_count: shiftCount,
    };
  });

  // Look up existing position mappings for this location
  const { data: existingMappings } = await supabase
    .from('hs_position_mappings')
    .select('hs_job_id, position_id, org_positions(id, name)')
    .eq('location_id', locationId);

  const mappingByJobId = new Map<number, { position_id: string; position_name: string }>();
  (existingMappings || []).forEach((m: any) => {
    if (m.position_id) {
      mappingByJobId.set(Number(m.hs_job_id), {
        position_id: m.position_id,
        position_name: m.org_positions?.name || 'Unknown',
      });
    }
  });

  const mappedJobs = hsJobsUsed
    .filter(j => mappingByJobId.has(j.hs_job_id))
    .map(j => ({
      hs_job_id: j.hs_job_id,
      hs_job_name: j.hs_job_name,
      position_id: mappingByJobId.get(j.hs_job_id)!.position_id,
      position_name: mappingByJobId.get(j.hs_job_id)!.position_name,
    }));

  const unmappedJobs = hsJobsUsed.filter(j => !mappingByJobId.has(j.hs_job_id));

  // Group shifts by employee
  const shiftsByOwner = new Map<number, HotSchedulesShift[]>();
  weekShifts.forEach(s => {
    const ownerId = s.house ? 0 : s.ownerId;
    if (!shiftsByOwner.has(ownerId)) shiftsByOwner.set(ownerId, []);
    shiftsByOwner.get(ownerId)!.push(s);
  });

  const shiftsByEmployee = Array.from(shiftsByOwner.entries()).map(([ownerId, ownerShifts]) => {
    const levelsetEmp = ownerId ? employeeByHsId.get(ownerId) : undefined;
    // Try to get name from the first shift's data or from Levelset employee
    const empName = levelsetEmp
      ? `${levelsetEmp.first_name || ''} ${levelsetEmp.last_name || ''}`.trim()
      : ownerId === 0
        ? 'Open Shifts'
        : `HS Employee #${ownerId}`;

    return {
      hs_employee_id: ownerId,
      employee_name: empName,
      levelset_employee_id: levelsetEmp?.id || null,
      shifts: ownerShifts.map(s => {
        const breakMins = calcBreakMinutes(s.mbpBreaks);
        return {
          hs_shift_id: s.id,
          date: s.startDate,
          start_time: s.startTime,
          end_time: calcEndTime(s.startTime, s.duration),
          duration_minutes: s.duration,
          hs_job_id: s.jobId,
          hs_job_name: jobMap.get(s.jobId)?.jobName || `Job ${s.jobId}`,
          is_house_shift: s.house,
          break_minutes: breakMins,
          notes: s.shiftNote || null,
        };
      }),
    };
  });

  // Calculate totals
  const totalHours = weekShifts.reduce((sum, s) => {
    const breakMins = calcBreakMinutes(s.mbpBreaks);
    return sum + (s.duration - breakMins) / 60;
  }, 0);

  // Estimated cost from HS pay data (totalCost is in CENTS)
  const totalEstimatedCost = weekShifts.reduce((sum, s) => sum + (s.totalCost || 0), 0) / 100;

  const uniqueEmployees = new Set(weekShifts.filter(s => !s.house && s.ownerId).map(s => s.ownerId));

  return {
    total_shifts: weekShifts.length,
    total_employees_scheduled: uniqueEmployees.size,
    total_hours: Math.round(totalHours * 100) / 100,
    total_estimated_cost: Math.round(totalEstimatedCost * 100) / 100,
    hs_jobs_used: hsJobsUsed,
    mapped_jobs: mappedJobs,
    unmapped_jobs: unmappedJobs,
    shifts_by_employee: shiftsByEmployee,
  };
}

