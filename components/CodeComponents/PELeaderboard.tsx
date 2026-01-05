import * as React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Switch,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { fetchLeaderboardData, formatTenure, formatRatingDate } from '@/lib/ratings-data';
import type { LeaderboardEntry } from '@/lib/ratings-data';
import type { Employee } from '@/lib/supabase.types';
import { EmployeeModal } from './EmployeeModal';
import { pdf } from '@react-pdf/renderer';
import PELeaderboardPDF from './PELeaderboardPDF';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';
const fohColor = '#006391';
const bohColor = '#ffcc5b';

// Date range helper
const getDateRange = (preset: 'mtd' | 'qtd' | '30d' | '90d'): [Date, Date] => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  
  switch (preset) {
    case 'mtd':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'qtd':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case '30d':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
  }
  
  start.setHours(0, 0, 0, 0);
  return [start, end];
};

const PillButton = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  fontFamily,
  fontSize: 13,
  fontWeight: 600,
  padding: '6px 16px',
  borderRadius: 20,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  backgroundColor: selected ? levelsetGreen : '#f3f4f6',
  color: selected ? '#ffffff' : '#6b7280',
  '&:hover': {
    backgroundColor: selected ? levelsetGreen : '#e5e7eb',
  },
}));

const AreaToggle = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 12px',
  backgroundColor: '#f3f4f6',
  borderRadius: 20,
});

const AreaLabel = styled(Typography)<{ active?: boolean; area: 'FOH' | 'BOH' }>(({ active, area }) => ({
  fontFamily,
  fontSize: 13,
  fontWeight: 600,
  color: active ? (area === 'FOH' ? fohColor : '#b8860b') : '#9ca3af',
  transition: 'color 0.15s ease',
}));

const StyledSwitch = styled(Switch)({
  width: 42,
  height: 24,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 2,
    '&.Mui-checked': {
      transform: 'translateX(18px)',
      '& + .MuiSwitch-track': {
        backgroundColor: bohColor,
        opacity: 1,
      },
    },
  },
  '& .MuiSwitch-thumb': {
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
  },
  '& .MuiSwitch-track': {
    borderRadius: 12,
    backgroundColor: fohColor,
    opacity: 1,
  },
});

// Top 3 card component
interface TopCardProps {
  entry: LeaderboardEntry;
  rank: number;
  onEmployeeClick: (employeeId: string) => void;
}

function TopCard({ entry, rank, onEmployeeClick }: TopCardProps) {
  const rankColors = {
    1: { bg: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 100%)', text: '#856404', badge: '#ffd700' },
    2: { bg: 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)', text: '#5a5a5a', badge: '#c0c0c0' },
    3: { bg: 'linear-gradient(135deg, #cd7f32 0%, #daa06d 100%)', text: '#7a4a00', badge: '#cd7f32' },
  };
  
  const colors = rankColors[rank as 1 | 2 | 3];
  const hasScore = entry.ratings_needed === 0;
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        flex: 1,
        minWidth: 200,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Rank badge */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 700, color: colors.text }}>
          {rank}
        </Typography>
      </Box>
      
      {/* Employee name */}
      <Typography
        onClick={() => onEmployeeClick(entry.employee_id)}
        sx={{
          fontFamily,
          fontSize: 18,
          fontWeight: 700,
          color: '#111827',
          cursor: 'pointer',
          '&:hover': { color: levelsetGreen },
          marginBottom: '4px',
          paddingRight: '40px',
        }}
      >
        {entry.employee_name}
      </Typography>
      
      {/* Role */}
      <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', marginBottom: '16px' }}>
        {entry.role || 'Team Member'}
      </Typography>
      
      {/* Metrics */}
      {hasScore ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontFamily, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overall Rating
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 24, fontWeight: 700, color: levelsetGreen }}>
              {entry.overall_rating?.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box>
              <Typography sx={{ fontFamily, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Ratings
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: '#374151' }}>
                {entry.total_ratings}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tenure
              </Typography>
              <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: '#374151' }}>
                {formatTenure(entry.tenure_months)}
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Typography sx={{ fontFamily, fontSize: 14, color: '#9ca3af', fontStyle: 'italic' }}>
          {entry.ratings_needed} more ratings to be on the leaderboard
        </Typography>
      )}
    </Box>
  );
}

