import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button, CircularProgress } from '@mui/material';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import sty from './OrgChartPage.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { createSupabaseClient } from '@/util/supabase/component';
import { computeOrgChartLayout } from '@/lib/org-chart-layout';
import { EmployeeCardNode } from '@/components/org-chart/EmployeeCardNode';
import { GroupBoxNode } from '@/components/org-chart/GroupBoxNode';
import { DepartmentBoxNode } from '@/components/org-chart/DepartmentBoxNode';
import { TierLabel } from '@/components/org-chart/TierLabel';
import { EmployeeDetailPanel } from '@/components/org-chart/EmployeeDetailPanel';
import { ConfigPanel } from '@/components/org-chart/ConfigPanel';
import type { OrgChartData, OrgChartEmployee } from '@/lib/org-chart-types';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// IMPORTANT: nodeTypes must be declared outside the component to avoid
// React Flow re-registering them on every render (which destroys handles).
const nodeTypes = {
  employeeCard: EmployeeCardNode,
  groupBox: GroupBoxNode,
  departmentBox: DepartmentBoxNode,
  tierLabel: TierLabel,
};

/**
 * OrgChartCanvas — uses `defaultNodes` / `defaultEdges` (uncontrolled mode)
 * and a `key` prop that changes whenever `chartData` changes, forcing a
 * fresh mount of ReactFlow so nodes AND edges are rendered together on the
 * very first paint — no timing issues, no state-sync race conditions.
 */
function OrgChartCanvas({
  chartData,
  onSelectEmployee,
  onClickGroup,
}: {
  chartData: OrgChartData;
  onSelectEmployee: (id: string, position: { x: number; y: number }) => void;
  onClickGroup?: (groupId: string) => void;
}) {
  const layout = React.useMemo(
    () => computeOrgChartLayout(chartData),
    [chartData]
  );

  // Stable key that changes whenever chartData reference changes (new fetch
  // or optimistic update).  We use a ref counter instead of Date.now() to
  // avoid non-deterministic keys on the same render.
  const renderCount = React.useRef(0);
  React.useMemo(() => { renderCount.current += 1; }, [chartData]);
  const chartKey = `chart-${renderCount.current}`;

  // Inject callbacks into group box nodes so they can call onSelectEmployee
  // and onClickGroup from within the node component.
  const nodesWithCallbacks = React.useMemo(() => {
    return layout.nodes.map((node) => {
      if (node.type === 'groupBox') {
        return {
          ...node,
          data: {
            ...node.data,
            onSelectEmployee: (empId: string) => {
              // Use a placeholder position; the detail panel handles positioning
              onSelectEmployee(empId, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
            },
            onClickGroup: onClickGroup,
          },
        };
      }
      return node;
    });
  }, [layout.nodes, onSelectEmployee, onClickGroup]);

  // Handle node click
  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (node.type === 'employeeCard' && node.data?.employee?.id) {
        onSelectEmployee(node.data.employee.id, { x: _event.clientX, y: _event.clientY });
      }
    },
    [onSelectEmployee]
  );

  return (
    <ReactFlow
      key={chartKey}
      defaultNodes={nodesWithCallbacks}
      defaultEdges={layout.edges}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={{
        type: 'smoothstep',
        style: { stroke: '#475569', strokeWidth: 2 },
      }}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      minZoom={0.05}
      maxZoom={2}
    >
      <Controls showInteractive={false} />
      <MiniMap
        style={{ border: '1px solid var(--ls-color-border)', borderRadius: 8 }}
        maskColor="rgba(0, 0, 0, 0.08)"
        nodeColor="var(--ls-color-muted-border)"
      />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--ls-color-muted-border)" />
    </ReactFlow>
  );
}

