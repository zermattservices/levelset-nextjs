import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './SchedulePage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useScheduleData } from '@/components/scheduling/useScheduleData';
import { useColumnConfig } from '@/components/scheduling/useColumnConfig';
import { ScheduleToolbar } from '@/components/scheduling/ScheduleToolbar';
import { ScheduleGrid } from '@/components/scheduling/ScheduleGrid';
import { ShiftModal } from '@/components/scheduling/ShiftModal';
import { BottomPanel } from '@/components/scheduling/BottomPanel';
import CircularProgress from '@mui/material/CircularProgress';
import type { Shift } from '@/lib/scheduling.types';
import type { PendingShiftPreview } from '@/components/scheduling/ScheduleGrid';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function SchedulePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId } = useLocationContext();

  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  const { has } = usePermissions();
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

  const data = useScheduleData();

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

  // Show unauthorized message if user is not Levelset Admin
  if (!isLevelsetAdmin) {
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

  const isPublished = data.schedule?.status === 'published';

  const handleCellClick = (date: string, entityId?: string) => {
    if (isPublished) return;
    setEditingShift(null);
    setPrefillDate(date);
    setPrefillStartTime('');
    setPrefillEndTime('');

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
    setEditingShift(shift);
    setPrefillDate('');
    setPrefillPositionId('');
    setPrefillEmployeeId('');
    setPrefillStartTime('');
    setPrefillEndTime('');
    setShiftModalOpen(true);
  };

  const handleShiftDelete = async (shiftId: string) => {
    if (isPublished) return;
    if (!window.confirm('Delete this shift?')) return;
    try {
      await data.deleteShift(shiftId);
    } catch (err) {
      console.error('Failed to delete shift:', err);
    }
  };

  const handleDragCreate = (date: string, startTime: string, endTime: string, entityId?: string) => {
    if (isPublished) return;
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

  const handlePublish = async () => {
    if (!window.confirm('Publish this schedule? Editing will be locked until you unpublish.')) return;
    try {
      await data.publishSchedule();
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Unpublish this schedule? It will return to draft status.')) return;
    try {
      await data.unpublishSchedule();
    } catch (err) {
      console.error('Failed to unpublish:', err);
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
              onNavigateWeek={data.navigateWeek}
              onNavigateDay={data.navigateDay}
              onGoToToday={data.goToToday}
              onTimeViewChange={data.setTimeViewMode}
              onGridViewChange={data.setGridViewMode}
              onZoneFilterChange={data.setZoneFilter}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
            />

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
                isPublished={isPublished}
                canViewPay={canViewPay}
                columnConfig={columnConfig}
                onColumnConfigUpdate={updateColumnConfig}
                onCellClick={handleCellClick}
                onShiftClick={handleShiftClick}
                onShiftDelete={handleShiftDelete}
                onDragCreate={handleDragCreate}
                pendingShift={shiftModalOpen && !editingShift ? pendingShift : null}
              />
            )}

            {!data.isLoading && (
              <BottomPanel
                shifts={data.shifts}
                positions={data.allPositions}
                laborSummary={data.laborSummary}
                days={data.days}
                canViewPay={canViewPay}
                isPublished={isPublished}
                onDeleteShift={data.deleteShift}
              />
            )}
          </div>
        )}
      </div>

      {/* Shift Modal */}
      <ShiftModal
        open={shiftModalOpen}
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
        isPublished={isPublished}
        onSave={data.createShift}
        onUpdate={data.updateShift}
        onDelete={data.deleteShift}
        onAssign={data.assignEmployee}
        onUnassign={data.unassignEmployee}
      />
    </>
  );
}

export default SchedulePage;
