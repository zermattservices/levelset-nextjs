/**
 * GET /api/onboarding/hs-sync-result
 *
 * FOH/BOH enrichment endpoint for onboarding HS sync.
 *
 * Reads the latest raw HotSchedules employee AND schedule data from Supabase
 * storage (uploaded by the production /api/employees/sync-hotschedules endpoint)
 * and runs FOH/BOH auto-detection based on job names.
 *
 * HS employee objects do NOT have a `jobs` array — they only have `primaryJobId`.
 * The actual job names come from the schedule file's `jobs` array, and employee-to-job
 * mappings come from the schedule's `shifts` array (ownerId → jobId).
 *
 * Query params:
 *   - location_id (required): the location to look up
 *
 * Returns:
 *   { fohBohMap: { [hsId]: { isFoh, isBoh } }, salariedMap: { [hsId]: true } }
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { detectFohBoh, isSalariedEmployee } from '@/lib/onboarding/foh-boh-detector';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  // Get user's org_id for scoping
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'Complete account setup first' });
  }

  const locationId = req.query.location_id as string;
  if (!locationId) {
    return res.status(400).json({ error: 'location_id query parameter is required' });
  }

  try {
    // Get location_number for the storage file name pattern — scoped to user's org
    const { data: location } = await supabase
      .from('locations')
      .select('location_number')
      .eq('id', locationId)
      .eq('org_id', appUser.org_id)
      .single();

    if (!location?.location_number) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const locNum = location.location_number;

    // Fetch both employee and schedule files in parallel
    const [employeeFiles, scheduleFiles] = await Promise.all([
      supabase.storage.from('hs_script_updates').list('', {
        search: `employees_${locNum}_`,
        sortBy: { column: 'created_at', order: 'desc' },
        limit: 1,
      }),
      supabase.storage.from('hs_script_updates').list('', {
        search: `schedule_${locNum}_`,
        sortBy: { column: 'created_at', order: 'desc' },
        limit: 1,
      }),
    ]);

    if (!employeeFiles.data?.length) {
      return res.status(200).json({ fohBohMap: {}, salariedMap: {} });
    }

    // Download both files in parallel
    const downloads = await Promise.all([
      supabase.storage.from('hs_script_updates').download(employeeFiles.data[0].name),
      scheduleFiles.data?.length
        ? supabase.storage.from('hs_script_updates').download(scheduleFiles.data[0].name)
        : Promise.resolve({ data: null, error: null }),
    ]);

    const employeeBlob = downloads[0].data;
    const scheduleBlob = downloads[1].data;

    if (!employeeBlob) {
      return res.status(200).json({ fohBohMap: {}, salariedMap: {} });
    }

    // Parse raw employee data
    const rawEmployees = JSON.parse(await employeeBlob.text());
    if (!Array.isArray(rawEmployees)) {
      return res.status(200).json({ fohBohMap: {}, salariedMap: {} });
    }

    // Build jobId → jobName map and employeeId → Set<jobId> from schedule data
    const jobIdToName: Record<string, string> = {};
    const employeeJobIds: Record<string, Set<string>> = {};

    if (scheduleBlob) {
      try {
        const scheduleData = JSON.parse(await scheduleBlob.text());

        // Map job IDs to job names from the jobs array
        const jobs = scheduleData.jobs || [];
        for (const job of jobs) {
          if (job.id && (job.jobName || job.name)) {
            jobIdToName[String(job.id)] = job.jobName || job.name;
          }
        }

        // Map employees to jobs via shifts (ownerId → jobId)
        const shifts = scheduleData.shifts || [];
        for (const shift of shifts) {
          if (shift.ownerId && shift.jobId) {
            const empId = String(shift.ownerId);
            if (!employeeJobIds[empId]) {
              employeeJobIds[empId] = new Set();
            }
            employeeJobIds[empId].add(String(shift.jobId));
          }
        }
      } catch {
        // If schedule parsing fails, continue with empty maps
        console.error('Failed to parse schedule data for FOH/BOH detection');
      }
    }

    // Build FOH/BOH detection map keyed by HS employee ID
    const fohBohMap: Record<string, { isFoh: boolean; isBoh: boolean }> = {};
    const salariedMap: Record<string, boolean> = {};

    for (const emp of rawEmployees) {
      const hsId = emp.id ? String(emp.id) : null;
      if (!hsId) continue;

      // Collect all job IDs for this employee:
      // 1. primaryJobId from the employee object
      // 2. Any jobIds from shifts where this employee is the owner
      const allJobIds: string[] = [];

      if (emp.primaryJobId) {
        allJobIds.push(String(emp.primaryJobId));
      }

      const shiftJobIds = employeeJobIds[hsId];
      if (shiftJobIds) {
        // Convert Set to array for iteration (TS target compatibility)
        const shiftArr = Array.from(shiftJobIds);
        for (let i = 0; i < shiftArr.length; i++) {
          if (allJobIds.indexOf(shiftArr[i]) === -1) {
            allJobIds.push(shiftArr[i]);
          }
        }
      }

      // Resolve job IDs to job names
      const jobNames: string[] = [];
      for (let i = 0; i < allJobIds.length; i++) {
        const jid = allJobIds[i];
        if (jobIdToName[jid]) {
          jobNames.push(jobIdToName[jid]);
        }
      }

      // Detect FOH/BOH from resolved job names
      const { isFoh, isBoh } = detectFohBoh(jobNames);
      fohBohMap[hsId] = { isFoh, isBoh };

      // Detect salaried employees
      if (isSalariedEmployee({ type: emp.type, payType: emp.payType })) {
        salariedMap[hsId] = true;
      }
    }

    return res.status(200).json({ fohBohMap, salariedMap });
  } catch (err: any) {
    console.error('onboarding hs-sync-result error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
