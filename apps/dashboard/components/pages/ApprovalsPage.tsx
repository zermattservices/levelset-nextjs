import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import sty from './ApprovalsPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import { createSupabaseClient } from '@/util/supabase/component';
import { ApprovalsToolbar } from '@/components/scheduling/ApprovalsToolbar';
import { RequestDetailModal } from '@/components/scheduling/RequestDetailModal';
import { DenyReasonDialog } from '@/components/scheduling/DenyReasonDialog';
import { AddTimeOffModal } from '@/components/scheduling/AddTimeOffModal';
import { RequestsMonthlyCalendar } from '@/components/scheduling/RequestsMonthlyCalendar';
import { RequestsWeeklyCalendar } from '@/components/scheduling/RequestsWeeklyCalendar';
import type {
  ApprovalsTab,
  RequestsViewMode,
  RequestTypeFilter,
  RequestStatusFilter,
  ApprovalItem,
  TimeOffRequest,
  AvailabilityChangeRequest,
  ShiftTradeRequest,
  DenialReasonRequestType,
} from '@/lib/scheduling.types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatShiftDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAY_LABELS[d.getDay()];
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${dayName}, ${month} ${d.getDate()}`;
}

function formatDateTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();

  const formatDT = (d: Date) => {
    const dayName = DAY_LABELS[d.getDay()];
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const timeStr = m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
    return { label: `${dayName} ${month} ${day}`, time: timeStr };
  };

  // All-day request (midnight to midnight)
  if (s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 0 && e.getMinutes() === 0) {
    if (sameDay || (e.getTime() - s.getTime() <= 86400000)) {
      const sf = formatDT(s);
      return `${sf.label} (all day)`;
    }
    const sf = formatDT(s);
    const dayBefore = new Date(e);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const ef = formatDT(dayBefore);
    return `${sf.label} \u2013 ${ef.label} (all day)`;
  }

  const sf = formatDT(s);
  const ef = formatDT(e);
  if (sameDay) return `${sf.label}, ${sf.time} \u2013 ${ef.time}`;
  return `${sf.label}, ${sf.time} \u2192 ${ef.label}, ${ef.time}`;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cx(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function formatISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Get the status-based CSS class for the left border */
function cardStatusClass(status: string): string {
  if (status === 'pending' || status === 'open' || status === 'pending_approval') return sty.cardPending;
  if (status === 'approved') return sty.cardApproved;
  if (status === 'denied') return sty.cardDenied;
  return '';
}

function isPendingStatus(status: string): boolean {
  return status === 'pending' || status === 'open' || status === 'pending_approval';
}

/* ------------------------------------------------------------------ */
/*  MUI tab sx                                                         */
/* ------------------------------------------------------------------ */

const tabSx = {
  minHeight: 40,
  '& .MuiTab-root': {
    fontFamily: 'var(--ls-font-heading)',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'none',
    minHeight: 40,
    padding: '8px 20px',
    color: 'var(--ls-color-disabled-text)',
  },
  '& .Mui-selected': {
    color: 'var(--ls-color-brand) !important',
  },
  '& .MuiTabs-indicator': {
    backgroundColor: 'var(--ls-color-brand)',
    height: 2,
  },
};

/* ------------------------------------------------------------------ */
/*  Shift Trade Card                                                   */
/* ------------------------------------------------------------------ */

function ShiftTradeCard({
  trade, onApprove, onDeny, onClick, isActioning,
}: {
  trade: ShiftTradeRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onClick: () => void;
  isActioning: boolean;
}) {
  const pending = isPendingStatus(trade.status);
  const subtypeLabel = trade.type === 'swap' ? 'Swap' : 'House Pickup';

  return (
    <div className={cx(sty.card, cardStatusClass(trade.status))} onClick={onClick}>
      <div className={sty.cardInner}>
        <div className={sty.cardHeader}>
          <div className={sty.cardHeaderLeft}>
            <span className={cx(sty.cardType, sty.cardTypeShiftTrade)}>Shift Trade</span>
            <span className={sty.cardSubtype}>{subtypeLabel}</span>
          </div>
          <div className={sty.cardHeaderRight}>
            {!pending && (
              <span className={cx(
                sty.statusBadge,
                trade.status === 'approved' ? sty.statusApproved : sty.statusDenied,
              )}>
                {trade.status === 'approved' ? 'Approved' : 'Denied'}
              </span>
            )}
            {pending && <span className={cx(sty.statusBadge, sty.statusPending)}>Pending</span>}
            <span className={sty.cardTimestamp}>{timeAgo(trade.created_at ?? '')}</span>
          </div>
        </div>

        <div className={sty.cardBody}>
          {trade.type === 'swap' ? (
            <div className={sty.swapContainer}>
              <div className={sty.swapSide}>
                <span className={sty.swapLabel}>Offers</span>
                <span className={sty.employeeName}>{trade.source_employee?.full_name ?? 'Unknown'}</span>
                {trade.source_shift && (
                  <div className={sty.shiftInfo}>
                    <span className={sty.shiftDate}>{formatShiftDate(trade.source_shift.shift_date)}</span>
                    <span className={sty.shiftTime}>
                      {formatTime12h(trade.source_shift.start_time)} - {formatTime12h(trade.source_shift.end_time)}
                    </span>
                    {trade.source_shift.position && (
                      <span className={sty.shiftPosition}>{trade.source_shift.position.name}</span>
                    )}
                  </div>
                )}
              </div>
              <div className={sty.swapArrow}>
                <SwapHorizIcon sx={{ fontSize: 18 }} />
              </div>
              <div className={sty.swapSide}>
                <span className={sty.swapLabel}>Receives</span>
                <span className={sty.employeeName}>{trade.target_employee?.full_name ?? 'Unknown'}</span>
                {trade.target_shift && (
                  <div className={sty.shiftInfo}>
                    <span className={sty.shiftDate}>{formatShiftDate(trade.target_shift.shift_date)}</span>
                    <span className={sty.shiftTime}>
                      {formatTime12h(trade.target_shift.start_time)} - {formatTime12h(trade.target_shift.end_time)}
                    </span>
                    {trade.target_shift.position && (
                      <span className={sty.shiftPosition}>{trade.target_shift.position.name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <span className={sty.employeeName}>
                {trade.target_employee?.full_name ?? 'Unknown'} wants to pick up a house shift
              </span>
              {trade.source_shift && (
                <div className={sty.shiftInfo}>
                  <span className={sty.shiftDate}>{formatShiftDate(trade.source_shift.shift_date)}</span>
                  <span className={sty.shiftTime}>
                    {formatTime12h(trade.source_shift.start_time)} - {formatTime12h(trade.source_shift.end_time)}
                  </span>
                  {trade.source_shift.position && (
                    <span className={sty.shiftPosition}>{trade.source_shift.position.name}</span>
                  )}
                </div>
              )}
            </>
          )}
          {trade.notes && <div className={sty.requestNote}>{trade.notes}</div>}
        </div>
      </div>

      {/* Denial info for denied cards */}
      {trade.status === 'denied' && trade.denial_reason && (
        <div className={sty.denialDisplay}>
          <span className={sty.denialReasonLabel}>Denied:</span>
          <span>{trade.denial_reason.label}</span>
          {trade.denial_message && <span>— {trade.denial_message}</span>}
        </div>
      )}

      {!pending && trade.reviewed_at && !trade.denial_reason && (
        <div className={sty.reviewInfo}>
          Reviewed {timeAgo(trade.reviewed_at)}
        </div>
      )}

      {pending && (
        <div className={sty.cardFooter}>
          <button
            className={sty.denyBtn}
            onClick={(e) => { e.stopPropagation(); onDeny(trade.id); }}
            disabled={isActioning}
          >
            Deny
          </button>
          <button
            className={sty.approveBtn}
            onClick={(e) => { e.stopPropagation(); onApprove(trade.id); }}
            disabled={isActioning}
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time Off Card                                                      */
/* ------------------------------------------------------------------ */

function TimeOffCard({
  request, onApprove, onDeny, onClick, isActioning,
}: {
  request: TimeOffRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onClick: () => void;
  isActioning: boolean;
}) {
  const pending = request.status === 'pending';

  return (
    <div className={cx(sty.card, cardStatusClass(request.status))} onClick={onClick}>
      <div className={sty.cardInner}>
        <div className={sty.cardHeader}>
          <div className={sty.cardHeaderLeft}>
            <span className={cx(sty.cardType, sty.cardTypeTimeOff)}>Time Off</span>
            {request.is_paid && <span className={sty.cardSubtype}>Paid</span>}
          </div>
          <div className={sty.cardHeaderRight}>
            {!pending && (
              <span className={cx(
                sty.statusBadge,
                request.status === 'approved' ? sty.statusApproved : sty.statusDenied,
              )}>
                {request.status === 'approved' ? 'Approved' : 'Denied'}
              </span>
            )}
            {pending && <span className={cx(sty.statusBadge, sty.statusPending)}>Pending</span>}
            <span className={sty.cardTimestamp}>{timeAgo(request.created_at ?? '')}</span>
          </div>
        </div>

        <div className={sty.cardBody}>
          <span className={sty.employeeName}>{request.employee?.full_name ?? 'Unknown'}</span>
          <span className={sty.dateRange}>
            {formatDateTimeRange(request.start_datetime, request.end_datetime)}
          </span>
          {request.note && <div className={sty.requestNote}>{request.note}</div>}
        </div>
      </div>

      {request.status === 'denied' && request.denial_reason && (
        <div className={sty.denialDisplay}>
          <span className={sty.denialReasonLabel}>Denied:</span>
          <span>{request.denial_reason.label}</span>
          {request.denial_message && <span>— {request.denial_message}</span>}
        </div>
      )}

      {!pending && request.reviewed_at && !request.denial_reason && (
        <div className={sty.reviewInfo}>
          Reviewed {timeAgo(request.reviewed_at)}
        </div>
      )}

      {pending && (
        <div className={sty.cardFooter}>
          <button
            className={sty.denyBtn}
            onClick={(e) => { e.stopPropagation(); onDeny(request.id); }}
            disabled={isActioning}
          >
            Deny
          </button>
          <button
            className={sty.approveBtn}
            onClick={(e) => { e.stopPropagation(); onApprove(request.id); }}
            disabled={isActioning}
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Availability Change Card                                           */
/* ------------------------------------------------------------------ */

function AvailabilityCard({
  request, onApprove, onDeny, onClick, isActioning,
}: {
  request: AvailabilityChangeRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onClick: () => void;
  isActioning: boolean;
}) {
  const pending = request.status === 'pending';

  const byDay = useMemo(() => {
    const map = new Map<number, { start_time: string; end_time: string }[]>();
    for (const slot of request.requested_availability ?? []) {
      if (!map.has(slot.day_of_week)) map.set(slot.day_of_week, []);
      map.get(slot.day_of_week)!.push({ start_time: slot.start_time, end_time: slot.end_time });
    }
    return map;
  }, [request.requested_availability]);

  return (
    <div className={cx(sty.card, cardStatusClass(request.status))} onClick={onClick}>
      <div className={sty.cardInner}>
        <div className={sty.cardHeader}>
          <div className={sty.cardHeaderLeft}>
            <span className={cx(sty.cardType, sty.cardTypeAvailability)}>Availability</span>
            {request.is_permanent ? (
              <span className={sty.cardSubtype}>Permanent</span>
            ) : (
              <span className={sty.cardSubtype}>
                Temporary{request.end_date ? ` until ${new Date(request.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
              </span>
            )}
          </div>
          <div className={sty.cardHeaderRight}>
            {!pending && (
              <span className={cx(
                sty.statusBadge,
                request.status === 'approved' ? sty.statusApproved : sty.statusDenied,
              )}>
                {request.status === 'approved' ? 'Approved' : 'Denied'}
              </span>
            )}
            {pending && <span className={cx(sty.statusBadge, sty.statusPending)}>Pending</span>}
            <span className={sty.cardTimestamp}>{timeAgo(request.created_at ?? '')}</span>
          </div>
        </div>

        <div className={sty.cardBody}>
          <span className={sty.employeeName}>{request.employee?.full_name ?? 'Unknown'}</span>

          {request.effective_date && (
            <span className={sty.dateRange}>
              Effective {new Date(request.effective_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}

          <div className={sty.availDiff}>
            {[0, 1, 2, 3, 4, 5, 6].map(dow => {
              const slots = byDay.get(dow);
              if (!slots || slots.length === 0) {
                return (
                  <React.Fragment key={dow}>
                    <span className={sty.availDay}>{DAY_LABELS_FULL[dow]}</span>
                    <span className={sty.availTime}>Unavailable</span>
                  </React.Fragment>
                );
              }
              return slots.map((slot, si) => (
                <React.Fragment key={`${dow}-${si}`}>
                  <span className={sty.availDay}>{si === 0 ? DAY_LABELS_FULL[dow] : ''}</span>
                  <span className={sty.availTimeNew}>
                    {formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}
                  </span>
                </React.Fragment>
              ));
            })}
          </div>

          {request.employee_notes && <div className={sty.requestNote}>{request.employee_notes}</div>}
        </div>
      </div>

      {request.status === 'denied' && request.denial_reason && (
        <div className={sty.denialDisplay}>
          <span className={sty.denialReasonLabel}>Denied:</span>
          <span>{request.denial_reason.label}</span>
          {request.denial_message && <span>— {request.denial_message}</span>}
        </div>
      )}

      {!pending && request.reviewed_at && !request.denial_reason && (
        <div className={sty.reviewInfo}>
          Reviewed {timeAgo(request.reviewed_at)}
        </div>
      )}

      {pending && (
        <div className={sty.cardFooter}>
          <button
            className={sty.denyBtn}
            onClick={(e) => { e.stopPropagation(); onDeny(request.id); }}
            disabled={isActioning}
          >
            Deny
          </button>
          <button
            className={sty.approveBtn}
            onClick={(e) => { e.stopPropagation(); onApprove(request.id); }}
            disabled={isActioning}
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading State                                                      */
/* ------------------------------------------------------------------ */

function LoadingState() {
  return (
    <div className={sty.loading}>
      <CircularProgress size={28} sx={{ color: 'var(--ls-color-brand)' }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ApprovalsPage() {
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();
  const auth = useAuth();
  const orgId = selectedLocationOrgId ?? auth.org_id;

  /* ── Top-level tab ─────────────────────────────────────────────── */
  const [tab, setTab] = useState<ApprovalsTab>('requests');

  /* ── Requests tab state ────────────────────────────────────────── */
  const [viewMode, setViewMode] = useState<RequestsViewMode>('list');
  const [typeFilters, setTypeFilters] = useState<RequestTypeFilter[]>(['time_off', 'availability']);
  const [statusFilters, setStatusFilters] = useState<RequestStatusFilter[]>(['pending']);

  /* ── Calendar state ────────────────────────────────────────────── */
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [monthStart, setMonthStart] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  /* ── Shift Swaps tab state ─────────────────────────────────────── */
  const [swapStatusFilter, setSwapStatusFilter] = useState<RequestStatusFilter[]>(['pending']);

  /* ── Data ──────────────────────────────────────────────────────── */
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [availability, setAvailability] = useState<AvailabilityChangeRequest[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTradeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);

  /* ── Modal state ───────────────────────────────────────────────── */
  const [selectedRequest, setSelectedRequest] = useState<ApprovalItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyTarget, setDenyTarget] = useState<{
    intent: string;
    id: string;
    requestType: DenialReasonRequestType;
  } | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [addTimeOffOpen, setAddTimeOffOpen] = useState(false);

  /* ── Auth token ────────────────────────────────────────────────── */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  /* ── View mode switching ───────────────────────────────────────── */
  const handleViewModeChange = useCallback((mode: RequestsViewMode) => {
    setViewMode(mode);
    if (mode === 'list') {
      setTypeFilters(['time_off', 'availability']);
      setStatusFilters(['pending']);
    } else {
      setTypeFilters(['time_off']);
      setStatusFilters(['pending', 'approved']);
    }
  }, []);

  /* ── Data fetching ─────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    if (!orgId || !selectedLocationId) return;
    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (tab === 'requests') {
        const params = new URLSearchParams({
          org_id: orgId,
          location_id: selectedLocationId,
          status: statusFilters.join(','),
          type: typeFilters.join(','),
        });

        if (viewMode === 'weekly') {
          const endDate = new Date(weekStart);
          endDate.setDate(endDate.getDate() + 6);
          params.set('start_date', formatISODate(weekStart));
          params.set('end_date', formatISODate(endDate));
        } else if (viewMode === 'monthly') {
          const firstDay = new Date(monthStart);
          const startSunday = new Date(firstDay);
          startSunday.setDate(startSunday.getDate() - startSunday.getDay());
          const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
          const endSaturday = new Date(lastDay);
          endSaturday.setDate(endSaturday.getDate() + (6 - endSaturday.getDay()));
          params.set('start_date', formatISODate(startSunday));
          params.set('end_date', formatISODate(endSaturday));
        }

        const res = await fetch(`/api/scheduling/approvals?${params}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setTimeOff(data.timeOff ?? []);
          setAvailability(data.availability ?? []);
          setShiftTrades([]);
        }
      } else {
        const swapStatuses = swapStatusFilter
          .map((s) => (s === 'pending' ? 'open,pending_approval' : s))
          .join(',');
        const params = new URLSearchParams({
          org_id: orgId,
          location_id: selectedLocationId,
          status: swapStatuses,
          type: 'shift_trade',
        });
        const res = await fetch(`/api/scheduling/approvals?${params}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setShiftTrades(
            (data.shiftTrades ?? []).filter((t: any) => t.type !== 'giveaway'),
          );
          setTimeOff([]);
          setAvailability([]);
        }
      }
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    orgId, selectedLocationId, tab, statusFilters, typeFilters,
    viewMode, weekStart, monthStart, swapStatusFilter, getAccessToken,
  ]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Employee list (for calendar views) ─────────────────────────── */
  useEffect(() => {
    if (!orgId || !selectedLocationId) return;
    const fetchEmployees = async () => {
      const supabase = createSupabaseClient();
      const { data } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('org_id', orgId)
        .eq('location_id', selectedLocationId)
        .eq('active', true)
        .order('full_name');
      if (data) setEmployees(data);
    };
    fetchEmployees();
  }, [orgId, selectedLocationId]);

  /* ── Calendar navigation ───────────────────────────────────────── */
  const handleNavigate = useCallback((dir: -1 | 1) => {
    if (viewMode === 'weekly') {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + dir * 7);
        return d;
      });
    } else if (viewMode === 'monthly') {
      setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
    }
  }, [viewMode]);

  const handleGoToToday = useCallback(() => {
    const now = new Date();
    if (viewMode === 'weekly') {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      setWeekStart(d);
    } else if (viewMode === 'monthly') {
      setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
    }
  }, [viewMode]);

  /* ── Action handler ────────────────────────────────────────────── */
  const handleAction = useCallback(
    async (
      intent: string,
      id: string,
      extra?: { denial_reason_id?: string; denial_message?: string },
    ) => {
      if (!orgId) return;
      setActioningId(id);
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const body: any = { intent, id, org_id: orgId };
        if (extra?.denial_reason_id) body.denial_reason_id = extra.denial_reason_id;
        if (extra?.denial_message) body.denial_message = extra.denial_message;

        const res = await fetch('/api/scheduling/approvals', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('Action failed:', err);
        }
        setModalOpen(false);
        setSelectedRequest(null);
        await fetchData();
      } catch (err) {
        console.error('Error performing action:', err);
      } finally {
        setActioningId(null);
      }
    },
    [orgId, fetchData, getAccessToken],
  );

  /* ── Request click → opens modal ───────────────────────────────── */
  const handleRequestClick = useCallback((item: ApprovalItem) => {
    setSelectedRequest(item);
    setModalOpen(true);
  }, []);

  /* ── Inline deny → opens DenyReasonDialog directly ─────────────── */
  const handleInlineDeny = useCallback(
    (intent: string, id: string, requestType: DenialReasonRequestType) => {
      setDenyTarget({ intent, id, requestType });
      setDenyDialogOpen(true);
    },
    [],
  );

  /* ── Swap status filter toggle ─────────────────────────────────── */
  const toggleSwapStatus = useCallback((status: RequestStatusFilter) => {
    setSwapStatusFilter((prev) => {
      const isActive = prev.includes(status);
      if (isActive && prev.length === 1) return prev;
      return isActive ? prev.filter((s) => s !== status) : [...prev, status];
    });
  }, []);

  /* ── Sorted request items ─────────────────────────────────────── */
  const sortedRequestItems = useMemo(() => {
    type Item =
      | { kind: 'time_off'; data: TimeOffRequest; statusOrder: number; sortKey: string }
      | { kind: 'availability'; data: AvailabilityChangeRequest; statusOrder: number; sortKey: string };

    const items: Item[] = [];

    for (const t of timeOff) {
      const statusOrder = t.status === 'pending' ? 0 : t.status === 'approved' ? 1 : 2;
      const sortKey = t.status === 'pending' ? t.created_at ?? '' : t.reviewed_at ?? t.created_at ?? '';
      items.push({ kind: 'time_off', data: t, statusOrder, sortKey });
    }

    for (const a of availability) {
      const statusOrder = a.status === 'pending' ? 0 : a.status === 'approved' ? 1 : 2;
      const sortKey = a.status === 'pending' ? a.created_at ?? '' : a.reviewed_at ?? a.created_at ?? '';
      items.push({ kind: 'availability', data: a, statusOrder, sortKey });
    }

    items.sort((a, b) => {
      if (a.statusOrder !== b.statusOrder) return a.statusOrder - b.statusOrder;
      if (a.statusOrder === 0) return a.sortKey.localeCompare(b.sortKey); // Pending: oldest first
      return b.sortKey.localeCompare(a.sortKey); // Reviewed: most recent first
    });

    return items;
  }, [timeOff, availability]);

  /* ── Sorted swap items ────────────────────────────────────────── */
  const sortedSwapItems = useMemo(() => {
    return shiftTrades
      .filter((t) => t.type !== 'giveaway')
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [shiftTrades]);

  /* ── RequestsList ──────────────────────────────────────────────── */
  function RequestsList() {
    if (sortedRequestItems.length === 0) {
      return (
        <div className={sty.emptyState}>
          <TaskAltOutlinedIcon className={sty.emptyIcon} sx={{ fontSize: 40 }} />
          <span className={sty.emptyText}>No requests found</span>
          <span className={sty.emptySubText}>
            Time off and availability requests matching your filters will appear here.
          </span>
        </div>
      );
    }

    return (
      <div className={sty.cardList}>
        {sortedRequestItems.map((item) => {
          if (item.kind === 'time_off') {
            return (
              <TimeOffCard
                key={`timeoff-${item.data.id}`}
                request={item.data}
                onApprove={(id) => handleAction('approve_time_off', id)}
                onDeny={(id) => handleInlineDeny('deny_time_off', id, 'time_off')}
                onClick={() => handleRequestClick({ kind: 'time_off', data: item.data })}
                isActioning={actioningId === item.data.id}
              />
            );
          }
          return (
            <AvailabilityCard
              key={`avail-${item.data.id}`}
              request={item.data}
              onApprove={(id) => handleAction('approve_availability', id)}
              onDeny={(id) => handleInlineDeny('deny_availability', id, 'availability')}
              onClick={() => handleRequestClick({ kind: 'availability', data: item.data })}
              isActioning={actioningId === item.data.id}
            />
          );
        })}
      </div>
    );
  }

  /* ── SwapFilterBar ─────────────────────────────────────────────── */
  function SwapFilterBar() {
    return (
      <div className={sty.swapFilterBar}>
        {(['pending', 'approved', 'denied'] as const).map((s) => (
          <button
            key={s}
            className={cx(sty.filterChip, swapStatusFilter.includes(s) && sty.filterChipActive)}
            onClick={() => toggleSwapStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    );
  }

  /* ── ShiftSwapsList ────────────────────────────────────────────── */
  function ShiftSwapsList() {
    if (sortedSwapItems.length === 0) {
      return (
        <div className={sty.emptyState}>
          <TaskAltOutlinedIcon className={sty.emptyIcon} sx={{ fontSize: 40 }} />
          <span className={sty.emptyText}>No shift swaps found</span>
          <span className={sty.emptySubText}>
            Shift swaps and house pickups matching your filters will appear here.
          </span>
        </div>
      );
    }

    return (
      <div className={sty.cardList}>
        {sortedSwapItems.map((trade) => (
          <ShiftTradeCard
            key={`trade-${trade.id}`}
            trade={trade}
            onApprove={(id) => handleAction('approve_shift_trade', id)}
            onDeny={(id) => handleInlineDeny('deny_shift_trade', id, 'shift_swap')}
            onClick={() => handleRequestClick({ kind: 'shift_trade', data: trade })}
            isActioning={actioningId === trade.id}
          />
        ))}
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div
      className={cx(
        projectcss.all,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        sty.root,
      )}
    >
      <MenuNavigation
        className={cx("__wab_instance", sty.menuNavigation)}
        firstName={auth.first_name}
        userRole={auth.role}
        fullWidth
      />
      <div className={sty.content}>
        <div className={sty.header}>
          <h1 className={sty.title}>Approvals</h1>
        </div>

        {/* Top-level tabs */}
        <div className={sty.tabBar}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={tabSx}>
            <Tab label="Requests" value="requests" />
            <Tab label="Shift Swaps" value="shift_swaps" />
          </Tabs>
        </div>

        {tab === 'requests' && (
          <>
            <ApprovalsToolbar
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              typeFilters={typeFilters}
              onTypeFiltersChange={setTypeFilters}
              statusFilters={statusFilters}
              onStatusFiltersChange={setStatusFilters}
              currentDate={viewMode === 'monthly' ? monthStart : weekStart}
              onNavigate={handleNavigate}
              onGoToToday={handleGoToToday}
              onAddTimeOff={() => setAddTimeOffOpen(true)}
            />

            {isLoading ? (
              <LoadingState />
            ) : viewMode === 'list' ? (
              <RequestsList />
            ) : viewMode === 'weekly' ? (
              <RequestsWeeklyCalendar
                weekStart={weekStart}
                timeOffRequests={timeOff}
                employees={employees}
                onRequestClick={handleRequestClick}
              />
            ) : (
              <RequestsMonthlyCalendar
                monthStart={monthStart}
                timeOffRequests={timeOff}
                onRequestClick={handleRequestClick}
              />
            )}
          </>
        )}

        {tab === 'shift_swaps' && (
          <>
            <SwapFilterBar />
            {isLoading ? <LoadingState /> : <ShiftSwapsList />}
          </>
        )}

        {/* Modals */}
        <RequestDetailModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          locationId={selectedLocationId || ''}
          orgId={orgId || ''}
          onAction={handleAction}
          getAccessToken={getAccessToken}
        />

        <DenyReasonDialog
          open={denyDialogOpen}
          onClose={() => {
            setDenyDialogOpen(false);
            setDenyTarget(null);
          }}
          onConfirm={async (reasonId, message) => {
            if (denyTarget) {
              await handleAction(denyTarget.intent, denyTarget.id, {
                denial_reason_id: reasonId,
                denial_message: message ?? undefined,
              });
            }
            setDenyDialogOpen(false);
            setDenyTarget(null);
          }}
          requestType={denyTarget?.requestType ?? 'time_off'}
          orgId={orgId || ''}
          getAccessToken={getAccessToken}
        />

        <AddTimeOffModal
          open={addTimeOffOpen}
          onClose={() => setAddTimeOffOpen(false)}
          onSuccess={fetchData}
          orgId={orgId || ''}
          locationId={selectedLocationId || ''}
          employees={employees}
          getAccessToken={getAccessToken}
        />
      </div>
    </div>
  );
}
