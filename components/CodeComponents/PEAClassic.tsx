import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Typography,
  Box,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { FohBohSlider } from "./FohBohSlider";
import { PEARubric } from "./PEARubric";
import { 
  fetchOverviewData, 
  fetchPositionData, 
  fetchLeadershipData,
  fetchPositionsList,
  fetchBig5Labels,
  getRatingColor,
  formatRating,
  formatRatingDate,
  getPositionsByArea
} from "@/lib/ratings-data";
import type { 
  EmployeeRatingAggregate, 
  LeaderRatingAggregate,
  PositionBig5Labels,
  Rating
} from "@/lib/supabase.types";
import { createSupabaseClient } from "@/util/supabase/component";

// Helper function to remove "FOH" or "BOH" from position names for display
const cleanPositionName = (positionName: string): string => {
  // Remove " FOH" or " BOH" from 3H Week, Trainer, and Leadership positions
  if (positionName.includes('3H Week') || positionName.includes('Trainer') || positionName.includes('Leadership')) {
    return positionName.replace(/ (FOH|BOH)$/i, '');
  }
  return positionName;
};

export interface PEAClassicProps {
  locationId: string;
  className?: string;
  density?: "comfortable" | "compact";
  defaultTab?: "overview" | "employees" | "leadership";
  defaultArea?: "FOH" | "BOH";
  logoUrl?: string;
  width?: string | number;
  maxWidth?: string | number;
  /** Show compact controls on a single row for mobile */
  compactControls?: boolean;
  /** Fill available height (for use in full-page layouts) */
  fillHeight?: boolean;
}