export function OrgChartPage() {
  const router = useRouter();
  const auth = useAuth();
  const { hasFeature, loading: featuresLoading } = useOrgFeatures();
  const { has } = usePermissions();
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();

  const [chartData, setChartData] = React.useState<OrgChartData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewScope, setViewScope] = React.useState<'location' | 'org'>('location');
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null);
  const [clickPosition, setClickPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isConfigOpen, setIsConfigOpen] = React.useState(false);
  const [configInitialTab, setConfigInitialTab] = React.useState<number | undefined>(undefined);
  const [focusGroupId, setFocusGroupId] = React.useState<string | null>(null);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  const featureEnabled = hasFeature(F.ORG_CHART);
  const canView = isLevelsetAdmin || has(P.OC_VIEW);
  const canEdit = isLevelsetAdmin || has(P.OC_EDIT);

  // Fetch org chart data
  const fetchData = React.useCallback(async () => {
    if (!selectedLocationId) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      const params = new URLSearchParams({
        location_id: selectedLocationId,
      });
      if (viewScope === 'org') {
        params.set('scope', 'org');
      }

      const response = await fetch(`/api/org-chart?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const data: OrgChartData = await response.json();
      setChartData(data);
    } catch (err: any) {
      console.error('Failed to fetch org chart data:', err);
      setError(err.message || 'Failed to load org chart');
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId, viewScope]);

  React.useEffect(() => {
    if (auth.isLoaded && auth.authUser && canView) {
      fetchData();
    }
  }, [auth.isLoaded, auth.authUser, canView, fetchData]);

  const handleSelectEmployee = React.useCallback((id: string, position: { x: number; y: number }) => {
    setSelectedEmployeeId(id);
    setClickPosition(position);
  }, []);

  const handleClickGroup = React.useCallback((groupId: string) => {
    if (!canEdit) return;
    setFocusGroupId(groupId);
    setConfigInitialTab(1); // Role Groups tab
    setIsConfigOpen(true);
  }, [canEdit]);

  // Optimistic update: patch a single employee's fields without full reload
  const updateEmployeeLocally = React.useCallback((employeeId: string, updates: Partial<OrgChartEmployee>) => {
    setChartData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        employees: prev.employees.map((e) =>
          e.id === employeeId ? { ...e, ...updates } : e
        ),
      };
    });
  }, []);

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  // Wait for features to load before gating.
  // Also wait for location context — without it the provider returns an empty
  // feature set (loading=false but no data), which flashes "Feature Not Available".
  if (featuresLoading || (!selectedLocationOrgId && !isLevelsetAdmin)) {
    return <AuthLoadingScreen />;
  }

  if (!featureEnabled) {
    return (
      <div className={sty.pageContainer}>
        <Head><title>Levelset | Org Chart</title></Head>
        <MenuNavigation fullWidth />
        <div className={sty.emptyState}>
          <AccountTreeOutlinedIcon className={sty.emptyIcon} />
          <p className={sty.emptyTitle}>Feature Not Available</p>
          <p className={sty.emptyDescription}>
            Org Chart is not enabled for your organization. Contact your Levelset administrator to enable this feature.
          </p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className={sty.pageContainer}>
        <Head><title>Levelset | Org Chart</title></Head>
        <MenuNavigation fullWidth />
        <div className={sty.emptyState}>
          <p className={sty.emptyTitle}>Access Denied</p>
          <p className={sty.emptyDescription}>
            You don&apos;t have permission to view the org chart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={sty.pageContainer}>
      <Head><title>Levelset | Org Chart</title></Head>
      <MenuNavigation fullWidth />

      <div className={sty.header}>
        <div className={sty.headerLeft}>
          <h1 className={sty.pageTitle}>Org Chart</h1>
          <div className={sty.scopeToggle}>
            <button
              className={classNames(sty.scopeBtn, viewScope === 'location' && sty.scopeBtnActive)}
              onClick={() => setViewScope('location')}
            >
              This Location
            </button>
            <button
              className={classNames(sty.scopeBtn, viewScope === 'org' && sty.scopeBtnActive)}
              onClick={() => setViewScope('org')}
            >
              Organization
            </button>
          </div>
        </div>
        <div className={sty.headerRight}>
          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<SettingsOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={() => {
                setConfigInitialTab(undefined);
                setFocusGroupId(null);
                setIsConfigOpen(true);
              }}
              sx={{
                fontFamily: 'var(--ls-font-body)',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 'var(--ls-radius-md)',
                boxShadow: 'none',
                borderColor: 'var(--ls-color-brand-border)',
                color: 'var(--ls-color-brand)',
                '&:hover': {
                  borderColor: 'var(--ls-color-brand)',
                  backgroundColor: 'var(--ls-color-brand-soft)',
                },
              }}
            >
              Configure
            </Button>
          )}
        </div>
      </div>

      {/* Mobile fallback */}
      <div className={sty.mobileMessage}>
        <AccountTreeOutlinedIcon sx={{ fontSize: 48, color: 'var(--ls-color-brand)', opacity: 0.4 }} />
        <p className={sty.emptyTitle}>Org Chart</p>
        <p className={sty.emptyDescription}>
          The org chart is best viewed on a desktop browser for the full interactive experience.
        </p>
      </div>

      {/* Canvas */}
      <div className={sty.canvasContainer}>
        {loading && (
          <div className={sty.emptyState}>
            <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
          </div>
        )}

        {error && (
          <div className={sty.emptyState}>
            <p className={sty.emptyTitle}>Failed to Load</p>
            <p className={sty.emptyDescription}>{error}</p>
            <Button
              variant="outlined"
              onClick={fetchData}
              sx={{
                mt: 1,
                fontFamily: 'var(--ls-font-body)',
                textTransform: 'none',
                borderColor: 'var(--ls-color-brand-border)',
                color: 'var(--ls-color-brand)',
                '&:hover': {
                  borderColor: 'var(--ls-color-brand)',
                  backgroundColor: 'var(--ls-color-brand-soft)',
                },
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && chartData && chartData.employees.length === 0 && (
          <div className={sty.emptyState}>
            <AccountTreeOutlinedIcon className={sty.emptyIcon} />
            <p className={sty.emptyTitle}>No Employees Found</p>
            <p className={sty.emptyDescription}>
              Add employees to the roster to see them on the org chart.
            </p>
          </div>
        )}

        {!loading && !error && chartData && chartData.employees.length > 0 && (
          <ReactFlowProvider>
            <OrgChartCanvas
              chartData={chartData}
              onSelectEmployee={handleSelectEmployee}
              onClickGroup={canEdit ? handleClickGroup : undefined}
            />
          </ReactFlowProvider>
        )}
      </div>

      {/* Detail Panel */}
      {chartData && (
        <EmployeeDetailPanel
          employeeId={selectedEmployeeId}
          chartData={chartData}
          onClose={() => { setSelectedEmployeeId(null); setClickPosition(null); }}
          canEdit={canEdit}
          canViewPay={isLevelsetAdmin || has(P.ROSTER_MANAGE_PAY)}
          onUpdate={fetchData}
          onUpdateEmployee={updateEmployeeLocally}
          position={clickPosition}
          locationId={selectedLocationId || ''}
        />
      )}

      {/* Config Panel */}
      {chartData && (
        <ConfigPanel
          open={isConfigOpen}
          onClose={() => {
            setIsConfigOpen(false);
            setConfigInitialTab(undefined);
            setFocusGroupId(null);
          }}
          chartData={chartData}
          locationId={selectedLocationId || ''}
          onUpdate={fetchData}
          initialTab={configInitialTab}
          focusGroupId={focusGroupId}
        />
      )}
    </div>
  );
}
