import * as React from 'react';
import { DataGridPro, GridColDef, gridClasses } from '@mui/x-data-grid-pro';
import { Box, Typography, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { RolePill } from './shared/RolePill';
import { EmployeeTableSkeleton } from './Skeletons/EmployeeTableSkeleton';
import type { Employee } from '@/lib/supabase.types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const StyledContainer = styled(Box)(() => ({
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflow: "hidden",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
  width: "100%",
  height: 650,
  display: "flex",
  flexDirection: "column",
}));

export interface PIPTableProps {
  locationId: string;
  className?: string;
}

interface PIPRow {
  id: string;
  employee_name: string;
  role: string;
  rating_status: boolean | null;
  month: string | null;
}

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

function monthIndex(month?: string | null): number {
  if (!month) {
    return -1;
  }
  const index = MONTH_ORDER.indexOf(month);
  return index === -1 ? -1 : index;
}

export function PIPTable({ locationId, className }: PIPTableProps) {
  const [rows, setRows] = React.useState<PIPRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!locationId) {
        throw new Error('Location is required');
      }

      // Fetch PIP employees and their evaluations
      const [employeesRes, evaluationsRes] = await Promise.all([
        fetch(`/api/employees?location_id=${locationId}`),
        fetch(`/api/evaluations?location_id=${locationId}`),
      ]);

      if (!employeesRes.ok) {
        throw new Error('Failed to fetch employees');
      }
      if (!evaluationsRes.ok) {
        throw new Error('Failed to fetch evaluations');
      }

      const { employees } = await employeesRes.json();
      const { evaluations } = await evaluationsRes.json();

      // Filter for PIP employees
      const pipEmployees = (employees as Employee[]).filter(
        (emp) => emp.certified_status === 'PIP'
      );

      // Create a map of employee_id to their most recent evaluation
      // Sort evaluations by created_at descending to get most recent first
      const sortedEvaluations = (evaluations as any[]).sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      const evaluationMap = new Map<string, { rating_status: boolean | null; month: string | null }>();
      sortedEvaluations.forEach((eval) => {
        const empId = eval.employee_id;
        // Only set if not already set (first occurrence is most recent)
        if (!evaluationMap.has(empId)) {
          evaluationMap.set(empId, {
            rating_status: eval.rating_status ?? null,
            month: eval.month ?? null,
          });
        }
      });

      // Transform to PIPRow format
      const pipRows: PIPRow[] = pipEmployees.map((emp) => {
        const evalData = evaluationMap.get(emp.id) || { rating_status: null, month: null };
        return {
          id: emp.id,
          employee_name: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          role: emp.role || '',
          rating_status: evalData.rating_status,
          month: evalData.month,
        };
      });

      setRows(pipRows);
    } catch (err) {
      console.error('[PIPTable] fetch error', err);
      setError(err instanceof Error ? err.message : 'Failed to load PIP employees');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  React.useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId, fetchData]);

  const columns = React.useMemo<GridColDef[]>(() => [
    {
      field: 'employee_name',
      headerName: 'Employee',
      flex: 1.4,
      minWidth: 220,
      headerAlign: 'left',
      align: 'left',
      renderCell: (params) => (
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 600,
            color: '#111827',
            width: '100%',
            textAlign: 'left',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <RolePill role={params.value} />
        </Box>
      ),
    },
    {
      field: 'rating_status',
      headerName: 'Rating Status',
      width: 160,
      align: 'center',
      headerAlign: 'center',
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
          {params.value !== null ? (
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
          ) : (
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500, color: '#6b7280' }}>
              No evaluation
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'month',
      headerName: 'Month',
      width: 130,
      align: 'center',
      headerAlign: 'center',
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
            {params.value || '—'}
          </Typography>
        </Box>
      ),
    },
  ], []);

  if (loading && rows.length === 0) {
    return (
      <EmployeeTableSkeleton
        className={className}
        rows={10}
        showActions={false}
      />
    );
  }

  if (error && rows.length === 0) {
    return (
      <StyledContainer
        className={`pip-table-container ${className}`}
        data-plasmic-name="pip-table-container"
      >
        <Box sx={{ py: 6, px: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#b91c1c', fontFamily }}>
            {error}
          </Typography>
        </Box>
      </StyledContainer>
    );
  }

  if (rows.length === 0 && !loading) {
    return (
      <StyledContainer
        className={`pip-table-container ${className}`}
        data-plasmic-name="pip-table-container"
      >
        <Box sx={{ py: 6, px: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6b7280', fontFamily }}>
            No employees with PIP status.
          </Typography>
        </Box>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer
      className={`pip-table-container ${className}`}
      data-plasmic-name="pip-table-container"
    >
      <DataGridPro
        rows={rows}
        columns={columns}
        disableRowSelectionOnClick
        loading={loading}
        hideFooter
        rowHeight={48}
        columnHeaderHeight={56}
        style={{ flex: 1, width: '100%' }}
        sx={{
          border: 'none',
          fontFamily,
          [`& .${gridClasses.columnHeaders}`]: {
            borderBottom: '1px solid #e5e7eb',
          },
          [`& .${gridClasses.columnHeader}`]: {
            backgroundColor: '#f9fafb',
            fontWeight: 600,
            fontSize: 14,
            color: '#111827',
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
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            '&:focus, &:focus-within': {
              outline: 'none',
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
          },
          [`& .${gridClasses.row}:hover`]: {
            backgroundColor: '#f9fafb',
          },
          '& .MuiDataGrid-overlay': {
            fontFamily,
          },
        }}
      />
    </StyledContainer>
  );
}

