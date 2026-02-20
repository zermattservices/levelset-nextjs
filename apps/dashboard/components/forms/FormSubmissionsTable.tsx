/**
 * FormSubmissionsTable — DataGrid Pro table for form submissions.
 *
 * Shows submissions with filters for type, status, and date range.
 * Clicking a row opens the SubmissionDetailDialog.
 */

import * as React from 'react';
import {
  DataGridPro,
  type GridColDef,
  type GridRowsProp,
  gridClasses,
} from '@mui/x-data-grid-pro';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import sty from './FormSubmissionsTable.module.css';
import { SubmissionDetailDialog } from './SubmissionDetailDialog';
import type { FormSubmission, FormType, SubmissionStatus } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; bg: string; text: string }> = {
  submitted: {
    label: 'Submitted',
    bg: 'var(--ls-color-brand-soft)',
    text: 'var(--ls-color-brand)',
  },
  approved: {
    label: 'Approved',
    bg: 'var(--ls-color-success-soft)',
    text: 'var(--ls-color-success)',
  },
  rejected: {
    label: 'Rejected',
    bg: 'var(--ls-color-destructive-soft)',
    text: 'var(--ls-color-destructive)',
  },
  draft: {
    label: 'Draft',
    bg: 'var(--ls-color-neutral-foreground)',
    text: 'var(--ls-color-muted)',
  },
};

const TYPE_CONFIG: Record<FormType, { label: string; bg: string; text: string }> = {
  rating: { label: 'Rating', bg: 'var(--ls-color-brand-soft)', text: 'var(--ls-color-brand)' },
  discipline: { label: 'Discipline', bg: 'var(--ls-color-warning-soft)', text: 'var(--ls-color-warning)' },
  evaluation: { label: 'Evaluation', bg: 'var(--ls-color-success-soft)', text: 'var(--ls-color-success)' },
  custom: { label: 'Custom', bg: 'var(--ls-color-neutral-foreground)', text: 'var(--ls-color-muted)' },
};

interface FormSubmissionsTableProps {
  /** Submissions data */
  submissions: FormSubmission[];
  /** Loading state */
  loading?: boolean;
  /** Filter: restrict to a specific template */
  templateId?: string;
  /** Whether to show the form name column (hide when viewing a single template) */
  showFormName?: boolean;
  /** Refresh callback after status update */
  onRefresh?: () => void;
  /** Access token getter for API calls */
  getAccessToken: () => Promise<string | null>;
}

