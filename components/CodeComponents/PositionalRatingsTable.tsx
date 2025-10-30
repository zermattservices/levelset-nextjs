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
  Collapse
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

export interface PositionalRatingsTableProps {
  orgId: string;
  locationId: string;
  className?: string;
  density?: "comfortable" | "compact";
  defaultTab?: "overview" | "employees" | "leadership";
  defaultArea?: "FOH" | "BOH";
  logoUrl?: string;
}

const fontFamily = `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

// ===== Styled Components =====

const StyledContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflow: "auto",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
  maxHeight: '70vh'
}));

const StyledTable = styled(Table)(() => ({
  fontFamily,
  "& th": {
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.05em",
    textTransform: "none", // Changed from uppercase to none
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

const RatingCell = styled(TableCell)<{ $rating?: number | null }>(({ $rating }) => {
  let bgColor = 'transparent';
  let textColor = '#111827';
  let fontWeight = 400;

  if ($rating !== null && $rating !== undefined) {
    fontWeight = 600;
    if ($rating >= 2.75) {
      bgColor = '#249e6b';
      textColor = '#fff';
    } else if ($rating >= 1.75) {
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
  '& svg': {
    fontSize: 18
  }
}));

const StyledTabs = styled(Tabs)(() => ({
  borderBottom: '1px solid #e5e7eb',
  marginBottom: 16,
  '& .MuiTabs-indicator': {
    backgroundColor: '#31664a',
    height: 3
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
  }
}));

const ControlsContainer = styled(Box)(() => ({
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  marginBottom: 16,
  flexWrap: 'wrap'
}));

const ExpandedContentRow = styled(TableRow)(() => ({
  backgroundColor: '#fafafa',
  '& td': {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottom: '2px solid #e5e7eb'
  }
}));

const ExpandedTable = styled(Table)(() => ({
  '& th': {
    backgroundColor: '#f3f4f6',
    padding: '6px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderBottom: '1px solid #d1d5db',
    textTransform: 'none'
  },
  '& td': {
    padding: '6px 8px',
    fontSize: 12,
    borderBottom: '1px solid #e5e7eb'
  }
}));

// ===== Main Component =====

export function PositionalRatingsTable({
  orgId,
  locationId,
  className = "",
  density = "comfortable",
  defaultTab = "overview",
  defaultArea = "FOH",
  logoUrl
}: PositionalRatingsTableProps) {
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

  const cellPadding = density === "compact" ? 0.5 : 1;

  // Fetch positions list when area changes
  React.useEffect(() => {
    async function loadPositions() {
      try {
        const response = await fetch(
          `/api/position-labels?org_id=${orgId}&location_id=${locationId}&area=${area}`
        );
        const result = await response.json();
        
        if (result.success) {
          setPositions(result.positions || []);
          // Set first position as default
          if (result.positions && result.positions.length > 0 && !selectedPosition) {
            setSelectedPosition(result.positions[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching positions:', err);
        // Fallback to hard-coded list
        setPositions(getPositionsByArea(area));
      }
    }

    loadPositions();
  }, [area, orgId, locationId]);

  // Fetch Big 5 labels when position changes
  React.useEffect(() => {
    if (!selectedPosition) return;

    async function loadLabels() {
      try {
        const response = await fetch(
          `/api/position-labels?org_id=${orgId}&location_id=${locationId}&position=${encodeURIComponent(selectedPosition)}`
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
  }, [selectedPosition, orgId, locationId]);

  // Fetch data when tab, area, or position changes
  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      
      // Reset expanded rows when changing views
      setExpandedRows(new Set());

      try {
        let endpoint = `/api/ratings?org_id=${orgId}&location_id=${locationId}&area=${area}`;

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

    if (orgId && locationId) {
      loadData();
    }
  }, [activeTab, area, selectedPosition, orgId, locationId]);

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
    setArea(newArea);
    setSelectedPosition(null); // reset position selection
    setExpandedRows(new Set());
  };

  // Handle position selection
  const handlePositionChange = (event: any) => {
    setSelectedPosition(event.target.value);
    setExpandedRows(new Set());
  };

  if (loading && (overviewData.length === 0 && positionData.length === 0 && leadershipData.length === 0)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#31664a' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box className={`positional-ratings-table ${className}`}>
      {/* Header with Rubric and Logo */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr auto 1fr', 
        alignItems: 'start', 
        gap: 2,
        mb: 3
      }}>
        <Box sx={{ gridColumn: 1 }}>
          <PEARubric />
        </Box>
        
        <Box sx={{ gridColumn: 2, textAlign: 'center' }}>
          <Typography 
            variant="h5" 
            sx={{ fontFamily, fontWeight: 600, mb: 2 }}
          >
            Positional Excellence Ratings
          </Typography>
        </Box>

        {logoUrl && (
          <Box sx={{ gridColumn: 3, justifySelf: 'end' }}>
            <img src={logoUrl} alt="Location Logo" style={{ width: 180, height: 'auto' }} />
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <StyledTabs value={activeTab} onChange={handleTabChange}>
        <StyledTab label="Overview" value="overview" />
        <StyledTab label="Employee Ratings" value="employees" />
        <StyledTab label="Leadership View" value="leadership" />
      </StyledTabs>

      {/* Controls */}
      <ControlsContainer>
        <FohBohSlider key={`slider-${area}`} value={area} onChange={handleAreaChange} />
        
        {activeTab === 'employees' && (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel sx={{ fontFamily }}>Position</InputLabel>
            <Select
              value={selectedPosition || ''}
              onChange={handlePositionChange}
              label="Position"
              sx={{ fontFamily }}
            >
              {positions.map(pos => (
                <MenuItem key={pos} value={pos} sx={{ fontFamily }}>
                  {pos}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </ControlsContainer>

      {/* Table Content - Render based on active tab */}
      {activeTab === 'overview' && (
        <OverviewTable 
          data={overviewData}
          area={area}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          cellPadding={cellPadding}
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
        />
      )}

      {activeTab === 'leadership' && (
        <LeadershipTable
          data={leadershipData}
          area={area}
          expandedRows={expandedRows}
          toggleRow={toggleRow}
          cellPadding={cellPadding}
        />
      )}
    </Box>
  );
}

// ===== Overview Table Sub-Component =====

interface OverviewTableProps {
  data: EmployeeRatingAggregate[];
  area: 'FOH' | 'BOH';
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  cellPadding: number;
}

function OverviewTable({ data, area, expandedRows, toggleRow, cellPadding }: OverviewTableProps) {
  const positions = getPositionsByArea(area);

  return (
    <StyledContainer>
      <StyledTable>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}></TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="center">Last Rating</TableCell>
            {positions.map(pos => (
              <TableCell key={pos} align="center" sx={{ whiteSpace: 'nowrap' }}>
                {pos}
              </TableCell>
            ))}
            <TableCell align="center">Overall Avg</TableCell>
            <TableCell align="center"># Ratings</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((employee) => {
            const isExpanded = expandedRows.has(employee.employee_id);
            
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
                  <TableCell sx={{ py: cellPadding, fontWeight: 500 }}>
                    {employee.employee_name}
                  </TableCell>
                  <TableCell align="center" sx={{ py: cellPadding, fontSize: 12, color: '#6b7280' }}>
                    {employee.last_rating_date ? formatRatingDate(employee.last_rating_date) : '—'}
                  </TableCell>
                  {positions.map(pos => {
                    const rating = employee.positions[pos];
                    return (
                      <RatingCell key={pos} $rating={rating} sx={{ py: cellPadding }}>
                        {formatRating(rating)}
                      </RatingCell>
                    );
                  })}
                  <RatingCell $rating={employee.overall_avg} sx={{ py: cellPadding }}>
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
                      <Typography variant="subtitle2" sx={{ fontFamily, fontWeight: 600, mb: 1 }}>
                        Last 4 Ratings
                      </Typography>
                      <ExpandedTable size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Leader</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell align="center">Rating 1</TableCell>
                            <TableCell align="center">Rating 2</TableCell>
                            <TableCell align="center">Rating 3</TableCell>
                            <TableCell align="center">Rating 4</TableCell>
                            <TableCell align="center">Rating 5</TableCell>
                            <TableCell align="center">Avg</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {employee.recent_ratings.map((rating, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{rating.rater_name}</TableCell>
                              <TableCell>{formatRatingDate(rating.created_at)}</TableCell>
                              <TableCell>{rating.position}</TableCell>
                              <RatingCell $rating={rating.rating_1}>{formatRating(rating.rating_1)}</RatingCell>
                              <RatingCell $rating={rating.rating_2}>{formatRating(rating.rating_2)}</RatingCell>
                              <RatingCell $rating={rating.rating_3}>{formatRating(rating.rating_3)}</RatingCell>
                              <RatingCell $rating={rating.rating_4}>{formatRating(rating.rating_4)}</RatingCell>
                              <RatingCell $rating={rating.rating_5}>{formatRating(rating.rating_5)}</RatingCell>
                              <RatingCell $rating={rating.rating_avg}>{formatRating(rating.rating_avg)}</RatingCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </ExpandedTable>
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
}

function PositionTable({ data, position, big5Labels, expandedRows, toggleRow, cellPadding }: PositionTableProps) {
  return (
    <StyledContainer>
      <StyledTable>
        <TableHead>
          {/* First Header Row - Big 5 Labels */}
          <TableRow>
            <TableCell sx={{ width: 40 }}></TableCell>
            <TableCell>Name</TableCell>
            <TableCell align="center">Last Rating</TableCell>
            <TableCell align="center">{big5Labels?.label_1 || 'Rating 1'}</TableCell>
            <TableCell align="center">{big5Labels?.label_2 || 'Rating 2'}</TableCell>
            <TableCell align="center">{big5Labels?.label_3 || 'Rating 3'}</TableCell>
            <TableCell align="center">{big5Labels?.label_4 || 'Rating 4'}</TableCell>
            <TableCell align="center">{big5Labels?.label_5 || 'Rating 5'}</TableCell>
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
                  <TableCell sx={{ py: cellPadding, fontWeight: 500 }}>
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
                  
                  <RatingCell $rating={employee.overall_avg} sx={{ py: cellPadding }}>
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
                      <Typography variant="subtitle2" sx={{ fontFamily, fontWeight: 600, mb: 1 }}>
                        Last 4 Ratings for {position}
                      </Typography>
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
                              <RatingCell $rating={rating.rating_1}>{formatRating(rating.rating_1)}</RatingCell>
                              <RatingCell $rating={rating.rating_2}>{formatRating(rating.rating_2)}</RatingCell>
                              <RatingCell $rating={rating.rating_3}>{formatRating(rating.rating_3)}</RatingCell>
                              <RatingCell $rating={rating.rating_4}>{formatRating(rating.rating_4)}</RatingCell>
                              <RatingCell $rating={rating.rating_5}>{formatRating(rating.rating_5)}</RatingCell>
                              <RatingCell $rating={rating.rating_avg}>{formatRating(rating.rating_avg)}</RatingCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </ExpandedTable>
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
  expandedRows: Set<string>;
  toggleRow: (id: string) => void;
  cellPadding: number;
}

function LeadershipTable({ data, area, expandedRows, toggleRow, cellPadding }: LeadershipTableProps) {
  const positions = getPositionsByArea(area);

  return (
    <StyledContainer>
      <StyledTable>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}></TableCell>
            <TableCell>Leader Name</TableCell>
            <TableCell align="center">Last Rating</TableCell>
            {positions.map(pos => (
              <TableCell key={pos} align="center" sx={{ whiteSpace: 'nowrap' }}>
                {pos}
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
                  <TableCell sx={{ py: cellPadding, fontWeight: 500 }}>
                    {leader.leader_name}
                  </TableCell>
                  <TableCell align="center" sx={{ py: cellPadding, fontSize: 12, color: '#6b7280' }}>
                    {leader.last_rating_date ? formatRatingDate(leader.last_rating_date) : '—'}
                  </TableCell>
                  {positions.map(pos => {
                    const rating = leader.positions[pos];
                    return (
                      <RatingCell key={pos} $rating={rating} sx={{ py: cellPadding }}>
                        {formatRating(rating)}
                      </RatingCell>
                    );
                  })}
                  <RatingCell $rating={leader.overall_avg} sx={{ py: cellPadding }}>
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
                      <Typography variant="subtitle2" sx={{ fontFamily, fontWeight: 600, mb: 1 }}>
                        Last 10 Ratings Given
                      </Typography>
                      <ExpandedTable size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Employee</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell align="center">Rating 1</TableCell>
                            <TableCell align="center">Rating 2</TableCell>
                            <TableCell align="center">Rating 3</TableCell>
                            <TableCell align="center">Rating 4</TableCell>
                            <TableCell align="center">Rating 5</TableCell>
                            <TableCell align="center">Avg</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leader.recent_ratings.map((rating, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{rating.employee_name}</TableCell>
                              <TableCell>{formatRatingDate(rating.created_at)}</TableCell>
                              <TableCell>{rating.position}</TableCell>
                              <RatingCell $rating={rating.rating_1}>{formatRating(rating.rating_1)}</RatingCell>
                              <RatingCell $rating={rating.rating_2}>{formatRating(rating.rating_2)}</RatingCell>
                              <RatingCell $rating={rating.rating_3}>{formatRating(rating.rating_3)}</RatingCell>
                              <RatingCell $rating={rating.rating_4}>{formatRating(rating.rating_4)}</RatingCell>
                              <RatingCell $rating={rating.rating_5}>{formatRating(rating.rating_5)}</RatingCell>
                              <RatingCell $rating={rating.rating_avg}>{formatRating(rating.rating_avg)}</RatingCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </ExpandedTable>
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

