import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { styled } from '@mui/material/styles';
import { Button, Box, Skeleton, TextField } from '@mui/material';
import { DataGridPro, type GridColDef, type GridRowParams } from '@mui/x-data-grid-pro';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
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

// ------------------------------------------------------------------
// Styled Components (copied from PositionalRatings.tsx — single source of truth)
// ------------------------------------------------------------------

const levelsetGreen = 'var(--ls-color-brand)';
const fohColor = '#006391';
const bohColor = '#ffcc5b';
const fohColorLight = '#eaf9ff';
const bohColorLight = '#fffcf0';

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
  color: selected ? '#ffffff !important' : 'var(--ls-color-muted)',
  '&:hover': {
    backgroundColor: selected ? levelsetGreen : 'var(--ls-color-muted-border)',
    boxShadow: 'none',
    color: selected ? '#ffffff !important' : 'var(--ls-color-muted)',
  },
}));

const AreaPill = styled(Box)<{ selected?: boolean; area: 'FOH' | 'BOH' }>(({ selected, area }) => {
  const baseColor = area === 'FOH' ? fohColor : bohColor;
  const lightColor = area === 'FOH' ? fohColorLight : bohColorLight;

  return {
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: selected ? baseColor : lightColor,
    color: selected ? '#ffffff' : baseColor,
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
      },
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 11,
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
      color: '#fff !important',
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
      color: '#fff !important',
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
  priorOverallScore: number;
  change: number;
  pillarScores: Record<string, number>;
  priorPillarScores: Record<string, number>;
  positions: EmployeePositionDetail[];
  ratingCount: number;
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
        <span style={{ fontWeight: 700, color: '#535862', fontFamily }}>{params.value}</span>
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
        <span style={{ fontWeight: 700, fontFamily, color: '#181d27' }}>{params.value.toFixed(1)}</span>
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
            color: isSelected ? pillarColorMap[p.id] : '#535862',
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
        const val = params.value as number;
        const isNeg = val < 0;
        return (
          <span style={{
            fontFamily,
            fontWeight: 600,
            color: val === 0 ? '#535862' : isNeg ? '#ad2624' : '#249e6b',
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
        <span style={{ fontFamily, color: '#535862' }}>{params.value}</span>
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
        return <div className={sty.detailPanel} style={{ color: '#535862', fontFamily }}>No position data available</div>;
      }

      const displayPillars = selectedPillarId
        ? pillars.filter((p) => p.id === selectedPillarId)
        : pillars;

      return (
        <div className={sty.detailPanel}>
          <table className={sty.detailTable}>
            <thead>
              <tr>
                <th>Position</th>
                {displayPillars.map((p) => (
                  <th key={p.id} style={{ color: pillarColorMap[p.id] }}>{p.name}</th>
                ))}
                <th>Ratings</th>
              </tr>
            </thead>
            <tbody>
              {emp.positions.map((pos) => (
                <tr key={pos.positionName}>
                  <td style={{ fontWeight: 600 }}>{pos.positionName}</td>
                  {displayPillars.map((p) => (
                    <td key={p.id}>
                      {pos.pillarScores[p.id] != null ? pos.pillarScores[p.id].toFixed(1) : '—'}
                    </td>
                  ))}
                  <td>{pos.ratingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
    [data?.employees, pillars, selectedPillarId, pillarColorMap]
  );

  // Build chart data — null values mean no data for that pillar on that day
  const chartData = (data?.trends || []).map((t) => {
    const point: any = {
      date: new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    for (const p of pillars) {
      point[p.id] = t.pillarScores[p.id]; // null from API = line won't plot
    }
    return point;
  });

  // Build improvers list
  const getImprovers = () => {
    return (data?.employees || [])
      .map((emp) => {
        let currentScore: number;
        let priorScore: number;
        if (selectedPillarId) {
          currentScore = emp.pillarScores[selectedPillarId] ?? 0;
          priorScore = emp.priorPillarScores[selectedPillarId] ?? 0;
        } else {
          currentScore = emp.overallScore;
          priorScore = emp.priorOverallScore;
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
        />

        <div className={sty.contentWrapper}>
          <div className={sty.contentInner}>
            {!isLevelsetAdmin ? (
              <div className={sty.comingSoonContainer}>
                <StarOutlinedIcon className={sty.comingSoonIcon} />
                <h2 className={sty.comingSoonTitle}>Operational Excellence</h2>
                <p className={sty.comingSoonDescription}>
                  Track and analyze operational excellence metrics across your team. This feature is currently being developed.
                </p>
                <span className={sty.comingSoonBadge}>Coming Soon</span>
              </div>
            ) : (
              <>
                {/* Page Header + Date Range */}
                <div className={sty.pageHeader}>
                  <h1 className={sty.pageTitle}>Operational Excellence</h1>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* FOH/BOH toggles */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <AreaPill
                        selected={showFOH}
                        area="FOH"
                        onClick={() => setShowFOH(!showFOH)}
                      >
                        FOH
                      </AreaPill>
                      <AreaPill
                        selected={showBOH}
                        area="BOH"
                        onClick={() => setShowBOH(!showBOH)}
                      >
                        BOH
                      </AreaPill>
                    </Box>

                    {/* Divider */}
                    <Box sx={{
                      width: '1px',
                      height: '24px',
                      backgroundColor: 'rgba(0, 0, 0, 0.23)',
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
                              color: 'rgba(0, 0, 0, 0.6) !important',
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
                              color: 'rgba(0, 0, 0, 0.6) !important',
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
                          variant="positional-excellence"
                          titleBadge={`${p.weight}%`}
                          selected={selectedPillarId === p.id}
                          onClick={() => setSelectedPillarId(selectedPillarId === p.id ? null : p.id)}
                          customMetric={buildCustomMetric(p.name, p.score, p.change, p.percentChange)}
                        />
                      ))}
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
                              backgroundColor: '#fafafa',
                              borderBottom: '1px solid #e9eaeb',
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                              fontFamily,
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#535862',
                            },
                            '& .MuiDataGrid-cell': {
                              fontFamily,
                              fontSize: 14,
                              borderBottom: '1px solid #f5f5f5',
                            },
                            '& .MuiDataGrid-detailPanel': {
                              overflow: 'visible',
                            },
                            '& .MuiDataGrid-row:hover': {
                              backgroundColor: '#fafafa',
                            },
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Chart + Improvers */}
                    <div className={sty.rightColumn}>
                      {/* Trend Chart */}
                      <div className={sty.chartCard}>
                        <h3 className={sty.chartTitle}>Pillar Scores Over Time</h3>
                        {loading ? (
                          <Skeleton variant="rounded" animation="wave" sx={{ height: 280, borderRadius: '8px' }} />
                        ) : chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e9eaeb" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 11, fontFamily, fill: '#535862' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e9eaeb' }}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                domain={[0, 100]}
                                tick={{ fontSize: 12, fontFamily, fill: '#535862' }}
                                tickLine={false}
                                axisLine={{ stroke: '#e9eaeb' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  fontFamily,
                                  fontSize: 13,
                                  borderRadius: 8,
                                  border: '1px solid #e9eaeb',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }}
                              />
                              <Legend
                                wrapperStyle={{ fontFamily, fontSize: 12 }}
                              />
                              {pillars.map((p) => (
                                <Line
                                  key={p.id}
                                  type="monotone"
                                  dataKey={p.id}
                                  name={p.name}
                                  stroke={pillarColorMap[p.id]}
                                  strokeWidth={selectedPillarId === p.id ? 3 : selectedPillarId ? 1 : 2}
                                  strokeOpacity={selectedPillarId && selectedPillarId !== p.id ? 0.3 : 1}
                                  dot={false}
                                  activeDot={{ r: 4, strokeWidth: 2 }}
                                  connectNulls={false}
                                />
                              ))}
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
              </>
            )}
          </div>
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
    </LocalizationProvider>
  );
}

export default OperationalExcellencePage;
