import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './SchedulePage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useScheduleData } from '@/components/scheduling/useScheduleData';
import { useColumnConfig } from '@/components/scheduling/useColumnConfig';
import { ScheduleToolbar } from '@/components/scheduling/ScheduleToolbar';
import { ScheduleGrid } from '@/components/scheduling/ScheduleGrid';
import { ShiftModal } from '@/components/scheduling/ShiftModal';
import { BottomPanel } from '@/components/scheduling/BottomPanel';
import { SetupBoardView } from '@/components/scheduling/setup/SetupBoardView';
import { SetupTemplateManager } from '@/components/scheduling/setup/SetupTemplateManager';
import { useSetupBoardData } from '@/components/scheduling/setup/useSetupBoardData';
import { SyncEmployeesModal } from '@/components/CodeComponents/SyncEmployeesModal';
import CircularProgress from '@mui/material/CircularProgress';
import type { Shift } from '@/lib/scheduling.types';
import type { PendingShiftPreview } from '@/components/scheduling/ScheduleGrid';
import type { LocationBusinessHours } from '@/lib/supabase.types';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getShiftEndMinute(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return end;
}

function formatMinutesToTime(minutes: number): string {
  const wrapped = ((Math.floor(minutes) % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getDayCloseMinute(
  date: string,
  businessHours: LocationBusinessHours[],
): number | null {
  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  const periods = businessHours.filter((h) => h.day_of_week === dayOfWeek);
  if (!periods.length) return null;
  return Math.max(
    ...periods.map((p) => {
      const open = p.open_hour * 60 + p.open_minute;
      let close = p.close_hour * 60 + p.close_minute;
      if (close <= open) close += 24 * 60;
      return close;
    }),
  );
}

function getDefaultShiftWindowForDay(
  date: string,
  existingShiftEnds: number[],
  businessHours: LocationBusinessHours[],
): { start: string; end: string } {
  const DEFAULT_LENGTH_MIN = 8 * 60;
  const MIN_LENGTH_MIN = 15;

  const latestEnd = existingShiftEnds.length ? Math.max(...existingShiftEnds) : 9 * 60;
  const closeMinute = getDayCloseMinute(date, businessHours);

  const startMinute = latestEnd;
  let endMinute = startMinute + DEFAULT_LENGTH_MIN;

  if (closeMinute != null) {
    endMinute = Math.min(endMinute, closeMinute);
    if (endMinute <= startMinute) endMinute = startMinute + MIN_LENGTH_MIN;
  }

  return {
    start: formatMinutesToTime(startMinute),
    end: formatMinutesToTime(endMinute),
  };
}

export function SchedulePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();

  const { has } = usePermissions();
  const { hasFeature } = useOrgFeatures();
  const canViewSchedule = hasFeature(F.SCHEDULING) && has(P.SCHED_VIEW);
  const canViewPay = has(P.ROSTER_MANAGE_PAY);
  const { config: columnConfig, updateConfig: updateColumnConfig } = useColumnConfig();

  // Modal state
  const [shiftModalOpen, setShiftModalOpen] = React.useState(false);
  const [editingShift, setEditingShift] = React.useState<Shift | null>(null);
  const [prefillDate, setPrefillDate] = React.useState('');
  const [prefillPositionId, setPrefillPositionId] = React.useState('');
  const [prefillEmployeeId, setPrefillEmployeeId] = React.useState('');
  const [prefillStartTime, setPrefillStartTime] = React.useState('');
  const [prefillEndTime, setPrefillEndTime] = React.useState('');
  const [pendingShift, setPendingShift] = React.useState<PendingShiftPreview | null>(null);

  // HotSchedules sync modal
  const [hsSyncOpen, setHsSyncOpen] = React.useState(false);

  // Synchronized hover cursor between ScheduleGrid and LaborSpreadTab
  const [gridHoverMinute, setGridHoverMinute] = React.useState<number | null>(null);
  const [chartHoverMinute, setChartHoverMinute] = React.useState<number | null>(null);

  const data = useScheduleData();

  // Fetch business hours for the selected location
  const [businessHours, setBusinessHours] = React.useState<LocationBusinessHours[]>([]);
  React.useEffect(() => {
    if (!selectedLocationId) {
      setBusinessHours([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/locations/google-info?locationId=${selectedLocationId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.businessHours) {
          setBusinessHours(json.businessHours);
        }
      })
      .catch(() => {
        if (!cancelled) setBusinessHours([]);
      });
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  // When entering setup mode, force zone to FOH or BOH (not 'all')
  React.useEffect(() => {
    if (data.gridViewMode === 'setup' && data.zoneFilter === 'all') {
      data.setZoneFilter('FOH');
    }
  }, [data.gridViewMode]);

  // Setup board data hook — only active when in setup view mode
  const setupZoneFilter = data.zoneFilter === 'all' ? 'FOH' : data.zoneFilter;
  const setupData = useSetupBoardData({
    selectedDay: data.selectedDay,
    shifts: data.shifts,
    positions: data.allPositions,
    employees: data.employees,
    zoneFilter: setupZoneFilter,
  });

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Show loading screen while auth is loading
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  // Show unauthorized message if user lacks scheduling feature or permission
  if (!canViewSchedule) {
    return (
      <>
        <Head>
          <title key="title">Levelset | Scheduling</title>
          <meta key="og:title" property="og:title" content="Levelset | Scheduling" />
        </Head>

        <style>{`body { margin: 0; }`}</style>

        <div
          className={classNames(
            projectcss.all,
            projectcss.root_reset,
            projectcss.plasmic_default_styles,
            projectcss.plasmic_mixins,
            projectcss.plasmic_tokens,
            sty.root
          )}
        >
          <MenuNavigation
            className={classNames("__wab_instance", sty.menuNavigation)}
            firstName={auth.first_name}
            userRole={auth.role}
          />

          <div className={sty.unauthorizedContainer}>
            <h1 className={sty.unauthorizedTitle}>Access Denied</h1>
            <p className={sty.unauthorizedText}>
              You don&apos;t have permission to view Scheduling. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </>
    );
  }

  const handleCellClick = (date: string, entityId?: string) => {
    setEditingShift(null);
    setPrefillDate(date);

    const shouldUseSmartDefaults = data.timeViewMode === 'day' && !!entityId;
    if (shouldUseSmartDefaults) {
      const matchingShifts = data.shifts.filter((shift) => {
        if (shift.shift_date !== date) return false;
        if (data.gridViewMode === 'employees') {
          return shift.assignment?.employee_id === entityId;
        }
        if (data.gridViewMode === 'positions' && entityId !== '__none__') {
          return shift.position_id === entityId;
        }
        return false;
      });
      const ends = matchingShifts.map((s) => getShiftEndMinute(s.start_time, s.end_time));
      const window = getDefaultShiftWindowForDay(date, ends, businessHours);
      setPrefillStartTime(window.start);
      setPrefillEndTime(window.end);
    } else {
      setPrefillStartTime('');
      setPrefillEndTime('');
    }

    if (data.gridViewMode === 'positions' && entityId && entityId !== '__none__') {
      setPrefillPositionId(entityId);
      setPrefillEmployeeId('');
    } else if (data.gridViewMode === 'employees' && entityId) {
      setPrefillEmployeeId(entityId);
      setPrefillPositionId('');
    } else {
      setPrefillPositionId('');
      setPrefillEmployeeId('');
    }

    setShiftModalOpen(true);
  };

  const handleAddShiftClick = (
    date: string,
    entityId?: string,
    prefillStart?: string,
    prefillEnd?: string,
  ) => {
    setEditingShift(null);
    setPrefillDate(date);
    setPrefillStartTime(prefillStart ?? '');
    setPrefillEndTime(prefillEnd ?? '');

    if (data.gridViewMode === 'positions' && entityId && entityId !== '__none__') {
      setPrefillPositionId(entityId);
      setPrefillEmployeeId('');
    } else if (data.gridViewMode === 'employees' && entityId) {
      setPrefillEmployeeId(entityId);
      setPrefillPositionId('');
    } else {
      setPrefillPositionId('');
      setPrefillEmployeeId('');
    }

    setShiftModalOpen(true);
  };

  const handleShiftClick = (shift: Shift) => {
    // Clicking a pending-delete shift restores it
    if (shift.pending_delete) {
      handleShiftRestore(shift.id);
      return;
    }
    setEditingShift(shift);
    setPrefillDate('');
    setPrefillPositionId('');
    setPrefillEmployeeId('');
    setPrefillStartTime('');
    setPrefillEndTime('');
    setShiftModalOpen(true);
  };

  const handleShiftDelete = async (shiftId: string) => {
    try {
      await data.deleteShift(shiftId);
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const handleShiftRestore = async (shiftId: string) => {
    try {
      await data.restoreShift(shiftId);
    } catch (err) {
      console.error('Failed to restore shift:', err);
    }
  };

  const handleDragCreate = (date: string, startTime: string, endTime: string, entityId?: string) => {
    setEditingShift(null);
    setPrefillDate(date);
    setPrefillStartTime(startTime);
    setPrefillEndTime(endTime);

    let posZone: 'FOH' | 'BOH' | null = null;
    if (data.gridViewMode === 'positions' && entityId && entityId !== '__none__') {
      setPrefillPositionId(entityId);
      setPrefillEmployeeId('');
      // Look up the zone for this position
      const pos = data.allPositions.find((p) => p.id === entityId);
      posZone = pos?.zone ?? null;
    } else if (data.gridViewMode === 'employees' && entityId) {
      setPrefillEmployeeId(entityId);
      setPrefillPositionId('');
    } else {
      setPrefillPositionId('');
      setPrefillEmployeeId('');
    }

    setPendingShift({
      date,
      startTime,
      endTime,
      entityId,
      positionZone: posZone,
    });
    setShiftModalOpen(true);
  };

  const handleAssignHouseShift = async (shiftId: string, employeeId: string) => {
    try {
      await data.assignEmployee(shiftId, employeeId);
      await data.updateShift(shiftId, { is_house_shift: false });
    } catch (err) {
      console.error('Failed to assign house shift:', err);
    }
  };

  const handlePublish = async () => {
    const count = data.unpublishedCount;
    if (!window.confirm(`Publish ${count} ${count === 1 ? 'change' : 'changes'}?`)) return;
    try {
      await data.publishSchedule();
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  return (
    <>
      <Head>
        <title key="title">Levelset | Scheduling</title>
        <meta key="og:title" property="og:title" content="Levelset | Scheduling" />
      </Head>

      <style>{`body { margin: 0; }`}</style>

      <div
        className={classNames(
          projectcss.all,
          projectcss.root_reset,
          projectcss.plasmic_default_styles,
          projectcss.plasmic_mixins,
          projectcss.plasmic_tokens,
          sty.root
        )}
      >
        <MenuNavigation
          className={classNames("__wab_instance", sty.menuNavigation)}
          firstName={auth.first_name}
          userRole={auth.role}
          fullWidth
        />

        {!selectedLocationId ? (
          <div className={sty.noLocationContainer}>
            <p className={sty.noLocationText}>
              Select a location to view the schedule.
            </p>
          </div>
        ) : (
          <div className={sty.scheduleContainer}>
            <ScheduleToolbar
              weekStart={data.weekStart}
              selectedDay={data.selectedDay}
              timeViewMode={data.timeViewMode}
              gridViewMode={data.gridViewMode}
              zoneFilter={data.zoneFilter}
              schedule={data.schedule}
              laborSummary={data.laborSummary}
              canViewPay={canViewPay}
              unpublishedCount={data.unpublishedCount}
              hasShifts={data.shifts.length > 0}
              onNavigateWeek={data.navigateWeek}
              onNavigateDay={data.navigateDay}
              onGoToToday={data.goToToday}
              onTimeViewChange={data.setTimeViewMode}
              onGridViewChange={data.setGridViewMode}
              onZoneFilterChange={data.setZoneFilter}
              onPublish={handlePublish}
              onSyncClick={() => setHsSyncOpen(true)}
            />

            {data.gridViewMode === 'setup' ? (
              <SetupBoardView
                blocks={setupData.blocks}
                activeBlockIndex={setupData.activeBlockIndex}
                onBlockChange={setupData.setActiveBlockIndex}
                positionSlots={setupData.positionSlots}
                availableEmployees={setupData.availableEmployees}
                onAssign={setupData.assignEmployee}
                onUnassign={setupData.unassignEmployee}
                onReassign={setupData.reassignEmployee}
                onManageTemplates={() => setupData.setTemplateManagerOpen(true)}
                isLoading={setupData.isLoading}
              />
            ) : (
              <>
                {data.isLoading ? (
                  <div className={sty.loadingContainer}>
                    <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
                  </div>
                ) : (
                  <ScheduleGrid
                    shifts={data.shifts}
                    positions={data.positions}
                    employees={data.employees}
                    days={data.days}
                    selectedDay={data.selectedDay}
                    gridViewMode={data.gridViewMode}
                    timeViewMode={data.timeViewMode}
                    laborSummary={data.laborSummary}
                    isPublished={false}
                    canViewPay={canViewPay}
                    columnConfig={columnConfig}
                    onColumnConfigUpdate={updateColumnConfig}
                    onCellClick={handleCellClick}
                    onAddShiftClick={handleAddShiftClick}
                    onShiftClick={handleShiftClick}
                    onShiftDelete={handleShiftDelete}
                    onDragCreate={handleDragCreate}
                    onAssignHouseShift={handleAssignHouseShift}
                    pendingShift={shiftModalOpen && !editingShift ? pendingShift : null}
                    businessHours={businessHours}
                    externalHoverMinute={chartHoverMinute}
                    onHoverMinuteChange={setGridHoverMinute}
                  />
                )}

                {!data.isLoading && (
                  <BottomPanel
                    shifts={data.shifts}
                    positions={data.allPositions}
                    laborSummary={data.laborSummary}
                    days={data.days}
                    canViewPay={canViewPay}
                    isPublished={false}
                    timeViewMode={data.timeViewMode}
                    selectedDay={data.selectedDay}
                    onDeleteShift={data.deleteShift}
                    externalHoverMinute={gridHoverMinute}
                    onHoverMinuteChange={setChartHoverMinute}
                    forecasts={data.forecasts}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Template Manager Modal — conditionally rendered to avoid aria-hidden warnings */}
      {setupData.templateManagerOpen && (
        <SetupTemplateManager
          open
          onClose={() => setupData.setTemplateManagerOpen(false)}
          templates={setupData.templates}
          positions={data.allPositions}
          onSave={async (templateData) => {
            const orgId = selectedLocationOrgId ?? auth.org_id;
            const res = await fetch('/api/scheduling/setup-templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...templateData,
                org_id: orgId,
              }),
            });
            if (!res.ok) throw new Error('Failed to save template');
          }}
          onDelete={async (templateId) => {
            const res = await fetch('/api/scheduling/setup-templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ intent: 'delete', id: templateId }),
            });
            if (!res.ok) throw new Error('Failed to delete template');
          }}
          onRefetch={() => {
            setupData.fetchTemplates();
            setupData.refetchBlocks();
          }}
        />
      )}

      {/* Shift Modal — conditionally rendered to avoid aria-hidden warnings */}
      {shiftModalOpen && (
        <ShiftModal
          open
          onClose={() => { setShiftModalOpen(false); setPendingShift(null); }}
          shift={editingShift}
          onPositionChange={(posId) => {
            if (!pendingShift) return;
            const pos = data.allPositions.find((p) => p.id === posId);
            setPendingShift((prev) => prev ? { ...prev, positionZone: pos?.zone ?? null } : null);
          }}
          onTimeChange={(startTime, endTime) => {
            if (!pendingShift) return;
            setPendingShift((prev) => prev ? { ...prev, startTime, endTime } : null);
          }}
          prefillDate={prefillDate}
          prefillPositionId={prefillPositionId}
          prefillEmployeeId={prefillEmployeeId}
          prefillStartTime={prefillStartTime}
          prefillEndTime={prefillEndTime}
          canViewPay={canViewPay}
          positions={data.allPositions}
          employees={data.employees}
          isPublished={false}
          onSave={data.createShift}
          onUpdate={data.updateShift}
          onDelete={data.deleteShift}
          onAssign={data.assignEmployee}
          onUnassign={data.unassignEmployee}
        />
      )}

      {/* First-time HS schedule import modal (auto-triggered by notification) */}
      {!!data.pendingHsNotificationId && (
        <SyncEmployeesModal
          open
          onClose={() => data.clearPendingHsImport()}
          locationId={selectedLocationId}
          orgId={selectedLocationOrgId ?? auth.org_id}
          scheduleImportMode
          onSyncComplete={() => data.clearPendingHsImport()}
        />
      )}

      {/* Manual HS sync from toolbar button */}
      {hsSyncOpen && (
        <SyncEmployeesModal
          open
          onClose={() => setHsSyncOpen(false)}
          locationId={selectedLocationId}
          orgId={selectedLocationOrgId ?? auth.org_id}
          defaultScheduleSync
          onSyncComplete={() => {
            setHsSyncOpen(false);
            data.refetch();
          }}
        />
      )}
    </>
  );
}

export default SchedulePage;
