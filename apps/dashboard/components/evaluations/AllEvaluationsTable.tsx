import * as React from 'react';
import { useRouter } from 'next/router';
import { DataGridPro, GridColDef, gridClasses } from '@mui/x-data-grid-pro';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
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
  scheduled: {
    label: 'Scheduled',
    bg: 'var(--ls-color-muted-soft)',
    color: 'var(--ls-color-muted)',
  },
  certification_pending: {
    label: 'Cert — Pending',
    bg: 'var(--ls-color-brand-soft)',
    color: 'var(--ls-color-brand-base)',
  },
  certification_pip: {
    label: 'Cert — PIP',
    bg: 'var(--ls-color-warning-soft)',
    color: 'var(--ls-color-warning-base)',
  },
  manual: {
    label: 'Manual',
    bg: 'var(--ls-color-muted-soft)',
    color: 'var(--ls-color-muted)',
  },
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

const filterSelectSx = {
  fontFamily,
  fontSize: 13,
  borderRadius: '8px',
  minWidth: 160,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
};

const filterLabelSx = {
  fontFamily,
  fontSize: 13,
  '&.Mui-focused': { color: 'var(--ls-color-brand)' },
};

const filterMenuItemSx = { fontFamily, fontSize: 13 };

export interface AllEvaluationsTableProps {
  items: EvaluationItem[];
  loading: boolean;
  onRefresh: () => void;
  orgId?: string | null;
  onEmployeeClick?: (employeeId: string) => void;
}

export function AllEvaluationsTable({ items, loading, onRefresh, orgId, onEmployeeClick }: AllEvaluationsTableProps) {
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

  // Filter state
  const [roleFilter, setRoleFilter] = React.useState<string>('');
  const [evaluationFilter, setEvaluationFilter] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [sourceFilter, setSourceFilter] = React.useState<string>('');

  // Derived filter options
  const roleOptions = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.employee?.role).filter(Boolean))).sort(),
    [items]
  );
  const evaluationOptions = React.useMemo(
    () => Array.from(new Set(items.map((i) => i.evaluation?.name).filter(Boolean))).sort(),
    [items]
  );

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (roleFilter && item.employee?.role !== roleFilter) return false;
      if (evaluationFilter && item.evaluation?.name !== evaluationFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (sourceFilter && item.source !== sourceFilter) return false;
      return true;
    });
  }, [items, roleFilter, evaluationFilter, statusFilter, sourceFilter]);

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
        headerAlign: 'center' as const,
        align: 'center' as const,
        width: 140,
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
                <EvaluationDeleteMenu
                  submissionId={item.last_submission_id}
                  employeeName={item.employee?.name ?? 'this employee'}
                  orgId={orgId}
                  onDeleted={onRefresh}
                />
              ) : (
                item.source === 'scheduled' && item.rule_id && item.period_start && (
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
    [onRefresh, router]
  );

  const rowHeight = 52;
  const headerHeight = 56;
  const gridHeight = headerHeight + Math.max(filteredItems.length, 1) * rowHeight + 2;

  return (
    <>
      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <FormControl size="small">
          <InputLabel sx={filterLabelSx}>Role</InputLabel>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            label="Role"
            sx={filterSelectSx}
          >
            <MenuItem value="" sx={filterMenuItemSx}>All roles</MenuItem>
            {roleOptions.map((r) => (
              <MenuItem key={r} value={r} sx={filterMenuItemSx}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel sx={filterLabelSx}>Evaluation</InputLabel>
          <Select
            value={evaluationFilter}
            onChange={(e) => setEvaluationFilter(e.target.value)}
            label="Evaluation"
            sx={filterSelectSx}
          >
            <MenuItem value="" sx={filterMenuItemSx}>All evaluations</MenuItem>
            {evaluationOptions.map((e) => (
              <MenuItem key={e} value={e} sx={filterMenuItemSx}>{e}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel sx={filterLabelSx}>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status"
            sx={filterSelectSx}
          >
            <MenuItem value="" sx={filterMenuItemSx}>All statuses</MenuItem>
            {(Object.keys(STATUS_CHIP) as EvaluationStatus[]).map((s) => (
              <MenuItem key={s} value={s} sx={filterMenuItemSx}>{STATUS_CHIP[s].label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small">
          <InputLabel sx={filterLabelSx}>Source</InputLabel>
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            label="Source"
            sx={filterSelectSx}
          >
            <MenuItem value="" sx={filterMenuItemSx}>All sources</MenuItem>
            {(Object.keys(SOURCE_CHIP) as EvaluationSource[]).map((s) => (
              <MenuItem key={s} value={s} sx={filterMenuItemSx}>{SOURCE_CHIP[s].label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <StyledContainer>
          <Box sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, backgroundColor: 'var(--ls-color-neutral-foreground)', borderBottom: '1px solid var(--ls-color-muted-border)' }}>
              {[140, 90, 160, 80, 90, 100, 80, 100, 120].map((w, i) => (
                <Skeleton key={i} variant="text" width={w} height={20} sx={{ borderRadius: '4px' }} />
              ))}
            </Box>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 1.75, borderBottom: '1px solid var(--ls-color-muted-soft)', alignItems: 'center' }}>
                <Skeleton variant="text" width={120} height={16} sx={{ borderRadius: '4px' }} />
                <Skeleton variant="rounded" width={70} height={26} sx={{ borderRadius: '14px' }} />
                <Skeleton variant="text" width={140} height={16} sx={{ borderRadius: '4px' }} />
                <Skeleton variant="text" width={65} height={16} sx={{ borderRadius: '4px' }} />
                <Skeleton variant="text" width={70} height={16} sx={{ borderRadius: '4px' }} />
                <Skeleton variant="rounded" width={65} height={22} sx={{ borderRadius: '12px' }} />
                <Skeleton variant="rounded" width={45} height={22} sx={{ borderRadius: '12px' }} />
                <Skeleton variant="text" width={70} height={16} sx={{ borderRadius: '4px' }} />
                <Skeleton variant="rounded" width={80} height={30} sx={{ borderRadius: '6px' }} />
              </Box>
            ))}
          </Box>
        </StyledContainer>
      ) : filteredItems.length === 0 ? (
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
            No evaluations found
          </Typography>
          <Typography sx={{ fontFamily, fontSize: 14, color: 'var(--ls-color-muted)' }}>
            {items.length > 0
              ? 'No evaluations match the selected filters.'
              : 'No evaluations have been created yet.'}
          </Typography>
        </Box>
      ) : (
        <StyledContainer>
          <DataGridPro
            rows={filteredItems}
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
      )}

      <SubmissionDetailDialog
        open={dialogOpen}
        submission={viewSubmission}
        onClose={() => { setDialogOpen(false); setViewSubmission(null); }}
        getAccessToken={getAccessToken}
      />
    </>
  );
}
