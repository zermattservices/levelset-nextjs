import * as React from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Stack,
  Chip,
  Badge,
  Menu,
  MenuItem,
  Divider,
  InputAdornment,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  DataGridPro,
  GridColDef,
  GridRowsProp,
  Toolbar,
  ToolbarButton,
  FilterPanelTrigger,
  ColumnsPanelTrigger,
  QuickFilter,
  QuickFilterTrigger,
  QuickFilterControl,
  QuickFilterClear,
  getGridNumericOperators,
  getGridStringOperators,
  GridFilterOperator
} from '@mui/x-data-grid-pro';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import { createSupabaseClient } from '@/util/supabase/component';
import type { Rating, PositionBig5Labels } from '@/lib/supabase.types';
import { cleanPositionName, FOH_POSITIONS, BOH_POSITIONS } from '@/lib/ratings-data';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';
const fohColor = '#006391';
const bohColor = '#ffcc5b';
const fohColorLight = '#eaf9ff';
const bohColorLight = '#fffcf0';

export interface PositionalRatingsProps {
  orgId: string;
  locationId: string;
  className?: string;
  width?: string | number;
  maxWidth?: string | number;
}

interface RatingRow extends Rating {
  id: string;
  employee_name: string;
  employee_role: string;
  rater_name: string;
  position_cleaned: string;
  formatted_date: string;
}

type OwnerState = {
  expanded: boolean;
};

const StyledContainer = styled(Box)<{ componentwidth?: string | number; componentmaxwidth?: string | number }>(
  ({ componentwidth, componentmaxwidth }) => ({
    width: componentwidth || '100%',
    maxWidth: componentmaxwidth || '100%',
    fontFamily,
  })
);

const FilterContainer = styled(Box)({
  display: 'flex',
  gap: 16,
  marginBottom: 16,
  alignItems: 'center',
  justifyContent: 'space-between',
});

const DateRangeContainer = styled(Box)({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
});

