import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { styled } from '@mui/material/styles';
import { Button, Box, Skeleton, TextField, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { DataGridPro, type GridColDef, type GridRowParams } from '@mui/x-data-grid-pro';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import sty from './OperationalExcellencePage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { DashboardMetricCard } from '@/components/CodeComponents/DashboardMetricCard';
import { EmployeeModal } from '@/components/CodeComponents/EmployeeModal';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { createSupabaseClient } from '@/util/supabase/component';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const PILLAR_COLORS: Record<number, string> = {
  1: '#12b76a', // Great Food — green
  2: '#f59e0b', // Quick & Accurate — amber
  3: '#8b5cf6', // Creating Moments — purple
  4: '#3b82f6', // Caring Interactions — blue
  5: '#ec4899', // Inviting Atmosphere — pink
};

type DateRange = 'mtd' | 'qtd' | '30d' | '90d' | 'custom';

/** Least-squares linear regression. Returns slope & intercept, or null if < 2 points. */
function linearRegression(values: (number | null | undefined)[]) {
  const pts: [number, number][] = [];
  values.forEach((v, i) => { if (v != null) pts.push([i, v]); });
  if (pts.length < 2) return null;
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p[0], 0);
  const sy = pts.reduce((s, p) => s + p[1], 0);
  const sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const sx2 = pts.reduce((s, p) => s + p[0] * p[0], 0);
  const denom = n * sx2 - sx * sx;
  if (denom === 0) return null;
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b };
}

// ------------------------------------------------------------------
// Styled Components (copied from PositionalRatings.tsx — single source of truth)
// ------------------------------------------------------------------

const levelsetGreen = 'var(--ls-color-brand)';
const fohColor = '#006391';
const bohColor = '#ffcc5b';
const fohColorLight = '#eaf9ff';
const bohColorLight = '#fffcf0';
const fohColorLightDark = '#0d2d3d'; // dark mode FOH light
const bohColorLightDark = '#2d2a0d'; // dark mode BOH light

const DateRangeContainer = styled(Box)({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
});

const PillButton = styled(Button)<{ selected?: boolean }>(({ selected }) => ({
  fontFamily,
  fontSize: 13,
  fontWeight: 600,
  padding: '6px 16px',
  borderRadius: 20,
  textTransform: 'none',
  border: 'none',
  boxShadow: 'none',
  backgroundColor: selected ? levelsetGreen : 'var(--ls-color-muted-soft)',
  color: selected ? 'var(--ls-color-bg-container) !important' : 'var(--ls-color-muted)',
  '&:hover': {
    backgroundColor: selected ? levelsetGreen : 'var(--ls-color-muted-border)',
    boxShadow: 'none',
    color: selected ? 'var(--ls-color-bg-container) !important' : 'var(--ls-color-muted)',
  },
}));

const AreaPill = styled(Box)<{ selected?: boolean; area: 'FOH' | 'BOH'; darkMode?: boolean }>(({ selected, area, darkMode }) => {
  const baseColor = area === 'FOH' ? fohColor : bohColor;
  const lightColor = area === 'FOH'
    ? (darkMode ? fohColorLightDark : fohColorLight)
    : (darkMode ? bohColorLightDark : bohColorLight);

  return {
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: selected ? baseColor : lightColor,
    color: selected ? 'var(--ls-color-bg-container)' : baseColor,
    border: `2px solid ${baseColor}`,
    '&:hover': {
      opacity: 0.9,
    },
  };
});

// Custom DatePicker TextField - matching PE table style
const CustomDateTextField = React.forwardRef((props: any, ref: any) => (
  <TextField
    {...props}
    ref={ref}
    size="small"
    sx={{
      width: 130,
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 11,
        padding: '8px 10px',
        color: 'var(--ls-color-text-primary)',
      },
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 11,
        color: 'var(--ls-color-text-secondary)',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-muted-border)',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--ls-color-border)',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      '& .MuiIconButton-root': {
        padding: '6px',
        '& .MuiSvgIcon-root': {
          fontSize: '1rem',
        },
      },
      ...props.sx,
    }}
  />
));