export function FormSubmissionsTable({
  submissions,
  loading = false,
  showFormName = true,
  onRefresh,
  getAccessToken,
}: FormSubmissionsTableProps) {
  const [statusFilter, setStatusFilter] = React.useState<SubmissionStatus | ''>('');
  const [typeFilter, setTypeFilter] = React.useState<FormType | ''>('');
  const [selectedSubmission, setSelectedSubmission] = React.useState<FormSubmission | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  // Filter submissions
  const filteredSubmissions = React.useMemo(() => {
    let result = submissions;
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (typeFilter) {
      result = result.filter((s) => s.form_type === typeFilter);
    }
    return result;
  }, [submissions, statusFilter, typeFilter]);

  const rows: GridRowsProp = React.useMemo(() => {
    return filteredSubmissions.map((sub) => ({
      id: sub.id,
      form_name: sub.template?.name || 'Unknown Form',
      form_type: sub.form_type,
      submitted_by_name: sub.submitted_by_name || 'Unknown',
      employee_name: sub.employee_name || '—',
      status: sub.status,
      score: sub.score,
      created_at: sub.created_at,
      _raw: sub,
    }));
  }, [filteredSubmissions]);

  const columns: GridColDef[] = React.useMemo(() => {
    const cols: GridColDef[] = [];

    if (showFormName) {
      cols.push({
        field: 'form_name',
        headerName: 'Form',
        width: 220,
        sortable: true,
        resizable: false,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography
              sx={{
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ls-color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {params.value}
            </Typography>
          </Box>
        ),
      });
    }

    cols.push(
      {
        field: 'form_type',
        headerName: 'Type',
        width: 120,
        sortable: true,
        resizable: false,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => {
          const config = TYPE_CONFIG[params.value as FormType] || TYPE_CONFIG.custom;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <Chip
                label={config.label}
                size="small"
                sx={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  height: 22,
                  borderRadius: '6px',
                  backgroundColor: config.bg,
                  color: config.text,
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'submitted_by_name',
        headerName: 'Submitted By',
        width: 180,
        sortable: true,
        resizable: false,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500 }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'employee_name',
        headerName: 'Employee',
        width: 180,
        sortable: true,
        resizable: false,
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontFamily, fontSize: 13, fontWeight: 500, color: 'var(--ls-color-neutral-soft-foreground)' }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        sortable: true,
        resizable: false,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => {
          const config = STATUS_CONFIG[params.value as SubmissionStatus] || STATUS_CONFIG.submitted;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
              <Chip
                label={config.label}
                size="small"
                sx={{
                  fontFamily,
                  fontSize: 11,
                  fontWeight: 600,
                  height: 22,
                  borderRadius: '6px',
                  backgroundColor: config.bg,
                  color: config.text,
                }}
              />
            </Box>
          );
        },
      },
      {
        field: 'score',
        headerName: 'Score',
        width: 100,
        sortable: true,
        resizable: false,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
            <Typography
              sx={{
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                color: params.value != null ? 'var(--ls-color-text-primary)' : 'var(--ls-color-muted)',
              }}
            >
              {params.value != null ? `${Math.round(params.value)}%` : '—'}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'created_at',
        headerName: 'Date',
        width: 160,
        sortable: true,
        resizable: false,
        renderCell: (params) => {
          const date = new Date(params.value);
          const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-muted)' }}>
                {formatted}
              </Typography>
            </Box>
          );
        },
      }
    );

    return cols;
  }, [showFormName]);

  const handleRowClick = (params: any) => {
    const raw = params.row._raw as FormSubmission;
    setSelectedSubmission(raw);
    setDetailOpen(true);
  };

  const handleStatusUpdate = () => {
    setDetailOpen(false);
    setSelectedSubmission(null);
    if (onRefresh) onRefresh();
  };

  return (
    <div className={sty.tableWrapper}>
      {/* Filters */}
      <div className={sty.filters}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ fontFamily, fontSize: 13 }}>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | '')}
            sx={{ fontFamily, fontSize: 13 }}
          >
            <MenuItem value="" sx={{ fontFamily, fontSize: 13 }}>All</MenuItem>
            <MenuItem value="submitted" sx={{ fontFamily, fontSize: 13 }}>Submitted</MenuItem>
            <MenuItem value="approved" sx={{ fontFamily, fontSize: 13 }}>Approved</MenuItem>
            <MenuItem value="rejected" sx={{ fontFamily, fontSize: 13 }}>Rejected</MenuItem>
            <MenuItem value="draft" sx={{ fontFamily, fontSize: 13 }}>Draft</MenuItem>
          </Select>
        </FormControl>

        {showFormName && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ fontFamily, fontSize: 13 }}>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value as FormType | '')}
              sx={{ fontFamily, fontSize: 13 }}
            >
              <MenuItem value="" sx={{ fontFamily, fontSize: 13 }}>All</MenuItem>
              <MenuItem value="rating" sx={{ fontFamily, fontSize: 13 }}>Rating</MenuItem>
              <MenuItem value="discipline" sx={{ fontFamily, fontSize: 13 }}>Discipline</MenuItem>
              <MenuItem value="evaluation" sx={{ fontFamily, fontSize: 13 }}>Evaluation</MenuItem>
              <MenuItem value="custom" sx={{ fontFamily, fontSize: 13 }}>Custom</MenuItem>
            </Select>
          </FormControl>
        )}

        <span className={sty.resultCount}>
          {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* DataGrid */}
      <DataGridPro
        rows={rows}
        columns={columns}
        loading={loading}
        pagination
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25 },
          },
          sorting: {
            sortModel: [{ field: 'created_at', sort: 'desc' }],
          },
        }}
        disableRowSelectionOnClick
        disableColumnResize
        showColumnVerticalBorder={false}
        rowHeight={48}
        columnHeaderHeight={48}
        onRowClick={handleRowClick}
        autoHeight
        sx={{
          fontFamily,
          border: '1px solid var(--ls-color-muted-border)',
          borderRadius: '12px',

          [`& .${gridClasses.columnHeaders}`]: {
            borderBottom: '1px solid var(--ls-color-muted-border)',
          },
          [`& .${gridClasses.columnHeader}`]: {
            backgroundColor: 'var(--ls-color-neutral-foreground)',
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--ls-color-muted)',
            fontFamily,
            '&:focus, &:focus-within': { outline: 'none' },
          },
          [`& .${gridClasses.columnSeparator}`]: { display: 'none' },
          [`& .${gridClasses.cell}`]: {
            borderBottom: '1px solid var(--ls-color-muted-soft)',
            borderRight: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ls-color-neutral-soft-foreground)',
            fontFamily,
            '&:focus, &:focus-within': { outline: 'none' },
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
          },
          [`& .${gridClasses.row}:hover`]: {
            backgroundColor: 'var(--ls-color-neutral-foreground)',
            cursor: 'pointer',
          },
          [`& .${gridClasses.footerContainer}`]: {
            borderTop: '1px solid var(--ls-color-muted-border)',
            fontFamily,
          },
          '& .MuiTablePagination-root': {
            fontFamily,
            color: 'var(--ls-color-muted)',
          },
        }}
      />

      {/* Detail Dialog */}
      <SubmissionDetailDialog
        open={detailOpen}
        submission={selectedSubmission}
        onClose={() => {
          setDetailOpen(false);
          setSelectedSubmission(null);
        }}
        onStatusUpdate={handleStatusUpdate}
        getAccessToken={getAccessToken}
      />
    </div>
  );
}
