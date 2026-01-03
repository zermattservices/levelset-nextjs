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
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { createSupabaseClient } from '@/util/supabase/component';
import type { Rating, PositionBig5Labels, Employee } from '@/lib/supabase.types';
import { cleanPositionName, FOH_POSITIONS, BOH_POSITIONS } from '@/lib/ratings-data';
import RatingsAnalytics from './RatingsAnalytics';
import { pdf } from '@react-pdf/renderer';
import PositionalRatingsPDF from './PositionalRatingsPDF';
import { EmployeeModal } from './EmployeeModal';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';
const fohColor = '#006391';
const bohColor = '#ffcc5b';
const fohColorLight = '#eaf9ff';
const bohColorLight = '#fffcf0';

export interface PositionalRatingsProps {
  locationId: string;
  locationImageUrl?: string | null;
  employeeId?: string;
  raterUserId?: string;
  className?: string;
  width?: string | number;
  maxWidth?: string | number;
}

interface RatingRow extends Rating {
  id: string;
  employee_name: string;
  employee_id: string;
  employee_role: string;
  rater_name: string;
  rater_employee_id: string | null;
  position_cleaned: string;
  formatted_date: string;
  rating_location_id: string;
  rating_location_number: string | null;
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
      borderRadius: '8px',
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

// Helper to get rating color with thresholds
const getRatingColor = (rating: number | null, thresholds?: { yellow_threshold: number; green_threshold: number }): string => {
  if (rating === null || rating === undefined) return 'transparent';
  const yellowThreshold = thresholds?.yellow_threshold ?? 1.75;
  const greenThreshold = thresholds?.green_threshold ?? 2.75;
  if (rating >= greenThreshold) return '#249e6b';
  if (rating >= yellowThreshold) return '#ffb549';
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
  const { item, applyValue, apiRef, employeeId, raterUserId } = props;
  const columns = apiRef?.current?.getAllColumns?.() || [];
  let filterableColumns = columns.filter((col: any) => col.filterable !== false);
  
  // Exclude employee_name and employee_role from filter dropdown when employeeId or raterUserId is provided
  if (employeeId || raterUserId) {
    filterableColumns = filterableColumns.filter(
      (col: any) => col.field !== 'employee_name' && col.field !== 'employee_role'
    );
  }

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

// Helper function to fetch all rows using pagination (bypasses 1000 row limit)
async function fetchAllRatings(
  queryBuilder: any,
  batchSize: number = 1000
): Promise<any[]> {
  const allRatings: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await queryBuilder.range(offset, offset + batchSize - 1);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allRatings.push(...data);
      // If we got less than batchSize, we've reached the end
      hasMore = data.length === batchSize;
      offset += batchSize;
    } else {
      hasMore = false;
    }
  }

  return allRatings;
}