const fontFamily = `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

// ===== Styled Components =====

const StyledContainer = styled(TableContainer)<{ componentwidth?: string | number; componentmaxwidth?: string | number }>(({ componentwidth, componentmaxwidth }) => ({
  width: componentwidth || '100%',
  maxWidth: componentmaxwidth || '100%',
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflowX: "auto",
  overflowY: "auto",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
  maxHeight: 650,
  boxSizing: 'border-box',
  // Mobile responsive
  '@media (max-width: 768px)': {
    borderRadius: 8,
    maxHeight: 450,
  },
  // iPad/Tablet styles
  '@media (min-width: 769px) and (max-width: 1024px)': {
    borderRadius: 12,
    maxHeight: 550,
  }
}));

const StyledTable = styled(Table)(() => ({
  fontFamily,
  tableLayout: 'auto',
  "& th": {
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.05em",
    textTransform: "none",
    color: "#111827",
    lineHeight: 1.2,
    fontFamily,
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  "& td": {
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.2,
    fontFamily,
  },
  "& tbody tr:hover": {
    backgroundColor: "#f9fafb",
  },
  // Mobile responsive styles
  '@media (max-width: 768px)': {
    "& th, & td": {
      fontSize: 11,
      padding: '6px 4px',
    },
    // Keep first column (expand icon) non-sticky for better tap interaction
    "& th:first-of-type, & td:first-of-type": {
      padding: '4px 2px',
      width: 32,
      minWidth: 32,
    },
    // Sticky second column (name) only
    "& th:nth-of-type(2), & td:nth-of-type(2)": {
      position: 'sticky',
      left: 0,
      zIndex: 5,
      backgroundColor: '#f9fafb',
      boxShadow: '2px 0 4px rgba(0,0,0,0.08)',
      minWidth: 100,
      maxWidth: 140,
    },
    "& td:nth-of-type(2)": {
      backgroundColor: '#ffffff',
    },
    "& tbody tr:hover td:nth-of-type(2)": {
      backgroundColor: '#f9fafb',
    },
    // Top sticky header needs higher z-index
    "& th:nth-of-type(2)": {
      zIndex: 11,
    },
  },
  // iPad/Tablet styles
  '@media (min-width: 769px) and (max-width: 1024px)': {
    "& th, & td": {
      fontSize: 12,
      padding: '8px 6px',
    },
  },
}));

const SecondStickyHeader = styled(TableRow)(() => ({
  "& th": {
    position: 'sticky',
    top: 40, // below first header (adjust based on actual header height)
    zIndex: 9,
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  }
}));

const RatingCell = styled(TableCell)<{ $rating?: number | null; $greenThreshold?: number; $yellowThreshold?: number }>(({ $rating, $greenThreshold = 2.75, $yellowThreshold = 1.75 }) => {
  let bgColor = 'transparent';
  let textColor = '#111827';
  let fontWeight = 400;

  if ($rating !== null && $rating !== undefined) {
    fontWeight = 600;
    if ($rating >= $greenThreshold) {
      bgColor = '#249e6b';
      textColor = '#fff';
    } else if ($rating >= $yellowThreshold) {
      bgColor = '#ffb549';
      textColor = '#fff';
    } else if ($rating >= 1.0) {
      bgColor = '#ad2624';
      textColor = '#fff';
    }
  }

  return {
    backgroundColor: bgColor,
    color: `${textColor} !important`, // Force white text with !important
    fontWeight,
    textAlign: 'center',
    padding: '8px 4px'
  };
});

const ExpandIcon = styled(IconButton)<{ $expanded: boolean }>(({ $expanded }) => ({
  padding: 4,
  transition: 'transform 0.15s ease',
  transform: $expanded ? 'rotate(90deg)' : 'rotate(0deg)',
  color: '#6b7280',
  '& svg': {
    fontSize: 18
  },
  '@media (max-width: 768px)': {
    padding: 2,
    '& svg': {
      fontSize: 16
    }
  }
}));

const StyledTabs = styled(Tabs)(() => ({
  borderBottom: '1px solid #e5e7eb',
  marginBottom: 12,
  '& .MuiTabs-indicator': {
    backgroundColor: '#31664a',
    height: 3
  },
  '@media (max-width: 768px)': {
    marginBottom: 8,
    minHeight: 36,
    '& .MuiTabs-flexContainer': {
      justifyContent: 'space-between',
    }
  }
}));

const StyledTab = styled(Tab)(() => ({
  fontFamily,
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'none',
  color: '#6b7280',
  '&.Mui-selected': {
    color: '#31664a',
    fontWeight: 600
  },
  '@media (max-width: 768px)': {
    fontSize: 12,
    minWidth: 'auto',
    padding: '8px 12px',
  }
}));

const ControlsContainer = styled(Box)<{ compact?: boolean }>(({ compact }) => ({
  display: 'flex',
  gap: compact ? 8 : 16,
  alignItems: 'center',
  marginBottom: compact ? 8 : 16,
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  '@media (max-width: 768px)': {
    gap: compact ? 8 : 12,
    flexDirection: compact ? 'row' : 'column',
    alignItems: compact ? 'center' : 'stretch',
    justifyContent: compact ? 'space-between' : 'flex-start',
  }
}));

const ExpandedContentRow = styled(TableRow)(() => ({
  backgroundColor: '#fafafa',
  '& td': {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottom: '2px solid #e5e7eb'
  }
}));

const ExpandedTableContainer = styled(Box)(() => ({
  overflowX: 'auto',
  width: '100%',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
}));

const ExpandedTable = styled(Table)(() => ({
  tableLayout: 'auto',
  minWidth: 500,
  '& th': {
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    fontSize: 10,
    fontWeight: 600,
    borderBottom: '1px solid #d1d5db',
    textTransform: 'none',
    whiteSpace: 'nowrap',
  },
  '& td': {
    padding: '4px 8px',
    fontSize: 11,
    borderBottom: '1px solid #e5e7eb',
  },
  // First column (Leader/Employee name) - sticky with proper width
  '& thead th:first-of-type, & tbody td:first-of-type': {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    minWidth: 90,
    width: 90,
    maxWidth: 110,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
  '& thead th:first-of-type': {
    backgroundColor: '#f3f4f6',
  },
  '& tbody td:first-of-type': {
    backgroundColor: '#fafafa',
    boxShadow: '2px 0 4px rgba(0,0,0,0.05)',
  },
  // Date column - compact, NOT sticky
  '& thead th:nth-of-type(2), & tbody td:nth-of-type(2)': {
    whiteSpace: 'nowrap',
    width: 75,
    minWidth: 75,
    position: 'static',
  },
}));

const LoadingOverlay = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 10,
  backdropFilter: 'blur(2px)'
}));

// ===== Main Component =====

export function PEAClassic({
  locationId,
  className = "",
  density = "comfortable",
  defaultTab = "overview",
  defaultArea = "FOH",
  logoUrl,
  width,
  maxWidth,
  compactControls = false,
  fillHeight = false
}: PEAClassicProps) {
  const [activeTab, setActiveTab] = React.useState<"overview" | "employees" | "leadership">(defaultTab);
  const [area, setArea] = React.useState<"FOH" | "BOH">(defaultArea);
  const [selectedPosition, setSelectedPosition] = React.useState<string | null>(null);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  
  const [overviewData, setOverviewData] = React.useState<EmployeeRatingAggregate[]>([]);
  const [positionData, setPositionData] = React.useState<EmployeeRatingAggregate[]>([]);
  const [leadershipData, setLeadershipData] = React.useState<LeaderRatingAggregate[]>([]);
  
  const [positions, setPositions] = React.useState<string[]>([]);
  const [big5Labels, setBig5Labels] = React.useState<PositionBig5Labels | null>(null);
  
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  const [showRatingScale, setShowRatingScale] = React.useState(false);
  const [thresholds, setThresholds] = React.useState<{ yellow_threshold: number; green_threshold: number } | null>(null);

  const cellPadding = density === "compact" ? 0.5 : 1;

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

  // Fetch positions list when area changes
  React.useEffect(() => {
    async function loadPositions() {
      try {
        const response = await fetch(
          `/api/position-labels?location_id=${locationId}&area=${area}`
        );
        const result = await response.json();
        
        if (result.success && result.positions && result.positions.length > 0) {
          setPositions(result.positions);
          // Set first position as default for position view
          if (!selectedPosition || !result.positions.includes(selectedPosition)) {
            setSelectedPosition(result.positions[0]);
          }
        } else {
          // Fallback to hard-coded list
          const fallbackPositions = getPositionsByArea(area);
          setPositions(fallbackPositions);
          if (!selectedPosition || !fallbackPositions.includes(selectedPosition)) {
            setSelectedPosition(fallbackPositions[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching positions:', err);
        // Fallback to hard-coded list
        const fallbackPositions = getPositionsByArea(area);
        setPositions(fallbackPositions);
        if (!selectedPosition || !fallbackPositions.includes(selectedPosition)) {
          setSelectedPosition(fallbackPositions[0]);
        }
      }
    }

    loadPositions();
  }, [area, locationId]);

  // Fetch Big 5 labels when position changes
  React.useEffect(() => {
    if (!selectedPosition) return;

    async function loadLabels() {
      try {
        const response = await fetch(
          `/api/position-labels?location_id=${locationId}&position=${encodeURIComponent(selectedPosition)}`
        );
        const result = await response.json();
        
        if (result.success) {
          setBig5Labels(result.labels);
        } else {
          setBig5Labels(null);
        }
      } catch (err) {
        console.error('Error fetching Big 5 labels:', err);
        setBig5Labels(null);
      }
    }

    loadLabels();
  }, [selectedPosition, locationId]);

  // Fetch data when tab, area, or position changes
  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      
      // Reset expanded rows when changing views
      setExpandedRows(new Set());

      try {
        let endpoint = `/api/ratings?location_id=${locationId}&area=${area}`;

        switch (activeTab) {
          case 'overview':
            endpoint += '&tab=overview';
            const overviewRes = await fetch(endpoint);
            const overviewResult = await overviewRes.json();
            if (overviewResult.success) {
              setOverviewData(overviewResult.data);
            }
            break;

          case 'employees':
            if (!selectedPosition) break;
            endpoint += `&tab=position&position=${encodeURIComponent(selectedPosition)}`;
            const posRes = await fetch(endpoint);
            const posResult = await posRes.json();
            if (posResult.success) {
              setPositionData(posResult.data);
            }
            break;

          case 'leadership':
            endpoint += '&tab=leadership';
            const leaderRes = await fetch(endpoint);
            const leaderResult = await leaderRes.json();
            if (leaderResult.success) {
              setLeadershipData(leaderResult.data);
            }
            break;
        }
      } catch (err) {
        console.error('Error loading ratings data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (locationId) {
      loadData();
    }
  }, [activeTab, area, selectedPosition, locationId]);

  // Handle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue as "overview" | "employees" | "leadership");
    setExpandedRows(new Set()); // collapse all rows when switching tabs
  };

  // Handle area change (FOH/BOH slider)
  const handleAreaChange = (newArea: "FOH" | "BOH") => {
    console.log('[PositionalRatingsTable] handleAreaChange called with:', newArea);
    console.log('[PositionalRatingsTable] Current area:', area, '-> New area:', newArea);
    setArea(newArea);
    setSelectedPosition(null); // reset position selection
    setExpandedRows(new Set());
  };

  // Handle position selection
  const handlePositionChange = (event: any) => {
    setSelectedPosition(event.target.value);
    setExpandedRows(new Set());
  };

  // Only show loading screen on initial load (no data at all)
  const isInitialLoad = loading && (overviewData.length === 0 && positionData.length === 0 && leadershipData.length === 0);
  
  if (isInitialLoad) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#31664a' }} />
      </Box>
    );
  }

  if (error && !loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box 
      className={`pea-classic ${className}`}
      sx={{
        width: width || '100%',
        maxWidth: maxWidth || '100%',
        height: fillHeight ? '100%' : 'auto',
        display: fillHeight ? 'flex' : 'block',
        flexDirection: 'column',
      }}
    >
      {/* Header with Logo only */}
      {logoUrl && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <img src={logoUrl} alt="Location Logo" style={{ width: 180, height: 'auto' }} />
        </Box>
      )}

      {/* Tabs */}
      <StyledTabs value={activeTab} onChange={handleTabChange}>
        <StyledTab label="Overview" value="overview" />
        <StyledTab label="Position View" value="employees" />
        <StyledTab label="Leadership View" value="leadership" />
      </StyledTabs>

      {/* Controls */}
      <ControlsContainer compact={compactControls}>
        <Box sx={{ display: 'flex', gap: compactControls ? 1 : 2, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <FohBohSlider value={area} onChange={handleAreaChange} />
          
          {activeTab === 'employees' && (
            <FormControl size="small" sx={{ minWidth: compactControls ? 150 : 200, flex: { xs: 1, sm: 'none' } }}>
              <InputLabel sx={{ fontFamily }}>Position</InputLabel>
              <Select
                value={selectedPosition || ''}
                onChange={handlePositionChange}
                label="Position"
                sx={{ fontFamily }}
              >
                {positions.map(pos => (
                  <MenuItem key={pos} value={pos} sx={{ fontFamily }}>
                    {cleanPositionName(pos)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        
        {/* Show Rating Scale Button - only on Overview tab */}
        {activeTab === 'overview' && (
          <Button
            onClick={() => setShowRatingScale(true)}
            sx={{
              fontFamily,
              fontSize: compactControls ? 12 : 14,
              fontWeight: 600,
              backgroundColor: '#31664a',
              color: '#ffffff',
              borderRadius: '6px',
              textTransform: 'none',
              padding: compactControls ? '6px 12px' : '8px 16px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              '&:hover': {
                backgroundColor: '#27533d',
              }
            }}
          >
            Rating Scale
          </Button>
        )}
      </ControlsContainer>

      {/* Table Content - Render based on active tab with loading overlay */}
      <Box sx={{ position: 'relative', minHeight: 400, flex: fillHeight ? 1 : 'none', overflow: 'hidden' }}>
        {loading && (
          <LoadingOverlay>
            <CircularProgress sx={{ color: '#31664a' }} />
          </LoadingOverlay>
        )}
        
        {activeTab === 'overview' && (
          <OverviewTable 
            data={overviewData}
            area={area}
            positions={positions}
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            cellPadding={cellPadding}
            thresholds={thresholds}
            fillHeight={fillHeight}
          />
        )}

        {activeTab === 'employees' && selectedPosition && (
          <PositionTable
            data={positionData}
            position={selectedPosition}
            big5Labels={big5Labels}
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            cellPadding={cellPadding}
            thresholds={thresholds}
            fillHeight={fillHeight}
          />
        )}

        {activeTab === 'leadership' && (
          <LeadershipTable
            data={leadershipData}
            area={area}
            positions={positions}
            expandedRows={expandedRows}
            toggleRow={toggleRow}
            cellPadding={cellPadding}
            thresholds={thresholds}
            fillHeight={fillHeight}
          />
        )}
      </Box>
      
      {/* Rating Scale Modal */}
      <Dialog
        open={showRatingScale}
        onClose={() => setShowRatingScale(false)}
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2,
            fontFamily,
          }
        }}
      >
        <DialogTitle sx={{ fontFamily, fontWeight: 600, pb: 1 }}>
          Rating Scale
        </DialogTitle>
        <DialogContent>
          <PEARubric 
            yellowThreshold={thresholds?.yellow_threshold}
            greenThreshold={thresholds?.green_threshold}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// ===== Overview Table Sub-Component =====

interface OverviewTableProps {
  data: EmployeeRatingAggregate[];
  area: 'FOH' | 'BOH';
  positions: string[];
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  cellPadding: number;
  thresholds?: { yellow_threshold: number; green_threshold: number } | null;
  fillHeight?: boolean;
}

function OverviewTable({ data, area, positions, expandedRows, toggleRow, cellPadding, thresholds, fillHeight }: OverviewTableProps) {

  return (
    <StyledContainer sx={{ 
      height: fillHeight ? '100%' : 'auto', 
      maxHeight: fillHeight ? 'none' : undefined,
      '@media (max-width: 768px)': fillHeight ? { maxHeight: 'none' } : undefined,
    }}>
      <StyledTable>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 32, minWidth: 32, p: '8px 4px' }}></TableCell>
            <TableCell sx={{ pl: 1, minWidth: 100 }}>Name</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap', minWidth: 80 }}>Last Rating</TableCell>
            {positions.map(pos => (
              <TableCell key={pos} align="center" sx={{ whiteSpace: 'nowrap', minWidth: 50, px: 1 }}>
                {cleanPositionName(pos)}
              </TableCell>
            ))}
            <TableCell align="center" sx={{ whiteSpace: 'nowrap', minWidth: 70 }}>Overall Avg</TableCell>
            <TableCell align="center" sx={{ whiteSpace: 'nowrap', minWidth: 60 }}># Ratings</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((employee) => {
            const isExpanded = expandedRows.has(employee.employee_id);
            
            return (
              <React.Fragment key={employee.employee_id}>
                {/* Main Row */}
                <TableRow hover>
                  <TableCell sx={{ py: cellPadding, px: '4px' }}>
                    <ExpandIcon 
                      $expanded={isExpanded}
                      onClick={() => toggleRow(employee.employee_id)}
                      size="small"
                    >
                      <ExpandMoreIcon />
                    </ExpandIcon>
                  </TableCell>
                  <TableCell 
                    sx={{ py: cellPadding, pl: 1, fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => toggleRow(employee.employee_id)}
                  >
                    {employee.employee_name}
                  </TableCell>
                  <TableCell align="center" sx={{ py: cellPadding, fontSize: 12, color: '#6b7280' }}>
                    {employee.last_rating_date ? formatRatingDate(employee.last_rating_date) : '—'}
                  </TableCell>
                  {positions.map(pos => {
                    const rating = employee.positions[pos];
                    return (
                      <RatingCell 
                        key={pos} 
                        $rating={rating} 
                        $greenThreshold={thresholds?.green_threshold}
                        $yellowThreshold={thresholds?.yellow_threshold}
                        sx={{ py: cellPadding, px: 1 }}
                      >
                        {formatRating(rating)}
                      </RatingCell>
                    );
                  })}
                  <RatingCell 
                    $rating={employee.overall_avg} 
                    $greenThreshold={thresholds?.green_threshold}
                    $yellowThreshold={thresholds?.yellow_threshold}
                    sx={{ py: cellPadding }}
                  >
                    {formatRating(employee.overall_avg)}
                  </RatingCell>
                  <TableCell align="center" sx={{ py: cellPadding }}>
                    {employee.total_count_90d}
                  </TableCell>
                </TableRow>

                {/* Expanded Content */}
                {isExpanded && (
                  <ExpandedContentRow>
                    <TableCell colSpan={positions.length + 5} sx={{ p: 2 }}>
                      <Typography sx={{ fontFamily, fontWeight: 600, fontSize: 11, mb: 1 }}>
                        Last 4 Ratings
                      </Typography>
                      <ExpandedTableContainer>
                        <ExpandedTable size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Leader</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Position</TableCell>
                              <TableCell align="center">Criteria 1</TableCell>
                              <TableCell align="center">Criteria 2</TableCell>
                              <TableCell align="center">Criteria 3</TableCell>
                              <TableCell align="center">Criteria 4</TableCell>
                              <TableCell align="center">Criteria 5</TableCell>
                              <TableCell align="center">Avg</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {employee.recent_ratings.map((rating, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{rating.rater_name}</TableCell>
                                <TableCell>{formatRatingDate(rating.created_at)}</TableCell>
                                <TableCell>{cleanPositionName(rating.position)}</TableCell>
                                <RatingCell $rating={rating.rating_1} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_1)}</RatingCell>
                                <RatingCell $rating={rating.rating_2} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_2)}</RatingCell>
                                <RatingCell $rating={rating.rating_3} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_3)}</RatingCell>
                                <RatingCell $rating={rating.rating_4} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_4)}</RatingCell>
                                <RatingCell $rating={rating.rating_5} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_5)}</RatingCell>
                                <RatingCell $rating={rating.rating_avg} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_avg)}</RatingCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </ExpandedTable>
                      </ExpandedTableContainer>
                    </TableCell>
                  </ExpandedContentRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </StyledTable>
    </StyledContainer>
  );
}

// ===== Position-Specific Table Sub-Component =====

interface PositionTableProps {
  data: EmployeeRatingAggregate[];
  position: string;
  big5Labels: PositionBig5Labels | null;
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  cellPadding: number;
  thresholds?: { yellow_threshold: number; green_threshold: number } | null;
  fillHeight?: boolean;
}

function PositionTable({ data, position, big5Labels, expandedRows, toggleRow, cellPadding, thresholds, fillHeight }: PositionTableProps) {
  return (
    <StyledContainer sx={{ 
      height: fillHeight ? '100%' : 'auto', 
      maxHeight: fillHeight ? 'none' : undefined,
      '@media (max-width: 768px)': fillHeight ? { maxHeight: 'none' } : undefined,
    }}>
      <StyledTable>
        <TableHead>
          {/* First Header Row - Big 5 Labels */}
          <TableRow>
            <TableCell sx={{ width: 40 }}></TableCell>
            <TableCell sx={{ pl: 1 }}>Name</TableCell>
            <TableCell align="center">Last Rating</TableCell>
            <TableCell align="center">{big5Labels?.label_1 || 'Criteria 1'}</TableCell>
            <TableCell align="center">{big5Labels?.label_2 || 'Criteria 2'}</TableCell>
            <TableCell align="center">{big5Labels?.label_3 || 'Criteria 3'}</TableCell>
            <TableCell align="center">{big5Labels?.label_4 || 'Criteria 4'}</TableCell>
            <TableCell align="center">{big5Labels?.label_5 || 'Criteria 5'}</TableCell>
            <TableCell align="center">Avg</TableCell>
            <TableCell align="center"># Ratings</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((employee) => {
            const isExpanded = expandedRows.has(employee.employee_id);
            
            // For position view, we show the average of rating_1-5 from recent ratings
            const recentRating = employee.recent_ratings[0]; // most recent
            
            return (
              <React.Fragment key={employee.employee_id}>
                {/* Main Row */}
                <TableRow hover>
                  <TableCell sx={{ py: cellPadding }}>
                    <ExpandIcon 
                      $expanded={isExpanded}
                      onClick={() => toggleRow(employee.employee_id)}
                      size="small"
                    >
                      <ExpandMoreIcon />
                    </ExpandIcon>
                  </TableCell>
                  <TableCell 
                    sx={{ py: cellPadding, pl: 1, fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => toggleRow(employee.employee_id)}
                  >
                    {employee.employee_name}
                  </TableCell>
                  <TableCell align="center" sx={{ py: cellPadding, fontSize: 12, color: '#6b7280' }}>
                    {employee.last_rating_date ? formatRatingDate(employee.last_rating_date) : '—'}
                  </TableCell>
                  
                  {/* Show average ratings 1-5 from last 4 */}
                  {[1, 2, 3, 4, 5].map(num => {
                    const key = `rating_${num}` as keyof Rating;
                    const ratings = employee.recent_ratings
                      .slice(0, 4)
                      .map(r => r[key])
                      .filter(v => v !== null) as number[];
                    const avg = ratings.length > 0 
                      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
                      : null;
                    
                    return (
                      <RatingCell key={num} $rating={avg} sx={{ py: cellPadding }}>
                        {formatRating(avg)}
                      </RatingCell>
                    );
                  })}
                  
                  <RatingCell 
                    $rating={employee.overall_avg} 
                    $greenThreshold={thresholds?.green_threshold}
                    $yellowThreshold={thresholds?.yellow_threshold}
                    sx={{ py: cellPadding }}
                  >
                    {formatRating(employee.overall_avg)}
                  </RatingCell>
                  <TableCell align="center" sx={{ py: cellPadding }}>
                    {employee.total_count_90d}
                  </TableCell>
                </TableRow>

                {/* Expanded Content */}
                {isExpanded && (
                  <ExpandedContentRow>
                    <TableCell colSpan={10} sx={{ p: 2 }}>
                      <Typography sx={{ fontFamily, fontWeight: 600, fontSize: 11, mb: 1 }}>
                        Last 4 Ratings for {position}
                      </Typography>
                      <ExpandedTableContainer>
                        <ExpandedTable size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Leader</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell align="center">{big5Labels?.label_1 || 'Rating 1'}</TableCell>
                              <TableCell align="center">{big5Labels?.label_2 || 'Rating 2'}</TableCell>
                              <TableCell align="center">{big5Labels?.label_3 || 'Rating 3'}</TableCell>
                              <TableCell align="center">{big5Labels?.label_4 || 'Rating 4'}</TableCell>
                              <TableCell align="center">{big5Labels?.label_5 || 'Rating 5'}</TableCell>
                              <TableCell align="center">Avg</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {employee.recent_ratings.map((rating, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{rating.rater_name}</TableCell>
                                <TableCell>{formatRatingDate(rating.created_at)}</TableCell>
                                <RatingCell $rating={rating.rating_1} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_1)}</RatingCell>
                                <RatingCell $rating={rating.rating_2} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_2)}</RatingCell>
                                <RatingCell $rating={rating.rating_3} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_3)}</RatingCell>
                                <RatingCell $rating={rating.rating_4} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_4)}</RatingCell>
                                <RatingCell $rating={rating.rating_5} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_5)}</RatingCell>
                                <RatingCell $rating={rating.rating_avg} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_avg)}</RatingCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </ExpandedTable>
                      </ExpandedTableContainer>
                    </TableCell>
                  </ExpandedContentRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </StyledTable>
    </StyledContainer>
  );
}

// ===== Leadership Table Sub-Component =====

interface LeadershipTableProps {
  data: LeaderRatingAggregate[];
  area: 'FOH' | 'BOH';
  positions: string[];
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  cellPadding: number;
  thresholds?: { yellow_threshold: number; green_threshold: number } | null;
  fillHeight?: boolean;
}

function LeadershipTable({ data, area, positions, expandedRows, toggleRow, cellPadding, thresholds, fillHeight }: LeadershipTableProps) {

  return (
    <StyledContainer sx={{ 
      height: fillHeight ? '100%' : 'auto', 
      maxHeight: fillHeight ? 'none' : undefined,
      '@media (max-width: 768px)': fillHeight ? { maxHeight: 'none' } : undefined,
    }}>
      <StyledTable>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}></TableCell>
            <TableCell sx={{ pl: 1 }}>Leader Name</TableCell>
            <TableCell align="center">Last Rating</TableCell>
            {positions.map(pos => (
              <TableCell key={pos} align="center" sx={{ whiteSpace: 'nowrap' }}>
                {cleanPositionName(pos)}
              </TableCell>
            ))}
            <TableCell align="center">Overall Avg</TableCell>
            <TableCell align="center"># Ratings</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((leader) => {
            const isExpanded = expandedRows.has(leader.leader_id);
            
            return (
              <React.Fragment key={leader.leader_id}>
                {/* Main Row */}
                <TableRow hover>
                  <TableCell sx={{ py: cellPadding }}>
                    <ExpandIcon 
                      $expanded={isExpanded}
                      onClick={() => toggleRow(leader.leader_id)}
                      size="small"
                    >
                      <ExpandMoreIcon />
                    </ExpandIcon>
                  </TableCell>
                  <TableCell 
                    sx={{ py: cellPadding, pl: 1, fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => toggleRow(leader.leader_id)}
                  >
                    {leader.leader_name}
                  </TableCell>
                  <TableCell align="center" sx={{ py: cellPadding, fontSize: 12, color: '#6b7280' }}>
                    {leader.last_rating_date ? formatRatingDate(leader.last_rating_date) : '—'}
                  </TableCell>
                  {positions.map(pos => {
                    const rating = leader.positions[pos];
                    return (
                      <RatingCell 
                        key={pos} 
                        $rating={rating} 
                        $greenThreshold={thresholds?.green_threshold}
                        $yellowThreshold={thresholds?.yellow_threshold}
                        sx={{ py: cellPadding }}
                      >
                        {formatRating(rating)}
                      </RatingCell>
                    );
                  })}
                  <RatingCell 
                    $rating={leader.overall_avg} 
                    $greenThreshold={thresholds?.green_threshold}
                    $yellowThreshold={thresholds?.yellow_threshold}
                    sx={{ py: cellPadding }}
                  >
                    {formatRating(leader.overall_avg)}
                  </RatingCell>
                  <TableCell align="center" sx={{ py: cellPadding }}>
                    {leader.total_count_90d}
                  </TableCell>
                </TableRow>

                {/* Expanded Content */}
                {isExpanded && (
                  <ExpandedContentRow>
                    <TableCell colSpan={positions.length + 5} sx={{ p: 2 }}>
                      <Typography sx={{ fontFamily, fontWeight: 600, fontSize: 11, mb: 1 }}>
                        Last 10 Ratings Given
                      </Typography>
                      <ExpandedTableContainer>
                        <ExpandedTable size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Employee</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell>Position</TableCell>
                              <TableCell align="center">Criteria 1</TableCell>
                              <TableCell align="center">Criteria 2</TableCell>
                              <TableCell align="center">Criteria 3</TableCell>
                              <TableCell align="center">Criteria 4</TableCell>
                              <TableCell align="center">Criteria 5</TableCell>
                              <TableCell align="center">Avg</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {leader.recent_ratings.map((rating, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{rating.employee_name}</TableCell>
                                <TableCell>{formatRatingDate(rating.created_at)}</TableCell>
                                <TableCell>{cleanPositionName(rating.position)}</TableCell>
                                <RatingCell $rating={rating.rating_1} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_1)}</RatingCell>
                                <RatingCell $rating={rating.rating_2} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_2)}</RatingCell>
                                <RatingCell $rating={rating.rating_3} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_3)}</RatingCell>
                                <RatingCell $rating={rating.rating_4} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_4)}</RatingCell>
                                <RatingCell $rating={rating.rating_5} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_5)}</RatingCell>
                                <RatingCell $rating={rating.rating_avg} $greenThreshold={thresholds?.green_threshold} $yellowThreshold={thresholds?.yellow_threshold}>{formatRating(rating.rating_avg)}</RatingCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </ExpandedTable>
                      </ExpandedTableContainer>
                    </TableCell>
                  </ExpandedContentRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </StyledTable>
    </StyledContainer>
  );
}

