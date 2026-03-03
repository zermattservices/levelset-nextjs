/**
 * LeadsPage
 * Admin CRM page for viewing and managing all marketing leads
 */

import * as React from 'react';
import { CircularProgress, TextField, InputAdornment } from '@mui/material';
import { DataGridPro, type GridColDef, type GridRowParams } from '@mui/x-data-grid-pro';
import SearchIcon from '@mui/icons-material/Search';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './LeadsPage.module.css';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = ['new', 'contacted', 'trial', 'onboarded', 'converted', 'lost'] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

const STAGE_COLORS: Record<string, string> = {
  new: '#2196F3',
  contacted: '#FF9800',
  trial: '#9C27B0',
  onboarded: '#00897B',
  converted: '#4CAF50',
  lost: '#F44336',
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  trial: 'Trial',
  onboarded: 'Onboarded',
  converted: 'Converted',
  lost: 'Lost',
};

interface Lead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  operator_name: string | null;
  store_number: string | null;
  source: string | null;
  pipeline_stage: PipelineStage;
  engagement_score: number;
  estimated_value_cents: number;
  created_at: string;
}

interface LeadsPageProps {
  onSelectLead: (leadId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadsPage({ onSelectLead }: LeadsPageProps) {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<string>('all');

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch leads
  React.useEffect(() => {
    async function fetchLeads() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('id, email, first_name, last_name, operator_name, store_number, source, pipeline_stage, engagement_score, estimated_value_cents, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLeads((data as Lead[]) || []);
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [supabase]);

  // Filter leads
  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      // Stage filter
      if (stageFilter !== 'all' && lead.pipeline_stage !== stageFilter) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesEmail = lead.email?.toLowerCase().includes(query);
        const matchesFirst = lead.first_name?.toLowerCase().includes(query);
        const matchesLast = lead.last_name?.toLowerCase().includes(query);
        const matchesStore = lead.store_number?.toLowerCase().includes(query);
        if (!matchesEmail && !matchesFirst && !matchesLast && !matchesStore) {
          return false;
        }
      }
      return true;
    });
  }, [leads, searchQuery, stageFilter]);

  // Summary stats
  const totalLeads = filteredLeads.length;
  const totalPipelineValue = React.useMemo(() => {
    return filteredLeads.reduce((sum, lead) => sum + (lead.estimated_value_cents || 0), 0);
  }, [filteredLeads]);

  // DataGrid columns — all use flex so the grid auto-fits the container
  const columns: GridColDef[] = React.useMemo(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        valueGetter: (_value: unknown, row: Lead) => {
          const first = row.first_name || '';
          const last = row.last_name || '';
          return `${first} ${last}`.trim() || '--';
        },
        renderCell: (params) => (
          <span className={styles.cellName}>{params.value || '--'}</span>
        ),
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1.5,
        renderCell: (params) => (
          <span className={styles.cellEmail}>{params.value}</span>
        ),
      },
      {
        field: 'store_number',
        headerName: 'Store #',
        flex: 0.5,
        renderCell: (params) => (
          <span className={styles.cellMuted}>{params.value || '--'}</span>
        ),
      },
      {
        field: 'operator_name',
        headerName: 'Operator',
        flex: 1,
        renderCell: (params) => (
          <span className={styles.cellMuted}>{params.value || '--'}</span>
        ),
      },
      {
        field: 'pipeline_stage',
        headerName: 'Stage',
        flex: 0.7,
        renderCell: (params) => {
          const stage = params.value as string;
          const color = STAGE_COLORS[stage] || '#999';
          return (
            <span
              className={styles.stageChip}
              style={{ color }}
            >
              {STAGE_LABELS[stage] || stage}
            </span>
          );
        },
      },
      {
        field: 'engagement_score',
        headerName: 'Engagement',
        flex: 0.6,
        headerAlign: 'center' as const,
        align: 'center' as const,
        renderCell: (params) => (
          <span className={styles.cellScore}>{params.value ?? 0}</span>
        ),
      },
      {
        field: 'estimated_value_cents',
        headerName: 'Est. Value',
        flex: 0.6,
        headerAlign: 'right' as const,
        align: 'right' as const,
        renderCell: (params) => (
          <span className={styles.cellValue}>
            {formatCurrency(params.value ?? 0)}
          </span>
        ),
      },
      {
        field: 'source',
        headerName: 'Source',
        flex: 0.6,
        renderCell: (params) => (
          <span className={styles.cellSource}>{params.value || '--'}</span>
        ),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        flex: 0.7,
        renderCell: (params) => (
          <span className={styles.cellDate}>{relativeDate(params.value)}</span>
        ),
      },
    ],
    []
  );

  // Row click handler
  const handleRowClick = React.useCallback(
    (params: GridRowParams) => {
      onSelectLead(params.id as string);
    },
    [onSelectLead]
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={40} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.intro}>
        <h1 className={styles.title}>Leads</h1>
        <p className={styles.description}>
          Track and manage all inbound marketing leads through the pipeline.
        </p>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{totalLeads}</span>
          <span className={styles.summaryLabel}>Total Leads</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{formatCurrency(totalPipelineValue)}</span>
          <span className={styles.summaryLabel}>Pipeline Value</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <TextField
          placeholder="Search by name, email, or store #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          className={styles.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'var(--ls-color-disabled-text)', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 14,
              borderRadius: '8px',
              '&:hover fieldset': { borderColor: 'var(--ls-color-brand)' },
              '&.Mui-focused fieldset': { borderColor: 'var(--ls-color-brand)' },
            },
          }}
        />
        <select
          className={styles.filterSelect}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </div>

      {/* DataGrid */}
      <div className={styles.gridContainer}>
        <DataGridPro
          rows={filteredLeads}
          columns={columns}
          onRowClick={handleRowClick}
          disableColumnMenu
          disableRowSelectionOnClick
          hideFooterSelectedRowCount
          pagination
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          getRowClassName={() => styles.gridRow}
          sx={{
            border: 'none',
            fontFamily: '"Satoshi", sans-serif',
            fontSize: 14,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'var(--ls-color-bg-surface)',
              borderBottom: '1px solid var(--ls-color-muted-border)',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--ls-color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid var(--ls-color-muted-soft)',
              padding: '0 16px',
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'var(--ls-color-success-foreground)',
              },
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid var(--ls-color-muted-border)',
            },
            '& .MuiTablePagination-root': {
              fontFamily: '"Satoshi", sans-serif',
              fontSize: 13,
            },
          }}
        />
      </div>

      {/* Empty state */}
      {filteredLeads.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            {searchQuery || stageFilter !== 'all'
              ? 'No leads found matching your filters.'
              : 'No leads yet.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default LeadsPage;
