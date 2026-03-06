import * as React from 'react';
import { useState, useEffect } from 'react';
import sty from './RequestDetailModal.module.css';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import { DenyReasonDialog } from './DenyReasonDialog';
import type {
  ApprovalItem,
  DenialReasonRequestType,
  TimeOffRequest,
  AvailabilityChangeRequest,
  ShiftTradeRequest,
} from '@/lib/scheduling.types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  request: ApprovalItem | null;
  locationId: string;
  orgId: string;
  onAction: (
    intent: string,
    id: string,
    extra?: { denial_reason_id?: string; denial_message?: string },
  ) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Convert "HH:MM" (24-h) to "9:00 AM" style. */
function formatTime12h(time: string): string {
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

/** Format an ISO datetime range in a human-friendly way. */
function formatDateTimeRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);

  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };

  const sDate = s.toLocaleDateString('en-US', dateOpts);
  const eDate = e.toLocaleDateString('en-US', dateOpts);

  const sTime = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const eTime = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isAllDay =
    s.getHours() === 0 && s.getMinutes() === 0 && e.getHours() === 0 && e.getMinutes() === 0;

  if (sDate === eDate) {
    return isAllDay ? `${sDate} (all day)` : `${sDate}, ${sTime} - ${eTime}`;
  }

  return isAllDay
    ? `${sDate} \u2013 ${eDate} (all day)`
    : `${sDate} ${sTime} \u2013 ${eDate} ${eTime}`;
}

