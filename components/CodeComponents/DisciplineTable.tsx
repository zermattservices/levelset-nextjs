import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import { DisciplineTableSkeleton } from "./Skeletons/DisciplineTableSkeleton";
import { Box, Typography } from "@mui/material";
import {
  DataGridPro,
  GridColDef,
  GridRowsProp,
  gridClasses,
} from "@mui/x-data-grid-pro";
import type { Employee } from "@/lib/supabase.types";
import { EmployeeModal } from "./EmployeeModal";
import { RolePill } from "./shared/RolePill";

export interface DisciplineEntry {
  id: string;
  full_name: string;
  role: string;
  last_infraction: string | null;
  current_points: number;
  employee?: Employee; // Full employee object for modal
}

export interface DisciplineTableProps {
  orgId: string;
  locationId: string;
  currentUserId?: string; // For passing to EmployeeModal
  className?: string;

  // style/density controls
  density?: "comfortable" | "compact";
  showActions?: boolean;

  // class overrides (for Plasmic design control)
  tableClass?: string;
  headerRowClass?: string;
  headerCellClass?: string;
  rowClass?: string;
  cellClass?: string;
  nameCellClass?: string;
  roleBadgeClass?: string;
  pointsBadgeClass?: string;
  actionsCellClass?: string;

  // handlers
  onViewDetails?: (id: string) => void;
  onAddInfraction?: (id: string) => void;
  onRowClick?: (employee: DisciplineEntry) => void;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

// Points Badge Component - color based on discipline actions
const PointsBadge = ({ points, disciplineActions }: { points: number; disciplineActions: any[] }) => {
  const getBadgeColor = () => {
  if (points === 0) {
      return { bg: '#f3f4f6', color: '#111827' }; // Light grey with black text for 0 points
    }
    
    // Find the highest threshold that the points exceed
    const applicableAction = disciplineActions
      .filter(action => points >= action.points_threshold)
      .sort((a, b) => b.points_threshold - a.points_threshold)[0];
    
    if (applicableAction) {
      // Map action names to colors
      const actionName = applicableAction.action.toLowerCase();
      if (actionName.includes('documented warning')) {
        return { bg: '#fee2e2', color: '#991b1b' }; // Light red/pink
      } else if (actionName.includes('write up 1')) {
        return { bg: '#fecaca', color: '#991b1b' }; // Medium red/pink
      } else if (actionName.includes('write up 2')) {
        return { bg: '#fca5a5', color: '#7f1d1d' }; // Medium red
      } else if (actionName.includes('write up 3')) {
        return { bg: '#f87171', color: '#7f1d1d' }; // Darker red
      } else if (actionName.includes('termination')) {
        return { bg: '#dc2626', color: '#ffffff' }; // Darkest red
      }
    }
    
    // Fallback based on points
    if (points <= 10) return { bg: '#fee2e2', color: '#991b1b' };
    else if (points <= 30) return { bg: '#fecaca', color: '#991b1b' };
    else if (points <= 50) return { bg: '#fca5a5', color: '#7f1d1d' };
    else if (points <= 75) return { bg: '#f87171', color: '#7f1d1d' };
    else return { bg: '#dc2626', color: '#ffffff' };
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
        fontSize: 14,
        fontWeight: 600,
        height: 28,
        minWidth: 42,
        padding: '0 12px',
        borderRadius: '14px',
      }}
    >
      {points}
    </Box>
  );
};