const datePickerPopperSx = {
  '& .MuiPaper-root': { fontFamily },
  '& .MuiTypography-root': { fontFamily, fontSize: 11 },
  '& .MuiPickersDay-root': {
    fontFamily, fontSize: 11,
    '&.Mui-selected': {
      backgroundColor: `${levelsetGreen} !important`,
      color: 'var(--ls-color-bg-container) !important',
      '&:hover': { backgroundColor: `${levelsetGreen} !important` },
      '&:focus': { backgroundColor: `${levelsetGreen} !important` },
    },
    '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.04)' },
    '&:focus': { backgroundColor: 'rgba(49, 102, 74, 0.12)' },
  },
  '& .MuiPickersCalendarHeader-label': { fontFamily, fontSize: 12 },
  '& .MuiDayCalendar-weekDayLabel': { fontFamily, fontSize: 10 },
  '& .MuiButtonBase-root': { fontFamily, fontSize: 11, color: levelsetGreen },
  '& .MuiIconButton-root': {
    color: `${levelsetGreen} !important`,
    '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.04)' },
    '&:focus': { backgroundColor: 'rgba(49, 102, 74, 0.12)' },
  },
  '& .MuiPickersYear-yearButton': {
    fontFamily, fontSize: 12,
    '&.Mui-selected': {
      backgroundColor: `${levelsetGreen} !important`,
      color: 'var(--ls-color-bg-container) !important',
      '&:hover': { backgroundColor: `${levelsetGreen} !important` },
      '&:focus': { backgroundColor: `${levelsetGreen} !important` },
    },
    '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.04)' },
  },
  '& .MuiDialogActions-root .MuiButton-root': {
    fontFamily, fontSize: 12, color: levelsetGreen, textTransform: 'none',
  },
  '& .MuiButton-root': { color: `${levelsetGreen} !important`, fontFamily },
  '& .MuiPickersArrowSwitcher-button': { color: `${levelsetGreen} !important` },
  '& .MuiPickersCalendarHeader-switchViewButton': { color: `${levelsetGreen} !important` },
};

// ------------------------------------------------------------------
// Types (matching API response)
// ------------------------------------------------------------------

interface PillarScore {
  id: string;
  name: string;
  weight: number;
  displayOrder: number;
  score: number;
  priorScore: number;
  change: number;
  percentChange: number;
}

interface EmployeePositionDetail {
  positionName: string;
  pillarScores: Record<string, number>;
  ratingCount: number;
}

interface EmployeeScore {
  employeeId: string;
  name: string;
  overallScore: number;
  priorOverallScore: number | null;
  change: number | null;
  pillarScores: Record<string, number>;
  priorPillarScores: Record<string, number>;
  positions: EmployeePositionDetail[];
  ratingCount: number;
  priorRatingCount: number;
}

interface TrendPoint {
  date: string;
  pillarScores: Record<string, number | null>;
  overallScore: number;
}

