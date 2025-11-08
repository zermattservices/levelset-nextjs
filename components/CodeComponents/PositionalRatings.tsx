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
  InputAdornment,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  Checkbox,
  InputLabel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  DataGridPro,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarQuickFilter,
  getGridNumericOperators,
  gridClasses,
  useGridApiRef
} from '@mui/x-data-grid-pro';
import type {
  GridColDef,
  GridRowsProp,
  GridFilterOperator,
  GridFilterInputValueProps,
  GridFilterItem,
  GridFilterModel,
  GridApi
} from '@mui/x-data-grid-pro';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { createSupabaseClient } from '@/util/supabase/component';
import type { Rating, PositionBig5Labels } from '@/lib/supabase.types';
import { cleanPositionName, FOH_POSITIONS, BOH_POSITIONS } from '@/lib/ratings-data';
import RatingsAnalytics from './RatingsAnalytics';
import { pdf } from '@react-pdf/renderer';
import PositionalRatingsPDF from './PositionalRatingsPDF';

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


const StyledContainer = styled(Box)<{ componentwidth?: string | number; componentmaxwidth?: string | number }>(
  ({ componentwidth, componentmaxwidth }) => ({
    width: componentwidth || '100%',
    maxWidth: componentmaxwidth || '100%',
    fontFamily,
  })
);

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
  backgroundColor: selected ? levelsetGreen : '#f3f4f6',
  color: selected ? '#ffffff !important' : '#6b7280',
  '&:hover': {
    backgroundColor: selected ? levelsetGreen : '#e5e7eb',
    boxShadow: 'none',
    color: selected ? '#ffffff !important' : '#6b7280',
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

// Custom base components for DataGrid slots - with Levelset styling
// These need to be functional components, not styled components, for proper type compatibility
const CustomBaseTextField = React.forwardRef((props: any, ref: any) => (
  <TextField
    {...props}
    ref={ref}
    sx={{
      '& .MuiInputLabel-root': {
        fontFamily,
        fontSize: 11,
        color: '#6b7280',
        '&.Mui-focused': {
          color: levelsetGreen,
        },
      },
      '& .MuiInputBase-root': {
        fontFamily,
        fontSize: 12,
      },
      '& .MuiInputBase-input': {
        fontFamily,
        fontSize: 12,
        padding: '8.5px 14px',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: '#e5e7eb',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#d1d5db',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      ...props.sx,
    }}
  />
));

const CustomBaseButton = React.forwardRef((props: any, ref: any) => (
  <Button
    {...props}
    ref={ref}
    sx={{
      fontFamily,
      fontSize: 12,
      textTransform: 'none',
      color: levelsetGreen,
      '&:hover': {
        backgroundColor: 'rgba(49, 102, 74, 0.04)',
      },
      ...props.sx,
    }}
  />
));

const CustomBaseCheckbox = React.forwardRef((props: any, ref: any) => (
  <Checkbox
    {...props}
    ref={ref}
    sx={{
      color: '#6b7280',
      '&.Mui-checked': {
        color: levelsetGreen,
      },
      '&:hover': {
        backgroundColor: 'rgba(49, 102, 74, 0.04)',
      },
      ...props.sx,
    }}
  />
));

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

// Custom input component for dropdown filters
interface SelectFilterInputProps extends GridFilterInputValueProps {
  options?: string[];
}

function SelectFilterInput(props: SelectFilterInputProps) {
  const { item, applyValue, options } = props;

  return (
    <FormControl fullWidth size="small" variant="outlined">
      <InputLabel 
        shrink
        sx={{ 
          fontFamily: `${fontFamily} !important`,
          fontSize: '16px !important',
          color: 'rgba(0, 0, 0, 0.6) !important',
          '&.Mui-focused': {
            color: `${levelsetGreen} !important`,
          },
        }}
      >
        Filter value
      </InputLabel>
      <Select
        value={item.value || ''}
        onChange={(event) => {
          applyValue({ ...item, value: event.target.value });
        }}
        label="Filter value"
        displayEmpty
        variant="outlined"
        sx={{ 
          fontFamily: `${fontFamily} !important`,
          fontSize: '12px !important',
          minWidth: '150px',
          '& .MuiSelect-select': {
            fontFamily: `${fontFamily} !important`,
            fontSize: '12px !important',
            padding: '8.5px 14px',
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              '& .MuiMenuItem-root': {
                fontFamily: `${fontFamily} !important`,
                fontSize: 12,
              },
            },
          },
        }}
      >
        <MuiMenuItem value="" sx={{ fontFamily, fontSize: 12, fontStyle: 'italic', color: '#9ca3af' }}>
          Select value
        </MuiMenuItem>
        {options?.map((option: any) => (
          <MuiMenuItem key={option} value={option} sx={{ fontFamily, fontSize: 12 }}>
            {option}
          </MuiMenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Custom Column Filter Input - matches SelectFilterInput pattern
function ColumnFilterInput(props: any) {
  const { item, applyValue, apiRef } = props;
  const columns = apiRef?.current?.getAllColumns?.() || [];
  const filterableColumns = columns.filter((col: any) => col.filterable !== false);

  return (
    <FormControl fullWidth size="small" variant="outlined">
      <InputLabel 
        shrink
        sx={{ 
          fontFamily: `${fontFamily} !important`,
          fontSize: '16px !important',
          color: 'rgba(0, 0, 0, 0.6) !important',
          '&.Mui-focused': {
            color: `${levelsetGreen} !important`,
          },
        }}
      >
        Columns
      </InputLabel>
      <Select
        value={item.field || ''}
        onChange={(event) => {
          applyValue({ ...item, field: event.target.value });
        }}
        label="Columns"
        displayEmpty
        variant="outlined"
        slotProps={{
          input: {
            notched: true,
          } as any,
        }}
        sx={{ 
          fontFamily: `${fontFamily} !important`,
          fontSize: '12px !important',
          minWidth: '150px',
          '& .MuiSelect-select': {
            fontFamily: `${fontFamily} !important`,
            fontSize: '12px !important',
            padding: '8.5px 14px',
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              '& .MuiMenuItem-root': {
                fontFamily: `${fontFamily} !important`,
                fontSize: 12,
              },
            },
          },
        }}
      >
        <MuiMenuItem value="" sx={{ fontFamily, fontSize: 12, fontStyle: 'italic', color: '#9ca3af' }}>
          Select column
        </MuiMenuItem>
        {filterableColumns.map((column: any) => (
          <MuiMenuItem key={column.field} value={column.field} sx={{ fontFamily, fontSize: 12 }}>
            {column.headerName || column.field}
          </MuiMenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Custom Operator Filter Input - matches SelectFilterInput pattern
function OperatorFilterInput(props: any) {
  const { item, applyValue, operators } = props;

  return (
    <FormControl fullWidth size="small" variant="outlined">
      <InputLabel 
        shrink
        sx={{ 
          fontFamily: `${fontFamily} !important`,
          fontSize: '16px !important',
          color: 'rgba(0, 0, 0, 0.6) !important',
          '&.Mui-focused': {
            color: `${levelsetGreen} !important`,
          },
        }}
      >
        Operator
      </InputLabel>
      <Select
        value={item.operator || ''}
        onChange={(event) => {
          applyValue({ ...item, operator: event.target.value });
        }}
        label="Operator"
        displayEmpty
        variant="outlined"
        slotProps={{
          input: {
            notched: true,
          } as any,
        }}
        sx={{ 
          fontFamily: `${fontFamily} !important`,
          fontSize: '12px !important',
          minWidth: '120px',
          '& .MuiSelect-select': {
            fontFamily: `${fontFamily} !important`,
            fontSize: '12px !important',
            padding: '8.5px 14px',
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              '& .MuiMenuItem-root': {
                fontFamily: `${fontFamily} !important`,
                fontSize: 12,
              },
            },
          },
        }}
      >
        <MuiMenuItem value="" sx={{ fontFamily, fontSize: 12, fontStyle: 'italic', color: '#9ca3af' }}>
          Select operator
        </MuiMenuItem>
        {operators?.map((operator: any) => (
          <MuiMenuItem key={operator.value} value={operator.value} sx={{ fontFamily, fontSize: 12 }}>
            {operator.label}
          </MuiMenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Custom DatePicker TextField - with Satoshi font for date values
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
        borderColor: '#e5e7eb',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: '#d1d5db',
      },
      '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: levelsetGreen,
        borderWidth: '2px',
      },
      // Calendar icon button - reduce size
      '& .MuiIconButton-root': {
        padding: '6px',
        '& .MuiSvgIcon-root': {
          fontSize: '1rem', // Smaller icon
        },
      },
      ...props.sx,
    }}
  />
));

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
  
  // DataGrid API ref to access filtered rows
  const apiRef = useGridApiRef();
  const [filteredRows, setFilteredRows] = React.useState<GridRowsProp>([]);
  
  // Filter states
  const [showFOH, setShowFOH] = React.useState(true);
  const [showBOH, setShowBOH] = React.useState(true);
  const [dateRange, setDateRange] = React.useState<'mtd' | 'qtd' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [filterModel, setFilterModel] = React.useState<any>(undefined);
  
  // Metrics data for PDF export
  const [metricsData, setMetricsData] = React.useState<any>(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [ratingToDelete, setRatingToDelete] = React.useState<RatingRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  
  // Big 5 labels cache
  const [big5LabelsCache, setBig5LabelsCache] = React.useState<Map<string, PositionBig5Labels>>(new Map());
  
  // Unique values for filter dropdowns
  const [uniqueEmployees, setUniqueEmployees] = React.useState<string[]>([]);
  const [uniqueLeaders, setUniqueLeaders] = React.useState<string[]>([]);
  const [uniqueRoles, setUniqueRoles] = React.useState<string[]>([]);
  const [uniquePositions, setUniquePositions] = React.useState<string[]>([]);

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

  // Initialize dates
  React.useEffect(() => {
    const [start, end] = getDateRange('30d');
    setStartDate(start);
    setEndDate(end);
  }, [getDateRange]);

  // Fetch Big 5 labels for a position
  const fetchBig5Labels = React.useCallback(async (position: string) => {
    if (big5LabelsCache.has(position)) {
      return big5LabelsCache.get(position);
    }

    if (!orgId || !locationId) {
      return null;
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

  // Handle PDF Export
  const handleExportPDF = async () => {
    try {
      // Determine logo URL based on location
      // Default to CFA Buda logo (default location)
      // TODO: Fetch from Supabase locations table image_url column
      const locationLogos: { [key: string]: string } = {
        '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd': '/logos/CFA Buda Logo.png', // CFA Buda
        'e437119c-27d9-4114-9273-350925016738': '/logos/CFA West Buda Logo.png', // CFA West Buda
      };
      const logoUrl = locationLogos[locationId] || '/logos/Circle C CFA.png'; // Default to Circle C
      
      // Prepare filter data
      const filterData = {
        dateRange: {
          start: startDate?.toLocaleDateString() || '',
          end: endDate?.toLocaleDateString() || ''
        },
        fohSelected: showFOH,
        bohSelected: showBOH,
        searchText: searchText || '',
        columnFilters: filterModel?.items?.map((item: any) => ({
          field: item.field || '',
          operator: item.operator || '',
          value: String(item.value || '')
        })) || []
      };

      // Prepare metrics data
      const metrics = metricsData ? {
        ratingsCount: {
          value: metricsData.current.count,
          change: metricsData.prior ? metricsData.current.count - metricsData.prior.count : 0,
          percentChange: metricsData.prior && metricsData.prior.count > 0 
            ? ((metricsData.current.count - metricsData.prior.count) / metricsData.prior.count) * 100 
            : 0,
          priorPeriod: metricsData.periodText,
          hasPriorData: !!metricsData.prior && metricsData.prior.count > 0,
        },
        avgRating: {
          value: metricsData.current.avgRating,
          change: metricsData.prior ? metricsData.current.avgRating - metricsData.prior.avgRating : 0,
          percentChange: metricsData.prior && metricsData.prior.avgRating > 0
            ? ((metricsData.current.avgRating - metricsData.prior.avgRating) / metricsData.prior.avgRating) * 100
            : 0,
          priorPeriod: metricsData.periodText,
          hasPriorData: !!metricsData.prior && metricsData.prior.count > 0,
        },
        ratingsPerDay: {
          value: metricsData.current.ratingsPerDay,
          change: metricsData.prior ? metricsData.current.ratingsPerDay - metricsData.prior.ratingsPerDay : 0,
          percentChange: metricsData.prior && metricsData.prior.ratingsPerDay > 0
            ? ((metricsData.current.ratingsPerDay - metricsData.prior.ratingsPerDay) / metricsData.prior.ratingsPerDay) * 100
            : 0,
          priorPeriod: metricsData.periodText,
          hasPriorData: !!metricsData.prior && metricsData.prior.count > 0,
        },
      } : {
        ratingsCount: { value: 0, change: 0, percentChange: 0, priorPeriod: 'period', hasPriorData: false },
        avgRating: { value: 0, change: 0, percentChange: 0, priorPeriod: 'period', hasPriorData: false },
        ratingsPerDay: { value: 0, change: 0, percentChange: 0, priorPeriod: 'period', hasPriorData: false },
      };

      // Prepare table data from filteredRows
      const tableData = filteredRows.map((row: any) => ({
        date: row.formatted_date,
        employeeName: row.employee_name,
        employeeRole: row.employee_role,
        leaderName: row.rater_name,
        position: cleanPositionName(row.position_cleaned || row.position),
        isFOH: FOH_POSITIONS.includes(row.position),
        rating1: row.rating_1,
        rating2: row.rating_2,
        rating3: row.rating_3,
        rating4: row.rating_4,
        rating5: row.rating_5,
        overall: row.rating_avg,
      }));

      // Generate PDF blob
      const blob = await pdf(
        <PositionalRatingsPDF
          title="Positional Excellence Ratings"
          logoUrl={logoUrl}
          filters={filterData}
          metrics={metrics}
          tableData={tableData}
        />
      ).toBlob();

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `positional-ratings-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  // Fetch ratings data whenever core filters change
  React.useEffect(() => {
    let isActive = true;

    if (!orgId || !locationId) {
      setError(null);
      setRows([]);
      setFilteredRows([]);
      setLoading(false);
      return;
    }

    if (!startDate || !endDate) {
      return;
    }

    const loadRatings = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createSupabaseClient();

        let query = supabase
          .from('ratings')
          .select(`
          *,
          employee:employees!ratings_employee_id_fkey(full_name, first_name, last_name, role, is_foh, is_boh),
          rater:employees!ratings_rater_user_id_fkey(full_name)
        `)
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });

        const { data: ratings, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        const transformedRows: RatingRow[] = (ratings || [])
          .filter((rating: any) => {
            const isFOHPosition = FOH_POSITIONS.includes(rating.position);
            const isBOHPosition = BOH_POSITIONS.includes(rating.position);

            if (!showFOH && !showBOH) return false;
            if (showFOH && !showBOH) return isFOHPosition;
            if (!showFOH && showBOH) return isBOHPosition;

            return true;
          })
          .map((rating: any) => {
            const employeeName =
              rating.employee?.full_name ||
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
              formatted_date: formatDate(rating.created_at),
              created_at: rating.created_at,
            };
          });

        if (!isActive) {
          return;
        }

        setRows(transformedRows);

        const employees = Array.from(new Set(transformedRows.map((r) => r.employee_name))).sort();
        const leaders = Array.from(new Set(transformedRows.map((r) => r.rater_name))).sort();
        const roles = Array.from(new Set(transformedRows.map((r) => r.employee_role))).sort();
        const positions = Array.from(new Set(transformedRows.map((r) => r.position_cleaned))).sort();

        setUniqueEmployees(employees);
        setUniqueLeaders(leaders);
        setUniqueRoles(roles);
        setUniquePositions(positions);

        const positionsSet = new Set(transformedRows.map((r) => r.position));
        const uniquePos = Array.from(positionsSet);
        uniquePos.forEach((pos) => fetchBig5Labels(pos));
      } catch (err) {
        if (!isActive) {
          return;
        }
        console.error('Error fetching ratings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ratings');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadRatings();

    return () => {
      isActive = false;
    };
  }, [orgId, locationId, startDate, endDate, showFOH, showBOH, fetchBig5Labels]);

  // Update filtered rows from DataGrid API whenever filters or data changes
  React.useEffect(() => {
    if (!apiRef.current || rows.length === 0) {
      setFilteredRows(rows);
      return;
    }

    try {
      const hasFilters =
        (filterModel && filterModel.items && filterModel.items.length > 0) || Boolean(searchText);

      if (!hasFilters) {
        setFilteredRows(rows);
        return;
      }

      const visibleRows: any[] = [];

      rows.forEach((row: any) => {
        let isVisible = true;

        if (filterModel && filterModel.items) {
          for (const filterItem of filterModel.items) {
            if (!filterItem.value) continue;

            const fieldValue = row[filterItem.field];
            const filterValue = filterItem.value;

            if (filterItem.operator === 'is') {
              if (fieldValue !== filterValue) {
                isVisible = false;
                break;
              }
            } else if (filterItem.operator === 'isNot') {
              if (fieldValue === filterValue) {
                isVisible = false;
                break;
              }
            } else if (filterItem.operator === 'isAnyOf') {
              const values = typeof filterValue === 'string' ? filterValue.split(',') : [filterValue];
              if (!values.includes(fieldValue)) {
                isVisible = false;
                break;
              }
            }
          }
        }

        if (isVisible && searchText) {
          const searchLower = searchText.toLowerCase();
          const searchableText = [
            row.employee_name,
            row.employee_role,
            row.rater_name,
            row.position_cleaned,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          isVisible = searchableText.includes(searchLower);
        }

        if (isVisible) {
          visibleRows.push(row);
        }
      });

      setFilteredRows(visibleRows);
    } catch (error) {
      console.error('[PositionalRatings] Error getting filtered rows:', error);
      setFilteredRows(rows);
    }
  }, [rows, filterModel, searchText]);

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

  // Handle date range preset - updates both the preset and the date pickers
  const handleDateRangePreset = (preset: 'mtd' | 'qtd' | '30d' | '90d') => {
    setDateRange(preset);
    const [start, end] = getDateRange(preset);
    setStartDate(start);
    setEndDate(end);
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

  // Create custom filter operators for dropdown columns
  const createDropdownOperators = (options: string[]): GridFilterOperator[] => {
    return [
      {
        label: 'is',
        value: 'is',
        getApplyFilterFn: (filterItem: GridFilterItem) => {
          if (!filterItem.value) {
            return null;
          }
          return (value: any) => {
            return value === filterItem.value;
          };
        },
        InputComponent: SelectFilterInput,
        InputComponentProps: { options } as any,
      },
      {
        label: 'is not',
        value: 'not',
        getApplyFilterFn: (filterItem: GridFilterItem) => {
          if (!filterItem.value) {
            return null;
          }
          return (value: any) => {
            return value !== filterItem.value;
          };
        },
        InputComponent: SelectFilterInput,
        InputComponentProps: { options } as any,
      },
      {
        label: 'is any of',
        value: 'isAnyOf',
        getApplyFilterFn: (filterItem: GridFilterItem) => {
          if (!filterItem.value || !Array.isArray(filterItem.value)) {
            return null;
          }
          return (value: any) => {
            return filterItem.value.includes(value);
          };
        },
        InputComponent: SelectFilterInput,
        InputComponentProps: { options } as any,
      },
    ];
  };

  // Custom toolbar
  function CustomToolbar() {
    return (
      <GridToolbarContainer sx={{ p: 2, gap: 2, display: 'flex', flexWrap: 'wrap' }}>
        {/* Left side - FOH/BOH and Date filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
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
          
          {/* Grey divider */}
          <Box sx={{ 
            width: '1px', 
            height: '24px', 
            backgroundColor: 'rgba(0, 0, 0, 0.23)', // Match unfocused input border
            mx: 1 
          }} />
          
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
              enableAccessibleFieldDOMStructure={false}
              slots={{
                textField: CustomDateTextField,
              }}
              slotProps={{
                textField: {
                  sx: {
                    '& .MuiInputLabel-root': {
                      fontFamily: `${fontFamily} !important`,
                      fontSize: '16px !important',
                      color: 'rgba(0, 0, 0, 0.6) !important',
                      '&.Mui-focused': {
                        color: `${levelsetGreen} !important`,
                      },
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#e5e7eb !important',
                      },
                      '&:hover fieldset': {
                        borderColor: '#d1d5db !important',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: `${levelsetGreen} !important`,
                        borderWidth: '2px !important',
                      },
                    },
                    '& .MuiInputAdornment-root .MuiIconButton-root': {
                      color: '#6b7280 !important',
                      '&:hover': {
                        color: `${levelsetGreen} !important`,
                        backgroundColor: 'rgba(49, 102, 74, 0.04) !important',
                      },
                    },
                  },
                },
                popper: {
                  sx: {
                    '& .MuiPaper-root': {
                      fontFamily,
                    },
                    '& .MuiTypography-root': {
                      fontFamily,
                      fontSize: 11,
                    },
                    '& .MuiPickersDay-root': {
                      fontFamily,
                      fontSize: 11,
                      '&.Mui-selected': {
                        backgroundColor: `${levelsetGreen} !important`,
                        color: '#fff !important',
                        '&:hover': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                        '&:focus': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                      },
                      '&:focus': {
                        backgroundColor: 'rgba(49, 102, 74, 0.12)',
                      },
                    },
                    '& .MuiPickersCalendarHeader-label': {
                      fontFamily,
                      fontSize: 12,
                    },
                    '& .MuiDayCalendar-weekDayLabel': {
                      fontFamily,
                      fontSize: 10,
                    },
                    '& .MuiButtonBase-root': {
                      fontFamily,
                      fontSize: 11,
                      color: levelsetGreen,
                    },
                    '& .MuiIconButton-root': {
                      color: `${levelsetGreen} !important`,
                      '&:hover': {
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                      },
                      '&:focus': {
                        backgroundColor: 'rgba(49, 102, 74, 0.12)',
                      },
                    },
                    '& .MuiPickersYear-yearButton': {
                      fontFamily,
                      fontSize: 12,
                      '&.Mui-selected': {
                        backgroundColor: `${levelsetGreen} !important`,
                        color: '#fff !important',
                        '&:hover': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                        '&:focus': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                      },
                    },
                    '& .MuiDialogActions-root .MuiButton-root': {
                      fontFamily,
                      fontSize: 12,
                      color: levelsetGreen,
                      textTransform: 'none',
                    },
                    // Override ALL potential blue colors
                    '& .MuiButton-root': {
                      color: `${levelsetGreen} !important`,
                      fontFamily,
                    },
                    '& .MuiPickersArrowSwitcher-button': {
                      color: `${levelsetGreen} !important`,
                    },
                    '& .MuiPickersCalendarHeader-switchViewButton': {
                      color: `${levelsetGreen} !important`,
                    },
                  },
                },
              }}
            />
            
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              format="M/d/yyyy"
              enableAccessibleFieldDOMStructure={false}
              slots={{
                textField: CustomDateTextField,
              }}
              slotProps={{
                textField: {
                  sx: {
                    '& .MuiInputLabel-root': {
                      fontFamily: `${fontFamily} !important`,
                      fontSize: '16px !important',
                      color: 'rgba(0, 0, 0, 0.6) !important',
                      '&.Mui-focused': {
                        color: `${levelsetGreen} !important`,
                      },
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#e5e7eb !important',
                      },
                      '&:hover fieldset': {
                        borderColor: '#d1d5db !important',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: `${levelsetGreen} !important`,
                        borderWidth: '2px !important',
                      },
                    },
                    '& .MuiInputAdornment-root .MuiIconButton-root': {
                      color: '#6b7280 !important',
                      '&:hover': {
                        color: `${levelsetGreen} !important`,
                        backgroundColor: 'rgba(49, 102, 74, 0.04) !important',
                      },
                    },
                  },
                },
                popper: {
                  sx: {
                    '& .MuiPaper-root': {
                      fontFamily,
                    },
                    '& .MuiTypography-root': {
                      fontFamily,
                      fontSize: 11,
                    },
                    '& .MuiPickersDay-root': {
                      fontFamily,
                      fontSize: 11,
                      '&.Mui-selected': {
                        backgroundColor: `${levelsetGreen} !important`,
                        color: '#fff !important',
                        '&:hover': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                        '&:focus': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                      },
                      '&:focus': {
                        backgroundColor: 'rgba(49, 102, 74, 0.12)',
                      },
                    },
                    '& .MuiPickersCalendarHeader-label': {
                      fontFamily,
                      fontSize: 12,
                    },
                    '& .MuiDayCalendar-weekDayLabel': {
                      fontFamily,
                      fontSize: 10,
                    },
                    '& .MuiButtonBase-root': {
                      fontFamily,
                      fontSize: 11,
                      color: levelsetGreen,
                    },
                    '& .MuiIconButton-root': {
                      color: `${levelsetGreen} !important`,
                      '&:hover': {
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                      },
                      '&:focus': {
                        backgroundColor: 'rgba(49, 102, 74, 0.12)',
                      },
                    },
                    '& .MuiPickersYear-yearButton': {
                      fontFamily,
                      fontSize: 12,
                      '&.Mui-selected': {
                        backgroundColor: `${levelsetGreen} !important`,
                        color: '#fff !important',
                        '&:hover': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                        '&:focus': {
                          backgroundColor: `${levelsetGreen} !important`,
                        },
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(49, 102, 74, 0.04)',
                      },
                    },
                    '& .MuiDialogActions-root .MuiButton-root': {
                      fontFamily,
                      fontSize: 12,
                      color: levelsetGreen,
                      textTransform: 'none',
                    },
                    // Override ALL potential blue colors
                    '& .MuiButton-root': {
                      color: `${levelsetGreen} !important`,
                      fontFamily,
                    },
                    '& .MuiPickersArrowSwitcher-button': {
                      color: `${levelsetGreen} !important`,
                    },
                    '& .MuiPickersCalendarHeader-switchViewButton': {
                      color: `${levelsetGreen} !important`,
                    },
                  },
                },
              }}
            />
          </DateRangeContainer>
        </Box>

        {/* Right side - Toolbar buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center',
          marginLeft: 'auto',
        }}>
          <IconButton
            onClick={handleExportPDF}
            sx={{
              color: levelsetGreen,
              padding: '8px',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              '&:hover': {
                backgroundColor: 'rgba(49, 102, 74, 0.04)',
              },
            }}
            aria-label="Export to PDF"
          >
            <FileDownloadIcon sx={{ fontSize: '20px' }} />
          </IconButton>
          <GridToolbarFilterButton 
            slotProps={{
              button: {
                'aria-label': 'Show filters',
              },
            }}
          />
          <GridToolbarQuickFilter 
            quickFilterParser={(searchInput) => {
              setSearchText(searchInput);
              return searchInput.split(' ').filter(word => word !== '');
            }}
            sx={{
              '& .MuiSvgIcon-root': {
                color: `${levelsetGreen} !important`,
              },
            }}
          />
        </Box>
      </GridToolbarContainer>
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
      filterable: false, // Date column not filterable
      resizable: false, // Disable column resize to hide separators
      valueGetter: (value, row) => row.created_at, // Use created_at for sorting
      sortComparator: (v1, v2) => {
        // Sort by actual date values
        return new Date(v1).getTime() - new Date(v2).getTime();
      },
      renderCell: (params) => (
        <Box sx={{ fontFamily, fontSize: 11 }}>
          {formatDate(params.row.created_at)}
        </Box>
      ),
    },
    {
      field: 'employee_name',
      headerName: 'Employee',
      width: 160,
      sortable: true,
      filterable: true,
      resizable: false, // Disable column resize to hide separators
      filterOperators: createDropdownOperators(uniqueEmployees),
    },
    {
      field: 'employee_role',
      headerName: 'Employee Role',
      width: 140,
      sortable: true,
      filterable: true,
      resizable: false, // Disable column resize to hide separators
      filterOperators: createDropdownOperators(uniqueRoles),
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
      resizable: false, // Disable column resize to hide separators
      filterOperators: createDropdownOperators(uniqueLeaders),
    },
    {
      field: 'position_cleaned',
      headerName: 'Position',
      width: 120,
      sortable: true,
      filterable: true,
      resizable: false, // Disable column resize to hide separators
      filterOperators: createDropdownOperators(uniquePositions),
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
      resizable: false, // Disable column resize to hide separators
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip 
            title={labels?.label_1 || 'Criteria 1'} 
            arrow 
            placement="bottom"
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -8],
                    },
                  },
                ],
              },
            }}
          >
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
      resizable: false, // Disable column resize to hide separators
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip 
            title={labels?.label_2 || 'Criteria 2'} 
            arrow 
            placement="bottom"
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -8],
                    },
                  },
                ],
              },
            }}
          >
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
      resizable: false, // Disable column resize to hide separators
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip 
            title={labels?.label_3 || 'Criteria 3'} 
            arrow 
            placement="bottom"
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -8],
                    },
                  },
                ],
              },
            }}
          >
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
      resizable: false, // Disable column resize to hide separators
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip 
            title={labels?.label_4 || 'Criteria 4'} 
            arrow 
            placement="bottom"
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -8],
                    },
                  },
                ],
              },
            }}
          >
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
      resizable: false, // Disable column resize to hide separators
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const rating = params.value as number | null;
        const row = params.row as RatingRow;
        const labels = big5LabelsCache.get(row.position);
        
        return (
          <Tooltip 
            title={labels?.label_5 || 'Criteria 5'} 
            arrow 
            placement="bottom"
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -8],
                    },
                  },
                ],
              },
            }}
          >
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
      resizable: false, // Disable column resize to hide separators
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
      resizable: false, // Disable column resize to hide separators
      disableColumnMenu: true,
      disableExport: true,
      hideable: false, // Prevent from showing in columns panel
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
        {/* Error Display */}
        {error && (
          <Typography color="error" sx={{ mb: 2, fontFamily }}>
            {error}
          </Typography>
        )}
        
        {/* Analytics Metrics */}
        <RatingsAnalytics
          orgId={orgId}
          locationId={locationId}
          currentRows={filteredRows}
          startDate={startDate}
          endDate={endDate}
          showFOH={showFOH}
          showBOH={showBOH}
          searchText={searchText}
          filterModel={filterModel}
          loading={loading}
          onMetricsCalculated={setMetricsData}
        />
        
        {/* Data Grid */}
        <Box sx={{ height: 650, width: '100%' }}>
          <DataGridPro
            apiRef={apiRef}
            rows={rows}
            columns={columns}
            loading={loading}
            onFilterModelChange={(newModel) => {
              setFilterModel(newModel);
            }}
            pagination
            pageSizeOptions={[25, 50, 100, 250]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 50 },
              },
              sorting: {
                sortModel: [{ field: 'formatted_date', sort: 'desc' }],
              },
            }}
            disableRowSelectionOnClick
            disableColumnResize
            showColumnVerticalBorder={false}
            rowHeight={48}
            slots={{
              toolbar: CustomToolbar,
              baseTextField: CustomBaseTextField,
              baseButton: CustomBaseButton,
              baseCheckbox: CustomBaseCheckbox,
            }}
            slotProps={{
              filterPanel: {
                // Use our custom column input component
                columnsSort: 'asc',
                sx: {
                  '& .MuiDataGrid-filterFormColumnInput': {
                    '& .MuiInputLabel-root': {
                      fontFamily,
                      fontSize: 11,
                    },
                    '& .MuiInputBase-root': {
                      fontFamily,
                    },
                    '& .MuiSelect-select': {
                      fontFamily,
                      fontSize: 12,
                    },
                  },
                  '& .MuiDataGrid-filterFormOperatorInput': {
                    '& .MuiInputLabel-root': {
                      fontFamily,
                      fontSize: 11,
                    },
                    '& .MuiInputBase-root': {
                      fontFamily,
                    },
                    '& .MuiSelect-select': {
                      fontFamily,
                      fontSize: 12,
                    },
                  },
                },
              },
            }}
            showToolbar
            sx={{
              // Base grid styling
              fontFamily,
              border: '1px solid #e5e7eb',
              borderRadius: 2,
              
              // Column headers - Use gridClasses
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
              
              // COLUMN SEPARATORS - Hide non-resizable separators per documentation
              [`& .${gridClasses.columnSeparator}`]: {
                display: 'none',
              },
              
              // Cells - Use gridClasses
              [`& .${gridClasses.cell}`]: {
                borderBottom: '1px solid #f3f4f6',
                borderRight: 'none',
                fontSize: 13,
                color: '#111827',
                fontFamily,
                '&:focus, &:focus-within': {
                  outline: 'none',
                },
              },
              
              // Remove padding from rating cells so colored backgrounds fill entire width
              [`& .${gridClasses.cell}[data-field="rating_1"]`]: {
                padding: 0,
              },
              [`& .${gridClasses.cell}[data-field="rating_2"]`]: {
                padding: 0,
              },
              [`& .${gridClasses.cell}[data-field="rating_3"]`]: {
                padding: 0,
              },
              [`& .${gridClasses.cell}[data-field="rating_4"]`]: {
                padding: 0,
              },
              [`& .${gridClasses.cell}[data-field="rating_5"]`]: {
                padding: 0,
              },
              [`& .${gridClasses.cell}[data-field="rating_avg"]`]: {
                padding: 0,
              },
              
              // Rows - Use gridClasses
              [`& .${gridClasses.row}:hover`]: {
                backgroundColor: '#f9fafb',
              },
              
              // Footer - Use gridClasses
              [`& .${gridClasses.footerContainer}`]: {
                borderTop: '1px solid #e5e7eb',
                fontFamily,
              },
              '& .MuiTablePagination-root': {
                fontFamily,
                color: '#6b7280',
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                fontFamily,
                fontSize: 13,
              },
              
              // Loading
              '& .MuiCircularProgress-root': {
                color: levelsetGreen,
              },
              '& .MuiLinearProgress-bar': {
                backgroundColor: levelsetGreen,
              },
              
              // FILTER PANEL - Use gridClasses
              [`& .${gridClasses.filterForm}`]: {
                gap: 2,
                p: 2,
                fontFamily,
              },
              
              // Column selector dropdown - Use gridClasses with !important
              [`& .${gridClasses.filterFormColumnInput}`]: {
                minWidth: 150,
                '& .MuiInputLabel-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '11px !important',
                  color: '#6b7280 !important',
                  '&.Mui-focused': {
                    color: `${levelsetGreen} !important`,
                  },
                },
                '& .MuiInputBase-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                },
                '& .MuiOutlinedInput-root': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e5e7eb !important',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db !important',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${levelsetGreen} !important`,
                    borderWidth: '2px !important',
                  },
                },
                '& .MuiSelect-select': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                  padding: '8.5px 14px !important',
                },
              },
              
              // Operator selector dropdown - Use gridClasses with !important
              [`& .${gridClasses.filterFormOperatorInput}`]: {
                minWidth: 120,
                '& .MuiInputLabel-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '11px !important',
                  color: '#6b7280 !important',
                  '&.Mui-focused': {
                    color: `${levelsetGreen} !important`,
                  },
                },
                '& .MuiInputBase-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                },
                '& .MuiOutlinedInput-root': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e5e7eb !important',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db !important',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${levelsetGreen} !important`,
                    borderWidth: '2px !important',
                  },
                },
                '& .MuiSelect-select': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                  padding: '8.5px 14px !important',
                },
              },
              
              // Value input/dropdown - Use gridClasses with !important
              [`& .${gridClasses.filterFormValueInput}`]: {
                minWidth: 150,
                '& .MuiInputLabel-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '11px !important',
                  color: '#6b7280 !important',
                  '&.Mui-focused': {
                    color: `${levelsetGreen} !important`,
                  },
                },
                '& .MuiInputBase-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                },
                '& .MuiOutlinedInput-root': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e5e7eb !important',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db !important',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${levelsetGreen} !important`,
                    borderWidth: '2px !important',
                  },
                },
                '& .MuiSelect-select': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                  padding: '8.5px 14px !important',
                },
                '& .MuiInputBase-input': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                  padding: '8.5px 14px !important',
                },
              },
              
              // Filter delete icon - Use gridClasses
              [`& .${gridClasses.filterFormDeleteIcon}`]: {
                color: '#6b7280',
                '&:hover': {
                  color: '#dc2626',
                },
              },
              
              // Menu items in all dropdowns
              '& .MuiMenuItem-root': {
                fontFamily,
                fontSize: 12,
                '&.Mui-selected': {
                  backgroundColor: `rgba(49, 102, 74, 0.08)`,
                  '&:hover': {
                    backgroundColor: `rgba(49, 102, 74, 0.12)`,
                  },
                },
              },
              
              // Panels - Use gridClasses
              [`& .${gridClasses.panel}`]: {
                fontFamily,
              },
              [`& .${gridClasses.panelHeader}`]: {
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
              },
              '& .MuiCheckbox-root.Mui-checked': {
                color: levelsetGreen,
              },
              '& .MuiButton-text': {
                fontFamily,
                fontSize: 12,
                textTransform: 'none',
                color: levelsetGreen,
              },
              
              // Toolbar buttons styling
              [`& .${gridClasses.toolbarContainer}`]: {
                gap: 2,
                p: 2,
                fontFamily,
                '& button': {
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  color: levelsetGreen,
                },
              },
              
              // Quick filter (search bar) styling
              '& .MuiDataGrid-toolbarQuickFilter': {
                '& .MuiInputBase-root': {
                  fontFamily,
                  fontSize: 12,
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e7eb',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#d1d5db',
                },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: levelsetGreen,
                  borderWidth: '2px',
                },
                '& .MuiInputBase-input': {
                  fontFamily,
                  fontSize: 12,
                },
                '& .MuiSvgIcon-root': {
                  color: '#6b7280',
                },
              },
              
              // Global Select styling for filter dropdowns
              '& .MuiSelect-root': {
                fontFamily,
                fontSize: 12,
              },
              '& .MuiSelect-select': {
                fontFamily,
                fontSize: 12,
                padding: '8.5px 14px',
              },
              
              // Columns panel styling - AGGRESSIVE label visibility
              '& .MuiDataGrid-columnsManagement': {
                fontFamily: `${fontFamily} !important`,
                '& .MuiFormControlLabel-root': {
                  marginLeft: '0 !important',
                  marginRight: '0 !important',
                  width: '100%',
                  display: 'flex !important',
                  alignItems: 'center',
                  '& .MuiTypography-root': {
                    fontFamily: `${fontFamily} !important`,
                    fontSize: '13px !important',
                    color: '#111827 !important',
                    marginLeft: '8px !important',
                    display: 'block !important',
                    visibility: 'visible !important',
                    opacity: '1 !important',
                  },
                  '& .MuiCheckbox-root': {
                    color: '#6b7280 !important',
                    '&.Mui-checked': {
                      color: `${levelsetGreen} !important`,
                    },
                  },
                },
                '& .MuiDataGrid-columnsManagementRow': {
                  fontFamily: `${fontFamily} !important`,
                  display: 'flex !important',
                  alignItems: 'center',
                  padding: '4px 16px !important',
                  width: '100%',
                },
              },
              
              // Columns panel header
              '& .MuiDataGrid-columnsManagementHeader': {
                fontFamily,
                fontSize: 13,
                fontWeight: 600,
                padding: '12px 16px',
              },
              
              // Columns panel footer (Show/Hide All, Reset)
              '& .MuiDataGrid-columnsManagementFooter': {
                fontFamily,
                padding: '12px 16px',
                borderTop: '1px solid #e5e7eb',
                '& .MuiFormControlLabel-root .MuiTypography-root': {
                  fontFamily,
                  fontSize: 13,
                },
                '& .MuiButton-root': {
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  color: levelsetGreen,
                },
              },
              
              // Columns panel search - AGGRESSIVE overrides
              '& .MuiDataGrid-columnsManagementSearchInput': {
                padding: '8px 16px',
                '& .MuiInputBase-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${levelsetGreen} !important`,
                      borderWidth: '2px !important',
                    },
                  },
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d1d5db !important',
                    },
                  },
                },
                '& .MuiInputBase-input': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e5e7eb !important',
                },
                '& .MuiInputLabel-root': {
                  fontFamily: `${fontFamily} !important`,
                  fontSize: '12px !important',
                  '&.Mui-focused': {
                    color: `${levelsetGreen} !important`,
                  },
                },
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
              sx={{ 
                fontFamily, 
                backgroundColor: '#dc2626', 
                '&:hover': { backgroundColor: '#b91c1c' } 
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </StyledContainer>
    </LocalizationProvider>
  );
}
