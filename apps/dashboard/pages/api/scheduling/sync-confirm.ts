import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { HotSchedulesShift, HotSchedulesJob, HotSchedulesRole } from '@/lib/hotschedules.types';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface PositionMappingInput {
  hs_job_id: number;
  hs_job_name: string;
  hs_role_id?: number;
  hs_role_name?: string;
  position_id: string | null; // null = auto-create
}

interface SyncConfirmRequest {
  notification_id: string;
  week_start_date: string;
  location_id: string;
  org_id: string;
  position_mappings: PositionMappingInput[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const {
      notification_id,
      week_start_date,
      location_id,
      org_id,
      position_mappings,
    } = req.body as SyncConfirmRequest;

    if (!notification_id || !week_start_date || !location_id || !org_id) {
      return res.status(400).json({ error: 'notification_id, week_start_date, location_id, and org_id are required' });
    }

    if (!position_mappings || !Array.isArray(position_mappings)) {
      return res.status(400).json({ error: 'position_mappings array is required' });
    }

    // Step 1: Load the notification to get scheduling data
    const { data: notification, error: notifError } = await supabase
      .from('hs_sync_notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      return res.status(404).json({ error: 'Notification not found', details: notifError?.message });
    }

    const syncData = notification.sync_data as any;
    if (!syncData?.scheduling) {
      return res.status(400).json({ error: 'Notification does not contain scheduling data' });
    }

    // Step 2: Resolve position mappings (create scheduling_only positions for unmapped jobs)
    const positionMap = await resolvePositionMappings(supabase, position_mappings, org_id, location_id);

    // Step 3: Get the raw scheduling data from storage to access full shift details
    // The notification contains analyzed shifts, but we need the full shift objects
    const shiftsByEmployee = syncData.scheduling.shifts_by_employee as Array<{
      hs_employee_id: number;
      employee_name: string;
      levelset_employee_id: string | null;
      shifts: Array<{
        hs_shift_id: number;
        date: string;
        start_time: string;
        end_time: string;
        duration_minutes: number;
        hs_job_id: number;
        hs_job_name: string;
        is_house_shift: boolean;
        break_minutes: number;
        notes: string | null;
      }>;
    }>;

    // Step 3b: Re-resolve employee IDs from current DB state.
    // On first sync, employees didn't exist yet when the notification was created,
    // so levelset_employee_id was null. Now they've been created in the employee
    // confirm step, so we look them up fresh by hs_id.
    const hsEmployeeIds = shiftsByEmployee
      .filter(g => g.hs_employee_id > 0)
      .map(g => g.hs_employee_id);

    if (hsEmployeeIds.length > 0) {
      const { data: currentEmployees } = await supabase
        .from('employees')
        .select('id, hs_id')
        .eq('location_id', location_id)
        .not('hs_id', 'is', null);

      const empByHsId = new Map<number, string>();
      (currentEmployees || []).forEach((emp: any) => {
        if (emp.hs_id) empByHsId.set(Number(emp.hs_id), emp.id);
      });

      let resolved = 0;
      for (const group of shiftsByEmployee) {
        if (!group.levelset_employee_id && group.hs_employee_id > 0) {
          const empId = empByHsId.get(group.hs_employee_id);
          if (empId) {
            group.levelset_employee_id = empId;
            resolved++;
          }
        }
      }
      if (resolved > 0) {
        console.log(`[SyncConfirm] Re-resolved ${resolved} employee IDs from current DB state`);
      }
    }

    // Step 4: Create/update schedule and sync shifts
    const result = await syncScheduleShifts(
      supabase,
      location_id,
      org_id,
      week_start_date,
      shiftsByEmployee,
      positionMap,
    );

    // Step 5: Mark notification as processed
    await supabase
      .from('hs_sync_notifications')
      .update({
        status: 'schedule_synced',
        updated_at: new Date().toISOString(),
      })
      .eq('id', notification_id);

    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('Error in sync-confirm:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Resolve position mappings: upsert existing mappings and auto-create
 * scheduling_only positions for unmapped HS jobs.
 * Returns a Map<hs_job_id, position_id>.
 */
async function resolvePositionMappings(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  mappings: PositionMappingInput[],
  orgId: string,
  locationId: string,
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  // Fetch scheduling_areas for this org to assign area_id to new positions
  const { data: areas } = await supabase
    .from('scheduling_areas')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('is_active', true);

  const fohArea = areas?.find(a => a.name === 'FOH') || areas?.[0];
  const bohArea = areas?.find(a => a.name === 'BOH') || areas?.[1];

  // Get max display_order for new positions
  const { data: maxOrderData } = await supabase
    .from('org_positions')
    .select('display_order')
    .eq('org_id', orgId)
    .order('display_order', { ascending: false })
    .limit(1);

  let nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

  for (const mapping of mappings) {
    if (mapping.position_id) {
      // User mapped to existing Levelset position — upsert the mapping record
      const { error: upsertError } = await supabase
        .from('hs_position_mappings')
        .upsert({
          org_id: orgId,
          location_id: locationId,
          hs_job_id: mapping.hs_job_id,
          hs_job_name: mapping.hs_job_name,
          hs_role_id: mapping.hs_role_id || null,
          hs_role_name: mapping.hs_role_name || null,
          position_id: mapping.position_id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'location_id,hs_job_id',
        });

      if (upsertError) {
        console.error(`Error upserting position mapping for hs_job_id ${mapping.hs_job_id}:`, upsertError);
      }

      result.set(mapping.hs_job_id, mapping.position_id);
    } else {
      // Auto-create a scheduling_only position
      // Determine zone from HS job name and role name heuristic
      const jobName = (mapping.hs_job_name || '').toLowerCase();
      const roleName = (mapping.hs_role_name || '').toLowerCase();
      const combined = `${jobName} ${roleName}`;
      const isBoh = combined.includes('back') || combined.includes('boh');
      const zone: 'FOH' | 'BOH' = isBoh ? 'BOH' : 'FOH';
      const areaId = isBoh ? bohArea?.id : fohArea?.id;

      const { data: newPosition, error: posError } = await supabase
        .from('org_positions')
        .insert({
          org_id: orgId,
          name: mapping.hs_job_name,
          zone,
          display_order: nextOrder++,
          is_active: true,
          position_type: 'scheduling_only',
          area_id: areaId || null,
          scheduling_enabled: true,
        })
        .select('id')
        .single();

      if (posError || !newPosition) {
        console.error(`Error creating position for hs_job ${mapping.hs_job_name}:`, posError);
        continue;
      }

      // Store the mapping
      await supabase
        .from('hs_position_mappings')
        .upsert({
          org_id: orgId,
          location_id: locationId,
          hs_job_id: mapping.hs_job_id,
          hs_job_name: mapping.hs_job_name,
          hs_role_id: mapping.hs_role_id || null,
          hs_role_name: mapping.hs_role_name || null,
          position_id: newPosition.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'location_id,hs_job_id',
        });

      result.set(mapping.hs_job_id, newPosition.id);
      console.log(`[SyncConfirm] Auto-created position "${mapping.hs_job_name}" (${zone}) -> ${newPosition.id}`);
    }
  }

  return result;
}

/**
 * Create or overwrite shifts for the target week.
 * Finds/creates the schedule record, deletes existing shifts for the week,
 * then inserts all new shifts with assignments and projected costs.
 */
async function syncScheduleShifts(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  locationId: string,
  orgId: string,
  weekStartDate: string,
  shiftsByEmployee: Array<{
    hs_employee_id: number;
    employee_name: string;
    levelset_employee_id: string | null;
    shifts: Array<{
      hs_shift_id: number;
      date: string;
      start_time: string;
      end_time: string;
      duration_minutes: number;
      hs_job_id: number;
      hs_job_name: string;
      is_house_shift: boolean;
      break_minutes: number;
      notes: string | null;
    }>;
  }>,
  positionMap: Map<number, string>,
) {
  // Step 1: Find or create schedule record for this location + week
  let { data: schedule } = await supabase
    .from('schedules')
    .select('id')
    .eq('location_id', locationId)
    .eq('week_start', weekStartDate)
    .single();

  if (!schedule) {
    const { data: newSchedule, error: createErr } = await supabase
      .from('schedules')
      .insert({
        location_id: locationId,
        org_id: orgId,
        week_start: weekStartDate,
        status: 'draft',
      })
      .select('id')
      .single();

    if (createErr || !newSchedule) {
      throw new Error(`Failed to create schedule: ${createErr?.message}`);
    }
    schedule = newSchedule;
  }

  const scheduleId = schedule.id;

  // Step 2: Delete existing shifts for this schedule (assignments auto-cascade)
  const { error: deleteError } = await supabase
    .from('shifts')
    .delete()
    .eq('schedule_id', scheduleId);

  if (deleteError) {
    console.error('Error deleting existing shifts:', deleteError);
    throw new Error(`Failed to clear existing shifts: ${deleteError.message}`);
  }

  // Step 3: Pre-fetch all employee pay info to avoid N+1 queries
  const employeeIds = shiftsByEmployee
    .filter(g => g.levelset_employee_id)
    .map(g => g.levelset_employee_id!);

  interface PayInfo {
    hourlyRate: number | null;
    isSalary: boolean;
    weeklyCost: number | null;
  }
  const payInfoMap = new Map<string, PayInfo>();
  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, actual_pay, actual_pay_type, actual_pay_annual, calculated_pay')
      .in('id', Array.from(new Set(employeeIds)));

    (employees || []).forEach((emp: any) => {
      const isSalary = emp.actual_pay_type === 'salary' && emp.actual_pay_annual;
      const hourlyRate = isSalary ? null : (emp.actual_pay ?? emp.calculated_pay ?? null);
      const weeklyCost = isSalary ? Math.round(emp.actual_pay_annual / 52 * 100) / 100 : null;
      payInfoMap.set(emp.id, { hourlyRate, isSalary: !!isSalary, weeklyCost });
    });
  }

  // Step 4: Flatten all shifts and insert
  let shiftsCreated = 0;
  let assignmentsCreated = 0;
  let totalHours = 0;
  let totalHourlyCost = 0;
  const salariedEmployeesInSchedule = new Set<string>();

  for (const group of shiftsByEmployee) {
    for (const shift of group.shifts) {
      const positionId = positionMap.get(shift.hs_job_id) || null;

      // Insert the shift
      const { data: newShift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          schedule_id: scheduleId,
          org_id: orgId,
          position_id: positionId,
          shift_date: shift.date,
          end_date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes,
          is_house_shift: shift.is_house_shift,
          notes: shift.notes,
        })
        .select('id')
        .single();

      if (shiftError || !newShift) {
        console.error(`Error creating shift:`, shiftError);
        continue;
      }

      shiftsCreated++;

      // Calculate hours for this shift
      const startMins = parseTime(shift.start_time);
      let endMins = parseTime(shift.end_time);
      if (endMins <= startMins) endMins += 24 * 60; // cross-day
      const netHours = Math.max(0, (endMins - startMins) / 60 - shift.break_minutes / 60);
      totalHours += netHours;

      // Create assignment if not a house shift and employee is matched
      if (!shift.is_house_shift && group.levelset_employee_id) {
        const payInfo = payInfoMap.get(group.levelset_employee_id);
        let projectedCost: number | null = null;

        if (payInfo?.isSalary) {
          // Salary: no per-shift cost, track employee for weekly total
          salariedEmployeesInSchedule.add(group.levelset_employee_id);
        } else if (payInfo?.hourlyRate) {
          projectedCost = Math.round(payInfo.hourlyRate * netHours * 100) / 100;
        }

        const { error: assignError } = await supabase
          .from('shift_assignments')
          .insert({
            shift_id: newShift.id,
            employee_id: group.levelset_employee_id,
            org_id: orgId,
            projected_cost: projectedCost,
          });

        if (assignError) {
          console.error(`Error creating assignment:`, assignError);
        } else {
          assignmentsCreated++;
          totalHourlyCost += projectedCost || 0;
        }
      }
    }
  }

  // Calculate total cost: hourly costs + salaried weekly costs
  let totalSalaryCost = 0;
  for (const empId of Array.from(salariedEmployeesInSchedule)) {
    const payInfo = payInfoMap.get(empId);
    if (payInfo?.weeklyCost) {
      totalSalaryCost += payInfo.weeklyCost;
    }
  }
  const totalCost = totalHourlyCost + totalSalaryCost;

  // Step 5: Update schedule with totals and publish
  await supabase
    .from('schedules')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      total_hours: Math.round(totalHours * 100) / 100,
      total_labor_cost: Math.round(totalCost * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId);

  console.log(`[SyncConfirm] Schedule synced: ${shiftsCreated} shifts, ${assignmentsCreated} assignments, ${totalHours.toFixed(1)}h, $${totalCost.toFixed(2)} (hourly: $${totalHourlyCost.toFixed(2)}, salary: $${totalSalaryCost.toFixed(2)})`);

  return {
    schedule_id: scheduleId,
    shifts_created: shiftsCreated,
    assignments_created: assignmentsCreated,
    total_hours: Math.round(totalHours * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
  };
}



function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
