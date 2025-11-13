import * as React from 'react';
import { DataGridPro, GridColDef, gridClasses } from '@mui/x-data-grid-pro';
import { Box, Chip, FormControl, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addMonths, format } from 'date-fns';
import { EvaluationsTableSkeleton } from './Skeletons/EvaluationsTableSkeleton';
import { RolePill } from './shared/RolePill';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

const STATUS_ORDER: Record<string, number> = {
  Planned: 0,
  Scheduled: 1,
  Completed: 2,
  Cancelled: 3,
};

const ALLOWED_STATUSES = ['Planned', 'Scheduled', 'Completed'];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Planned: { bg: '#fef3c7', color: '#92400e' },
  Scheduled: { bg: '#e0f2fe', color: '#0369a1' },
  Completed: { bg: '#dcfce7', color: '#166534' },
  Cancelled: { bg: '#fee2e2', color: '#b91c1c' },
};

const MONTH_ORDER = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const StyledContainer = styled('div')({
  width: '100%',
  height: 600,
  borderRadius: 16,
  border: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
  boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.04)',
  fontFamily,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export interface EvaluationsTableProps {
  locationId: string;
  className?: string;
  onPlannedStatusChange?: (hasPlanned: boolean) => void;
}

interface EvaluationRow {
  id: string;
  employee_name: string;
  role: string;
  leader_id: string | null;
  leader_name: string | null;
  rating_status: boolean;
  month: string;
  evaluation_date: string | null;
  status: string;
  state_before: string | null;
  state_after: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface LeaderOption {
  id: string;
  name: string;
}

const LEADER_ROLES = ['Team Lead', 'Director', 'Executive', 'Operator'];

const DatePillTextField = React.forwardRef(function DatePillTextField(
  props: React.ComponentProps<typeof TextField>,
  ref: React.Ref<HTMLInputElement>
) {
  return (
    <TextField
      {...props}
      inputRef={ref}
      placeholder="MM/DD/YY"
      size="small"
      InputLabelProps={{ shrink: false }}
      sx={{
        width: 132,
        '& .MuiOutlinedInput-root': {
          borderRadius: 14,
          backgroundColor: '#f3f4f6',
          fontFamily,
          fontSize: 14,
          height: 28,
          paddingRight: '36px',
          '& fieldset': {
            border: 'none',
          },
          '&:hover fieldset': {
            border: 'none',
          },
          '&.Mui-focused fieldset': {
            border: 'none',
          },
        },
        '& .MuiInputBase-input': {
          fontFamily,
          fontSize: 13,
          fontWeight: 600,
          color: '#111827',
          WebkitTextFillColor: '#111827',
          padding: '0 12px',
          textAlign: 'center',
          height: 28,
          lineHeight: '28px',
        },
        '& .MuiInputBase-input::placeholder': {
          color: '#9ca3af',
          opacity: 1,
        },
        '& .MuiIconButton-root': {
          padding: 0,
          marginRight: 6,
          color: '#6b7280',
          '& .MuiSvgIcon-root': {
            fontSize: 18,
          },
        },
      }}
    />
  );
});

export function EvaluationsTable({ locationId, className, onPlannedStatusChange }: EvaluationsTableProps) {
  const [rows, setRows] = React.useState<EvaluationRow[]>([]);
  const [leaders, setLeaders] = React.useState<LeaderOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set());

  const applyFilters = React.useCallback(
    (evaluations: EvaluationRow[]) => {
      const now = new Date();
      const allowedMonths = new Set([
        format(now, 'MMMM'),
        format(addMonths(now, 1), 'MMMM'),
      ]);

      const filtered = evaluations
        .filter(
          (row) =>
            ALLOWED_STATUSES.includes(row.status) &&
            allowedMonths.has(row.month)
        )
        .sort((a, b) => {
          const monthDiff = monthIndex(b.month) - monthIndex(a.month);
          if (monthDiff !== 0) return monthDiff;
          const statusDiff =
            (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      onPlannedStatusChange?.(filtered.some((row) => row.status === 'Planned'));
      return filtered;
    },
    [onPlannedStatusChange]
  );

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!locationId) {
        throw new Error('Location is required');
      }

      const [evaluationsRes, employeesRes] = await Promise.all([
        fetch(`/api/evaluations?location_id=${locationId}`),
        fetch(`/api/employees?location_id=${locationId}`),
      ]);

      if (!evaluationsRes.ok) {
        throw new Error('Failed to fetch evaluations');
      }
      if (!employeesRes.ok) {
        throw new Error('Failed to fetch employees');
      }

      const { evaluations } = await evaluationsRes.json();
      const { employees } = await employeesRes.json();

      const leaderOptions: LeaderOption[] = (employees as EmployeeRow[])
        .filter((emp) => LEADER_ROLES.includes(emp.role ?? ''))
        .map((emp) => ({
          id: emp.id,
          name: emp.full_name || `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim(),
        }));

      leaderOptions.sort((a, b) => a.name.localeCompare(b.name));

      setLeaders(leaderOptions);
      setRows(applyFilters(evaluations as EvaluationRow[]));
    } catch (err) {
      console.error('[EvaluationsTable] fetch error', err);
      setError(err instanceof Error ? err.message : 'Failed to load evaluations');
      onPlannedStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [locationId, applyFilters, onPlannedStatusChange]);

  React.useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId, fetchData]);

  const handleUpdate = React.useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      setUpdatingIds((prev) => new Set(prev).add(id));
      try {
        const response = await fetch('/api/evaluations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...payload }),
        });

        if (!response.ok) {
          const { error: message } = await response.json();
          throw new Error(message || 'Failed to update evaluation');
        }

        const { evaluation } = await response.json();
        const updatedEvaluation = evaluation as EvaluationRow;
        setRows((prev) => {
          const exists = prev.some((row) => row.id === id);
          const base = exists
            ? prev.map((row) => (row.id === id ? { ...row, ...updatedEvaluation } : row))
            : [...prev, updatedEvaluation];
          return applyFilters(base);
        });
      } catch (err) {
        console.error('[EvaluationsTable] update error', err);
        setError(err instanceof Error ? err.message : 'Failed to update evaluation');
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [applyFilters]
  );

  const handleLeaderChange = React.useCallback(
    (row: EvaluationRow) => (event: SelectChangeEvent<string>) => {
      const leaderId = event.target.value || null;
      handleUpdate(row.id, { leader_id: leaderId });
    },
    [handleUpdate]
  );

  const handleStatusChange = React.useCallback(
    (row: EvaluationRow) => (event: SelectChangeEvent<string>) => {
      handleUpdate(row.id, { status: event.target.value });
    },
    [handleUpdate]
  );

  const handleDateChange = React.useCallback(
    (row: EvaluationRow) => async (value: Date | null) => {
      handleUpdate(row.id, { evaluation_date: value ? value.toISOString().split('T')[0] : null });
    },
    [handleUpdate]
  );

  const columns = React.useMemo<GridColDef<EvaluationRow>[]>(
    () => [
      {
        field: 'employee_name',
        headerName: 'Employee',
        flex: 1.2,
        minWidth: 200,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography
              sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: '#111827' }}
            >
              {params.value ?? 'Unknown'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 150,
        renderCell: (params) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <RolePill role={params.value} />
          </Box>
        ),
      },
      {
        field: 'leader_id',
        headerName: 'Leader',
        flex: 1,
        minWidth: 200,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;
          const disabled = updatingIds.has(row.id);
          const leaderId = row.leader_id ?? '';
          const leaderName = leaderId
            ? leaders.find((leader) => leader.id === leaderId)?.name ?? 'Unassigned'
            : 'Unassigned';
          const pillSx = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            padding: '0 10px',
            minHeight: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#f3f4f6',
            fontFamily,
            fontSize: 13,
            fontWeight: 600,
            color: leaderId ? '#374151' : '#6b7280',
            maxWidth: 180,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          } as const;

          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
              }}
            >
              <FormControl size="small" sx={{ minWidth: 0 }}>
                <Select
                  value={leaderId}
                  onChange={handleLeaderChange(row)}
                  disabled={disabled}
                  displayEmpty
                  IconComponent={() => null}
                  renderValue={() => (
                    <Box sx={pillSx}>
                      <Box
                        component="span"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {leaderName}
                      </Box>
                      <ExpandMoreIcon sx={{ fontSize: 18, color: '#6b7280' }} />
                    </Box>
                  )}
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    },
                    '& fieldset': {
                      border: 'none',
                    },
                    opacity: disabled ? 0.6 : 1,
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        fontFamily,
                        borderRadius: 2,
                        mt: 1,
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <Box sx={pillSx}>
                      <span>Unassigned</span>
                    </Box>
                  </MenuItem>
                  {leaders.map((leader) => (
                    <MenuItem key={leader.id} value={leader.id}>
                      <Box sx={pillSx}>
                        <span>{leader.name}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          );
        },
      },
      {
        field: 'rating_status',
        headerName: 'Rating Status',
        width: 160,
        renderCell: (params) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <Chip
              label={params.value ? 'Meets Threshold' : 'Needs Review'}
              size="small"
              sx={{
                fontFamily,
                fontWeight: 600,
                backgroundColor: params.value ? '#dcfce7' : '#fff7ed',
                color: params.value ? '#166534' : '#b45309',
                height: 28,
              }}
            />
          </Box>
        ),
      },
      {
        field: 'month',
        headerName: 'Month',
        width: 130,
        sortComparator: (v1, v2) => monthIndex(v1 as string) - monthIndex(v2 as string),
        renderCell: (params) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500, color: '#111827' }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'evaluation_date',
        headerName: 'Date',
        width: 160,
        renderCell: (params) => {
          const row = params.row;
          const disabled = updatingIds.has(row.id);
          const dateValue = row.evaluation_date ? new Date(row.evaluation_date) : null;
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  value={dateValue}
                  onChange={handleDateChange(row)}
                  disabled={disabled}
                  format="MM/dd/yyyy"
                  enableAccessibleFieldDOMStructure={false}
                  slots={{
                    textField: DatePillTextField,
                  }}
                  slotProps={{
                    openPickerButton: {
                      sx: {
                        color: '#6b7280',
                        padding: 0,
                        mr: 0,
                        '& .MuiSvgIcon-root': {
                          fontSize: 18,
                        },
                        '&:hover': {
                          backgroundColor: 'transparent',
                        },
                      },
                    },
                    popper: {
                      sx: {
                        '& .MuiPaper-root': {
                          fontFamily,
                          borderRadius: 16,
                          boxShadow: '0px 12px 32px rgba(17, 24, 39, 0.15)',
                          padding: 1,
                        },
                        '& .MuiTypography-root': {
                          fontFamily,
                          fontSize: 12,
                        },
                        '& .MuiPickersCalendarHeader-label': {
                          fontFamily,
                          fontSize: 12,
                        },
                        '& .MuiPickersCalendarHeader-switchViewIcon': {
                          color: levelsetGreen,
                        },
                        '& .MuiDayCalendar-weekDayLabel': {
                          fontFamily,
                          fontSize: 10,
                          color: '#6b7280',
                        },
                        '& .MuiPickersDay-root': {
                          fontFamily,
                          fontSize: 12,
                          borderRadius: 999,
                          '&.Mui-selected': {
                            backgroundColor: `${levelsetGreen} !important`,
                            color: '#ffffff !important',
                            '&:hover': {
                              backgroundColor: `${levelsetGreen} !important`,
                            },
                            '&:focus': {
                              backgroundColor: `${levelsetGreen} !important`,
                            },
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(49, 102, 74, 0.08)',
                          },
                        },
                        '& .MuiYearCalendar-root .MuiPickersYear-yearButton': {
                          fontFamily,
                          fontSize: 12,
                          '&.Mui-selected': {
                            backgroundColor: `${levelsetGreen} !important`,
                            color: '#ffffff !important',
                          },
                        },
                        '& .MuiIconButton-root': {
                          color: `${levelsetGreen} !important`,
                          '&:hover': {
                            backgroundColor: 'rgba(49, 102, 74, 0.08)',
                          },
                        },
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
          );
        },
        valueFormatter: (params: any) => {
          const value = params?.value;
          if (!value) {
            return '—';
          }
          try {
            return format(new Date(value as string), 'MM/dd/yyyy');
          } catch {
            return '—';
          }
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        sortComparator: (v1, v2) => (STATUS_ORDER[v1 as string] ?? 99) - (STATUS_ORDER[v2 as string] ?? 99),
        renderCell: (params) => {
          const row = params.row;
          const disabled = updatingIds.has(row.id);
          const status = row.status;
          const colors = STATUS_STYLES[status] ?? STATUS_STYLES.Planned;
          const pillSx = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '0 10px',
            minHeight: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.bg,
            color: colors.color,
            fontFamily,
            fontSize: 13,
            fontWeight: 700,
            maxWidth: 150,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          } as const;

          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
              }}
            >
              <FormControl size="small" sx={{ minWidth: 0, width: 'auto' }}>
                <Select
                  value={status}
                  onChange={handleStatusChange(row)}
                  disabled={disabled}
                  IconComponent={() => null}
                  renderValue={() => (
                    <Box component="span" sx={pillSx}>
                      <Box
                        component="span"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status}
                      </Box>
                      <ExpandMoreIcon sx={{ fontSize: 18 }} />
                    </Box>
                  )}
                  sx={{
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    },
                    '& fieldset': {
                      border: 'none',
                    },
                    opacity: disabled ? 0.6 : 1,
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        fontFamily,
                        borderRadius: 2,
                        mt: 1,
                      },
                    },
                  }}
                >
                  {Object.keys(STATUS_ORDER).map((statusKey) => {
                    const menuColors = STATUS_STYLES[statusKey] ?? STATUS_STYLES.Planned;
                    return (
                      <MenuItem key={statusKey} value={statusKey}>
                        <Box sx={{ ...pillSx, backgroundColor: menuColors.bg, color: menuColors.color }}>
                          <span>{statusKey}</span>
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
          );
        },
      },
    ],
    [handleLeaderChange, handleStatusChange, handleDateChange, leaders, updatingIds]
  );

  if (loading) {
    return <EvaluationsTableSkeleton className={className} rows={8} />;
  }

  if (error) {
    return (
      <StyledContainer className={className}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          gap={2}
          height="100%"
        >
          <Typography sx={{ fontFamily, color: '#b91c1c' }}>{error}</Typography>
          <Typography
            component="button"
            onClick={fetchData}
            sx={{ fontFamily, color: '#31664a', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            Retry
          </Typography>
        </Box>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer className={className}>
      <DataGridPro
        style={{ flex: 1, width: '100%' }}
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        disableRowSelectionOnClick
        disableColumnResize
        showColumnVerticalBorder={false}
        rowHeight={48}
        columnHeaderHeight={56}
        sortingOrder={['desc', 'asc']}
        initialState={{
          sorting: {
            sortModel: [
              { field: 'month', sort: 'desc' },
              { field: 'status', sort: 'asc' },
              { field: 'created_at', sort: 'desc' },
            ],
          },
        }}
        sx={{
          fontFamily,
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          [`& .${gridClasses.columnHeaders}`]: {
            borderBottom: '1px solid #e5e7eb',
          },
          [`& .${gridClasses.columnHeader}`]: {
            backgroundColor: '#f9fafb',
            fontWeight: 600,
            fontSize: 14,
            color: '#111827',
            fontFamily,
            '&:focus, &:focus-within': {
              outline: 'none',
            },
          },
          '& .MuiDataGrid-columnHeaderTitleContainer': {
            padding: '0 16px',
          },
          [`& .${gridClasses.columnSeparator}`]: {
            display: 'none',
          },
          [`& .${gridClasses.cell}`]: {
            borderBottom: '1px solid #f3f4f6',
            borderRight: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            fontFamily,
            '&:focus, &:focus-within': {
              outline: 'none',
            },
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
          },
          [`& .${gridClasses.row}:hover`]: {
            backgroundColor: '#f9fafb',
          },
          [`& .${gridClasses.footerContainer}`]: {
            borderTop: '1px solid #e5e7eb',
            fontFamily,
          },
        }}
      />
    </StyledContainer>
  );
}

interface EmployeeRow {
  id: string;
  role?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

function monthIndex(month?: string | null): number {
  if (!month) {
    return -1;
  }
  const index = MONTH_ORDER.indexOf(month);
  return index === -1 ? -1 : index;
}

