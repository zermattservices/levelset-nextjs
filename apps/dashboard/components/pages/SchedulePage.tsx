import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './SchedulePage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useScheduleData } from '@/components/scheduling/useScheduleData';
import { ScheduleToolbar } from '@/components/scheduling/ScheduleToolbar';
import { ScheduleGrid } from '@/components/scheduling/ScheduleGrid';
import { ShiftModal } from '@/components/scheduling/ShiftModal';
import { AreaManagerModal } from '@/components/scheduling/AreaManagerModal';
import { LaborSummaryBar } from '@/components/scheduling/LaborSummaryBar';
import CircularProgress from '@mui/material/CircularProgress';
import type { Shift } from '@/lib/scheduling.types';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function SchedulePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId } = useLocationContext();

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  // Modal state
  const [shiftModalOpen, setShiftModalOpen] = React.useState(false);
  const [editingShift, setEditingShift] = React.useState<Shift | null>(null);
  const [prefillDate, setPrefillDate] = React.useState('');
  const [prefillAreaId, setPrefillAreaId] = React.useState('');
  const [prefillEmployeeId, setPrefillEmployeeId] = React.useState('');
  const [areaModalOpen, setAreaModalOpen] = React.useState(false);

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

    if (data.gridViewMode === 'areas' && entityId && entityId !== '__none__') {
      setPrefillAreaId(entityId);
      setPrefillEmployeeId('');
    } else if (data.gridViewMode === 'employees' && entityId) {
      setPrefillEmployeeId(entityId);
      setPrefillAreaId('');
    } else {
      setPrefillAreaId('');
      setPrefillEmployeeId('');
    }

    setShiftModalOpen(true);
  };

  const handleShiftClick = (shift: Shift) => {
    setEditingShift(shift);
    setPrefillDate('');
    setPrefillAreaId('');
    setPrefillEmployeeId('');
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
              schedule={data.schedule}
              laborSummary={data.laborSummary}
              onNavigateWeek={data.navigateWeek}
              onNavigateDay={data.navigateDay}
              onGoToToday={data.goToToday}
              onTimeViewChange={data.setTimeViewMode}
              onGridViewChange={data.setGridViewMode}
              onManageAreas={() => setAreaModalOpen(true)}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
            />

            {data.isLoading ? (
              <div className={sty.loadingContainer}>
                <CircularProgress size={32} sx={{ color: '#31664a' }} />
              </div>
            ) : (
              <ScheduleGrid
                shifts={data.shifts}
                areas={data.areas}
                employees={data.employees}
                days={data.days}
                selectedDay={data.selectedDay}
                gridViewMode={data.gridViewMode}
                timeViewMode={data.timeViewMode}
                laborSummary={data.laborSummary}
                isPublished={isPublished}
                onCellClick={handleCellClick}
                onShiftClick={handleShiftClick}
                onShiftDelete={handleShiftDelete}
              />
            )}

            {!data.isLoading && data.shifts.length > 0 && (
              <LaborSummaryBar laborSummary={data.laborSummary} />
            )}
          </div>
        )}
      </div>

      {/* Shift Modal */}
      <ShiftModal
        open={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        shift={editingShift}
        prefillDate={prefillDate}
        prefillAreaId={prefillAreaId}
        prefillEmployeeId={prefillEmployeeId}
        areas={data.areas}
        employees={data.employees}
        isPublished={isPublished}
        onSave={data.createShift}
        onUpdate={data.updateShift}
        onDelete={data.deleteShift}
        onAssign={data.assignEmployee}
        onUnassign={data.unassignEmployee}
      />

      {/* Area Manager Modal */}
      <AreaManagerModal
        open={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        areas={data.areas}
        onCreate={data.createArea}
        onUpdate={data.updateArea}
        onDelete={data.deleteArea}
      />
    </>
  );
}

export default SchedulePage;
