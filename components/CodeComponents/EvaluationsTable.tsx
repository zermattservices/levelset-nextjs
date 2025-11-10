import * as React from 'react';
import { DataGridPro, GridColDef, gridClasses } from '@mui/x-data-grid-pro';
import { Box, Chip, FormControl, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { addMonths, format } from 'date-fns';
import { EvaluationsTableSkeleton } from './Skeletons/EvaluationsTableSkeleton';
import { RolePill } from './shared/RolePill';

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
  orgId: string;
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

export function EvaluationsTable({ orgId, locationId, className, onPlannedStatusChange }: EvaluationsTableProps) {
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

      const [evaluationsRes, employeesRes] = await Promise.all([
        fetch(`/api/evaluations?org_id=${orgId}&location_id=${locationId}`),
        fetch(`/api/employees?org_id=${orgId}&location_id=${locationId}`),
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
  }, [orgId, locationId, applyFilters, onPlannedStatusChange]);

  React.useEffect(() => {
    if (orgId && locationId) {
      fetchData();
    }
  }, [orgId, locationId, fetchData]);

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
          return (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <FormControl
                size="small"
                sx={{
                  minWidth: 0,
                  width: 'auto',
                  height: 28,
                }}
              >
                <Select
                  value={row.leader_id ?? ''}
                  onChange={handleLeaderChange(row)}
                  disabled={disabled}
                  displayEmpty
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 14,
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    height: 28,
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px 0 14px',
                      minHeight: 0,
                    },
                    '& fieldset': {
                      border: 'none',
                    },
                    opacity: disabled ? 0.6 : 1,
                    '& .MuiSelect-icon': {
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#6b7280',
                    },
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
                    <em>Unassigned</em>
                  </MenuItem>
                  {leaders.map((leader) => (
                    <MenuItem key={leader.id} value={leader.id}>
                      {leader.name}
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
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        fontFamily,
                        width: 128,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 14,
                          backgroundColor: '#f3f4f6',
                          fontFamily,
                          fontSize: 13,
                          height: 28,
                          paddingRight: 0,
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
                          padding: '0 12px',
                          textAlign: 'center',
                        },
                      },
                    },
                    openPickerButton: {
                      sx: {
                        color: '#6b7280',
                        padding: 0,
                        marginRight: 0.5,
                        '& .MuiSvgIcon-root': {
                          fontSize: 16,
                        },
                      },
                    },
                    popper: {
                      sx: {
                        '& .MuiPaper-root': {
                          fontFamily,
                          borderRadius: 12,
                          boxShadow: '0px 10px 25px rgba(15, 23, 42, 0.12)',
                          padding: '4px 8px',
                        },
                        '& .MuiPickersDay-root': {
                          fontFamily,
                          fontSize: 12,
                          '&.Mui-selected': {
                            backgroundColor: `${levelsetGreen} !important`,
                            color: '#ffffff !important',
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
          const style = STATUS_STYLES[row.status] || STATUS_STYLES.Planned;
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
              <FormControl
                size="small"
                sx={{
                  minWidth: 0,
                  width: 'auto',
                  height: 28,
                }}
              >
                <Select
                  value={row.status}
                  onChange={handleStatusChange(row)}
                  disabled={disabled}
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 14,
                    backgroundColor: style.bg,
                    color: style.color,
                    height: 28,
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px 0 14px',
                      minHeight: 0,
                    },
                    '& fieldset': {
                      border: 'none',
                    },
                    opacity: disabled ? 0.6 : 1,
                    '& .MuiSelect-icon': {
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: style.color,
                    },
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
                  {Object.keys(STATUS_ORDER).map((statusKey) => (
                    <MenuItem key={statusKey} value={statusKey}>
                      {statusKey}
                    </MenuItem>
                  ))}
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

