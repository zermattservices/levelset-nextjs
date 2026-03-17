import * as React from 'react';
import { DataGridPro, GridColDef, gridClasses } from '@mui/x-data-grid-pro';
import { Box, Button, Chip, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import type { EvaluationItem, EvaluationStatus, EvaluationSource } from '@/lib/evaluations/types';
import { EvaluationScoreSummary } from './EvaluationScoreSummary';
import { OverrideMenu } from './OverrideMenu';

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
    label: 'Certification — Pending',
    bg: 'var(--ls-color-brand-soft)',
    color: 'var(--ls-color-brand-base)',
  },
  certification_pip: {
    label: 'Certification — PIP',
    bg: 'var(--ls-color-warning-soft)',
    color: 'var(--ls-color-warning-base)',
  },
  manual: {
    label: 'Manual',
    bg: 'var(--ls-color-muted-soft)',
    color: 'var(--ls-color-muted)',
  },
};

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
}

export function MyEvaluationsTable({ items, loading, onRefresh, canManage }: MyEvaluationsTableProps) {
  const [viewScoreId, setViewScoreId] = React.useState<string | null>(null);

  const columns = React.useMemo<GridColDef<EvaluationItem>[]>(
    () => [
      {
        field: 'employee',
        headerName: 'Employee',
        width: 180,
        valueGetter: (value: EvaluationItem['employee']) => value?.name ?? '',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)' }}>
              {params.row.employee?.name ?? '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 140,
        valueGetter: (_value, row) => row.employee?.role ?? '',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-muted)' }}>
              {params.row.employee?.role ?? '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'evaluation',
        headerName: 'Evaluation',
        flex: 1,
        minWidth: 180,
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
        field: 'source',
        headerName: 'Source',
        width: 220,
        renderCell: (params) => {
          const chip = SOURCE_CHIP[params.row.source] ?? SOURCE_CHIP.manual;
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
        field: 'status',
        headerName: 'Status',
        width: 140,
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
        width: 160,
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
        width: 200,
        sortable: false,
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
                  onClick={() => setViewScoreId(item.last_submission_id)}
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
                        console.log('[EvaluationsPage] Start review for item:', item.id);
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
                      Start Review
                    </Button>
                  </span>
                </Tooltip>
              )}

              {item.source === 'scheduled' && item.rule_id && item.period_start && canManage && (
                <OverrideMenu
                  ruleId={item.rule_id}
                  employeeId={item.employee.id}
                  periodStart={item.period_start}
                  onOverrideCreated={onRefresh}
                />
              )}
            </Box>
          );
        },
      },
    ],
    [canManage, onRefresh]
  );

  const rowHeight = 52;
  const headerHeight = 56;
  const minRows = 1;
  const gridHeight = headerHeight + Math.max(items.length, minRows) * rowHeight + 2;

  if (!loading && items.length === 0) {
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
          loading={loading}
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
              padding: '0 16px',
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

      {viewScoreId && (
        <EvaluationScoreSummary
          submissionId={viewScoreId}
          onClose={() => setViewScoreId(null)}
        />
      )}
    </>
  );
}
