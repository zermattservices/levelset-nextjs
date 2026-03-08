import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  { userId, orgId }: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    const {
      location_id,
      status = 'pending',
      type = 'all',
    } = req.query as {
      location_id: string;
      status?: string;
      type?: string;
    };

    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required' });
    }

    const isPending = status === 'pending';

    const tradesQuery = supabase
      .from('shift_trade_requests')
      .select(`
        *,
        source_shift:shifts!shift_trade_requests_source_shift_id_fkey(
          id, shift_date, start_time, end_time, break_minutes,
          position:org_positions(id, name, zone)
        ),
        source_employee:employees!shift_trade_requests_source_employee_id_fkey(id, full_name),
        target_shift:shifts!shift_trade_requests_target_shift_id_fkey(
          id, shift_date, start_time, end_time, break_minutes,
          position:org_positions(id, name, zone)
        ),
        target_employee:employees!shift_trade_requests_target_employee_id_fkey(id, full_name),
        denial_reason:approval_denial_reasons(id, label)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: isPending });

    if (isPending) {
      tradesQuery.in('status', ['open', 'pending_approval']);
    } else {
      tradesQuery.in('status', ['approved', 'denied', 'cancelled', 'expired']);
    }

    const timeOffQuery = supabase
      .from('time_off_requests')
      .select('*, employee:employees!time_off_requests_employee_id_fkey(id, full_name)')
      .eq('org_id', orgId)
      .eq('location_id', location_id);

    if (isPending) {
      timeOffQuery.eq('status', 'pending');
    } else {
      timeOffQuery.in('status', ['approved', 'denied']);
    }

    const availQuery = supabase
      .from('availability_change_requests')
      .select('*, employee:employees!availability_change_requests_employee_id_fkey(id, full_name)')
      .eq('org_id', orgId);

    if (isPending) {
      availQuery.eq('status', 'pending');
    } else {
      availQuery.in('status', ['approved', 'denied']);
    }

    const shouldFetchTrades = type === 'all' || type === 'shift_trade';
    const shouldFetchTimeOff = type === 'all' || type === 'time_off';
    const shouldFetchAvailability = type === 'all' || type === 'availability';

    const [tradesResult, timeOffResult, availResult] = await Promise.all([
      shouldFetchTrades ? tradesQuery : Promise.resolve({ data: [] }),
      shouldFetchTimeOff ? timeOffQuery : Promise.resolve({ data: [] }),
      shouldFetchAvailability ? availQuery : Promise.resolve({ data: [] }),
    ]);

    return res.status(200).json({
      shiftTrades: (tradesResult.data as any[]) || [],
      timeOff: (timeOffResult.data as any[]) || [],
      availability: (availResult.data as any[]) || [],
    });
  }

  if (req.method === 'POST') {
    const { intent } = req.body;

    if (intent === 'approve_shift_trade') {
      const { id, manager_notes } = req.body;

      const { data: trade } = await supabase
        .from('shift_trade_requests')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (!trade) return res.status(404).json({ error: 'Trade request not found' });

      await supabase
        .from('shift_trade_requests')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          manager_notes: manager_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (trade.type === 'giveaway') {
        await supabase
          .from('shift_assignments')
          .delete()
          .eq('shift_id', trade.source_shift_id)
          .eq('employee_id', trade.source_employee_id);

        await supabase
          .from('shift_assignments')
          .insert({
            org_id: trade.org_id,
            shift_id: trade.source_shift_id,
            employee_id: trade.target_employee_id,
          });
      } else if (trade.type === 'swap') {
        const { data: sourceAssign } = await supabase
          .from('shift_assignments')
          .select('id')
          .eq('shift_id', trade.source_shift_id)
          .eq('employee_id', trade.source_employee_id)
          .single();

        const { data: targetAssign } = await supabase
          .from('shift_assignments')
          .select('id')
          .eq('shift_id', trade.target_shift_id)
          .eq('employee_id', trade.target_employee_id)
          .single();

        if (sourceAssign && targetAssign) {
          await supabase
            .from('shift_assignments')
            .update({ employee_id: trade.target_employee_id })
            .eq('id', sourceAssign.id);

          await supabase
            .from('shift_assignments')
            .update({ employee_id: trade.source_employee_id })
            .eq('id', targetAssign.id);
        }
      } else if (trade.type === 'house_pickup') {
        await supabase
          .from('shift_assignments')
          .insert({
            org_id: trade.org_id,
            shift_id: trade.source_shift_id,
            employee_id: trade.target_employee_id,
          });

        await supabase
          .from('shifts')
          .update({ is_house_shift: false })
          .eq('id', trade.source_shift_id);
      }

      return res.status(200).json({ success: true });
    }

    if (intent === 'deny_shift_trade') {
      const { id, manager_notes } = req.body;

      const { error } = await supabase
        .from('shift_trade_requests')
        .update({
          status: 'denied',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          manager_notes: manager_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true });
    }

    if (intent === 'approve_time_off') {
      const { id } = req.body;

      const { error } = await supabase
        .from('time_off_requests')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true });
    }

    if (intent === 'deny_time_off') {
      const { id } = req.body;

      const { error } = await supabase
        .from('time_off_requests')
        .update({
          status: 'denied',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true });
    }

    if (intent === 'approve_availability') {
      const { id, manager_notes } = req.body;

      const { data: request, error: fetchError } = await supabase
        .from('availability_change_requests')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (fetchError || !request) {
        return res.status(404).json({ error: 'Availability change request not found' });
      }

      await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', request.employee_id);

      if (request.requested_availability && Array.isArray(request.requested_availability) && request.requested_availability.length > 0) {
        await supabase
          .from('employee_availability')
          .insert(
            request.requested_availability.map((row: any) => ({
              org_id: request.org_id,
              employee_id: request.employee_id,
              day_of_week: row.day_of_week,
              start_time: row.start_time,
              end_time: row.end_time,
            }))
          );
      }

      const { error } = await supabase
        .from('availability_change_requests')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          manager_notes: manager_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true });
    }

    if (intent === 'deny_availability') {
      const { id, manager_notes } = req.body;

      const { error } = await supabase
        .from('availability_change_requests')
        .update({
          status: 'denied',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          manager_notes: manager_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: `Unknown intent: ${intent}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }
  return withPermissionAndContext(P.SCHED_MANAGE_APPROVALS, handler)(req, res);
}