interface OEData {
  pillars: PillarScore[];
  overall: {
    score: number;
    priorScore: number;
    change: number;
    percentChange: number;
  };
  employees: EmployeeScore[];
  trends: TrendPoint[];
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export function OperationalExcellencePage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId } = useLocationContext();
  const { hasFeature } = useOrgFeatures();
  const { resolvedTheme } = useTheme();

  // Dark-mode aware chart colors
  const chartGridColor = resolvedTheme === 'dark' ? '#30363d' : '#e9eaeb';
  const chartTickColor = resolvedTheme === 'dark' ? '#8b949e' : '#535862';
  const chartLineColor = resolvedTheme === 'dark' ? '#e6edf3' : '#181d27';

  // Date range state
  const [dateRange, setDateRange] = React.useState<DateRange>('90d');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);

  // FOH/BOH filter
  const [showFOH, setShowFOH] = React.useState(true);
  const [showBOH, setShowBOH] = React.useState(true);

  // Pillar filter
  const [selectedPillarId, setSelectedPillarId] = React.useState<string | null>(null);

  // Data
  const [data, setData] = React.useState<OEData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Employee modal
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<any>(null);

  // Pillar Descriptions modal
  const [descriptionsModalOpen, setDescriptionsModalOpen] = React.useState(false);
  const [pillarDescriptions, setPillarDescriptions] = React.useState<
    Array<{ id: string; name: string; weight: number; description: string; display_order: number }>
  >([]);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch pillar descriptions for the modal
  React.useEffect(() => {
    if (!descriptionsModalOpen) return;
    let cancelled = false;
    async function fetchDescriptions() {
      const { data, error } = await supabase
        .from('oe_pillars')
        .select('id, name, weight, description, display_order')
        .order('display_order');
      if (!cancelled && data && !error) {
        setPillarDescriptions(data);
      }
    }
    fetchDescriptions();
    return () => { cancelled = true; };
  }, [descriptionsModalOpen, supabase]);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Compute date range from preset
  const getDateRange = React.useCallback((preset: DateRange): [Date, Date] => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    switch (preset) {
      case 'mtd':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'qtd': {
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      }
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 90);
    }
    return [start, end];
  }, []);

  // Initialize dates
  React.useEffect(() => {
    if (!startDate || !endDate) {
      const [s, e] = getDateRange('90d');
      setStartDate(s);
      setEndDate(e);
    }
  }, [getDateRange, startDate, endDate]);

  // Fetch data when filters change
  React.useEffect(() => {
    if (!selectedLocationId || !startDate || !endDate) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          location_id: selectedLocationId,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          show_foh: String(showFOH),
          show_boh: String(showBOH),
        });

        const res = await fetch(`/api/operational-excellence?${params}`);
        if (!res.ok) throw new Error('Failed to fetch OE data');

        const json: OEData = await res.json();
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) {
          console.error('[OE Page] Error:', err);
          setError(err.message || 'Failed to load data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [selectedLocationId, startDate, endDate, showFOH, showBOH]);

  // Date range handlers
  const handleDatePreset = (preset: DateRange) => {
    setDateRange(preset);
    const [s, e] = getDateRange(preset);
    setStartDate(s);
    setEndDate(e);
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    setDateRange('custom');
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    setDateRange('custom');
  };

  // Employee modal handlers
  const handleEmployeeClick = (employeeId: string, employeeName: string) => {
    const [firstName, ...lastParts] = employeeName.split(' ');
    setSelectedEmployee({
      id: employeeId,
      first_name: firstName,
      last_name: lastParts.join(' '),
      full_name: employeeName,
      role: '',
      org_id: '',
      location_id: selectedLocationId || '',
      active: true,
    });
    setModalOpen(true);
  };

  // Show loading screen while auth is loading
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  const isOEEnabled = hasFeature(F.OPERATIONAL_EXCELLENCE);

  // ------------------------------------------------------------------
  // Build DataGrid columns
  // ------------------------------------------------------------------
  const pillars = data?.pillars || [];
  const pillarColorMap: Record<string, string> = {};
  for (const p of pillars) {
    pillarColorMap[p.id] = PILLAR_COLORS[p.displayOrder] || '#6b7280';
  }

  const columns: GridColDef[] = [
    {
      field: 'rank',
      headerName: '#',
      width: 50,
      sortable: false,
      renderCell: (params) => (
        <span style={{ fontWeight: 700, color: 'var(--ls-color-text-caption)', fontFamily }}>{params.value}</span>
      ),
    },
    {
      field: 'name',
      headerName: 'Team Member',
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <span
          className={sty.employeeNameLink}
          onClick={(e) => {
            e.stopPropagation();
            handleEmployeeClick(params.row.employeeId, params.value);
          }}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'overallScore',
      headerName: 'OE Score',
      width: 100,
      renderCell: (params) => (
        <span style={{ fontWeight: 700, fontFamily, color: 'var(--ls-color-text-primary)' }}>{params.value.toFixed(1)}</span>
      ),
    },
    ...pillars.map((p) => ({
      field: `pillar_${p.id}`,
      headerName: p.name,
      width: 155,
      renderCell: (params: any) => {
        const val = params.value as number;
        const isSelected = selectedPillarId === p.id;
        return (
          <span style={{
            fontFamily,
            fontWeight: isSelected ? 700 : 500,
            color: isSelected ? pillarColorMap[p.id] : 'var(--ls-color-text-caption)',
          }}>
            {val != null ? val.toFixed(1) : '—'}
          </span>
        );
      },
    })),
    {
      field: 'change',
      headerName: 'Change',
      width: 90,
      renderCell: (params) => {
        const val = params.value as number | null;
        if (val === null || val === undefined) {
          return <span style={{ fontFamily, color: 'var(--ls-color-text-caption)' }}>—</span>;
        }
        const isNeg = val < 0;
        return (
          <span style={{
            fontFamily,
            fontWeight: 600,
            color: val === 0 ? 'var(--ls-color-text-caption)' : isNeg ? 'var(--ls-color-destructive-medium)' : 'var(--ls-color-success-vivid)',
          }}>
            {val > 0 ? '+' : ''}{val.toFixed(1)}
          </span>
        );
      },
    },
    {
      field: 'ratingCount',
      headerName: 'Ratings',
      width: 80,
      renderCell: (params) => (
        <span style={{ fontFamily, color: 'var(--ls-color-text-caption)' }}>{params.value}</span>
      ),
    },
  ];

  // Build rows
  const rows = (data?.employees || []).map((emp, idx) => {
    const row: any = {
      id: emp.employeeId,
      rank: idx + 1,
      employeeId: emp.employeeId,
      name: emp.name,
      overallScore: emp.overallScore,
      change: emp.change,
      ratingCount: emp.ratingCount,
    };
    for (const p of pillars) {
      row[`pillar_${p.id}`] = emp.pillarScores[p.id] ?? null;
    }
    return row;
  });

  // Build detail panel for expandable rows
  const getDetailPanelContent = React.useCallback(
    (params: GridRowParams) => {
      const emp = data?.employees.find((e) => e.employeeId === params.row.employeeId);
      if (!emp || emp.positions.length === 0) {
        return <div className={sty.detailPanel} style={{ color: 'var(--ls-color-text-caption)', fontFamily }}>No position data available</div>;
      }

      return (
        <div className={sty.detailPanel}>
          {emp.positions.map((pos, posIdx) => (
            <div
              key={pos.positionName}
              className={sty.detailRow}
              style={posIdx < emp.positions.length - 1 ? { borderBottom: '1px solid var(--ls-color-muted-border)' } : undefined}
            >
              <div className={sty.detailPositionCell}>{pos.positionName}</div>
              {pillars.map((p) => {
                const isSelected = selectedPillarId === p.id;
                return (
                  <div
                    key={p.id}
                    className={sty.detailPillarCell}
                    style={isSelected ? { fontWeight: 700, color: pillarColorMap[p.id] } : undefined}
                  >
                    {pos.pillarScores[p.id] != null ? pos.pillarScores[p.id].toFixed(1) : '—'}
                  </div>
                );
              })}
              <div className={sty.detailChangeCell} />
              <div className={sty.detailRatingsCell}>{pos.ratingCount}</div>
            </div>
          ))}
        </div>
      );
    },
    [data?.employees, pillars, selectedPillarId, pillarColorMap]
  );

  // Build chart data — raw daily scores (for scatter) + 7-day rolling averages (for MA lines) + OE weighted avg
  const chartData = (() => {
    const trends = data?.trends || [];
    if (trends.length === 0) return [];

    return trends.map((t) => {
      const point: any = {
        date: new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };

      const currentDate = new Date(t.date + 'T00:00:00');
      const windowStart = new Date(currentDate);
      windowStart.setDate(windowStart.getDate() - 6); // 7 calendar days

      for (const p of pillars) {
        // Raw daily score (scatter dots when pillar selected)
        point[`raw_${p.id}`] = t.pillarScores[p.id];

        // 7-day rolling average (MA line)
        const windowValues: number[] = [];
        for (const other of trends) {
          const otherDate = new Date(other.date + 'T00:00:00');
          if (otherDate >= windowStart && otherDate <= currentDate) {
            const val = other.pillarScores[p.id];
            if (val !== null && val !== undefined) {
              windowValues.push(val);
            }
          }
        }
        point[`ma_${p.id}`] = windowValues.length > 0
          ? Math.round((windowValues.reduce((a, b) => a + b, 0) / windowValues.length) * 10) / 10
          : null;
      }

      // OE line — weighted average of pillar MAs (not double-rolling)
      let oeWeightedSum = 0;
      let oeTotalWeight = 0;
      for (const p of pillars) {
        const maVal = point[`ma_${p.id}`];
        if (maVal !== null && maVal !== undefined) {
          oeWeightedSum += maVal * p.weight;
          oeTotalWeight += p.weight;
        }
      }
      point.ma_oe = oeTotalWeight > 0
        ? Math.round((oeWeightedSum / oeTotalWeight) * 10) / 10
        : null;

      return point;
    });
  })();

  // Compute Y-axis min from chart data (don't start from 0)
  const chartYMin = (() => {
    if (chartData.length === 0) return 0;
    const allValues: number[] = [];
    for (const d of chartData) {
      for (const p of pillars) {
        const v = d[`ma_${p.id}`];
        if (v != null) allValues.push(v);
      }
      if (d.ma_oe != null) allValues.push(d.ma_oe);
    }
    if (allValues.length === 0) return 0;
    return Math.max(0, Math.floor(Math.min(...allValues) - 5));
  })();

  // Compute linear trendline for the active metric (selected pillar or OE overall)
  const trendlineKey = selectedPillarId ? `ma_${selectedPillarId}` : 'ma_oe';
  const trendlineColor = selectedPillarId ? (pillarColorMap[selectedPillarId] || '#6b7280') : chartLineColor;
  const trendlineReg = React.useMemo(() => {
    if (chartData.length < 2) return null;
    return linearRegression(chartData.map((d: any) => d[trendlineKey]));
  }, [chartData, trendlineKey]);

  // Inject trendline values into chartData (reuses same array identity per render)
  const chartDataWithTrend = React.useMemo(() => {
    if (!trendlineReg) return chartData;
    return chartData.map((d: any, i: number) => ({
      ...d,
      trendline: Math.round((trendlineReg.m * i + trendlineReg.b) * 10) / 10,
    }));
  }, [chartData, trendlineReg]);

  // Build improvers list — only include employees who had prior period data
  const getImprovers = () => {
    return (data?.employees || [])
      .filter((emp) => emp.priorRatingCount > 0) // Must have prior data for a meaningful change
      .map((emp) => {
        let currentScore: number;
        let priorScore: number;
        if (selectedPillarId) {
          currentScore = emp.pillarScores[selectedPillarId] ?? 0;
          priorScore = emp.priorPillarScores[selectedPillarId] ?? 0;
        } else {
          currentScore = emp.overallScore;
          priorScore = emp.priorOverallScore ?? 0;
        }
        return {
          employeeId: emp.employeeId,
          name: emp.name,
          change: currentScore - priorScore,
          currentScore,
        };
      })
      .filter((e) => e.change > 0)
      .sort((a, b) => b.change - a.change)
      .slice(0, 5);
  };

  const improvers = data ? getImprovers() : [];
  const selectedPillarName = selectedPillarId
    ? pillars.find((p) => p.id === selectedPillarId)?.name || 'Pillar'
    : 'Overall';

  // Helper to build customMetric prop for DashboardMetricCard
  const buildCustomMetric = (title: string, score: number, change: number, percentChange: number) => ({
    title,
    percentChange,
    isNegativeChange: change < 0,
    primaryValue: score.toFixed(1),
    valueSuffix: ' /100',
    changeText: `${change >= 0 ? '+' : ''}${change.toFixed(1)} pts`,
    periodLabel: 'vs prior period',
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Head>
        <title key="title">Levelset | Operational Excellence</title>
        <meta key="og:title" property="og:title" content="Levelset | Operational Excellence" />
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

        <div className={sty.contentWrapper}>
          {/* Page Header — inside contentWrapper like scheduling toolbar inside scheduleContainer */}
          {isOEEnabled && (
            <div className={sty.pageHeader}>
              <h1 className={sty.pageTitle}>Operational Excellence</h1>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* FOH/BOH toggles */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <AreaPill
                    selected={showFOH}
                    area="FOH"
                    darkMode={resolvedTheme === 'dark'}
                    onClick={() => setShowFOH(!showFOH)}
                  >
                    FOH
                  </AreaPill>
                  <AreaPill
                    selected={showBOH}
                    area="BOH"
                    darkMode={resolvedTheme === 'dark'}
                    onClick={() => setShowBOH(!showBOH)}
                  >
                    BOH
                  </AreaPill>
                </Box>

                {/* Divider */}
                <Box sx={{
                  width: '1px',
                  height: '24px',
                  backgroundColor: 'var(--ls-color-border)',
                  mx: 1,
                }} />

                <DateRangeContainer>
                  <PillButton selected={dateRange === 'mtd'} onClick={() => handleDatePreset('mtd')}>MTD</PillButton>
                  <PillButton selected={dateRange === 'qtd'} onClick={() => handleDatePreset('qtd')}>QTD</PillButton>
                  <PillButton selected={dateRange === '30d'} onClick={() => handleDatePreset('30d')}>Last 30 Days</PillButton>
                  <PillButton selected={dateRange === '90d'} onClick={() => handleDatePreset('90d')}>Last 90 Days</PillButton>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    format="M/d/yyyy"
                    enableAccessibleFieldDOMStructure={false}
                    slots={{ textField: CustomDateTextField }}
                    slotProps={{
                      textField: {
                        sx: {
                          '& .MuiInputLabel-root': {
                            fontFamily: `${fontFamily} !important`,
                            fontSize: '16px !important',
                            color: 'var(--ls-color-text-secondary) !important',
                            '&.Mui-focused': { color: `${levelsetGreen} !important` },
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'var(--ls-color-muted-border) !important' },
                            '&:hover fieldset': { borderColor: 'var(--ls-color-border) !important' },
                            '&.Mui-focused fieldset': { borderColor: `${levelsetGreen} !important`, borderWidth: '2px !important' },
                          },
                          '& .MuiInputAdornment-root .MuiIconButton-root': {
                            color: 'var(--ls-color-muted) !important',
                            '&:hover': { color: `${levelsetGreen} !important`, backgroundColor: 'rgba(49, 102, 74, 0.04) !important' },
                          },
                        },
                      },
                      popper: { sx: datePickerPopperSx },
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    format="M/d/yyyy"
                    enableAccessibleFieldDOMStructure={false}
                    slots={{ textField: CustomDateTextField }}
                    slotProps={{
                      textField: {
                        sx: {
                          '& .MuiInputLabel-root': {
                            fontFamily: `${fontFamily} !important`,
                            fontSize: '16px !important',
                            color: 'var(--ls-color-text-secondary) !important',
                            '&.Mui-focused': { color: `${levelsetGreen} !important` },
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'var(--ls-color-muted-border) !important' },
                            '&:hover fieldset': { borderColor: 'var(--ls-color-border) !important' },
                            '&.Mui-focused fieldset': { borderColor: `${levelsetGreen} !important`, borderWidth: '2px !important' },
                          },
                          '& .MuiInputAdornment-root .MuiIconButton-root': {
                            color: 'var(--ls-color-muted) !important',
                            '&:hover': { color: `${levelsetGreen} !important`, backgroundColor: 'rgba(49, 102, 74, 0.04) !important' },
                          },
                        },
                      },
                      popper: { sx: datePickerPopperSx },
                    }}
                  />
                </DateRangeContainer>
              </Box>
            </div>
          )}
            {!isOEEnabled ? (
              <div className={sty.contentInner}>
                <div className={sty.comingSoonContainer}>
                  <StarOutlinedIcon className={sty.comingSoonIcon} />
                  <h2 className={sty.comingSoonTitle}>Operational Excellence</h2>
                  <p className={sty.comingSoonDescription}>
                    Track and analyze operational excellence metrics across your team. This feature is currently being developed.
                  </p>
                  <span className={sty.comingSoonBadge}>Coming Soon</span>
                </div>
              </div>
            ) : (
              <div className={sty.contentInner}>
                {/* Score Cards — OE card large on left, pillar cards grid on right */}
                <div className={sty.scoreCardsSection}>
                  {loading && !data ? (
                    <>
                      <div className={sty.oeCardCell}>
                        <Skeleton variant="rounded" animation="wave" sx={{ height: '100%', minHeight: 200, borderRadius: '16px' }} />
                      </div>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" animation="wave" sx={{ height: 120, borderRadius: '16px' }} />
                      ))}
                    </>
                  ) : (
                    <>
                      <div className={sty.oeCardCell}>
                        <DashboardMetricCard
                          variant="positional-excellence"
                          size="large"
                          selected={selectedPillarId === null}
                          onClick={() => setSelectedPillarId(null)}
                          customMetric={buildCustomMetric(
                            'Operational Excellence',
                            data?.overall.score ?? 0,
                            data?.overall.change ?? 0,
                            data?.overall.percentChange ?? 0,
                          )}
                        />
                      </div>
                      {pillars.map((p) => (
                        <DashboardMetricCard
                          key={p.id}
                          className={sty.pillarCard}
                          variant="positional-excellence"
                          titleBadge={`${p.weight}%`}
                          selected={selectedPillarId === p.id}
                          onClick={() => setSelectedPillarId(selectedPillarId === p.id ? null : p.id)}
                          customMetric={buildCustomMetric(p.name, p.score, p.change, p.percentChange)}
                        />
                      ))}
                      <button
                        className={sty.pillarDescriptionsBtn}
                        onClick={() => setDescriptionsModalOpen(true)}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                        Pillar Descriptions
                      </button>
                    </>
                  )}
                </div>

                {/* Bottom Section */}
                {error ? (
                  <div className={sty.emptyState}>{error}</div>
                ) : (
                  <div className={sty.bottomSection}>
                    {/* Left: Employee Table */}
                    <div className={sty.leftColumn}>
                      <div className={sty.dataGridCard}>
                        <DataGridPro
                          rows={rows}
                          columns={columns}
                          loading={loading}
                          getDetailPanelContent={getDetailPanelContent}
                          getDetailPanelHeight={() => 'auto'}
                          initialState={{
                            sorting: { sortModel: [{ field: 'overallScore', sort: 'desc' }] },
                          }}
                          pageSizeOptions={[25, 50, 100]}
                          disableRowSelectionOnClick
                          autoHeight
                          sx={{
                            border: 'none',
                            fontFamily,
                            '& .MuiDataGrid-columnHeaders': {
                              backgroundColor: 'var(--ls-color-bg-surface)',
                              borderBottom: '1px solid var(--ls-color-muted-border)',
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                              fontFamily,
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--ls-color-text-caption)',
                            },
                            '& .MuiDataGrid-cell': {
                              fontFamily,
                              fontSize: 14,
                              borderBottom: '1px solid var(--ls-color-muted-soft)',
                            },
                            '& .MuiDataGrid-detailPanel': {
                              overflow: 'visible',
                            },
                            '& .MuiDataGrid-row:hover': {
                              backgroundColor: 'var(--ls-color-bg-surface)',
                            },
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Chart + Improvers */}
                    <div className={sty.rightColumn}>
                      {/* Trend Chart — 7-day MA lines + scatter dots for selected pillar */}
                      <div className={sty.chartCard}>
                        <div className={sty.chartHeader}>
                          <h3 className={sty.chartTitle}>Pillar Trends</h3>
                          <span className={sty.chartSubtitle}>7-day moving average</span>
                        </div>
                        {loading ? (
                          <Skeleton variant="rounded" animation="wave" sx={{ height: 280, borderRadius: '8px' }} />
                        ) : chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={chartDataWithTrend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fontFamily, fill: chartTickColor }}
                                tickLine={false}
                                axisLine={{ stroke: chartGridColor }}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                domain={[chartYMin, 100]}
                                tick={{ fontSize: 12, fontFamily, fill: chartTickColor }}
                                tickLine={false}
                                axisLine={{ stroke: chartGridColor }}
                              />
                              <Tooltip
                                contentStyle={{
                                  fontFamily,
                                  fontSize: 13,
                                  borderRadius: 8,
                                  border: `1px solid ${chartGridColor}`,
                                  boxShadow: '0 4px 12px var(--ls-color-shadow-lg)',
                                  backgroundColor: resolvedTheme === 'dark' ? '#161b22' : '#fff',
                                  color: chartLineColor,
                                }}
                                cursor={{ stroke: resolvedTheme === 'dark' ? '#30363d' : '#fff' }}
                              />
                              <Legend
                                wrapperStyle={{ fontFamily, fontSize: 12 }}
                              />
                              {/* OE weighted average line — bold, always visible */}
                              <Line
                                key="ma_oe"
                                type="monotone"
                                dataKey="ma_oe"
                                name="OE Score"
                                stroke={chartLineColor}
                                strokeWidth={selectedPillarId ? 2 : 3.5}
                                strokeOpacity={selectedPillarId ? 0.3 : 1}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 2, fill: chartLineColor }}
                                connectNulls={false}
                              />
                              {/* 7-day MA lines for all pillars */}
                              {pillars.map((p) => (
                                <Line
                                  key={`ma_${p.id}`}
                                  type="monotone"
                                  dataKey={`ma_${p.id}`}
                                  name={p.name}
                                  stroke={pillarColorMap[p.id]}
                                  strokeWidth={selectedPillarId === p.id ? 3 : selectedPillarId ? 1 : 1.5}
                                  strokeOpacity={selectedPillarId && selectedPillarId !== p.id ? 0.2 : 0.8}
                                  dot={false}
                                  activeDot={{ r: 4, strokeWidth: 2 }}
                                  connectNulls={false}
                                />
                              ))}
                              {/* Scatter dots for selected pillar — Line with no stroke, only dots */}
                              {selectedPillarId && (
                                <Line
                                  key={`raw_${selectedPillarId}`}
                                  type="monotone"
                                  dataKey={`raw_${selectedPillarId}`}
                                  name={`${pillars.find(p => p.id === selectedPillarId)?.name || ''} (daily)`}
                                  stroke="transparent"
                                  strokeWidth={0}
                                  dot={{
                                    fill: pillarColorMap[selectedPillarId] || '#6b7280',
                                    fillOpacity: 0.4,
                                    r: 3,
                                    strokeWidth: 0,
                                  }}
                                  activeDot={{
                                    fill: pillarColorMap[selectedPillarId] || '#6b7280',
                                    r: 5,
                                    strokeWidth: 2,
                                    stroke: resolvedTheme === 'dark' ? '#30363d' : '#fff',
                                  }}
                                  connectNulls={false}
                                  legendType="none"
                                />
                              )}
                              {/* Linear trendline for active metric */}
                              {trendlineReg && (
                                <Line
                                  key="trendline"
                                  type="linear"
                                  dataKey="trendline"
                                  name="Trend"
                                  stroke={trendlineColor}
                                  strokeWidth={1.5}
                                  strokeDasharray="6 4"
                                  strokeOpacity={0.5}
                                  dot={false}
                                  activeDot={false}
                                  connectNulls
                                  legendType="none"
                                />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className={sty.emptyState} style={{ minHeight: 200 }}>
                            No trend data available for this period
                          </div>
                        )}
                      </div>

                      {/* Top 5 Improvers */}
                      <div className={sty.improversCard}>
                        <div className={sty.improversHeader}>
                          <h3 className={sty.improversTitle}>Top Improvers</h3>
                          <span className={sty.improversPillarLabel}>{selectedPillarName}</span>
                        </div>
                        {loading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} variant="text" animation="wave" sx={{ height: 36 }} />
                          ))
                        ) : improvers.length > 0 ? (
                          <table className={sty.improversTable}>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th style={{ textAlign: 'right' }}>Change</th>
                                <th style={{ textAlign: 'right' }}>Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {improvers.map((imp, idx) => (
                                <tr key={imp.employeeId}>
                                  <td className={sty.improverRank}>{idx + 1}</td>
                                  <td>
                                    <span
                                      className={sty.improverName}
                                      onClick={() => handleEmployeeClick(imp.employeeId, imp.name)}
                                    >
                                      {imp.name}
                                    </span>
                                  </td>
                                  <td className={sty.improverChange}>+{imp.change.toFixed(1)}</td>
                                  <td className={sty.improverScore}>{imp.currentScore.toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className={sty.emptyState} style={{ padding: '24px 0' }}>
                            No improvers in this period
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Employee Modal */}
      {selectedEmployee && (
        <EmployeeModal
          open={modalOpen}
          employee={selectedEmployee}
          onClose={() => {
            setModalOpen(false);
            setSelectedEmployee(null);
          }}
          locationId={selectedLocationId || ''}
          initialTab="pe"
        />
      )}

      {/* Pillar Descriptions Modal */}
      <Dialog
        open={descriptionsModalOpen}
        onClose={() => setDescriptionsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--ls-color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 2,
          }}
        >
          OE Pillar Descriptions
          <IconButton
            onClick={() => setDescriptionsModalOpen(false)}
            size="small"
            sx={{ color: 'var(--ls-color-muted)' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px !important' }}>
          <p className={sty.modalSubtitle}>
            These pillars align with Chick-fil-A's Winning Hearts Every Day (WHED) strategy. Each pillar maps to a WHED Focus Area and determines its weighted contribution to your overall OE score.
          </p>
          <div className={sty.pillarDescriptionsList}>
            {pillarDescriptions.map((pillar) => (
              <div key={pillar.id} className={sty.pillarDescriptionItem}>
                <div className={sty.pillarDescriptionHeader}>
                  <span className={sty.pillarDescriptionName}>{pillar.name}</span>
                  <span className={sty.pillarDescriptionWeight}>{pillar.weight}%</span>
                </div>
                <p className={sty.pillarDescriptionText}>{pillar.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </LocalizationProvider>
  );
}

export default OperationalExcellencePage;