/** Format a shift date + times for the swap card. */
function formatShiftInfo(shiftDate: string, startTime: string, endTime: string): string {
  const d = new Date(shiftDate + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${dateStr}, ${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;
}

/** Format a date string for "reviewed at" display. */
function formatReviewedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Map request kind to the intent prefix used by the API. */
function approveIntent(kind: ApprovalItem['kind']): string {
  const map: Record<ApprovalItem['kind'], string> = {
    time_off: 'approve_time_off',
    availability: 'approve_availability',
    shift_trade: 'approve_shift_trade',
  };
  return map[kind];
}

function denyIntent(kind: ApprovalItem['kind']): string {
  const map: Record<ApprovalItem['kind'], string> = {
    time_off: 'deny_time_off',
    availability: 'deny_availability',
    shift_trade: 'deny_shift_trade',
  };
  return map[kind];
}

function denialReasonType(kind: ApprovalItem['kind']): DenialReasonRequestType {
  const map: Record<ApprovalItem['kind'], DenialReasonRequestType> = {
    time_off: 'time_off',
    availability: 'availability',
    shift_trade: 'shift_swap',
  };
  return map[kind];
}

/* ------------------------------------------------------------------ */
/*  Overlapping item shape                                             */
/* ------------------------------------------------------------------ */

interface OverlappingEntry {
  employee_name: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
}

type OverlappingState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; count: number; requests: OverlappingEntry[] };

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RequestDetailModal({
  open,
  onClose,
  request,
  locationId,
  orgId,
  onAction,
  getAccessToken,
}: RequestDetailModalProps) {
  const [overlapping, setOverlapping] = useState<OverlappingState>({ status: 'loading' });
  const [denyOpen, setDenyOpen] = useState(false);
  const [actioning, setActioning] = useState(false);

  /* -- Fetch overlapping requests for time-off ---------------------- */
  useEffect(() => {
    if (!open || !request || request.kind !== 'time_off') {
      setOverlapping({ status: 'loading' });
      return;
    }

    const data = request.data as TimeOffRequest;
    let cancelled = false;

    (async () => {
      try {
        const token = await getAccessToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const params = new URLSearchParams({
          location_id: locationId,
          start: data.start_datetime,
          end: data.end_datetime,
          exclude_id: data.id,
          org_id: orgId,
        });

        const res = await fetch(`/api/scheduling/overlapping-requests?${params}`, { headers });

        if (cancelled) return;

        if (res.ok) {
          const json = await res.json();
          setOverlapping({ status: 'loaded', count: json.count, requests: json.requests });
        } else {
          setOverlapping({ status: 'error' });
        }
      } catch (err) {
        console.error('Failed to fetch overlapping requests:', err);
        if (!cancelled) {
          setOverlapping({ status: 'error' });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, request, locationId, orgId, getAccessToken]);

  /* -- Reset state when modal closes -------------------------------- */
  useEffect(() => {
    if (!open) {
      setDenyOpen(false);
      setActioning(false);
      setOverlapping({ status: 'loading' });
    }
  }, [open]);

  /* -- Action handlers ---------------------------------------------- */

  async function handleApprove() {
    if (!request) return;
    setActioning(true);
    try {
      await onAction(approveIntent(request.kind), request.data.id);
      onClose();
    } finally {
      setActioning(false);
    }
  }

  async function handleDenyConfirm(reasonId: string, message: string | null) {
    if (!request) return;
    setDenyOpen(false);
    setActioning(true);
    try {
      await onAction(denyIntent(request.kind), request.data.id, {
        denial_reason_id: reasonId,
        denial_message: message ?? undefined,
      });
      onClose();
    } finally {
      setActioning(false);
    }
  }

  /* -- Determine pending / denied status ---------------------------- */

  const isPending = request
    ? request.kind === 'shift_trade'
      ? request.data.status === 'pending_approval' || request.data.status === 'open'
      : request.data.status === 'pending'
    : false;

  const isDenied = request ? request.data.status === 'denied' : false;

  const isApproved = request ? request.data.status === 'approved' : false;

  /* -- Status label ------------------------------------------------- */

  function getStatusClass(): string {
    if (isPending) return sty.statusPending;
    if (isApproved) return sty.statusApproved;
    if (isDenied) return sty.statusDenied;
    return '';
  }

  function getStatusLabel(): string {
    if (!request) return '';
    if (isPending) return 'Pending';
    if (isApproved) return 'Approved';
    if (isDenied) return 'Denied';
    return request.data.status;
  }

  /* -- Render ------------------------------------------------------- */

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 'var(--ls-radius-xl, 12px)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent sx={{ padding: 0 }}>
          {request && (
            <div className={sty.modalContent}>
              {/* Header bar */}
              <div className={sty.header}>
                <div className={sty.headerLeft}>
                  <TypeBadge kind={request.kind} data={request.data} />
                  <span className={`${sty.statusBadge} ${getStatusClass()}`}>
                    {getStatusLabel()}
                  </span>
                </div>
                <button className={sty.closeBtn} onClick={onClose} aria-label="Close">
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className={sty.body}>
                {request.kind === 'time_off' && (
                  <TimeOffContent
                    data={request.data as TimeOffRequest}
                    overlapping={overlapping}
                  />
                )}

                {request.kind === 'availability' && (
                  <AvailabilityContent data={request.data as AvailabilityChangeRequest} />
                )}

                {request.kind === 'shift_trade' && (
                  <ShiftTradeContent data={request.data as ShiftTradeRequest} />
                )}

                {/* Reviewed-by info for non-pending */}
                {!isPending && request.data.reviewed_by && (
                  <div className={sty.reviewInfo}>
                    <span className={sty.reviewInfoLabel}>
                      {isApproved ? 'Approved' : 'Denied'} by
                    </span>
                    <span className={sty.reviewInfoValue}>{request.data.reviewed_by}</span>
                    {request.data.reviewed_at && (
                      <span className={sty.reviewInfoDate}>
                        on {formatReviewedDate(request.data.reviewed_at)}
                      </span>
                    )}
                  </div>
                )}

                {/* Denial info for denied requests */}
                {isDenied && request.data.denial_reason && (
                  <div className={sty.denialInfo}>
                    <div className={sty.denialReason}>
                      {request.data.denial_reason.label}
                    </div>
                    {request.data.denial_message && (
                      <div className={sty.denialMessage}>
                        &ldquo;{request.data.denial_message}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons for pending requests */}
              {isPending && (
                <div className={sty.actions}>
                  <button
                    className={sty.denyBtn}
                    onClick={() => setDenyOpen(true)}
                    disabled={actioning}
                  >
                    Deny
                  </button>
                  <button
                    className={sty.approveBtn}
                    onClick={handleApprove}
                    disabled={actioning}
                  >
                    {actioning ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deny reason sub-dialog */}
      {request && (
        <DenyReasonDialog
          open={denyOpen}
          onClose={() => setDenyOpen(false)}
          onConfirm={handleDenyConfirm}
          requestType={denialReasonType(request.kind)}
          orgId={orgId}
          getAccessToken={getAccessToken}
        />
      )}
    </>
  );
}

/* ================================================================== */
/*  Type Badge                                                         */
/* ================================================================== */

function TypeBadge({ kind, data }: { kind: ApprovalItem['kind']; data: any }) {
  if (kind === 'time_off') {
    return (
      <div className={sty.typeBadgeRow}>
        <span className={`${sty.typeBadge} ${sty.typeBadgeTimeOff}`}>Time Off</span>
        {data.is_paid ? (
          <span className={`${sty.subBadge} ${sty.subBadgePaid}`}>Paid</span>
        ) : (
          <span className={`${sty.subBadge} ${sty.subBadgeUnpaid}`}>Unpaid</span>
        )}
      </div>
    );
  }

  if (kind === 'availability') {
    return (
      <div className={sty.typeBadgeRow}>
        <span className={`${sty.typeBadge} ${sty.typeBadgeAvailability}`}>Availability</span>
        {data.is_permanent ? (
          <span className={`${sty.subBadge} ${sty.subBadgePermanent}`}>Permanent</span>
        ) : (
          <span className={`${sty.subBadge} ${sty.subBadgeTemporary}`}>Temporary</span>
        )}
      </div>
    );
  }

  if (kind === 'shift_trade') {
    const label = data.type === 'swap' ? 'Shift Swap' : 'House Pickup';
    return (
      <div className={sty.typeBadgeRow}>
        <span className={`${sty.typeBadge} ${sty.typeBadgeShiftTrade}`}>{label}</span>
      </div>
    );
  }

  return null;
}

/* ================================================================== */
/*  Time Off Content                                                   */
/* ================================================================== */

function TimeOffContent({
  data,
  overlapping,
}: {
  data: TimeOffRequest;
  overlapping: OverlappingState;
}) {
  return (
    <div className={sty.section}>
      <div className={sty.employeeName}>{data.employee?.full_name ?? 'Unknown Employee'}</div>

      <div className={sty.infoCard}>
        <div className={sty.infoRow}>
          <span className={sty.infoLabel}>When</span>
          <span className={sty.infoValue}>
            {formatDateTimeRange(data.start_datetime, data.end_datetime)}
          </span>
        </div>
        {data.created_at && (
          <div className={sty.infoRow}>
            <span className={sty.infoLabel}>Submitted</span>
            <span className={sty.infoValue}>
              {new Date(data.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {data.note && (
        <div className={sty.noteBox}>
          <span className={sty.noteLabel}>Note</span>
          {data.note}
        </div>
      )}

      {/* Overlapping requests */}
      <div className={sty.overlappingSection}>
        <div className={sty.overlappingHeader}>
          {overlapping.status === 'loading' && (
            <>
              <CircularProgress size={14} sx={{ mr: 1 }} />
              <span>Checking for overlapping requests...</span>
            </>
          )}
          {overlapping.status === 'error' && (
            <span className={sty.overlappingError}>Could not load overlapping requests</span>
          )}
          {overlapping.status === 'loaded' && overlapping.count === 0 && (
            <span className={sty.overlappingNone}>No other requests during this period</span>
          )}
          {overlapping.status === 'loaded' && overlapping.count > 0 && (
            <span className={sty.overlappingWarn}>
              {overlapping.count} other request{overlapping.count === 1 ? '' : 's'} during this
              period
            </span>
          )}
        </div>

        {overlapping.status === 'loaded' &&
          overlapping.requests.map((item, idx) => (
            <div key={idx} className={sty.overlappingItem}>
              <span className={sty.overlappingName}>{item.employee_name}</span>
              <span
                className={`${sty.overlappingStatusBadge} ${
                  item.status === 'approved' ? sty.statusApproved : sty.statusPending
                }`}
              >
                {item.status}
              </span>
              <span className={sty.overlappingDates}>
                {formatDateTimeRange(item.start_datetime, item.end_datetime)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Availability Content                                               */
/* ================================================================== */

function AvailabilityContent({ data }: { data: AvailabilityChangeRequest }) {
  return (
    <div className={sty.section}>
      <div className={sty.employeeName}>{data.employee?.full_name ?? 'Unknown Employee'}</div>

      <div className={sty.infoCard}>
        {data.effective_date && (
          <div className={sty.infoRow}>
            <span className={sty.infoLabel}>Effective</span>
            <span className={sty.infoValue}>
              {new Date(data.effective_date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
        {!data.is_permanent && data.end_date && (
          <div className={sty.infoRow}>
            <span className={sty.infoLabel}>Until</span>
            <span className={sty.infoValue}>
              {new Date(data.end_date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {/* Day-of-week availability grid */}
      <div className={sty.availGridWrapper}>
        <div className={sty.availGridLabel}>Requested Availability</div>
        <div className={sty.availGrid}>
          {DAY_LABELS.map((label, dow) => {
            const entry = data.requested_availability?.find((a) => a.day_of_week === dow);
            const hasAvail = entry && entry.start_time && entry.end_time;

            return (
              <div key={dow} className={sty.availRow}>
                <span className={sty.availDayLabel}>{label}</span>
                {hasAvail ? (
                  <span className={sty.availTimeValue}>
                    {formatTime12h(entry.start_time)} - {formatTime12h(entry.end_time)}
                  </span>
                ) : (
                  <span className={sty.availUnavailable}>Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.employee_notes && (
        <div className={sty.noteBox}>
          <span className={sty.noteLabel}>Note</span>
          {data.employee_notes}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Shift Trade Content                                                */
/* ================================================================== */

function ShiftTradeContent({ data }: { data: ShiftTradeRequest }) {
  if (data.type === 'swap') {
    return (
      <div className={sty.section}>
        <div className={sty.swapContainer}>
          {/* Source side */}
          <div className={sty.swapCard}>
            <span className={sty.swapLabel}>Giving up</span>
            <div className={sty.swapEmployee}>
              {data.source_employee?.full_name ?? 'Unknown'}
            </div>
            {data.source_shift && (
              <div className={sty.swapShiftInfo}>
                {formatShiftInfo(
                  data.source_shift.shift_date,
                  data.source_shift.start_time,
                  data.source_shift.end_time,
                )}
              </div>
            )}
            {data.source_shift?.position && (
              <div className={sty.swapPosition}>{data.source_shift.position.name}</div>
            )}
          </div>

          {/* Arrow */}
          <div className={sty.swapArrow}>{'\u21C4'}</div>

          {/* Target side */}
          <div className={sty.swapCard}>
            <span className={sty.swapLabel}>Picking up</span>
            <div className={sty.swapEmployee}>
              {data.target_employee?.full_name ?? 'Unknown'}
            </div>
            {data.target_shift && (
              <div className={sty.swapShiftInfo}>
                {formatShiftInfo(
                  data.target_shift.shift_date,
                  data.target_shift.start_time,
                  data.target_shift.end_time,
                )}
              </div>
            )}
            {data.target_shift?.position && (
              <div className={sty.swapPosition}>{data.target_shift.position.name}</div>
            )}
          </div>
        </div>

        {data.notes && (
          <div className={sty.noteBox}>
            <span className={sty.noteLabel}>Note</span>
            {data.notes}
          </div>
        )}
      </div>
    );
  }

  /* House pickup */
  return (
    <div className={sty.section}>
      <div className={sty.swapContainer}>
        <div className={sty.swapCard}>
          <span className={sty.swapLabel}>Shift</span>
          {data.source_shift && (
            <div className={sty.swapShiftInfo}>
              {formatShiftInfo(
                data.source_shift.shift_date,
                data.source_shift.start_time,
                data.source_shift.end_time,
              )}
            </div>
          )}
          {data.source_shift?.position && (
            <div className={sty.swapPosition}>{data.source_shift.position.name}</div>
          )}
          {data.source_employee && (
            <div className={sty.swapOriginal}>
              Originally: {data.source_employee.full_name}
            </div>
          )}
        </div>

        <div className={sty.swapArrow}>{'\u2192'}</div>

        <div className={sty.swapCard}>
          <span className={sty.swapLabel}>Picked up by</span>
          <div className={sty.swapEmployee}>
            {data.target_employee?.full_name ?? 'Unknown'}
          </div>
        </div>
      </div>

      {data.notes && (
        <div className={sty.noteBox}>
          <span className={sty.noteLabel}>Note</span>
          {data.notes}
        </div>
      )}
    </div>
  );
}
