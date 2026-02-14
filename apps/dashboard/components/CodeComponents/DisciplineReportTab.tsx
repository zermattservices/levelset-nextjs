import * as React from 'react';
import { format, parseISO } from 'date-fns';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Button,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { RolePill } from './shared/RolePill';
import { DisciplineReportPDF } from './DisciplineReportPDF';
import { pdf } from '@react-pdf/renderer';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a'; // TODO: Use design token

// Color gradient from lightest to darkest red (5 levels)
const redGradient = [
  { bg: '#fee2e2', color: '#991b1b' }, // Lightest - level 1
  { bg: '#fecaca', color: '#991b1b' }, // Light - level 2
  { bg: '#fca5a5', color: '#7f1d1d' }, // Medium - level 3
  { bg: '#f87171', color: '#7f1d1d' }, // Dark - level 4
  { bg: '#dc2626', color: '#ffffff' }, // Darkest - level 5
];

interface ActiveEmployee {
  id: string;
  full_name: string;
  role: string;
  hire_date: string | null;
  last_infraction: string | null;
  current_points: number;
}

interface InactiveEmployee {
  id: string;
  full_name: string;
  role: string;
  hire_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  last_points_total: number;
}

interface DisciplineActions {
  points_threshold: number;
  action: string;
}

// Points Badge Component
const PointsBadge = ({ points, disciplineActions }: { points: number; disciplineActions: DisciplineActions[] }) => {
  const getBadgeColor = () => {
    if (points === 0) {
      return { bg: '#f3f4f6', color: '#111827' };
    }
    
    if (!disciplineActions || disciplineActions.length === 0) {
      return redGradient[0];
    }
    
    const sortedActions = [...disciplineActions].sort((a, b) => a.points_threshold - b.points_threshold);
    
    let actionIndex = -1;
    for (let i = sortedActions.length - 1; i >= 0; i--) {
      if (points >= sortedActions[i].points_threshold) {
        actionIndex = i;
        break;
      }
    }
    
    if (actionIndex === -1) {
      return redGradient[0];
    }
    
    const numActions = sortedActions.length;
    const gradientIndex = Math.min(
      Math.round((actionIndex / Math.max(numActions - 1, 1)) * (redGradient.length - 1)),
      redGradient.length - 1
    );
    
    return redGradient[gradientIndex];
  };
  
  const colors = getBadgeColor();
  
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        color: colors.color,
        fontFamily,
        fontSize: 13,
        fontWeight: 600,
        height: 26,
        minWidth: 38,
        padding: '0 10px',
        borderRadius: '13px',
      }}
    >
      {points}
    </Box>
  );
};

// Active Employee Row Component
const ActiveEmployeeRow = ({ 
  employee, 
  disciplineActions,
  onGenerateReport,
  isGenerating,
}: { 
  employee: ActiveEmployee; 
  disciplineActions: DisciplineActions[];
  onGenerateReport: (employeeId: string) => void;
  isGenerating: boolean;
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 100px 110px 100px 140px',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #f3f4f6',
        '&:last-child': {
          borderBottom: 'none',
        },
        '&:hover': {
          backgroundColor: '#fafafa',
        },
      }}
    >
      <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: '#111827' }}>
        {employee.full_name}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <RolePill role={employee.role} />
      </Box>
      <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
        {employee.hire_date ? format(parseISO(employee.hire_date), 'M/d/yyyy') : '-'}
      </Typography>
      <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
        {employee.last_infraction ? format(parseISO(employee.last_infraction), 'M/d/yyyy') : '-'}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <PointsBadge points={employee.current_points} disciplineActions={disciplineActions} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={isGenerating ? <CircularProgress size={14} /> : <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />}
          disabled={isGenerating}
          onClick={() => onGenerateReport(employee.id)}
          sx={{
            fontFamily,
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'none',
            borderColor: '#e5e7eb',
            color: '#374151',
            borderRadius: '8px',
            padding: '4px 12px',
            '&:hover': {
              borderColor: levelsetGreen,
              color: levelsetGreen,
              backgroundColor: 'rgba(49, 102, 74, 0.04)',
            },
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>
    </Box>
  );
};

// Inactive Employee Row Component
const InactiveEmployeeRow = ({ 
  employee,
  disciplineActions,
  onGenerateReport,
  isGenerating,
}: { 
  employee: InactiveEmployee;
  disciplineActions: DisciplineActions[];
  onGenerateReport: (employeeId: string) => void;
  isGenerating: boolean;
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 120px 100px 110px 100px 1fr 140px',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #f3f4f6',
        '&:last-child': {
          borderBottom: 'none',
        },
        '&:hover': {
          backgroundColor: '#fafafa',
        },
      }}
    >
      <Typography sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: '#111827' }}>
        {employee.full_name}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <RolePill role={employee.role} />
      </Box>
      <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
        {employee.hire_date ? format(parseISO(employee.hire_date), 'M/d/yyyy') : '-'}
      </Typography>
      <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
        {employee.termination_date ? format(parseISO(employee.termination_date), 'M/d/yyyy') : '-'}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <PointsBadge points={employee.last_points_total} disciplineActions={disciplineActions} />
      </Box>
      <Typography sx={{ fontFamily, fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {employee.termination_reason || '-'}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={isGenerating ? <CircularProgress size={14} /> : <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />}
          disabled={isGenerating}
          onClick={() => onGenerateReport(employee.id)}
          sx={{
            fontFamily,
            fontSize: 12,
            fontWeight: 500,
            textTransform: 'none',
            borderColor: '#e5e7eb',
            color: '#374151',
            borderRadius: '8px',
            padding: '4px 12px',
            '&:hover': {
              borderColor: levelsetGreen,
              color: levelsetGreen,
              backgroundColor: 'rgba(49, 102, 74, 0.04)',
            },
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>
    </Box>
  );
};

// Header Row for Active Employees
const ActiveHeaderRow = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '1fr 120px 100px 110px 100px 140px',
      alignItems: 'center',
      padding: '10px 16px',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
    }}
  >
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Employee
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Role
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Hire Date
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Last Infraction
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Points
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
      Actions
    </Typography>
  </Box>
);