export function PELeaderboard() {
  const { selectedLocationId, selectedLocationImageUrl } = useLocationContext();
  const [area, setArea] = React.useState<'FOH' | 'BOH'>('FOH');
  const [dateRange, setDateRange] = React.useState<'mtd' | 'qtd' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  
  // Initialize dates on mount
  React.useEffect(() => {
    const [start, end] = getDateRange('30d');
    setStartDate(start);
    setEndDate(end);
  }, []);
  
  // Fetch leaderboard data
  React.useEffect(() => {
    const fetchData = async () => {
      if (!selectedLocationId || !startDate || !endDate) return;
      
      setLoading(true);
      try {
        const supabase = createSupabaseClient();
        const data = await fetchLeaderboardData(supabase, selectedLocationId, area, startDate, endDate);
        setEntries(data);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedLocationId, area, startDate, endDate]);
  
  const handleDatePreset = (preset: 'mtd' | 'qtd' | '30d' | '90d') => {
    setDateRange(preset);
    const [start, end] = getDateRange(preset);
    setStartDate(start);
    setEndDate(end);
  };
  
  const handleAreaToggle = () => {
    setArea(prev => prev === 'FOH' ? 'BOH' : 'FOH');
  };
  
  const handleEmployeeClick = async (employeeId: string) => {
    try {
      const supabase = createSupabaseClient();
      const { data: employee, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (error || !employee) {
        console.error('Error fetching employee:', error);
        return;
      }
      
      setSelectedEmployee(employee as Employee);
      setEmployeeModalOpen(true);
    } catch (err) {
      console.error('Error fetching employee:', err);
    }
  };
  
  const handleExportPDF = async () => {
    try {
      const logoUrl = selectedLocationImageUrl || '/logos/Circle C CFA.png';
      
      const blob = await pdf(
        <PELeaderboardPDF
          entries={entries}
          area={area}
          dateRange={{
            start: startDate?.toLocaleDateString() || '',
            end: endDate?.toLocaleDateString() || '',
          }}
          logoUrl={logoUrl}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PE_Leaderboard_${area}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };
  
  // Split entries into top 3 and rest
  const rankedEntries = entries.filter(e => e.ratings_needed === 0);
  const unrankedEntries = entries.filter(e => e.ratings_needed > 0);
  const top3 = rankedEntries.slice(0, 3);
  const rest = [...rankedEntries.slice(3), ...unrankedEntries];
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Filter Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* FOH/BOH Toggle */}
            <AreaToggle>
              <AreaLabel active={area === 'FOH'} area="FOH">FOH</AreaLabel>
              <StyledSwitch checked={area === 'BOH'} onChange={handleAreaToggle} />
              <AreaLabel active={area === 'BOH'} area="BOH">BOH</AreaLabel>
            </AreaToggle>
            
            {/* Date Range Presets */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <PillButton selected={dateRange === 'mtd'} onClick={() => handleDatePreset('mtd')}>
                MTD
              </PillButton>
              <PillButton selected={dateRange === 'qtd'} onClick={() => handleDatePreset('qtd')}>
                QTD
              </PillButton>
              <PillButton selected={dateRange === '30d'} onClick={() => handleDatePreset('30d')}>
                Last 30 Days
              </PillButton>
              <PillButton selected={dateRange === '90d'} onClick={() => handleDatePreset('90d')}>
                Last 90 Days
              </PillButton>
            </Box>
            
            {/* Custom Date Pickers */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <DatePicker
                label="Start"
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setDateRange('custom');
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 140,
                      '& .MuiInputBase-input': { fontFamily, fontSize: 12 },
                      '& .MuiInputLabel-root': { fontFamily, fontSize: 12 },
                    },
                  },
                }}
              />
              <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280' }}>to</Typography>
              <DatePicker
                label="End"
                value={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setDateRange('custom');
                }}
                slotProps={{
                  textField: {
                    size: 'small',
                    sx: {
                      width: 140,
                      '& .MuiInputBase-input': { fontFamily, fontSize: 12 },
                      '& .MuiInputLabel-root': { fontFamily, fontSize: 12 },
                    },
                  },
                }}
              />
            </Box>
          </Box>
          
          {/* PDF Export */}
          <Tooltip title="Export to PDF">
            <IconButton
              onClick={handleExportPDF}
              sx={{
                color: levelsetGreen,
                '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.04)' },
              }}
            >
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress sx={{ color: levelsetGreen }} />
          </Box>
        ) : entries.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 4, gap: 2 }}>
            <EmojiEventsIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
            <Typography sx={{ fontFamily, fontSize: 16, color: '#6b7280' }}>
              No employees found for this area and date range.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Top 3 Cards */}
            {top3.length > 0 && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {top3.map((entry, index) => (
                  <TopCard
                    key={entry.employee_id}
                    entry={entry}
                    rank={index + 1}
                    onEmployeeClick={handleEmployeeClick}
                  />
                ))}
              </Box>
            )}
            
            {/* Table for rest */}
            {rest.length > 0 && (
              <Box
                sx={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                }}
              >
                {/* Table Header */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 150px 100px 120px 100px',
                    gap: 2,
                    padding: '12px 20px',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Rank
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Name
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Role
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Rating
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Total Ratings
                  </Typography>
                  <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                    Tenure
                  </Typography>
                </Box>
                
                {/* Table Rows */}
                {rest.map((entry, index) => {
                  const rank = entry.ratings_needed === 0 ? top3.length + index + 1 : null;
                  return (
                    <Box
                      key={entry.employee_id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 150px 100px 120px 100px',
                        gap: 2,
                        padding: '14px 20px',
                        borderBottom: '1px solid #f3f4f6',
                        '&:last-child': { borderBottom: 'none' },
                        '&:hover': { backgroundColor: '#f9fafb' },
                      }}
                    >
                      <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: rank ? '#374151' : '#9ca3af' }}>
                        {rank || '—'}
                      </Typography>
                      <Typography
                        onClick={() => handleEmployeeClick(entry.employee_id)}
                        sx={{
                          fontFamily,
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#111827',
                          cursor: 'pointer',
                          '&:hover': { color: levelsetGreen },
                        }}
                      >
                        {entry.employee_name}
                      </Typography>
                      <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280' }}>
                        {entry.role || 'Team Member'}
                      </Typography>
                      <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: entry.overall_rating ? levelsetGreen : '#9ca3af' }}>
                        {entry.overall_rating ? entry.overall_rating.toFixed(2) : `${entry.ratings_needed} more`}
                      </Typography>
                      <Typography sx={{ fontFamily, fontSize: 14, color: '#374151' }}>
                        {entry.total_ratings}
                      </Typography>
                      <Typography sx={{ fontFamily, fontSize: 14, color: '#374151' }}>
                        {formatTenure(entry.tenure_months)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </Box>
      
      {/* Employee Modal */}
      <EmployeeModal
        open={employeeModalOpen}
        employee={selectedEmployee}
        onClose={() => {
          setEmployeeModalOpen(false);
          setSelectedEmployee(null);
        }}
        locationId={selectedLocationId || ''}
        initialTab="pe"
      />
    </LocalizationProvider>
  );
}

export default PELeaderboard;