const PillButton = styled(Button)<{ selected?: boolean }>(({ selected }) => ({
  fontFamily,
  fontSize: 13,
  fontWeight: 500,
  padding: '6px 16px',
  borderRadius: 20,
  textTransform: 'none',
  border: 'none',
  boxShadow: 'none',
  backgroundColor: selected ? levelsetGreen : '#f3f4f6',
  color: selected ? '#fff' : '#6b7280',
  '&:hover': {
    backgroundColor: selected ? levelsetGreen : '#e5e7eb',
    boxShadow: 'none',
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

const PositionChip = styled(Chip)<{ positiontype: 'FOH' | 'BOH' }>(({ positiontype }) => {
  const color = positiontype === 'FOH' ? fohColor : bohColor;
  return {
    fontFamily,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: color,
    color: '#fff',
    borderRadius: 16,
    height: 24,
  };
});

const RoleChip = styled(Chip)<{ roletype: string }>(({ roletype }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    'New Hire': { bg: '#f0fdf4', color: '#166534' },
    'Team Member': { bg: '#eff6ff', color: '#1d4ed8' },
    'Trainer': { bg: '#fef2f2', color: '#dc2626' },
    'Team Lead': { bg: '#fef3c7', color: '#d97706' },
    'Director': { bg: '#f3e8ff', color: '#7c3aed' },
    'Executive': { bg: '#F0F0FF', color: '#483D8B' },
    'Operator': { bg: '#F0F0FF', color: '#483D8B' },
  };
  
  const style = styles[roletype] || styles['Team Member'];
  
  return {
    fontFamily,
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: style.bg,
    color: style.color,
    height: 24,
    borderRadius: 12,
    '& .MuiChip-label': {
      padding: '0 8px',
    },
  };
});

const StyledDataGrid = styled(DataGridPro)({
  fontFamily,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  '& .MuiDataGrid-columnHeader': {
    backgroundColor: '#f9fafb',
    fontWeight: 600,
    fontSize: 14,
    color: '#111827',
    fontFamily,
  },
  '& .MuiDataGrid-cell': {
    fontSize: 13,
    color: '#111827',
    fontFamily,
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    borderRight: 'none !important',
  },
  '& .MuiDataGrid-row': {
    minHeight: '48px !important',
    maxHeight: '48px !important',
  },
  '& .MuiDataGrid-row:hover': {
    backgroundColor: '#f9fafb',
  },
  '& .MuiDataGrid-columnHeaderTitle': {
    fontWeight: 600,
    fontFamily,
  },
  '& .MuiDataGrid-columnSeparator': {
    display: 'none !important',
  },
  '& .MuiDataGrid-iconSeparator': {
    display: 'none !important',
  },
  '& .MuiDataGrid-toolbarContainer': {
    padding: '12px',
    gap: '8px',
    borderBottom: '1px solid #e5e7eb',
    '& .MuiButton-root': {
      fontFamily,
      fontSize: 12,
      textTransform: 'none',
    },
  },
  '& .MuiCircularProgress-root': {
    color: levelsetGreen,
  },
  '& .MuiLinearProgress-root': {
    backgroundColor: '#e5e7eb',
    '& .MuiLinearProgress-bar': {
      backgroundColor: levelsetGreen,
    },
  },
});

const StyledQuickFilter = styled(QuickFilter)({
  display: 'grid',
  alignItems: 'center',
});

const StyledToolbarButton = styled(ToolbarButton)<{ ownerState: OwnerState }>(
  ({ theme, ownerState }) => ({
    gridArea: '1 / 1',
    width: 'min-content',
    height: 'min-content',
    zIndex: 1,
    opacity: ownerState.expanded ? 0 : 1,
    pointerEvents: ownerState.expanded ? 'none' : 'auto',
    transition: theme.transitions.create(['opacity']),
  }),
);

const StyledTextField = styled(TextField)<{ ownerState: OwnerState }>(
  ({ theme, ownerState }) => ({
    gridArea: '1 / 1',
    overflowX: 'clip',
    width: ownerState.expanded ? 260 : 'var(--trigger-width)',
    opacity: ownerState.expanded ? 1 : 0,
    transition: theme.transitions.create(['width', 'opacity']),
  }),
);

// Helper to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear() % 100;
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${month}/${day}/${year} ${displayHours}:${displayMinutes} ${ampm}`;
};

// Helper to get rating color
const getRatingColor = (rating: number | null): string => {
  if (rating === null || rating === undefined) return 'transparent';
  if (rating >= 2.75) return '#249e6b';
  if (rating >= 1.75) return '#ffb549';
  if (rating >= 1.0) return '#ad2624';
  return 'transparent';
};

export function PositionalRatings({
  orgId,
  locationId,
  className = '',
  width,
  maxWidth,
}: PositionalRatingsProps) {
  const [rows, setRows] = React.useState<GridRowsProp>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Filter states
  const [showFOH, setShowFOH] = React.useState(true);
  const [showBOH, setShowBOH] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<'mtd' | 'qtd' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [ratingToDelete, setRatingToDelete] = React.useState<RatingRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  
  // Big 5 labels cache
  const [big5LabelsCache, setBig5LabelsCache] = React.useState<Map<string, PositionBig5Labels>>(new Map());

  // Calculate date range based on preset
  const getDateRange = React.useCallback((preset: string): [Date, Date] => {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);
    
    switch (preset) {
      case 'mtd':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'qtd':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    return [start, end];
  }, []);

  // Fetch Big 5 labels for a position
  const fetchBig5Labels = React.useCallback(async (position: string) => {
    if (big5LabelsCache.has(position)) {
      return big5LabelsCache.get(position);
    }
    
    try {
      const response = await fetch(
        `/api/position-labels?org_id=${orgId}&location_id=${locationId}&position=${encodeURIComponent(position)}`
      );
      const result = await response.json();
      
      if (result.success && result.labels) {
        setBig5LabelsCache(prev => new Map(prev).set(position, result.labels));
        return result.labels;
      }
    } catch (err) {
      console.error('Error fetching Big 5 labels:', err);
    }
    
    return null;
  }, [orgId, locationId, big5LabelsCache]);

  // Fetch ratings data
  const fetchRatings = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabase = createSupabaseClient();
      const [startDateFilter, endDateFilter] = startDate && endDate 
        ? [startDate, endDate]
        : getDateRange(dateRange);
      
      // Build query
      let query = supabase
        .from('ratings')
        .select(`
          *,
          employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name, role, is_foh, is_boh),
          rater:employees!ratings_rater_user_id_fkey(full_name)
        `)
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .gte('created_at', startDateFilter.toISOString())
        .lte('created_at', endDateFilter.toISOString())
        .order('created_at', { ascending: false });
      
      const { data: ratings, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      // Transform data
      const transformedRows: RatingRow[] = (ratings || [])
        .filter((rating: any) => {
          // Filter by FOH/BOH based on position, not employee flags
          const isFOHPosition = FOH_POSITIONS.includes(rating.position);
          const isBOHPosition = BOH_POSITIONS.includes(rating.position);
          
          // If both unchecked, show nothing
          if (!showFOH && !showBOH) return false;
          
          // If only FOH checked, show only FOH positions
          if (showFOH && !showBOH) return isFOHPosition;
          
          // If only BOH checked, show only BOH positions
          if (!showFOH && showBOH) return isBOHPosition;
          
          // If both checked, show all
          return true;
        })
        .map((rating: any) => {
          const employeeName = rating.employee?.full_name || 
            `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim() || 
            'Unknown';
          const raterName = rating.rater?.full_name || 'Unknown';
          const employeeRole = rating.employee?.role || 'Team Member';
          
          return {
            ...rating,
            id: rating.id,
            employee_name: employeeName,
            employee_role: employeeRole,
            rater_name: raterName,
            position_cleaned: cleanPositionName(rating.position),
            formatted_date: formatDate(rating.created_at)
          };
        });
      
      setRows(transformedRows);
      
      // Prefetch Big 5 labels for all positions
      const positionsSet = new Set(transformedRows.map(r => r.position));
      const uniquePositions = Array.from(positionsSet);
      uniquePositions.forEach(pos => fetchBig5Labels(pos));
      
    } catch (err) {
      console.error('Error fetching ratings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ratings');
    } finally {
      setLoading(false);
    }
  }, [orgId, locationId, showFOH, showBOH, dateRange, startDate, endDate, getDateRange, fetchBig5Labels]);

  // Initial load
  React.useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Handle delete
  const handleDeleteClick = (row: RatingRow) => {
    setRatingToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ratingToDelete) return;
    
    setDeleting(true);
    
    try {
      const supabase = createSupabaseClient();
      const { error: deleteError } = await supabase
        .from('ratings')
        .delete()
        .eq('id', ratingToDelete.id);
      
      if (deleteError) throw deleteError;
      
      // Remove from local state
      setRows(prev => prev.filter(r => r.id !== ratingToDelete.id));
      setDeleteModalOpen(false);
      setRatingToDelete(null);
    } catch (err) {
      console.error('Error deleting rating:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete rating');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setRatingToDelete(null);
  };

  // Handle date range preset
  const handleDateRangePreset = (preset: 'mtd' | 'qtd' | '30d' | '90d') => {
    setDateRange(preset);
    setStartDate(null);
    setEndDate(null);
  };

  // Handle custom date range
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    setDateRange('custom');
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    setDateRange('custom');
  };

  // Custom toolbar
  function CustomToolbar() {
    return (
      <Toolbar>
        {/* Left side - FOH/BOH and Date filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
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
          
          <DateRangeContainer>
            <PillButton
              selected={dateRange === 'mtd'}
              onClick={() => handleDateRangePreset('mtd')}
            >
              MTD
            </PillButton>
            <PillButton
              selected={dateRange === 'qtd'}
              onClick={() => handleDateRangePreset('qtd')}
            >
              QTD
            </PillButton>
            <PillButton
              selected={dateRange === '30d'}
              onClick={() => handleDateRangePreset('30d')}
            >
              Last 30 Days
            </PillButton>
            <PillButton
              selected={dateRange === '90d'}
              onClick={() => handleDateRangePreset('90d')}
            >
              Last 90 Days
            </PillButton>
            
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={handleStartDateChange}
              format="M/d/yyyy"
              slotProps={{
                textField: {
                  size: 'small',
                  InputProps: {
                    sx: {
                      fontFamily,
                      fontSize: 11,
                    },
                  },
                  InputLabelProps: {
                    sx: {
                      fontFamily,
                      fontSize: 11,
                    },
                  },
                  sx: {
                    width: 130,
                  },
                },
              }}
            />
            
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              format="M/d/yyyy"
              slotProps={{
                textField: {
                  size: 'small',
                  InputProps: {
                    sx: {
                      fontFamily,
                      fontSize: 11,
                    },
                  },
                  InputLabelProps: {
                    sx: {
                      fontFamily,
                      fontSize: 11,
                    },
                  },
                  sx: {
                    width: 130,
                  },
                },
              }}
            />
          </DateRangeContainer>
        </Box>

        {/* Right side - Toolbar buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="Columns">
            <ColumnsPanelTrigger render={<ToolbarButton />}>
              <ViewColumnIcon fontSize="small" />
            </ColumnsPanelTrigger>
          </Tooltip>

          <Tooltip title="Filters">
            <FilterPanelTrigger
              render={(props, state) => (
                <ToolbarButton {...props} color="default">
                  <Badge badgeContent={state.filterCount} color="primary" variant="dot">
                    <FilterListIcon fontSize="small" />
                  </Badge>
                </ToolbarButton>
              )}
            />
          </Tooltip>

          <StyledQuickFilter>
            <QuickFilterTrigger
              render={(triggerProps, state) => (
                <Tooltip title="Search" enterDelay={0}>
                  <StyledToolbarButton
                    {...triggerProps}
                    ownerState={{ expanded: state.expanded }}
                    color="default"
                    aria-disabled={state.expanded}
                  >
                    <SearchIcon fontSize="small" />
                  </StyledToolbarButton>
                </Tooltip>
              )}
            />
            <QuickFilterControl
              render={({ ref, ...controlProps }, state) => (
                <StyledTextField
                  {...controlProps}
                  ownerState={{ expanded: state.expanded }}
                  inputRef={ref}
                  aria-label="Search"
                  placeholder="Search..."
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      endAdornment: state.value ? (
                        <InputAdornment position="end">
                          <QuickFilterClear
                            edge="end"
                            size="small"
                            aria-label="Clear search"
                            material={{ sx: { marginRight: -0.75 } }}
                          >
                            <CancelIcon fontSize="small" />
                          </QuickFilterClear>
                        </InputAdornment>
                      ) : null,
                      ...controlProps.slotProps?.input,
                      sx: { fontFamily, fontSize: 12 },
                    },
                    ...controlProps.slotProps,
                  }}
                />
              )}
            />
          </StyledQuickFilter>
        </Box>
      </Toolbar>
    );
  }

  // Custom numeric operators for rating columns
  const ratingOperators: GridFilterOperator[] = getGridNumericOperators()
    .filter(op => ['>', '<', '>=', '<=', '='].includes(op.value));

  // Define columns
  const columns: GridColDef[] = [
    {
      field: 'formatted_date',
      headerName: 'Date',
      width: 140,
      sortable: true,
      filterable: true,
      renderCell: (params) => (
        <Box sx={{ fontFamily, fontSize: 11 }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: 'employee_name',
      headerName: 'Employee',
      width: 160,
      sortable: true,
      filterable: true,
    },
    {
      field: 'employee_role',
      headerName: 'Employee Role',
      width: 140,
      sortable: true,
      filterable: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const role = params.value as string;
        return <RoleChip label={role} size="small" roletype={role} />;
      },
    },
    {
      field: 'rater_name',
      headerName: 'Leader',
      width: 160,
      sortable: true,
      filterable: true,
    },
    {
      field: 'position_cleaned',
      headerName: 'Position',
      width: 120,
      sortable: true,
      filterable: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const row = params.row as RatingRow;
        const isFOH = FOH_POSITIONS.includes(row.position);
        const positionType = isFOH ? 'FOH' : 'BOH';
        return <PositionChip label={params.value} size="small" positiontype={positionType} />;
      },
    },
    {
      field: 'rating_1',
      headerName: 'Criteria 1',
      width: 95,
      type: 'number',
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip title={labels?.label_1 || 'Criteria 1'} arrow placement="bottom">
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: getRatingColor(rating),
                color: rating ? '#fff !important' : '#111827',
                fontWeight: rating ? 600 : 400,
                fontFamily,
              }}
            >
              {rating?.toFixed(2) || '—'}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'rating_2',
      headerName: 'Criteria 2',
      width: 95,
      type: 'number',
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip title={labels?.label_2 || 'Criteria 2'} arrow placement="bottom">
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: getRatingColor(rating),
                color: rating ? '#fff !important' : '#111827',
                fontWeight: rating ? 600 : 400,
                fontFamily,
              }}
            >
              {rating?.toFixed(2) || '—'}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'rating_3',
      headerName: 'Criteria 3',
      width: 95,
      type: 'number',
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip title={labels?.label_3 || 'Criteria 3'} arrow placement="bottom">
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: getRatingColor(rating),
                color: rating ? '#fff !important' : '#111827',
                fontWeight: rating ? 600 : 400,
                fontFamily,
              }}
            >
              {rating?.toFixed(2) || '—'}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'rating_4',
      headerName: 'Criteria 4',
      width: 95,
      type: 'number',
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip title={labels?.label_4 || 'Criteria 4'} arrow placement="bottom">
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: getRatingColor(rating),
                color: rating ? '#fff !important' : '#111827',
                fontWeight: rating ? 600 : 400,
                fontFamily,
              }}
            >
              {rating?.toFixed(2) || '—'}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'rating_5',
      headerName: 'Criteria 5',
      width: 95,
      type: 'number',
      sortable: false,
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip title={labels?.label_5 || 'Criteria 5'} arrow placement="bottom">
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: getRatingColor(rating),
                color: rating ? '#fff !important' : '#111827',
                fontWeight: rating ? 600 : 400,
                fontFamily,
              }}
            >
              {rating?.toFixed(2) || '—'}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      field: 'rating_avg',
      headerName: 'Overall',
      width: 95,
      type: 'number',
      sortable: true,
      filterable: true,
      headerAlign: 'center',
      align: 'center',
      filterOperators: ratingOperators,
      renderCell: (params) => {
        const rating = params.value as number | null;
        
        return (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: getRatingColor(rating),
              color: rating ? '#fff !important' : '#111827',
              fontWeight: rating ? 600 : 400,
              fontFamily,
            }}
          >
            {rating?.toFixed(2) || '—'}
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      disableExport: true,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const row = params.row as RatingRow;
        
        return (
          <IconButton
            onClick={() => handleDeleteClick(row)}
            size="small"
            sx={{ color: '#dc2626' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      },
    },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <StyledContainer className={className} componentwidth={width} componentmaxwidth={maxWidth}>
        <Typography variant="h5" sx={{ fontFamily, fontWeight: 600, mb: 2, color: '#111827' }}>
          Positional Ratings
        </Typography>
        
        {/* Error Display */}
        {error && (
          <Typography color="error" sx={{ mb: 2, fontFamily }}>
            {error}
          </Typography>
        )}
        
        {/* Data Grid */}
        <Box sx={{ height: 650, width: '100%' }}>
          <StyledDataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            pagination
            pageSizeOptions={[25, 50, 100, 250]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 50 },
              },
              sorting: {
                sortModel: [{ field: 'formatted_date', sort: 'desc' }],
              },
              columns: {
                columnVisibilityModel: {
                  actions: true,
                },
              },
            }}
            disableRowSelectionOnClick
            rowHeight={48}
            slots={{
              toolbar: CustomToolbar,
            }}
            showToolbar
            sx={{
              '& .MuiDataGrid-cell--withRenderer': {
                padding: '0 !important',
              },
            }}
          />
        </Box>
        
        {/* Delete Confirmation Modal */}
        <Dialog
          open={deleteModalOpen}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontFamily, fontWeight: 600 }}>
            Confirm Delete
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontFamily, mb: 2 }}>
              Are you sure you want to delete this rating submission?
            </Typography>
            {ratingToDelete && (
              <Stack spacing={1}>
                <Typography sx={{ fontFamily }}>
                  <strong>Employee:</strong> {ratingToDelete.employee_name}
                </Typography>
                <Typography sx={{ fontFamily }}>
                  <strong>Leader:</strong> {ratingToDelete.rater_name}
                </Typography>
                <Typography sx={{ fontFamily }}>
                  <strong>Position:</strong> {ratingToDelete.position_cleaned}
                </Typography>
                <Typography sx={{ fontFamily }}>
                  <strong>Date:</strong> {ratingToDelete.formatted_date}
                </Typography>
                <Typography sx={{ fontFamily }}>
                  <strong>Overall Rating:</strong>{' '}
                  <Chip
                    label={ratingToDelete.rating_avg?.toFixed(2) || '—'}
                    size="small"
                    sx={{
                      backgroundColor: getRatingColor(ratingToDelete.rating_avg),
                      color: '#fff',
                      fontWeight: 600,
                      fontFamily,
                    }}
                  />
                </Typography>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleDeleteCancel}
              disabled={deleting}
              sx={{ fontFamily, color: '#6b7280' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              variant="contained"
              sx={{ fontFamily, backgroundColor: '#dc2626', '&:hover': { backgroundColor: '#b91c1c' } }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </StyledContainer>
    </LocalizationProvider>
  );
}