export function PositionalRatings({
  locationId,
  locationImageUrl,
  employeeId,
  raterUserId,
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
  
  // Filter states - when employeeId or raterUserId is provided, always show both FOH and BOH
  const [showFOH, setShowFOH] = React.useState(true);
  const [showBOH, setShowBOH] = React.useState(true);
  
  // Ensure FOH and BOH are both true when employeeId or raterUserId is provided
  React.useEffect(() => {
    if (employeeId || raterUserId) {
      setShowFOH(true);
      setShowBOH(true);
    }
  }, [employeeId, raterUserId]);
  const [dateRange, setDateRange] = React.useState<'mtd' | 'qtd' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [filterModel, setFilterModel] = React.useState<any>(undefined);
  const [sortModel, setSortModel] = React.useState<Array<{ field: string; sort: 'asc' | 'desc' }>>([
    { field: 'formatted_date', sort: 'desc' }
  ]);
  
  // Metrics data for PDF export
  const [metricsData, setMetricsData] = React.useState<any>(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [ratingToDelete, setRatingToDelete] = React.useState<RatingRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  
  // Employee modal state (only used when employeeId is NOT provided - full table view)
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  
  // Rating detail modal state
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedRatingForDetail, setSelectedRatingForDetail] = React.useState<RatingRow | null>(null);
  
  // Big 5 labels cache
  const [big5LabelsCache, setBig5LabelsCache] = React.useState<Map<string, PositionBig5Labels>>(new Map());
  
  // Unique values for filter dropdowns
  const [uniqueEmployees, setUniqueEmployees] = React.useState<string[]>([]);
  const [uniqueLeaders, setUniqueLeaders] = React.useState<string[]>([]);
  const [uniqueRoles, setUniqueRoles] = React.useState<string[]>([]);
  const [uniquePositions, setUniquePositions] = React.useState<string[]>([]);
  
  // Rating thresholds
  const [thresholds, setThresholds] = React.useState<{ yellow_threshold: number; green_threshold: number } | null>(null);
  
  // Fetch rating thresholds
  React.useEffect(() => {
    if (!locationId) return;
    
    fetch(`/api/rating-thresholds?location_id=${encodeURIComponent(locationId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.yellow_threshold && data.green_threshold) {
          setThresholds({
            yellow_threshold: Number(data.yellow_threshold),
            green_threshold: Number(data.green_threshold),
          });
        } else {
          // Fallback to defaults
          setThresholds({ yellow_threshold: 1.75, green_threshold: 2.75 });
        }
      })
      .catch(() => {
        // Fallback to defaults on error
        setThresholds({ yellow_threshold: 1.75, green_threshold: 2.75 });
      });
  }, [locationId]);

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

  // Initialize dates - default to QTD if employeeId or raterUserId is provided, otherwise 30d
  React.useEffect(() => {
    const preset = (employeeId || raterUserId) ? 'qtd' : '30d';
    const [start, end] = getDateRange(preset);
    setStartDate(start);
    setEndDate(end);
    setDateRange(preset);
  }, [getDateRange, employeeId, raterUserId]);

  // Fetch Big 5 labels for a position
  const fetchBig5Labels = React.useCallback(async (position: string) => {
    if (big5LabelsCache.has(position)) {
      return big5LabelsCache.get(position);
    }

    if (!locationId) {
      return null;
    }
    
    try {
      const response = await fetch(
        `/api/position-labels?location_id=${locationId}&position=${encodeURIComponent(position)}`
      );
      
      if (!response.ok) {
        // Endpoint doesn't exist or failed - return null gracefully
        return null;
      }
      
      const result = await response.json();
      
      if (result.success && result.labels) {
        setBig5LabelsCache(prev => new Map(prev).set(position, result.labels));
        return result.labels;
      }
    } catch (err) {
      // Silently fail - this is not critical for displaying ratings
      return null;
    }
    
    return null;
  }, [locationId, big5LabelsCache]);

  // Handle PDF Export
  const handleExportPDF = async () => {
    try {
      // Use the location's image_url from context, fallback to default if not set
      const logoUrl = locationImageUrl || '/logos/Circle C CFA.png';
      
      // Prepare filter data
      const columnFilters = filterModel?.items?.map((item: any) => ({
        field: item.field || '',
        operator: item.operator || '',
        value: String(item.value || '')
      })) || [];
      
      // Add employee filter if employeeId is provided
      if (employeeId && rows.length > 0) {
        const employeeName = rows[0]?.employee_name || '';
        columnFilters.push({
          field: 'employee_name',
          operator: 'is',
          value: employeeName
        });
      }
      
      // Add rater filter if raterUserId is provided
      if (raterUserId && rows.length > 0) {
        const raterName = rows[0]?.rater_name || '';
        columnFilters.push({
          field: 'rater_name',
          operator: 'is',
          value: raterName
        });
      }
      
      const filterData = {
        dateRange: {
          start: startDate?.toLocaleDateString() || '',
          end: endDate?.toLocaleDateString() || ''
        },
        fohSelected: employeeId ? true : showFOH, // When employeeId is provided, show both FOH and BOH
        bohSelected: employeeId ? true : showBOH,
        searchText: searchText || '',
        columnFilters
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

      // Apply current sorting to filteredRows before mapping to PDF data
      let sortedRows = [...filteredRows];
      if (sortModel && sortModel.length > 0) {
        const { field, sort } = sortModel[0];
        sortedRows.sort((a: any, b: any) => {
          let aVal = a[field];
          let bVal = b[field];
          
          // Handle null/undefined
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return sort === 'asc' ? -1 : 1;
          if (bVal == null) return sort === 'asc' ? 1 : -1;
          
          // Handle date fields
          if (field === 'formatted_date' || field === 'created_at') {
            aVal = new Date(a.created_at || a.formatted_date).getTime();
            bVal = new Date(b.created_at || b.formatted_date).getTime();
          }
          
          // Handle numeric fields
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sort === 'asc' ? aVal - bVal : bVal - aVal;
          }
          
          // Handle string fields
          const aStr = String(aVal).toLowerCase();
          const bStr = String(bVal).toLowerCase();
          if (aStr < bStr) return sort === 'asc' ? -1 : 1;
          if (aStr > bStr) return sort === 'asc' ? 1 : -1;
          return 0;
        });
      }

      // Prepare table data from sorted rows
      const tableData = sortedRows.map((row: any) => ({
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
        locationNumber: row.rating_location_id !== locationId ? row.rating_location_number : null,
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

    if (!locationId) {
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

        let ratings: any[] = [];
        let error: any = null;

        if (raterUserId) {
          // Rater View: Fetch ratings where this employee is the rater across all locations in the org
          // 1. Get employee and their org_id
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id, org_id, consolidated_employee_id')
            .eq('id', raterUserId)
            .single();

          if (employeeError) throw employeeError;
          if (!employee) throw new Error('Employee not found');

          // 2. Build set of all employee IDs for this person (handle consolidated employees)
          const raterIds = new Set([raterUserId]);
          if (employee.consolidated_employee_id) {
            raterIds.add(employee.consolidated_employee_id);
          }

          // Find other employees pointing to this person or their consolidated ID
          const { data: relatedEmployees, error: relatedError } = await supabase
            .from('employees')
            .select('id')
            .or(`consolidated_employee_id.eq.${raterUserId}${employee.consolidated_employee_id ? `,consolidated_employee_id.eq.${employee.consolidated_employee_id}` : ''}`)
            .eq('org_id', employee.org_id);

          if (relatedError) throw relatedError;
          relatedEmployees?.forEach(e => raterIds.add(e.id));

          // 3. Fetch all ratings where these IDs are the rater in the same org (with pagination)
          const queryBuilder = supabase
            .from('ratings')
            .select(`
              *,
              employee:employees!ratings_employee_id_fkey(
                full_name, 
                first_name, 
                last_name, 
                role, 
                is_foh, 
                is_boh
              ),
              rater:employees!ratings_rater_user_id_fkey(
                full_name, 
                id,
                consolidated_employee_id
              ),
              rating_location:locations!fk_ratings_location(
                id,
                location_number
              )
            `)
            .in('rater_user_id', Array.from(raterIds))
            .eq('org_id', employee.org_id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

          ratings = await fetchAllRatings(queryBuilder);
          error = null;
        } else if (employeeId) {
          // Employee Modal View: Fetch ratings for this employee across all locations in the org
          // 1. Get employee and their org_id
          const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id, org_id, consolidated_employee_id')
            .eq('id', employeeId)
            .single();

          if (employeeError) throw employeeError;
          if (!employee) throw new Error('Employee not found');

          // 2. Build set of all employee IDs for this person (handle consolidated employees)
          const employeeIds = new Set([employeeId]);
          if (employee.consolidated_employee_id) {
            employeeIds.add(employee.consolidated_employee_id);
          }

          // Find other employees pointing to this person or their consolidated ID
          const { data: relatedEmployees, error: relatedError } = await supabase
            .from('employees')
            .select('id')
            .or(`consolidated_employee_id.eq.${employeeId}${employee.consolidated_employee_id ? `,consolidated_employee_id.eq.${employee.consolidated_employee_id}` : ''}`)
            .eq('org_id', employee.org_id);

          if (relatedError) throw relatedError;
          relatedEmployees?.forEach(e => employeeIds.add(e.id));

          // 3. Fetch all ratings for these employee IDs in the same org (with pagination)
          const queryBuilder = supabase
            .from('ratings')
            .select(`
              *,
              employee:employees!ratings_employee_id_fkey(
                full_name, 
                first_name, 
                last_name, 
                role, 
                is_foh, 
                is_boh
              ),
              rater:employees!ratings_rater_user_id_fkey(
                full_name, 
                id,
                consolidated_employee_id
              ),
              rating_location:locations!fk_ratings_location(
                id,
                location_number
              )
            `)
            .in('employee_id', Array.from(employeeIds))
            .eq('org_id', employee.org_id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

          ratings = await fetchAllRatings(queryBuilder);
          error = null;
        } else {
          // Main Table View: Only fetch ratings for the current location (with pagination)
          const queryBuilder = supabase
            .from('ratings')
            .select(`
              *,
              employee:employees!ratings_employee_id_fkey(
                full_name, 
                first_name, 
                last_name, 
                role, 
                is_foh, 
                is_boh
              ),
              rater:employees!ratings_rater_user_id_fkey(
                full_name, 
                id,
                consolidated_employee_id
              ),
              rating_location:locations!fk_ratings_location(
                id,
                location_number
              )
            `)
            .eq('location_id', locationId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });

          ratings = await fetchAllRatings(queryBuilder);
          error = null;
        }

        // Check for errors
        if (error) throw error;
        
        // Deduplicate ratings by id first (in case of any duplicates from query)
        const ratingsById = new Map();
        (ratings || []).forEach((rating: any) => {
          if (!ratingsById.has(rating.id)) {
            ratingsById.set(rating.id, rating);
          }
        });
        
        // Additional deduplication: remove duplicates based on employee, rater (by consolidated ID), timestamp, and position
        // This handles cases where the same person has multiple employee records across locations
        const ratingsByKey = new Map<string, any>();
        Array.from(ratingsById.values()).forEach((rating: any) => {
          const raterConsolidatedId = rating.rater?.consolidated_employee_id || rating.rater?.id || rating.rater_user_id;
          const key = `${rating.employee_id}_${raterConsolidatedId}_${rating.created_at}_${rating.position}_${rating.location_id}`;
          
          // Keep the rating with the highest ID (most recent) if duplicates exist
          if (!ratingsByKey.has(key) || rating.id > ratingsByKey.get(key).id) {
            ratingsByKey.set(key, rating);
          }
        });
        
        const uniqueRatings = Array.from(ratingsByKey.values());
        
        const transformedRows: RatingRow[] = uniqueRatings
          .filter((rating: any) => {
            // When employeeId or raterUserId is provided, show both FOH and BOH (no filtering)
            if (employeeId || raterUserId) {
              return true;
            }
            
            // Get the position name for FOH/BOH filtering
            // First remove " | Spanish" part (if present), but keep the FOH/BOH suffix for filtering
            let positionForFilter = rating.position || '';
            if (positionForFilter.includes(' | ')) {
              positionForFilter = positionForFilter.split(' | ')[0].trim();
            }
            // Check against the full position names in FOH_POSITIONS/BOH_POSITIONS arrays
            const isFOHPosition = FOH_POSITIONS.includes(positionForFilter);
            const isBOHPosition = BOH_POSITIONS.includes(positionForFilter);

            if (!showFOH && !showBOH) {
              return false;
            }
            if (showFOH && !showBOH) {
              if (!isFOHPosition) {
                return false;
              }
            }
            if (!showFOH && showBOH) {
              if (!isBOHPosition) {
                return false;
              }
            }

            return true;
          })
          .map((rating: any) => {
            const employeeName =
              rating.employee?.full_name ||
              `${rating.employee?.first_name || ''} ${rating.employee?.last_name || ''}`.trim() ||
              'Unknown';
            const raterName = rating.rater?.full_name || 'Unknown';
            const employeeRole = rating.employee?.role || 'Team Member';
            // rater_user_id is the employee_id of the rater
            const raterEmployeeId = rating.rater_user_id || rating.rater?.id || null;
            
            // Get location info for pill display
            const ratingLocationId = rating.location_id || '';
            const ratingLocationNumber = rating.rating_location?.location_number || null;
            const isDifferentLocation = ratingLocationId !== locationId;

            return {
              ...rating,
              id: rating.id,
              employee_name: employeeName,
              employee_id: rating.employee_id,
              employee_role: employeeRole,
              rater_name: raterName,
              rater_employee_id: raterEmployeeId,
              position_cleaned: cleanPositionName(rating.position),
              formatted_date: formatDate(rating.created_at),
              created_at: rating.created_at,
              rating_location_id: ratingLocationId,
              rating_location_number: ratingLocationNumber,
            };
          });

        if (!isActive) {
          return;
        }

        setRows(transformedRows);

        // Build unique lists for dropdown filters
        let employees: string[];
        let leaders: string[];
        
        if (employeeId || raterUserId) {
          // Employee/Rater modal view: show all employees/leaders from ratings (already filtered)
          employees = Array.from(new Set(transformedRows.map((r) => r.employee_name))).sort();
          leaders = Array.from(new Set(transformedRows.map((r) => r.rater_name))).sort();
        } else {
          // Main table view: filter to only show employees/leaders from current location
          const { data: currentLocationEmployees, error: namesError } = await supabase
            .from('employees')
            .select('full_name')
            .eq('location_id', locationId)
            .eq('active', true);

          if (namesError) throw namesError;

          const currentLocationNamesSet = new Set(
            (currentLocationEmployees || []).map((emp: any) => emp.full_name).filter(Boolean)
          );

          employees = Array.from(
            new Set(
              transformedRows
                .filter((r) => currentLocationNamesSet.has(r.employee_name))
                .map((r) => r.employee_name)
            )
          ).sort();
          
          leaders = Array.from(
            new Set(
              transformedRows
                .filter((r) => currentLocationNamesSet.has(r.rater_name))
                .map((r) => r.rater_name)
            )
          ).sort();
        }
        
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
  }, [locationId, employeeId, startDate, endDate, showFOH, showBOH, fetchBig5Labels]);

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

  // Handle viewing rating details
  const handleViewDetail = (row: RatingRow) => {
    setSelectedRatingForDetail(row);
    setDetailModalOpen(true);
  };

  const handleDetailModalClose = () => {
    setDetailModalOpen(false);
    setSelectedRatingForDetail(null);
  };

  // Handle clicking on employee or leader name to open their modal
  const handleNameClick = React.useCallback(async (empId: string | null) => {
    if (!empId || employeeId) return; // Don't open modal if employeeId is provided (we're already in employee view)
    
    try {
      const supabase = createSupabaseClient();
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', empId)
        .single();
      
      if (error) throw error;
      
      if (employee) {
        setSelectedEmployee(employee as Employee);
        setEmployeeModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
    }
  }, [employeeId]);

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
          {/* Hide FOH/BOH buttons when employeeId or raterUserId is provided */}
          {!employeeId && !raterUserId && (
            <>
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
            </>
          )}
          
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
          {/* Hide search field when employeeId or raterUserId is provided */}
          {!employeeId && !raterUserId && (
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
          )}
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
      field: 'view_detail',
      headerName: '',
      width: 40,
      sortable: false,
      filterable: false,
      resizable: false,
      disableColumnMenu: true,
      disableExport: true, // Exclude from PDF export
      hideable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const row = params.row as RatingRow;
        return (
          <IconButton
            onClick={() => handleViewDetail(row)}
            size="small"
            sx={{ 
              color: '#6b7280',
              padding: '4px',
              '&:hover': {
                color: levelsetGreen,
                backgroundColor: 'rgba(49, 102, 74, 0.04)',
              },
            }}
          >
            <VisibilityIcon sx={{ fontSize: 18 }} />
          </IconButton>
        );
      },
    },
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
      width: 190,
      sortable: true,
      filterable: !employeeId && !raterUserId, // Disable filtering when employeeId or raterUserId is provided
      resizable: false, // Disable column resize to hide separators
      filterOperators: createDropdownOperators(uniqueEmployees),
      renderCell: (params) => {
        const row = params.row as RatingRow;
        const isClickable = !employeeId && !raterUserId && row.employee_id;
        const isDifferentLocation = row.rating_location_id !== locationId && row.rating_location_number;
        
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Box
              sx={{
                fontFamily,
                fontSize: 13,
                fontWeight: 500,
                color: isClickable ? levelsetGreen : '#111827',
                cursor: isClickable ? 'pointer' : 'default',
                textDecoration: 'none',
                '&:hover': isClickable ? {
                  textDecoration: 'underline',
                } : {},
              }}
              onClick={() => isClickable && handleNameClick(row.employee_id)}
            >
              {params.value}
            </Box>
            {isDifferentLocation && (
              <Chip
                label={row.rating_location_number}
                size="small"
                sx={{
                  fontFamily,
                  fontSize: 10,
                  fontWeight: 600,
                  height: '1.5em', // Match line height of text (13px * 1.5 = 19.5px)
                  lineHeight: 1.5,
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  '& .MuiChip-label': {
                    padding: '0 6px',
                    lineHeight: 1.5,
                  },
                }}
              />
            )}
          </Box>
        );
      },
    },
    {
      field: 'employee_role',
      headerName: 'Employee Role',
      width: 140,
      sortable: true,
      filterable: !employeeId && !raterUserId, // Disable filtering when employeeId or raterUserId is provided
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
      width: 180,
      sortable: true,
      filterable: true,
      resizable: false, // Disable column resize to hide separators
      filterOperators: createDropdownOperators(uniqueLeaders),
      renderCell: (params) => {
        const row = params.row as RatingRow;
        const isClickable = !employeeId && row.rater_employee_id;
        
        return (
          <Box
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 500,
              color: isClickable ? levelsetGreen : '#111827',
              cursor: isClickable ? 'pointer' : 'default',
              textDecoration: 'none',
              '&:hover': isClickable ? {
                textDecoration: 'underline',
              } : {},
            }}
            onClick={() => isClickable && handleNameClick(row.rater_employee_id)}
          >
            {params.value}
          </Box>
        );
      },
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
                backgroundColor: getRatingColor(rating, thresholds || undefined),
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
                backgroundColor: getRatingColor(rating, thresholds || undefined),
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
                backgroundColor: getRatingColor(rating, thresholds || undefined),
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
                backgroundColor: getRatingColor(rating, thresholds || undefined),
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
                backgroundColor: getRatingColor(rating, thresholds || undefined),
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
            columns={(employeeId || raterUserId) ? columns.filter(col => col.field !== 'employee_role') : columns}
            loading={loading}
            onFilterModelChange={(newModel) => {
              setFilterModel(newModel);
            }}
            onSortModelChange={(newModel) => {
              setSortModel(newModel as Array<{ field: string; sort: 'asc' | 'desc' }>);
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
                      backgroundColor: getRatingColor(ratingToDelete.rating_avg, thresholds || undefined),
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
        
        {/* Employee Modal - only shown when employeeId is NOT provided (full table view) */}
        {!employeeId && (
          <EmployeeModal
            open={employeeModalOpen}
            employee={selectedEmployee}
            onClose={() => {
              setEmployeeModalOpen(false);
              setSelectedEmployee(null);
            }}
            locationId={locationId}
            initialTab="pe"
          />
        )}
        
        {/* Rating Detail Modal */}
        <Dialog
          open={detailModalOpen}
          onClose={handleDetailModalClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '16px',
              maxWidth: '720px',
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            fontFamily,
            fontWeight: 600,
            fontSize: 18,
            borderBottom: '1px solid #e5e7eb',
            pb: 2,
          }}>
            Rating for {selectedRatingForDetail?.employee_name || 'Employee'}
            <IconButton onClick={handleDetailModalClose} size="small" sx={{ color: '#6b7280' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 3, pt: 5 }}>
            {selectedRatingForDetail && (() => {
              const rating = selectedRatingForDetail;
              const labels = big5LabelsCache.get(rating.position);
              const overallRating = rating.rating_avg ?? 0;
              const yellowThreshold = thresholds?.yellow_threshold ?? 1.75;
              const greenThreshold = thresholds?.green_threshold ?? 2.75;
              
              // Calculate position percentage for the dot (1-3 scale mapped to 0-100%)
              const dotPosition = ((overallRating - 1) / 2) * 100;
              
              // Determine color based on thresholds
              const getScoreColor = (score: number) => {
                if (score >= greenThreshold) return '#249e6b';
                if (score >= yellowThreshold) return '#ffb549';
                return '#ad2624';
              };
              
              const scoreColor = getScoreColor(overallRating);
              
              // Calculate threshold positions for the progress bar (1-3 scale mapped to 0-100%)
              const yellowPos = ((yellowThreshold - 1) / 2) * 100;
              const greenPos = ((greenThreshold - 1) / 2) * 100;
              
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Two-column layout */}
                  <Box sx={{ display: 'flex', gap: 4 }}>
                    {/* Left Column - Metadata */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <Box>
                        <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
                          Rater
                        </Typography>
                        <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 600, color: '#111827' }}>
                          {rating.rater_name}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
                          Date
                        </Typography>
                        <Typography sx={{ fontFamily, fontSize: 15, fontWeight: 500, color: '#111827' }}>
                          {rating.formatted_date}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
                          Position
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PositionChip 
                            label={rating.position_cleaned} 
                            size="small" 
                            positiontype={FOH_POSITIONS.includes(rating.position) ? 'FOH' : 'BOH'} 
                          />
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
                          Additional Details
                        </Typography>
                        <Box sx={{ 
                          backgroundColor: '#f9fafb', 
                          borderRadius: '8px', 
                          p: 1.5,
                          border: '1px solid #e5e7eb',
                          minHeight: 60,
                        }}>
                          <Typography sx={{ 
                            fontFamily, 
                            fontSize: 14, 
                            fontWeight: 400, 
                            color: rating.notes ? '#374151' : '#9ca3af', 
                            lineHeight: 1.5,
                            fontStyle: rating.notes ? 'normal' : 'italic',
                          }}>
                            {rating.notes || 'No additional details provided'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    {/* Right Column - Criteria Ratings */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>
                        Criteria Ratings
                      </Typography>
                      
                      {[1, 2, 3, 4, 5].map((num) => {
                        const ratingValue = rating[`rating_${num}` as keyof RatingRow] as number | null;
                        const labelKey = `label_${num}` as keyof typeof labels;
                        const criteriaLabel = labels?.[labelKey] || `Criteria ${num}`;
                        
                        return (
                          <Box 
                            key={num}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              backgroundColor: '#f9fafb',
                              borderRadius: '8px',
                              p: 1.5,
                              border: '1px solid #e5e7eb',
                            }}
                          >
                            <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 500, color: '#374151', flex: 1 }}>
                              {criteriaLabel}
                            </Typography>
                            <Box
                              sx={{
                                backgroundColor: getRatingColor(ratingValue, thresholds || undefined),
                                color: '#fff',
                                fontWeight: 600,
                                fontFamily,
                                fontSize: 14,
                                borderRadius: '6px',
                                px: 1.5,
                                py: 0.5,
                                minWidth: 45,
                                textAlign: 'center',
                              }}
                            >
                              {ratingValue?.toFixed(2) || '—'}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                  
                  {/* Overall Score Section */}
                  <Box sx={{ 
                    mt: 2, 
                    pt: 3, 
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                        Overall Rating
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ 
                          fontFamily, 
                          fontSize: 24, 
                          fontWeight: 700, 
                          color: scoreColor,
                        }}>
                          {overallRating.toFixed(2)}
                        </Typography>
                        <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 500, color: '#9ca3af' }}>
                          / 3.00
                        </Typography>
                      </Box>
                    </Box>
                    
                    {/* Progress Bar with Color Zones */}
                    <Box sx={{ position: 'relative', height: 24 }}>
                      {/* Track background with color zones */}
                      <Box sx={{ 
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: 0,
                        right: 0,
                        height: 12,
                        borderRadius: 6,
                        overflow: 'hidden',
                        display: 'flex',
                      }}>
                        {/* Red zone (1 to yellow threshold) */}
                        <Box sx={{ 
                          width: `${yellowPos}%`, 
                          backgroundColor: '#fecaca',
                          borderRight: '1px solid #fca5a5',
                        }} />
                        {/* Yellow zone (yellow threshold to green threshold) */}
                        <Box sx={{ 
                          width: `${greenPos - yellowPos}%`, 
                          backgroundColor: '#fef08a',
                          borderRight: '1px solid #fde047',
                        }} />
                        {/* Green zone (green threshold to 3) */}
                        <Box sx={{ 
                          flex: 1, 
                          backgroundColor: '#bbf7d0',
                        }} />
                      </Box>
                      
                      {/* Score Dot */}
                      <Box sx={{ 
                        position: 'absolute',
                        top: '50%',
                        left: `${Math.max(0, Math.min(100, dotPosition))}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: scoreColor,
                        border: '3px solid #fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                      }} />
                      
                      {/* Scale labels */}
                      <Box sx={{ 
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 0.5,
                      }}>
                        <Typography sx={{ fontFamily, fontSize: 10, fontWeight: 500, color: '#9ca3af' }}>1</Typography>
                        <Typography sx={{ fontFamily, fontSize: 10, fontWeight: 500, color: '#9ca3af' }}>3</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              );
            })()}
          </DialogContent>
        </Dialog>
      </StyledContainer>
    </LocalizationProvider>
  );
}
