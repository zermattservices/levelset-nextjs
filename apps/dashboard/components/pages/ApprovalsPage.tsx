import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import sty from './ApprovalsPage.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShiftTradeData {
  id: string;
  type: 'giveaway' | 'swap' | 'house_pickup';
  status: string;
  notes: string | null;
  manager_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  source_shift: {
    id: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    position: { id: string; name: string; zone: string } | null;
  } | null;
  source_employee: { id: string; full_name: string } | null;
  target_shift: {
    id: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    position: { id: string; name: string; zone: string } | null;
  } | null;
  target_employee: { id: string; full_name: string } | null;
}

interface TimeOffData {
  id: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
  note: string | null;
  is_paid: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  employee: { id: string; full_name: string } | null;
}

interface AvailabilityData {
  id: string;
  status: string;
  requested_availability: { day_of_week: number; start_time: string; end_time: string }[];
  effective_date: string | null;
  is_permanent: boolean;
  end_date: string | null;
  employee_notes: string | null;
  manager_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  employee: { id: string; full_name: string } | null;
}

type TabValue = 'pending' | 'history';

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

  // Check if it's an all-day request (midnight to midnight)
  if (s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 0 && e.getMinutes() === 0) {
    if (sameDay || (e.getTime() - s.getTime() <= 86400000)) {
      const sf = formatDT(s);
      return `${sf.label} (all day)`;
    }
    // Multi-day
    const sf = formatDT(s);
    const dayBefore = new Date(e);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const ef = formatDT(dayBefore);
    return `${sf.label} \u2013 ${ef.label} (all day)`;
  }

  const sf = formatDT(s);
  const ef = formatDT(e);

  if (sameDay) {
    return `${sf.label}, ${sf.time} \u2013 ${ef.time}`;
  }
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

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/*  Shift Trade Card                                                   */
/* ------------------------------------------------------------------ */