export function DisciplineTable({
  orgId = "default-org",
  locationId = "default-location",
  className = "",
  density = "comfortable",
  showActions = true,

  tableClass = "rounded-2xl overflow-hidden",
  headerRowClass = "bg-gray-50",
  headerCellClass,
  rowClass = "border-gray-200",
  cellClass,
  nameCellClass,
  roleBadgeClass,
  pointsBadgeClass,
  actionsCellClass,

  onViewDetails,
  onAddInfraction,
  onRowClick,
  currentUserId,
}: DisciplineTableProps) {
  const [data, setData] = React.useState<DisciplineEntry[]>([]);
  const [disciplineActions, setDisciplineActions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const supabase = createSupabaseClient();
  
  // Fetch discipline data from Supabase
  const fetchDisciplineData = React.useCallback(async () => {
        try {
          setLoading(true);
          console.log('Fetching discipline data for org:', orgId, 'location:', locationId);
          
          let transformedData: DisciplineEntry[] = [];
          
          // Fetch discipline actions for styling
          const { data: actionsData, error: actionsError } = await supabase
            .from('disc_actions_rubric')
            .select('*')
            .eq('org_id', orgId)
            .eq('location_id', locationId)
            .order('points_threshold', { ascending: true });
            
          if (!actionsError && actionsData) {
            setDisciplineActions(actionsData);
          }
          
      // Fetch employees (filter by active) and join to sum points from infractions within last 90 days
            const { data: employees, error: empError } = await supabase
              .from('employees')
        .select('*')
              .eq('org_id', orgId)
              .eq('location_id', locationId)
              .eq('active', true);
              
            if (empError) throw empError;
            
            if (employees && employees.length > 0) {
        // Get infractions for all employees from last 90 days
              const employeeIds = employees.map(emp => emp.id);
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              
              const { data: infractions, error: infError } = await supabase
                .from('infractions')
                .select('employee_id, points, infraction_date')
                .in('employee_id', employeeIds)
                .eq('org_id', orgId)
                .eq('location_id', locationId)
          .gte('infraction_date', ninetyDaysAgo)
                .order('infraction_date', { ascending: false });
                
              if (infError) {
                console.warn('Error fetching infractions, continuing with empty infractions:', infError);
              }
              
              // Calculate current points and last infraction for each employee
              transformedData = employees.map(emp => {
                const empInfractions = infractions?.filter(inf => inf.employee_id === emp.id) || [];
                const current_points = empInfractions.reduce((sum, inf) => sum + (inf.points || 0), 0);
                const last_infraction = empInfractions && empInfractions.length > 0 ? empInfractions[0]?.infraction_date : null;
                
                return {
                  id: emp.id,
                  full_name: emp.full_name || 'Unknown',
                  role: emp.role || 'Team Member',
                  last_infraction,
            current_points,
            employee: emp as Employee, // Store full employee object for modal
                };
        }).sort((a, b) => b.current_points - a.current_points || a.full_name.localeCompare(b.full_name)); // Sort by points DESC, then name ASC
              
              console.log('Loaded discipline data from tables:', transformedData.length, 'entries');
            } else {
              console.log('No employees found for org:', orgId, 'location:', locationId);
              transformedData = [];
          }
        
        setData(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching discipline data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load discipline data');
        setData([]);
      } finally {
        setLoading(false);
      }
  }, [orgId, locationId, supabase]);
    
  // Initial fetch
  React.useEffect(() => {
    if (orgId && locationId) {
      fetchDisciplineData();
    } else {
      setData([]);
      setLoading(false);
    }
  }, [orgId, locationId, fetchDisciplineData]);

  // Real-time subscription disabled - views cannot be added to publications
  // If you need real-time updates, enable Realtime on the underlying tables:
  // - infractions table
  // - employees table
  // Then uncomment the code below
  /*
  React.useEffect(() => {
    if (!orgId || !locationId) return;
    
    let channel: any = null;
    
    try {
      channel = supabase
        .channel(`infractions-changes-${orgId}-${locationId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'infractions',
            filter: `org_id=eq.${orgId}`
          }, 
          (payload) => {
            console.log('Infraction data changed:', payload);
            fetchDisciplineData();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to infraction changes');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Failed to subscribe to infraction changes - continuing without real-time updates');
          }
        });
    } catch (error) {
      console.warn('Error setting up real-time subscription:', error);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (error) {
          console.warn('Error removing channel:', error);
        }
      }
    };
  }, [orgId, locationId, supabase, fetchDisciplineData]);
  */

  // Convert data to DataGrid rows
  const rows: GridRowsProp = React.useMemo(() => {
    return data.map((entry) => ({
      id: entry.id,
      full_name: entry.full_name,
      role: entry.role,
      last_infraction: entry.last_infraction,
      current_points: entry.current_points,
      employee: entry.employee, // Store full employee object
    }));
  }, [data]);

  // Define columns
  const columns: GridColDef[] = React.useMemo(() => [
    {
      field: 'full_name',
      headerName: 'Employee',
      width: 200,
      sortable: true,
      resizable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              color: '#111827',
            }}
          >
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 160,
      sortable: true,
      resizable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
          <RolePill role={params.value} />
        </Box>
      ),
    },
    {
      field: 'last_infraction',
      headerName: 'Last Infraction',
      width: 160,
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
              fontWeight: 500,
              color: '#111827',
            }}
          >
            {params.value ? new Date(params.value).toLocaleDateString() : '-'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'current_points',
      headerName: 'Current Points',
      width: 160,
      sortable: true,
      resizable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <PointsBadge points={params.value} disciplineActions={disciplineActions} />
      ),
    },
  ], [disciplineActions]);

  if (loading && data.length === 0) {
    return (
      <DisciplineTableSkeleton
        className={className}
        rows={10}
        showActions={showActions}
        tableClass={tableClass}
        headerRowClass={headerRowClass}
      />
    );
  }

  if (error && data.length === 0) {
    return (
      <Box className={className} sx={{ p: 3, textAlign: 'center' }}>
        <Typography sx={{ fontFamily, color: '#dc2626' }}>{error}</Typography>
      </Box>
    );
  }

  if (data.length === 0 && !loading) {
    return (
      <Box className={className} sx={{ p: 3, textAlign: 'center' }}>
        <Typography sx={{ fontFamily, color: '#6b7280' }}>No discipline data available</Typography>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        height: 650,
        width: '100%',
        fontFamily,
      }}
      data-plasmic-name="discipline-table-container"
    >
      <DataGridPro
        style={{ flex: 1, width: '100%' }}
        rows={rows}
        columns={columns}
        loading={loading}
        pagination
        pageSizeOptions={[25, 50, 100]}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 50 },
          },
          sorting: {
            sortModel: [{ field: 'current_points', sort: 'desc' }],
          },
        }}
        disableRowSelectionOnClick
        disableColumnResize
        showColumnVerticalBorder={false}
        rowHeight={48}
        columnHeaderHeight={56}
        onRowClick={(params) => {
          const rowData = params.row as DisciplineEntry & { employee?: Employee };
          
          // Get the full employee object from the data array
          const entry = data.find(e => e.id === rowData.id);
          const employeeObj = entry?.employee;
          
          // If we have a full employee object, use it; otherwise create a minimal one
          if (employeeObj) {
            setSelectedEmployee(employeeObj);
            setModalOpen(true);
          } else {
            // Fallback: create minimal employee object
            const minimalEmployee: Employee = {
              id: rowData.id,
              full_name: rowData.full_name,
              role: rowData.role,
              org_id: orgId,
              location_id: locationId,
              active: true,
            };
            setSelectedEmployee(minimalEmployee);
            setModalOpen(true);
          }
          
          // Still call the original callbacks for backwards compatibility
          const employeeData: DisciplineEntry = {
            id: rowData.id,
            full_name: rowData.full_name,
            role: rowData.role,
            last_infraction: rowData.last_infraction,
            current_points: rowData.current_points,
          };
          onRowClick?.(employeeData);
          onViewDetails?.(employeeData.id);
        }}
        sx={{
          fontFamily,
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          
          // Column headers
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
          '& .MuiDataGrid-columnHeaderTitleContainer': {
            padding: '0 16px',
          },
          
          // Column separators - Hide
          [`& .${gridClasses.columnSeparator}`]: {
            display: 'none',
          },
          
          // Cells
          [`& .${gridClasses.cell}`]: {
            borderBottom: '1px solid #f3f4f6',
            borderRight: 'none',
            fontSize: 13,
            fontWeight: 500,
            color: '#111827',
            fontFamily,
            '&:focus, &:focus-within': {
              outline: 'none',
            },
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
          },
          
          // Rows
          [`& .${gridClasses.row}:hover`]: {
            backgroundColor: '#f9fafb',
            cursor: 'pointer',
          },
          
          // Footer
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
        }}
      />
      
      {/* Employee Modal */}
      <EmployeeModal
        open={modalOpen}
        employee={selectedEmployee}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmployee(null);
        }}
        orgId={orgId}
        locationId={locationId}
        initialTab="discipline"
        currentUserId={currentUserId}
        onRecordAction={onAddInfraction ? () => {
          onAddInfraction(selectedEmployee?.id || '');
        } : undefined}
      />
    </Box>
  );
}