// Header Row for Inactive Employees
const InactiveHeaderRow = () => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '1fr 120px 100px 110px 100px 1fr 140px',
      alignItems: 'center',
      padding: '10px 16px',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
    }}
  >
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Employee
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Role
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Hire Date
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Term. Date
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
      Last Points
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Term. Reason
    </Typography>
    <Typography sx={{ fontFamily, fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
      Actions
    </Typography>
  </Box>
);

// Loading skeleton
const LoadingSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <Skeleton variant="rounded" height={56} sx={{ borderRadius: '12px' }} />
    <Skeleton variant="rounded" height={56} sx={{ borderRadius: '12px' }} />
  </Box>
);

export function DisciplineReportTab() {
  const { selectedLocationId, selectedLocationOrgId } = useLocationContext();
  const [activeEmployees, setActiveEmployees] = React.useState<ActiveEmployee[]>([]);
  const [inactiveEmployees, setInactiveEmployees] = React.useState<InactiveEmployee[]>([]);
  const [disciplineActions, setDisciplineActions] = React.useState<DisciplineActions[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [generatingReportFor, setGeneratingReportFor] = React.useState<string | null>(null);
  const [locationImageUrl, setLocationImageUrl] = React.useState<string | null>(null);

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      if (!selectedLocationId) {
        setActiveEmployees([]);
        setInactiveEmployees([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/reporting/discipline-data?location_id=${selectedLocationId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch discipline data');
        }

        const data = await response.json();
        setActiveEmployees(data.activeEmployees || []);
        setInactiveEmployees(data.inactiveEmployees || []);
        setDisciplineActions(data.disciplineActions || []);
        setLocationImageUrl(data.locationImageUrl || null);
      } catch (err) {
        console.error('Error fetching discipline data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLocationId]);

  // Generate report handler
  const handleGenerateReport = async (employeeId: string) => {
    if (!selectedLocationId) return;
    
    setGeneratingReportFor(employeeId);
    
    try {
      // Fetch full report data for this employee
      const response = await fetch(`/api/reporting/discipline-report?employee_id=${employeeId}&location_id=${selectedLocationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const reportData = await response.json();
      
      // Generate PDF
      const blob = await pdf(
        <DisciplineReportPDF
          employeeName={reportData.employee.full_name}
          employeeRole={reportData.employee.role}
          hireDate={reportData.employee.hire_date}
          currentPoints={reportData.currentPoints}
          logoUrl={locationImageUrl || undefined}
          infractions={reportData.infractions}
          actions={reportData.actions}
          actionThresholds={reportData.actionThresholds}
        />
      ).toBlob();
      
      // Download PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Discipline_Report_${reportData.employee.full_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReportFor(null);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', padding: 4 }}>
        <Typography sx={{ fontFamily, color: '#dc2626' }}>{error}</Typography>
      </Box>
    );
  }

  if (!selectedLocationId) {
    return (
      <Box sx={{ textAlign: 'center', padding: 4 }}>
        <Typography sx={{ fontFamily, color: '#6b7280' }}>Please select a location to view discipline reports.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Active Employees Accordion */}
      <Accordion
        defaultExpanded={false}
        sx={{
          boxShadow: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: '12px !important',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: 0,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            '&.Mui-expanded': {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottom: '1px solid #e5e7eb',
            },
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: '#111827' }}>
              Active Employees
            </Typography>
            <Box
              sx={{
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: 13,
                fontWeight: 500,
                color: '#6b7280',
                fontFamily,
              }}
            >
              {activeEmployees.length}
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: 0 }}>
          {activeEmployees.length === 0 ? (
            <Box sx={{ padding: 3, textAlign: 'center' }}>
              <Typography sx={{ fontFamily, color: '#6b7280' }}>No active employees found.</Typography>
            </Box>
          ) : (
            <>
              <ActiveHeaderRow />
              {activeEmployees.map((employee) => (
                <ActiveEmployeeRow
                  key={employee.id}
                  employee={employee}
                  disciplineActions={disciplineActions}
                  onGenerateReport={handleGenerateReport}
                  isGenerating={generatingReportFor === employee.id}
                />
              ))}
            </>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Inactive Employees Accordion */}
      <Accordion
        defaultExpanded={false}
        sx={{
          boxShadow: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: '12px !important',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            margin: 0,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            '&.Mui-expanded': {
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              borderBottom: '1px solid #e5e7eb',
            },
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontFamily, fontSize: 16, fontWeight: 600, color: '#111827' }}>
              Inactive Employees
            </Typography>
            <Box
              sx={{
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: 13,
                fontWeight: 500,
                color: '#6b7280',
                fontFamily,
              }}
            >
              {inactiveEmployees.length}
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: 0 }}>
          {inactiveEmployees.length === 0 ? (
            <Box sx={{ padding: 3, textAlign: 'center' }}>
              <Typography sx={{ fontFamily, color: '#6b7280' }}>No inactive employees found.</Typography>
            </Box>
          ) : (
            <>
              <InactiveHeaderRow />
              {inactiveEmployees.map((employee) => (
                <InactiveEmployeeRow
                  key={employee.id}
                  employee={employee}
                  disciplineActions={disciplineActions}
                  onGenerateReport={handleGenerateReport}
                  isGenerating={generatingReportFor === employee.id}
                />
              ))}
            </>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default DisciplineReportTab;