function ShiftTradeCard({
  trade, isPending, onApprove, onDeny, isActioning,
}: {
  trade: ShiftTradeData;
  isPending: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isActioning: boolean;
}) {
  const subtypeLabel = trade.type === 'giveaway' ? 'Giveaway'
    : trade.type === 'swap' ? 'Swap'
    : 'House Pickup';

  return (
    <div className={sty.card}>
      <div className={sty.cardHeader}>
        <div className={sty.cardHeaderLeft}>
          <span className={classNames(sty.cardType, sty.cardTypeShiftTrade)}>Shift Trade</span>
          <span className={sty.cardSubtype}>{subtypeLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isPending && (
            <span className={classNames(
              sty.statusBadge,
              trade.status === 'approved' ? sty.statusApproved : sty.statusDenied,
            )}>
              {trade.status === 'approved' ? 'Approved' : 'Denied'}
            </span>
          )}
          <span className={sty.cardTimestamp}>{timeAgo(trade.created_at)}</span>
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
              <SwapHorizIcon sx={{ fontSize: 20 }} />
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
        ) : trade.type === 'house_pickup' ? (
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
        ) : (
          /* Giveaway */
          <>
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
            {trade.target_employee ? (
              <span style={{ fontSize: 13 }}>
                Picked up by <strong>{trade.target_employee.full_name}</strong>
              </span>
            ) : (
              <span className={sty.openStatus}>Open &mdash; awaiting pickup</span>
            )}
          </>
        )}
        {trade.notes && <div className={sty.requestNote}>{trade.notes}</div>}
      </div>

      {isPending && (
        <div className={sty.cardFooter}>
          <button className={sty.denyBtn} onClick={() => onDeny(trade.id)} disabled={isActioning}>
            Deny
          </button>
          <button className={sty.approveBtn} onClick={() => onApprove(trade.id)} disabled={isActioning}>
            Approve
          </button>
        </div>
      )}

      {!isPending && trade.reviewed_at && (
        <div className={sty.reviewInfo}>
          Reviewed {timeAgo(trade.reviewed_at)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Time Off Card                                                      */
/* ------------------------------------------------------------------ */

function TimeOffCard({
  request, isPending, onApprove, onDeny, isActioning,
}: {
  request: TimeOffData;
  isPending: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isActioning: boolean;
}) {
  return (
    <div className={sty.card}>
      <div className={sty.cardHeader}>
        <div className={sty.cardHeaderLeft}>
          <span className={classNames(sty.cardType, sty.cardTypeTimeOff)}>Time Off</span>
          {request.is_paid && <span className={sty.cardSubtype}>Paid</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isPending && (
            <span className={classNames(
              sty.statusBadge,
              request.status === 'approved' ? sty.statusApproved : sty.statusDenied,
            )}>
              {request.status === 'approved' ? 'Approved' : 'Denied'}
            </span>
          )}
          <span className={sty.cardTimestamp}>{timeAgo(request.created_at)}</span>
        </div>
      </div>

      <div className={sty.cardBody}>
        <span className={sty.employeeName}>{request.employee?.full_name ?? 'Unknown'}</span>
        <span className={sty.dateRange}>
          {formatDateTimeRange(request.start_datetime, request.end_datetime)}
        </span>
        {request.note && <div className={sty.requestNote}>{request.note}</div>}
      </div>

      {isPending && (
        <div className={sty.cardFooter}>
          <button className={sty.denyBtn} onClick={() => onDeny(request.id)} disabled={isActioning}>
            Deny
          </button>
          <button className={sty.approveBtn} onClick={() => onApprove(request.id)} disabled={isActioning}>
            Approve
          </button>
        </div>
      )}

      {!isPending && request.reviewed_at && (
        <div className={sty.reviewInfo}>
          Reviewed {timeAgo(request.reviewed_at)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Availability Change Card                                           */
/* ------------------------------------------------------------------ */

function AvailabilityCard({
  request, isPending, onApprove, onDeny, isActioning,
}: {
  request: AvailabilityData;
  isPending: boolean;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  isActioning: boolean;
}) {
  // Group requested availability by day
  const byDay = React.useMemo(() => {
    const map = new Map<number, { start_time: string; end_time: string }[]>();
    for (const slot of request.requested_availability ?? []) {
      if (!map.has(slot.day_of_week)) map.set(slot.day_of_week, []);
      map.get(slot.day_of_week)!.push({ start_time: slot.start_time, end_time: slot.end_time });
    }
    return map;
  }, [request.requested_availability]);

  return (
    <div className={sty.card}>
      <div className={sty.cardHeader}>
        <div className={sty.cardHeaderLeft}>
          <span className={classNames(sty.cardType, sty.cardTypeAvailability)}>Availability</span>
          {request.is_permanent ? (
            <span className={sty.cardSubtype}>Permanent</span>
          ) : (
            <span className={sty.cardSubtype}>
              Temporary{request.end_date ? ` until ${new Date(request.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isPending && (
            <span className={classNames(
              sty.statusBadge,
              request.status === 'approved' ? sty.statusApproved : sty.statusDenied,
            )}>
              {request.status === 'approved' ? 'Approved' : 'Denied'}
            </span>
          )}
          <span className={sty.cardTimestamp}>{timeAgo(request.created_at)}</span>
        </div>
      </div>

      <div className={sty.cardBody}>
        <span className={sty.employeeName}>{request.employee?.full_name ?? 'Unknown'}</span>

        {request.effective_date && (
          <span style={{ fontSize: 12, color: 'var(--ls-color-muted)' }}>
            Effective {new Date(request.effective_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}

        <div className={sty.availDiff}>
          <span className={sty.availDiffHeader}>Day</span>
          <span className={sty.availDiffHeader}>Requested</span>
          <span />
          {[0, 1, 2, 3, 4, 5, 6].map(dow => {
            const slots = byDay.get(dow);
            if (!slots || slots.length === 0) {
              return (
                <React.Fragment key={dow}>
                  <span className={sty.availDay}>{DAY_LABELS_FULL[dow]}</span>
                  <span className={sty.availTime}>Unavailable</span>
                  <span />
                </React.Fragment>
              );
            }
            return slots.map((slot, si) => (
              <React.Fragment key={`${dow}-${si}`}>
                <span className={sty.availDay}>{si === 0 ? DAY_LABELS_FULL[dow] : ''}</span>
                <span className={sty.availTimeNew}>
                  {formatTime12h(slot.start_time)} - {formatTime12h(slot.end_time)}
                </span>
                <span />
              </React.Fragment>
            ));
          })}
        </div>

        {request.employee_notes && <div className={sty.requestNote}>{request.employee_notes}</div>}
      </div>

      {isPending && (
        <div className={sty.cardFooter}>
          <button className={sty.denyBtn} onClick={() => onDeny(request.id)} disabled={isActioning}>
            Deny
          </button>
          <button className={sty.approveBtn} onClick={() => onApprove(request.id)} disabled={isActioning}>
            Approve
          </button>
        </div>
      )}

      {!isPending && request.reviewed_at && (
        <div className={sty.reviewInfo}>
          Reviewed {timeAgo(request.reviewed_at)}
        </div>
      )}
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

  const [tab, setTab] = React.useState<TabValue>('pending');
  const [shiftTrades, setShiftTrades] = React.useState<ShiftTradeData[]>([]);
  const [timeOff, setTimeOff] = React.useState<TimeOffData[]>([]);
  const [availability, setAvailability] = React.useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [actioningId, setActioningId] = React.useState<string | null>(null);

  // Fetch data
  const fetchData = React.useCallback(async () => {
    if (!orgId || !selectedLocationId) return;
    setIsLoading(true);
    try {
      const status = tab === 'pending' ? 'pending' : 'history';
      const params = new URLSearchParams({
        org_id: orgId,
        location_id: selectedLocationId,
        status,
      });
      const res = await fetch(`/api/scheduling/approvals?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setShiftTrades(data.shiftTrades ?? []);
      setTimeOff(data.timeOff ?? []);
      setAvailability(data.availability ?? []);
    } catch (err) {
      console.error('Error fetching approvals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, selectedLocationId, tab]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build sorted list
  const sortedItems = React.useMemo(() => {
    type Item =
      | { kind: 'shift_trade'; data: ShiftTradeData; sortKey: string }
      | { kind: 'time_off'; data: TimeOffData; sortKey: string }
      | { kind: 'availability'; data: AvailabilityData; sortKey: string };

    const items: Item[] = [];

    if (tab === 'pending') {
      // Shift trades first (sorted by created_at ASC)
      const sortedTrades = [...shiftTrades].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      for (const t of sortedTrades) {
        items.push({ kind: 'shift_trade', data: t, sortKey: '0_' + t.created_at });
      }

      // Then time off + availability by start date ASC, ties by oldest submission
      const others: Item[] = [];
      for (const t of timeOff) {
        others.push({
          kind: 'time_off',
          data: t,
          sortKey: t.start_datetime + '_' + t.created_at,
        });
      }
      for (const a of availability) {
        const sortDate = a.effective_date ?? a.created_at;
        others.push({
          kind: 'availability',
          data: a,
          sortKey: sortDate + '_' + a.created_at,
        });
      }
      others.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      items.push(...others);
    } else {
      // History: all items sorted by most recent action first
      for (const t of shiftTrades) {
        items.push({
          kind: 'shift_trade',
          data: t,
          sortKey: t.reviewed_at ?? t.created_at,
        });
      }
      for (const t of timeOff) {
        items.push({
          kind: 'time_off',
          data: t,
          sortKey: t.reviewed_at ?? t.created_at,
        });
      }
      for (const a of availability) {
        items.push({
          kind: 'availability',
          data: a,
          sortKey: a.reviewed_at ?? a.created_at,
        });
      }
      items.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }

    return items;
  }, [shiftTrades, timeOff, availability, tab]);

  // Action handlers
  const handleAction = React.useCallback(async (intent: string, id: string) => {
    if (!orgId) return;
    setActioningId(id);
    try {
      const res = await fetch('/api/scheduling/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, id, user_id: auth.id, org_id: orgId }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Action failed:', err);
      }
      await fetchData();
    } catch (err) {
      console.error('Error performing action:', err);
    } finally {
      setActioningId(null);
    }
  }, [orgId, auth.id, fetchData]);

  const isPending = tab === 'pending';

  return (
    <div className={sty.container}>
      <MenuNavigation />

      <div className={sty.content}>
        <div className={sty.header}>
          <h1 className={sty.title}>Approvals</h1>
        </div>

        <div className={sty.tabBar}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
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
            }}
          >
            <Tab label="Pending" value="pending" />
            <Tab label="History" value="history" />
          </Tabs>
        </div>

        {isLoading ? (
          <div className={sty.loading}>
            <CircularProgress size={28} sx={{ color: 'var(--ls-color-brand)' }} />
          </div>
        ) : sortedItems.length === 0 ? (
          <div className={sty.emptyState}>
            <TaskAltOutlinedIcon className={sty.emptyIcon} sx={{ fontSize: 40 }} />
            <span className={sty.emptyText}>
              {isPending ? 'No pending approvals' : 'No approval history'}
            </span>
            <span className={sty.emptySubText}>
              {isPending
                ? 'Shift trades, time off, and availability requests will appear here.'
                : 'Approved and denied requests will appear here.'}
            </span>
          </div>
        ) : (
          <div className={sty.cardList}>
            {sortedItems.map(item => {
              if (item.kind === 'shift_trade') {
                return (
                  <ShiftTradeCard
                    key={`trade-${item.data.id}`}
                    trade={item.data}
                    isPending={isPending}
                    onApprove={(id) => handleAction('approve_shift_trade', id)}
                    onDeny={(id) => handleAction('deny_shift_trade', id)}
                    isActioning={actioningId === item.data.id}
                  />
                );
              }
              if (item.kind === 'time_off') {
                return (
                  <TimeOffCard
                    key={`timeoff-${item.data.id}`}
                    request={item.data}
                    isPending={isPending}
                    onApprove={(id) => handleAction('approve_time_off', id)}
                    onDeny={(id) => handleAction('deny_time_off', id)}
                    isActioning={actioningId === item.data.id}
                  />
                );
              }
              return (
                <AvailabilityCard
                  key={`avail-${item.data.id}`}
                  request={item.data}
                  isPending={isPending}
                  onApprove={(id) => handleAction('approve_availability', id)}
                  onDeny={(id) => handleAction('deny_availability', id)}
                  isActioning={actioningId === item.data.id}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
