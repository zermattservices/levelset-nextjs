import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePayForLocation, shouldCalculatePay } from '@/lib/pay-calculator';
import type {
  HotSchedulesShift,
  HotSchedulesJob,
  HotSchedulesRole,
  HotSchedulesBootstrap,
  HotSchedulesUserJob,
  HotSchedulesForecastDaily,
  HotSchedulesTimeOff,
  HotSchedulesTimeOffStatus,
  HotSchedulesAvailability,
  SchedulingSyncAnalysis,
} from '@/lib/hotschedules.types';
import { setCorsOrigin } from '@/lib/cors';

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    setCorsOrigin(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers for POST requests
  setCorsOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  let syncLogId: string | undefined;

  try {
    const supabase = createServerSupabaseClient();

    // Create sync log entry immediately (captures attempt even if handler crashes)
    const { data: syncLog } = await supabase
      .from('hs_sync_log')
      .insert({
        status: 'started',
        source: req.body.source || (req.body.bookmarklet_version ? 'bookmarklet' : null),
        bookmarklet_version: req.body.bookmarklet_version || null,
        hs_client_id: req.body.hs_client_id || null,
        location_number: req.body.hs_location_number || null,
        request_meta: {
          user_agent: req.headers['user-agent'] || null,
          origin: req.headers.origin || null,
          employee_count: Array.isArray(req.body.employees) ? req.body.employees.length :
                          Array.isArray(req.body) ? req.body.length : 0,
          has_shifts: !!(req.body.shifts?.length),
          has_bootstrap: !!req.body.bootstrap,
        },
      })
      .select('id')
      .single();
    syncLogId = syncLog?.id;

    const employees: HotSchedulesEmployee[] = req.body.employees || req.body;
    const locationId = req.body.location_id as string | undefined;     // backward compat
    const orgId = req.body.org_id as string | undefined;               // backward compat
    const hsClientId = req.body.hs_client_id as number | undefined;    // from cookie/bootstrap
    const hsLocationNumber = req.body.hs_location_number as string | undefined; // from cookie

    // New scheduling data fields (optional — backwards compatible)
    const shifts: HotSchedulesShift[] = req.body.shifts || [];
    const roles: HotSchedulesRole[] = req.body.roles || [];
    const bootstrap: HotSchedulesBootstrap | undefined = req.body.bootstrap;

    // Merge jobs from endpoint (/client/jobs/) and bootstrap — some shift jobIds
    // only exist in bootstrap.jobs but not in the client endpoint.
    const endpointJobs: HotSchedulesJob[] = req.body.jobs || [];
    const bootstrapJobs: HotSchedulesJob[] = bootstrap?.jobs || [];
    const jobById = new Map<number, HotSchedulesJob>();
    bootstrapJobs.forEach(j => jobById.set(j.id, j));  // bootstrap first (lower priority)
    endpointJobs.forEach(j => jobById.set(j.id, j));   // endpoint overwrites (higher priority)
    const jobs: HotSchedulesJob[] = Array.from(jobById.values());
    const forecasts = req.body.forecasts || {};
    const slsProjected = req.body.slsProjected || [];
    const timeOff: HotSchedulesTimeOff[] = req.body.timeOff || [];
    const timeOffStatuses: HotSchedulesTimeOffStatus[] = req.body.timeOffStatuses || [];
    const availability: HotSchedulesAvailability[] = req.body.availability || [];
    const weekStartDate: string | undefined = req.body.weekStartDate;

    if (!Array.isArray(employees) || employees.length === 0) {
      if (syncLogId) {
        await supabase.from('hs_sync_log').update({
          status: 'error',
          error_message: 'Invalid request body. Expected array of employees.',
          completed_at: new Date().toISOString(),
        }).eq('id', syncLogId);
      }
      return res.status(400).json({ error: 'Invalid request body. Expected array of employees.' });
    }

    // Step 1: Resolve location — cascade through detection methods
    let finalLocationId: string | undefined;
    let finalOrgId: string | undefined;
    let locationNumber: string = 'unknown';

    // Method A: Direct from request (backward compat with old bookmarklets)
    if (locationId && orgId) {
      finalLocationId = locationId;
      finalOrgId = orgId;
      const { data } = await supabase.from('locations').select('location_number')
        .eq('id', locationId).single();
      locationNumber = data?.location_number || 'unknown';
      console.log(`[Sync] Location resolved via Method A (direct IDs): ${locationNumber}`);
    }

    // Method B: Lookup by HS client ID (fast, saved from previous syncs)
    if (!finalLocationId && hsClientId) {
      const { data } = await supabase.from('locations')
        .select('id, org_id, location_number')
        .eq('hs_client_id', hsClientId).single();
      if (data) {
        finalLocationId = data.id;
        finalOrgId = data.org_id;
        locationNumber = data.location_number;
        console.log(`[Sync] Location resolved via Method B (hs_client_id ${hsClientId}): ${locationNumber}`);
      }
    }

    // Method C: Lookup by location number (from cookie, works on first sync)
    if (!finalLocationId && hsLocationNumber) {
      const { data } = await supabase.from('locations')
        .select('id, org_id, location_number')
        .eq('location_number', hsLocationNumber).single();
      if (data) {
        finalLocationId = data.id;
        finalOrgId = data.org_id;
        locationNumber = data.location_number;
        console.log(`[Sync] Location resolved via Method C (location_number ${hsLocationNumber}): ${locationNumber}`);
      }
    }

    // Method D: Legacy type:5 employee extraction (last resort)
    if (!finalLocationId) {
      const locationEmployee = employees.find(emp => {
        if (emp.type !== 5) return false;
        if (emp.name?.startsWith('x')) return false;
        const match = emp.name?.match(/\b\d{5}\b/);
        return match !== null;
      });

      if (locationEmployee?.name) {
        const locationNumberMatch = locationEmployee.name.match(/\b\d{5}\b/);
        const extractedNumber = locationNumberMatch?.[0] || '';
        if (extractedNumber) {
          const { data } = await supabase.from('locations')
            .select('id, org_id, location_number')
            .eq('location_number', extractedNumber).single();
          if (data) {
            finalLocationId = data.id;
            finalOrgId = data.org_id;
            locationNumber = data.location_number;
            console.log(`[Sync] Location resolved via Method D (type:5 employee): ${locationNumber}`);
          }
        }
      }
    }

    if (!finalLocationId || !finalOrgId) {
      if (syncLogId) {
        await supabase.from('hs_sync_log').update({
          status: 'error',
          error_message: 'Could not identify location',
          completed_at: new Date().toISOString(),
        }).eq('id', syncLogId);
      }
      return res.status(400).json({
        error: 'Could not identify location. No hs_client_id mapping, location_number, or type:5 employee found.',
        debug: { hsClientId, hsLocationNumber, locationId, orgId },
      });
    }

    // Update sync log with resolved location
    if (syncLogId) {
      await supabase.from('hs_sync_log').update({
        location_id: finalLocationId,
        org_id: finalOrgId,
        location_number: locationNumber,
      }).eq('id', syncLogId);
    }

    // Persist hs_client_id for faster future lookups
    const effectiveHsClientId = hsClientId || (bootstrap?.id as number | undefined);
    if (effectiveHsClientId) {
      await supabase.from('locations')
        .update({ hs_client_id: effectiveHsClientId })
        .eq('id', finalLocationId)
        .is('hs_client_id', null);  // Only set if not already set
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
        bootstrap?.id || hsClientId,
      );
    }

    // Step 7f: Extract actual pay rates from bootstrap.userJobs
    if (bootstrap?.userJobs && bootstrap.userJobs.length > 0) {
      await updateActualPayRates(supabase, bootstrap.userJobs, existingEmployeesByHsId);
    }

    // Step 7g: Persist forecast data to sales_forecasts + intervals
    let forecastsUpserted = 0;
    let intervalsUpserted = 0;
    const forecastDaily: HotSchedulesForecastDaily[] = forecasts.daily || [];
    const forecastIntervals = forecasts.intervals || [];

    if (forecastDaily.length > 0) {
      try {
        // Filter to sales forecasts only (storeType 0)
        const salesForecasts = forecastDaily.filter(
          (f: HotSchedulesForecastDaily) => f.storeType === 0 || f.storeName === 'Sales'
        );
        const transactionForecasts = forecastDaily.filter(
          (f: HotSchedulesForecastDaily) => f.storeType === 6 || f.storeName === 'Transactions'
        );

        // Build a map of date → { sales, transactions }
        const forecastByDate = new Map<string, { sales: number; transactions: number }>();
        salesForecasts.forEach((f: HotSchedulesForecastDaily) => {
          const existing = forecastByDate.get(f.date) || { sales: 0, transactions: 0 };
          existing.sales = f.volume;
          forecastByDate.set(f.date, existing);
        });
        transactionForecasts.forEach((f: HotSchedulesForecastDaily) => {
          const existing = forecastByDate.get(f.date) || { sales: 0, transactions: 0 };
          existing.transactions = f.volume;
          forecastByDate.set(f.date, existing);
        });

        // Upsert daily forecasts
        for (const [date, values] of Array.from(forecastByDate.entries())) {
          const { data: upserted, error: upsertErr } = await supabase
            .from('sales_forecasts')
            .upsert({
              org_id: finalOrgId,
              location_id: finalLocationId,
              forecast_date: date,
              projected_sales: values.sales,
              projected_transactions: values.transactions || null,
              source: 'hotschedules',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'location_id,forecast_date' })
            .select('id')
            .single();

          if (upsertErr) {
            console.error(`[Sync] Error upserting forecast for ${date}:`, upsertErr);
            continue;
          }
          forecastsUpserted++;

          // Upsert 15-min intervals for this date via RPC (atomic delete+insert)
          if (upserted && forecastIntervals.length > 0) {
            const dateIntervals = forecastIntervals.filter((fi: any) => {
              const fiDate = fi.dateTime?.split('T')[0];
              return fiDate === date && (fi.volumeTypeId === 0 || fi.volumeTypeId === undefined);
            });

            if (dateIntervals.length > 0) {
              const intervalRows = dateIntervals.map((fi: any) => {
                const timePart = fi.dateTime?.split('T')[1]?.substring(0, 5) || '00:00';
                return {
                  interval_start: timePart,
                  sales_amount: fi.storeVolume,
                  transaction_count: null,
                };
              });

              const { data: count, error: intervalErr } = await supabase
                .rpc('sync_forecast_intervals', {
                  p_forecast_id: upserted.id,
                  p_intervals: intervalRows,
                });

              if (intervalErr) {
                console.error(`[Sync] Error syncing intervals for ${date}:`, intervalErr);
              } else {
                intervalsUpserted += (count as number) || intervalRows.length;
              }
            }
          }
        }

        console.log(`[Sync] Forecast data persisted: ${forecastsUpserted} days, ${intervalsUpserted} intervals`);
      } catch (e) {
        console.error('[Sync] Error persisting forecast data:', e);
      }
    }

    // Step 7h: Persist time off requests via RPC (atomic upsert by hs_id)
    let timeOffUpserted = 0;
    if (timeOff.length > 0) {
      try {
        // Build status lookup
        const statusByRangeId = new Map<number, string>();
        timeOffStatuses.forEach((ts: HotSchedulesTimeOffStatus) => {
          statusByRangeId.set(ts.timeoffRangeId, ts.status.toLowerCase());
        });

        for (const to of timeOff) {
          // Map HS employee to Levelset employee
          const levelsetEmp = existingEmployeesByHsId.get(Number(to.employeeId));
          if (!levelsetEmp) {
            console.log(`[Sync] Skipping time off for unknown HS employee ${to.employeeId}`);
            continue;
          }

          // Map status: HS uses "Approved"/"Pending"/"Denied"
          const rawStatus = statusByRangeId.get(to.id) || 'pending';
          const status = rawStatus === 'approved' ? 'approved' : rawStatus === 'denied' ? 'denied' : 'pending';

          const { error: toErr } = await supabase
            .rpc('upsert_time_off_request', {
              p_org_id: finalOrgId,
              p_employee_id: levelsetEmp.id,
              p_location_id: finalLocationId,
              p_start_datetime: to.startDateTime,
              p_end_datetime: to.endDateTime,
              p_status: status,
              p_note: to.note || null,
              p_is_paid: false,
              p_hs_id: to.id,
            });

          if (toErr) {
            console.error(`[Sync] Error upserting time off hs_id=${to.id}:`, toErr);
          } else {
            timeOffUpserted++;
          }
        }

        console.log(`[Sync] Time off data persisted: ${timeOffUpserted} requests`);
      } catch (e) {
        console.error('[Sync] Error persisting time off data:', e);
      }
    }

    // Step 7i: Persist employee availability via RPC (atomic delete+insert per employee)
    let availabilityUpdated = 0;
    if (availability.length > 0) {
      try {
        for (const avail of availability) {
          const levelsetEmp = existingEmployeesByHsId.get(Number(avail.employeeId));
          if (!levelsetEmp) continue;

          // Build ranges array for the RPC
          const ranges = (avail.ranges || []).map((r: any) => ({
            day_of_week: (r.weekDay - 1) % 7, // HS: 1=Sun..7=Sat → 0=Sun..6=Sat
            start_time: r.startTime,
            end_time: r.endTime,
          }));

          const { error: availErr } = await supabase
            .rpc('sync_employee_availability', {
              p_employee_id: levelsetEmp.id,
              p_org_id: finalOrgId,
              p_ranges: ranges,
              p_max_hours_week: avail.threshold?.hoursInWeekMax ?? null,
              p_max_days_week: avail.threshold?.daysInWeekMax ?? null,
            });

          if (availErr) {
            console.error(`[Sync] Error syncing availability for employee ${levelsetEmp.id}:`, availErr);
          } else {
            availabilityUpdated++;
          }
        }

        console.log(`[Sync] Availability data persisted: ${availabilityUpdated} employees`);
      } catch (e) {
        console.error('[Sync] Error persisting availability data:', e);
      }
    }

    // Step 8: Create sync notification record
    // Build pay rates map from bootstrap.userJobs for use by confirm-sync
    // (employees may not exist yet when updateActualPayRates runs)
    // HS payRate values are in DOLLARS (e.g. 9 = $9/hr, 22 = $22/hr)
    const payRates: Record<string, { rate: number; type: 'hourly' | 'salary' }> = {};
    if (bootstrap?.userJobs && bootstrap.userJobs.length > 0) {
      const bestRate = new Map<number, number>();
      const primaryRateMap = new Map<number, number>();
      for (const uj of bootstrap.userJobs) {
        if (!uj.employeeId || !uj.payRate) continue;
        if (uj.primary) primaryRateMap.set(uj.employeeId, uj.payRate);
        const current = bestRate.get(uj.employeeId) || 0;
        if (uj.payRate > current) bestRate.set(uj.employeeId, uj.payRate);
      }
      for (const [hsEmpId, highest] of Array.from(bestRate.entries())) {
        const rateDollars = primaryRateMap.get(hsEmpId) ?? highest;
        payRates[String(hsEmpId)] = {
          rate: rateDollars,
          type: rateDollars > 100 ? 'salary' : 'hourly', // $100/hr threshold
        };
      }
    }

    const syncData: Record<string, any> = {
      new_employees: newEmployees,
      modified_employees: modifiedEmployees,
      terminated_employees: terminatedEmployees,
      has_scheduling_data: shifts.length > 0,
      week_start_date: weekStartDate || null,
      scheduling: schedulingAnalysis || null,
      pay_rates: Object.keys(payRates).length > 0 ? payRates : null,
      forecasts_synced: forecastsUpserted,
      forecast_intervals_synced: intervalsUpserted,
      time_off_synced: timeOffUpserted,
      availability_synced: availabilityUpdated,
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

    // Update sync log with success — include all request_meta fields (initial + result stats)
    if (syncLogId) {
      await supabase.from('hs_sync_log').update({
        status: 'success',
        completed_at: new Date().toISOString(),
        request_meta: {
          user_agent: req.headers['user-agent'] || null,
          origin: req.headers.origin || null,
          employee_count: employees.length,
          has_shifts: shifts.length > 0,
          has_bootstrap: !!req.body.bootstrap,
          new_count: newEmployees.length,
          modified_count: modifiedEmployees.length,
          terminated_count: terminatedEmployees.length,
          shifts_received: shifts.length,
          notification_id: notification?.id || null,
        },
      }).eq('id', syncLogId);
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

    // Update sync log with error (don't let logging failure mask the real error)
    if (syncLogId) {
      try {
        const supabase = createServerSupabaseClient();
        await supabase.from('hs_sync_log').update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        }).eq('id', syncLogId);
      } catch { /* ignore logging failure */ }
    }

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
  localClientId?: number,
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

  const weekShiftsAll = shifts.filter(s => {
    const shiftDate = new Date(s.startDate + 'T00:00:00');
    return shiftDate >= weekStart && shiftDate <= weekEnd;
  });

  // Filter out cross-client shifts (visiting leaders from other HS locations).
  // These have a different clientId than the local store's and their job definitions
  // don't exist in the local jobs list, producing orphan "Job {id}" positions.
  const weekShifts = localClientId
    ? weekShiftsAll.filter(s => s.clientId === localClientId)
    : weekShiftsAll;

  if (weekShiftsAll.length !== weekShifts.length) {
    console.log(`[Sync] Filtered out ${weekShiftsAll.length - weekShifts.length} cross-client shifts (local clientId: ${localClientId})`);
  }

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

/**
 * Extract actual pay rates from HS bootstrap.userJobs and write to employees table.
 * Each employee may have multiple userJobs — pick the primary job's rate,
 * or the highest rate if none is marked primary.
 * HS payRate values are in DOLLARS (e.g. 9 = $9/hr, 22 = $22/hr).
 * Rates > $100/hr are treated as annual salaries.
 */
const SALARY_THRESHOLD_DOLLARS = 100; // $100/hr — anything above is treated as salary

async function updateActualPayRates(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userJobs: HotSchedulesUserJob[],
  employeesByHsId: Map<number, Employee>,
): Promise<void> {
  // Build map: HS employeeId → best payRate (dollars)
  const bestRate = new Map<number, number>();
  const primaryRate = new Map<number, number>();

  for (const uj of userJobs) {
    if (!uj.employeeId || !uj.payRate) continue;

    if (uj.primary) {
      primaryRate.set(uj.employeeId, uj.payRate);
    }

    const current = bestRate.get(uj.employeeId) || 0;
    if (uj.payRate > current) {
      bestRate.set(uj.employeeId, uj.payRate);
    }
  }

  let updated = 0;
  for (const [hsEmpId, highestRate] of Array.from(bestRate.entries())) {
    const levelsetEmp = employeesByHsId.get(hsEmpId);
    if (!levelsetEmp) continue;

    // Use primary job rate if available, otherwise highest
    // HS payRate is already in dollars
    const payRateDollars = primaryRate.get(hsEmpId) ?? highestRate;

    if (payRateDollars > SALARY_THRESHOLD_DOLLARS) {
      // Salary: the rate represents an annual salary in dollars
      const { error } = await supabase
        .from('employees')
        .update({
          actual_pay: null,
          actual_pay_type: 'salary',
          actual_pay_annual: payRateDollars,
        })
        .eq('id', levelsetEmp.id);

      if (error) {
        console.error(`[Sync] Error updating salary for ${levelsetEmp.id}:`, error);
      } else {
        updated++;
      }
    } else {
      // Hourly: payRate is already in dollars
      const { error } = await supabase
        .from('employees')
        .update({
          actual_pay: payRateDollars,
          actual_pay_type: 'hourly',
          actual_pay_annual: null,
        })
        .eq('id', levelsetEmp.id);

      if (error) {
        console.error(`[Sync] Error updating hourly pay for ${levelsetEmp.id}:`, error);
      } else {
        updated++;
      }
    }
  }

  console.log(`[Sync] Updated actual pay rates for ${updated} employees`);
}

export default handler;

