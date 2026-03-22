import * as React from 'react';
import { useRouter } from 'next/router';
import { DataGridPro, GridColDef, gridClasses } from '@mui/x-data-grid-pro';
import { Box, Button, Chip, Skeleton, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import type { EvaluationItem, EvaluationStatus, EvaluationSource, EvaluationCadence } from '@/lib/evaluations/types';
import { OverrideMenu } from './OverrideMenu';
import { EvaluationDeleteMenu } from './EvaluationDeleteMenu';
import { RolePill } from '@/components/CodeComponents/shared/RolePill';
import { SubmissionDetailDialog } from '@/components/forms/SubmissionDetailDialog';
import { createSupabaseClient } from '@/util/supabase/component';
import type { FormSubmission } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

const STATUS_CHIP: Record<EvaluationStatus, { label: string; bg: string; color: string }> = {
  overdue: {
    label: 'Overdue',
    bg: 'var(--ls-color-destructive-soft)',
    color: 'var(--ls-color-destructive-base)',
  },
  due: {
    label: 'Due',
    bg: 'var(--ls-color-warning-soft)',
    color: 'var(--ls-color-warning-base)',
  },
  completed: {
    label: 'Completed',
    bg: 'var(--ls-color-success-soft)',
    color: 'var(--ls-color-success-base)',
  },
  not_yet_due: {
    label: 'Not yet due',
    bg: 'var(--ls-color-muted-soft)',
    color: 'var(--ls-color-muted)',
  },
  skipped: {
    label: 'Skipped',
    bg: 'var(--ls-color-muted-soft)',
    color: 'var(--ls-color-muted)',
  },
};

const SOURCE_CHIP: Record<EvaluationSource, { label: string; bg: string; color: string }> = {
  scheduled: { label: 'Scheduled', bg: 'var(--ls-color-muted-soft)', color: 'var(--ls-color-muted)' },
  certification_pending: { label: 'Cert — Pending', bg: 'var(--ls-color-brand-soft)', color: 'var(--ls-color-brand-base)' },
  certification_pip: { label: 'Cert — PIP', bg: 'var(--ls-color-warning-soft)', color: 'var(--ls-color-warning-base)' },
  manual: { label: 'Manual', bg: 'var(--ls-color-muted-soft)', color: 'var(--ls-color-muted)' },
};

function formatCadence(cadence: EvaluationCadence | null): string {
  switch (cadence) {
    case 'monthly': return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'semi_annual': return 'Semi-annual';
    case 'annual': return 'Annual';
    default: return '';
  }
}

const StyledContainer = styled(Box)(() => ({
  borderRadius: 16,
  border: '1px solid var(--ls-color-muted-border)',
  backgroundColor: 'var(--ls-color-bg-container)',
  overflow: 'hidden',
  boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.04)',
  fontFamily,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

export interface MyEvaluationsTableProps {
  items: EvaluationItem[];
  loading: boolean;
  onRefresh: () => void;
  canManage: boolean;
  orgId?: string | null;
  onEmployeeClick?: (employeeId: string) => void;
}

export function MyEvaluationsTable({ items, loading, onRefresh, canManage, orgId, onEmployeeClick }: MyEvaluationsTableProps) {
  const router = useRouter();
  const [viewSubmission, setViewSubmission] = React.useState<FormSubmission | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const getAccessToken = React.useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createSupabaseClient();
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch { return null; }
  }, []);

  const handleViewSubmission = React.useCallback(async (submissionId: string | null) => {
    if (!submissionId) return;
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/forms/submissions/${encodeURIComponent(submissionId)}${orgId ? `?org_id=${encodeURIComponent(orgId)}` : ''}`, { headers });
      if (!res.ok) return;
      const sub = await res.json();
      if (sub) {
        setViewSubmission(sub);
        setDialogOpen(true);
      }
    } catch { /* silently fail */ }
  }, [getAccessToken, orgId]);

  const columns = React.useMemo<GridColDef<EvaluationItem>[]>(
    () => [
      {
        field: 'employee',
        headerName: 'Employee',
        headerAlign: 'center' as const,
        flex: 1,
        minWidth: 140,
        valueGetter: (value: EvaluationItem['employee']) => value?.name ?? '',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography
              onClick={(e) => {
                e.stopPropagation();
                if (params.row.employee?.id && onEmployeeClick) onEmployeeClick(params.row.employee.id);
              }}
              sx={{
                fontFamily, fontSize: 13, fontWeight: 600,
                color: 'var(--ls-color-neutral-soft-foreground)',
                cursor: onEmployeeClick ? 'pointer' : 'default',
                '&:hover': onEmployeeClick ? { color: 'var(--ls-color-brand)', textDecoration: 'underline' } : {},
              }}
            >
              {params.row.employee?.name ?? '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        headerAlign: 'center' as const,
        align: 'center' as const,
        width: 120,
        valueGetter: (_value, row) => row.employee?.role ?? '',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <RolePill
              role={params.row.employee?.role}
              colorKey={params.row.employee?.role_color}
            />
          </Box>
        ),
      },
      {
        field: 'evaluation',
        headerName: 'Evaluation',
        headerAlign: 'center' as const,
        align: 'center' as const,
        flex: 1,
        minWidth: 150,
        valueGetter: (value: EvaluationItem['evaluation']) => value?.name ?? '',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500, color: 'var(--ls-color-neutral-soft-foreground)' }}>
              {params.row.evaluation?.name ?? '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'cadence',
        headerName: 'Frequency',
        headerAlign: 'center' as const,
        align: 'center' as const,
        width: 120,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
              {formatCadence(params.row.cadence) || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'due_date',
        headerName: 'Due Date',
        headerAlign: 'center' as const,
        align: 'center' as const,
        width: 120,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: params.row.status === 'overdue' ? 600 : 400,
              color: params.row.status === 'overdue'
                ? 'var(--ls-color-destructive-base)'
                : 'var(--ls-color-neutral-soft-foreground)',
            }}>
              {params.row.due_date
                ? format(new Date(params.row.due_date + 'T00:00:00'), 'M/d/yyyy')
                : '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'source',
        headerName: 'Source',
        width: 140,
        headerAlign: 'center' as const,
        align: 'center' as const,
        renderCell: (params) => {
          const chip = SOURCE_CHIP[params.row.source] ?? SOURCE_CHIP.manual;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Chip
                label={chip.label}
                size="small"
                sx={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: chip.bg,
                  color: chip.color,
                  height: 24,
                  border: 'none',
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        headerAlign: 'center' as const,
        align: 'center' as const,
        width: 120,
        renderCell: (params) => {
          const chip = STATUS_CHIP[params.row.status] ?? STATUS_CHIP.not_yet_due;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Chip
                label={chip.label}
                size="small"
                sx={{
                  fontFamily,
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: chip.bg,
                  color: chip.color,
                  height: 24,
                  border: 'none',
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'last_completed_at',
        headerName: 'Last Completed',
        headerAlign: 'center' as const,
        align: 'center' as const,
        width: 150,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-neutral-soft-foreground)' }}>
              {params.row.last_completed_at
                ? format(new Date(params.row.last_completed_at), 'M/d/yyyy')
                : '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: 'Action',
        flex: 1,
        minWidth: 140,
        sortable: false,
        headerAlign: 'center' as const,
        renderCell: (params) => {
          const item = params.row;
          const isCompleted = item.status === 'completed';
          const canStart = item.evaluation?.is_active !== false;

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
              {isCompleted && item.last_submission_id ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewSubmission(item.last_submission_id)}
                  sx={{
                    fontFamily,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderColor: 'var(--ls-color-muted-border)',
                    color: 'var(--ls-color-neutral-soft-foreground)',
                    borderRadius: '6px',
                    '&:hover': {
                      borderColor: 'var(--ls-color-brand)',
                      color: 'var(--ls-color-brand)',
                    },
                  }}
                >
                  View
                </Button>
              ) : (
                <Tooltip
                  title={!canStart ? 'This evaluation form is currently inactive' : ''}
                  placement="top"
                >
                  <span>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!canStart}
                      onClick={() => {
                        router.push(`/evaluations/conduct/${item.id}`);
                      }}
                      sx={{
                        fontFamily,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'none',
                        backgroundColor: 'var(--ls-color-brand)',
                        borderRadius: '6px',
                        boxShadow: 'none',
                        '&:hover': {
                          backgroundColor: 'var(--ls-color-brand-hover)',
                          boxShadow: 'none',
                        },
                        '&.Mui-disabled': {
                          backgroundColor: 'var(--ls-color-muted-soft)',
                          color: 'var(--ls-color-muted)',
                        },
                      }}
                    >
                      Go to Form
                    </Button>
                  </span>
                </Tooltip>
              )}

              {isCompleted && item.last_submission_id ? (
                canManage && (
                  <EvaluationDeleteMenu
                    submissionId={item.last_submission_id}
                    employeeName={item.employee?.name ?? 'this employee'}
                    orgId={orgId}
                    onDeleted={onRefresh}
                  />
                )
              ) : (
                item.source === 'scheduled' && item.rule_id && item.period_start && canManage && (
                  <OverrideMenu
                    ruleId={item.rule_id}
                    employeeId={item.employee.id}
                    periodStart={item.period_start}
                    onOverrideCreated={onRefresh}
                  />
                )
              )}
            </Box>
          );
        },
      },
    ],
    [canManage, onRefresh, router]
  );

  const rowHeight = 52;
  const headerHeight = 56;
  const minRows = 1;
  const gridHeight = headerHeight + Math.max(items.length, minRows) * rowHeight + 2;

  if (loading) {
    return (
      <StyledContainer>
        <Box sx={{ p: 0 }}>
          {/* Header skeleton */}
          <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, backgroundColor: 'var(--ls-color-neutral-foreground)', borderBottom: '1px solid var(--ls-color-muted-border)' }}>
            {[160, 120, 200, 100, 100, 80, 120, 140].map((w, i) => (
              <Skeleton key={i} variant="text" width={w} height={20} sx={{ borderRadius: '4px' }} />
            ))}
          </Box>
          {/* Row skeletons */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 1.75, borderBottom: '1px solid var(--ls-color-muted-soft)', alignItems: 'center' }}>
              <Skeleton variant="text" width={130} height={16} sx={{ borderRadius: '4px' }} />
              <Skeleton variant="rounded" width={70} height={26} sx={{ borderRadius: '14px' }} />
              <Skeleton variant="text" width={150} height={16} sx={{ borderRadius: '4px' }} />
              <Skeleton variant="text" width={70} height={16} sx={{ borderRadius: '4px' }} />
              <Skeleton variant="text" width={75} height={16} sx={{ borderRadius: '4px' }} />
              <Skeleton variant="rounded" width={50} height={22} sx={{ borderRadius: '12px' }} />
              <Skeleton variant="text" width={75} height={16} sx={{ borderRadius: '4px' }} />
              <Skeleton variant="rounded" width={85} height={30} sx={{ borderRadius: '6px' }} />
            </Box>
          ))}
        </Box>
      </StyledContainer>
    );
  }

  if (items.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          gap: '12px',
          border: '2px dashed var(--ls-color-muted-border)',
          borderRadius: '12px',
          background: 'var(--ls-color-neutral-foreground)',
        }}
      >
        <AssignmentOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
        <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: 'var(--ls-color-text-primary)' }}>
          No evaluations assigned
        </Typography>
        <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
          Evaluations assigned to you will appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <StyledContainer>
        <DataGridPro
          rows={items}
          columns={columns}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          disableColumnResize
          disableColumnMenu
          showColumnVerticalBorder={false}
          hideFooter
          rowHeight={rowHeight}
          columnHeaderHeight={headerHeight}
          style={{ flex: 1, width: '100%', height: gridHeight }}
          sx={{
            border: 'none',
            fontFamily,
            [`& .${gridClasses.columnHeaders}`]: {
              borderBottom: '1px solid var(--ls-color-muted-border)',
            },
            [`& .${gridClasses.columnHeader}`]: {
              backgroundColor: 'var(--ls-color-neutral-foreground)',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--ls-color-neutral-soft-foreground)',
              '&:focus, &:focus-within': { outline: 'none' },
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              padding: 0,
            },
            [`& .${gridClasses.columnSeparator}`]: { display: 'none' },
            [`& .${gridClasses.cell}`]: {
              borderBottom: '1px solid var(--ls-color-muted-soft)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ls-color-neutral-soft-foreground)',
              '&:focus, &:focus-within': { outline: 'none' },
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
            },
            [`& .${gridClasses.row}:hover`]: {
              backgroundColor: 'var(--ls-color-neutral-foreground)',
            },
            '& .MuiDataGrid-overlay': { fontFamily },
          }}
        />
      </StyledContainer>

      <SubmissionDetailDialog
        open={dialogOpen}
        submission={viewSubmission}
        onClose={() => { setDialogOpen(false); setViewSubmission(null); }}
        getAccessToken={getAccessToken}
      />
    </>
  );
}
