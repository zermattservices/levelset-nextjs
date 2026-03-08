import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './SetupsPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { SetupBoardView } from '@/components/scheduling/setup/SetupBoardView';
import { SetupTemplateManager } from '@/components/scheduling/setup/SetupTemplateManager';
import { useSetupBoardData } from '@/components/scheduling/setup/useSetupBoardData';
import { SyncEmployeesModal } from '@/components/CodeComponents/SyncEmployeesModal';
import CircularProgress from '@mui/material/CircularProgress';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import type { Position } from '@/lib/scheduling.types';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_LONG[d.getDay()];
  const month = MONTHS[d.getMonth()];
  return `${dayName}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
}

interface Employee {
  id: string;
  full_name: string;
  role: string;
  is_foh: boolean;
  is_boh: boolean;
  calculated_pay?: number;
  actual_pay?: number;
  actual_pay_type?: 'hourly' | 'salary';
  actual_pay_annual?: number;
  active: boolean;
}

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  position_id: string | null;
  is_house_shift: boolean;
  break_minutes: number;
  assignment?: { employee_id: string } | null;
  [key: string]: any;
}

export function SetupsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();
  const { has } = usePermissions();
  const { hasFeature } = useOrgFeatures();

  const canViewSetups = hasFeature(F.SETUPS) && has(P.SCHED_VIEW);

  // Day navigation
  const [selectedDay, setSelectedDay] = React.useState<string>(() => formatDate(new Date()));
  const [zoneFilter, setZoneFilter] = React.useState<'FOH' | 'BOH'>('FOH');

  // HS sync modal
  const [hsSyncOpen, setHsSyncOpen] = React.useState(false);

  // Data fetching
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [shifts, setShifts] = React.useState<Shift[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const orgId = selectedLocationOrgId ?? auth.org_id;

  // Fetch positions
  React.useEffect(() => {
    if (!selectedLocationOrgId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scheduling/positions?org_id=${selectedLocationOrgId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setPositions(data.positions ?? []);
      } catch {
        if (!cancelled) setPositions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLocationOrgId]);

  // Fetch employees
  React.useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/employees?location_id=${selectedLocationId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setEmployees(data.employees ?? []);
      } catch {
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLocationId]);

  // Fetch shifts for the current week (needed for setup board employee availability)
  React.useEffect(() => {
    if (!selectedLocationId) return;
    let cancelled = false;
    setIsLoading(true);

    // Get the Sunday of the week containing selectedDay
    const dayDate = new Date(selectedDay + 'T00:00:00');
    const sunday = new Date(dayDate);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const weekStart = formatDate(sunday);

    (async () => {
      try {
        const res = await fetch(
          `/api/scheduling/schedules?location_id=${selectedLocationId}&week_start=${weekStart}`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setShifts(data.shifts ?? []);
      } catch {
        if (!cancelled) setShifts([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLocationId, selectedDay]);

  // Setup board data
  const setupData = useSetupBoardData({
    selectedDay,
    shifts: shifts as any,
    positions,
    employees: employees as any,
    zoneFilter,
  });

  // Day navigation
  const navigateDay = React.useCallback((dir: -1 | 1) => {
    setSelectedDay((prev) => {
      const d = new Date(prev + 'T00:00:00');
      d.setDate(d.getDate() + dir);
      return formatDate(d);
    });
  }, []);

  const goToToday = React.useCallback(() => {
    setSelectedDay(formatDate(new Date()));
  }, []);

  const refetchData = React.useCallback(() => {
    // Trigger re-fetch by updating a dependency — selectedDay stays the same
    // but we force a re-render by toggling loading
    setIsLoading(true);
    if (!selectedLocationId) return;
    const dayDate = new Date(selectedDay + 'T00:00:00');
    const sunday = new Date(dayDate);
    sunday.setDate(sunday.getDate() - sunday.getDay());
    const weekStart = formatDate(sunday);

    (async () => {
      try {
        const [schedRes, posRes, empRes] = await Promise.all([
          fetch(`/api/scheduling/schedules?location_id=${selectedLocationId}&week_start=${weekStart}`),
          fetch(`/api/scheduling/positions?org_id=${selectedLocationOrgId}`),
          fetch(`/api/employees?location_id=${selectedLocationId}`),
        ]);
        if (schedRes.ok) {
          const data = await schedRes.json();
          setShifts(data.shifts ?? []);
        }
        if (posRes.ok) {
          const data = await posRes.json();
          setPositions(data.positions ?? []);
        }
        if (empRes.ok) {
          const data = await empRes.json();
          setEmployees(data.employees ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    })();
  }, [selectedLocationId, selectedLocationOrgId, selectedDay]);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  if (!canViewSetups) {
    return (
      <>
        <Head>
          <title key="title">Levelset | Setups</title>
          <meta key="og:title" property="og:title" content="Levelset | Setups" />
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
              You don&apos;t have permission to view Setups. Please contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title key="title">Levelset | Setups</title>
        <meta key="og:title" property="og:title" content="Levelset | Setups" />
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
              Select a location to view setups.
            </p>
          </div>
        ) : (
          <div className={sty.setupsContainer}>
            {/* Toolbar */}
            <div className={sty.toolbar}>
              <div className={sty.navSection}>
                <IconButton
                  size="small"
                  onClick={() => navigateDay(-1)}
                  className={sty.navArrow}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>

                <span className={sty.dateLabel}>{formatDayLabel(selectedDay)}</span>

                <IconButton
                  size="small"
                  onClick={() => navigateDay(1)}
                  className={sty.navArrow}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>

                <button className={sty.todayBtn} onClick={goToToday}>Today</button>
              </div>

              <div className={sty.centerSection}>
                {/* Zone filter */}
                <div className={sty.toggleGroup}>
                  <button
                    className={`${sty.toggleBtn} ${zoneFilter === 'FOH' ? sty.toggleActive : ''}`}
                    onClick={() => setZoneFilter('FOH')}
                  >
                    FOH
                  </button>
                  <button
                    className={`${sty.toggleBtn} ${zoneFilter === 'BOH' ? sty.toggleActive : ''}`}
                    onClick={() => setZoneFilter('BOH')}
                  >
                    BOH
                  </button>
                </div>

                {/* HS Sync button */}
                <button className={sty.syncBtn} onClick={() => setHsSyncOpen(true)} title="Import from HotSchedules">
                  <img src="/hs_logo.png" alt="" className={sty.syncIcon} />
                  Sync
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className={sty.loadingContainer}>
                <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>

      {/* Template Manager Modal */}
      {setupData.templateManagerOpen && (
        <SetupTemplateManager
          open
          onClose={() => setupData.setTemplateManagerOpen(false)}
          templates={setupData.templates}
          positions={positions}
          onSave={async (templateData) => {
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

      {/* HS Sync Modal */}
      {hsSyncOpen && (
        <SyncEmployeesModal
          open
          onClose={() => setHsSyncOpen(false)}
          locationId={selectedLocationId}
          orgId={orgId}
          defaultScheduleSync
          onSyncComplete={() => {
            setHsSyncOpen(false);
            refetchData();
          }}
        />
      )}
    </>
  );
}

export default SetupsPage;
