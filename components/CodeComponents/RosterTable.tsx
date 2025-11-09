import * as React from "react";
import type { Employee, AvailabilityType, CertificationStatus } from "@/lib/supabase.types";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  CircularProgress,
  Typography,
  IconButton,
  Stack,
  Menu,
  MenuItem,
  Box,
  Tabs,
  Tab,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { EmployeeTableSkeleton } from "./Skeletons/EmployeeTableSkeleton";
import { EvaluationsTable } from "./EvaluationsTable";
import { usePlasmicCanvasContext } from '@plasmicapp/loader-nextjs';
import { RolePill } from "./shared/RolePill";

export type Role =
  | "New Hire"
  | "Team Member"
  | "Trainer"
  | "Team Lead"
  | "Director"
  | "Executive"
  | "Operator";

export interface RosterEntry {
  id: string;
  name: string;
  currentRole: Role;
  certifiedStatus: CertificationStatus;
  availability: AvailabilityType;
  calculatedPay: number | null;
  foh: boolean;
  boh: boolean;
}

export function RosterTable(props: RosterTableProps) {
  const { orgId, locationId } = props;
  const [activeTab, setActiveTab] = React.useState<'employees' | 'evaluations'>('employees');
  const [hasPlannedEvaluations, setHasPlannedEvaluations] = React.useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, value: string) => {
    setActiveTab((value as 'employees' | 'evaluations') ?? 'employees');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <StyledTabs value={activeTab} onChange={handleTabChange}>
        <StyledTab label="Employees" value="employees" />
        <StyledTab
          value="evaluations"
          label={
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <span>Pending Evaluations</span>
              {hasPlannedEvaluations && (
                <Box
                  component="span"
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#facc15',
                  }}
                />
              )}
            </Box>
          }
        />
      </StyledTabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 'employees' ? (
          <EmployeesTableView {...props} />
        ) : (
          <EvaluationsTable
            orgId={orgId}
            locationId={locationId}
            className={props.className}
            onPlannedStatusChange={setHasPlannedEvaluations}
          />
        )}
      </Box>
    </Box>
  );
}

export interface RosterTableProps {
  orgId: string;
  locationId: string;
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
  checkboxOnClass?: string;
  checkboxOffClass?: string;
  actionsCellClass?: string;

  // handlers
  onCertifiedStatusChange?: (id: string, status: CertificationStatus) => void;
  onAvailabilityChange?: (id: string, availability: AvailabilityType) => void;
  onFohChange?: (id: string, checked: boolean) => void;
  onBohChange?: (id: string, checked: boolean) => void;
  onRoleChange?: (id: string, newRole: Role) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEmployeeCreate?: (employee: Partial<Employee>) => void;
  onEmployeeUpdate?: (id: string, employee: Partial<Employee>) => void;
  onEmployeeDelete?: (id: string) => void;
}

// sample data (design preview)
const sampleData: RosterEntry[] = [
  { id: "1", name: "Alexandra Nolasco", currentRole: "New Hire", certifiedStatus: "Not Certified", availability: "Available", calculatedPay: 15, foh: true,  boh: false },
  { id: "2", name: "Amanda Luna",       currentRole: "Team Lead", certifiedStatus: "Certified", availability: "Available", calculatedPay: 25, foh: true,  boh: false },
  { id: "3", name: "Angeles Carbajal",  currentRole: "Team Lead", certifiedStatus: "Certified", availability: "Available", calculatedPay: 25, foh: false, boh: true  },
  { id: "4", name: "Ashley Ramirez",    currentRole: "Team Lead", certifiedStatus: "Certified", availability: "Available", calculatedPay: 25, foh: true,  boh: false },
  { id: "5", name: "Caidyn Spann",      currentRole: "Team Member", certifiedStatus: "Pending", availability: "Limited", calculatedPay: 14, foh: true, boh: false },
  { id: "6", name: "Casey Howard",      currentRole: "Director",  certifiedStatus: "PIP", availability: "Available", calculatedPay: 30, foh: true,  boh: true  },
  { id: "7", name: "Celia Barrera",     currentRole: "New Hire",  certifiedStatus: "Not Certified", availability: "Available", calculatedPay: 15, foh: true,  boh: false },
  { id: "8", name: "Daniel Millan",     currentRole: "Team Member", certifiedStatus: "Certified", availability: "Available", calculatedPay: 18, foh: true, boh: false },
  { id: "9", name: "Sarah Johnson",     currentRole: "Trainer",   certifiedStatus: "Certified", availability: "Available", calculatedPay: 20, foh: true,  boh: true  },
  { id: "10", name: "Michael Chen",     currentRole: "Executive", certifiedStatus: "Certified", availability: "Available", calculatedPay: 36, foh: true,  boh: true  },
  { id: "11", name: "Lisa Rodriguez",   currentRole: "Operator",  certifiedStatus: "Certified", availability: "Available", calculatedPay: null, foh: true,  boh: true  },
];

const fontFamily = `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

const StyledContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflow: "hidden",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
}));

const StyledTabs = styled(Tabs)(() => ({
  borderBottom: '1px solid #e5e7eb',
  marginBottom: 16,
  '& .MuiTabs-indicator': {
    backgroundColor: '#31664a',
    height: 3,
  },
}));

const StyledTab = styled(Tab)(() => ({
  fontFamily,
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'none',
  color: '#6b7280',
  '&.Mui-selected': {
    color: '#31664a',
    fontWeight: 600,
  },
}));

const StyledTable = styled(Table)(() => ({
  "& th": {
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontWeight: 600,
    fontSize: 14,
    color: "#111827",
    lineHeight: 1.2,
    fontFamily,
    padding: "14px 24px",
  },
  "& td": {
    borderBottom: "1px solid #e5e7eb",
    color: "#111827",
    fontSize: 14,
    lineHeight: 1.2,
    fontFamily,
    padding: "14px 24px",
  },
  "& tbody tr:hover": {
    backgroundColor: "#f9fafb",
  },
}));

const BrandCheckbox = styled(Checkbox)(() => ({
  color: "#9ca3af",
  padding: 0,
  "&.Mui-checked": {
    color: "#31664a",
  },
  "&:hover": {
    backgroundColor: "rgba(49, 102, 74, 0.08)",
  },
}));

const ActionsButton = styled(IconButton)(() => ({
  height: 28,
  width: 28,
  borderRadius: "50%",
  color: "#9ca3af",
  transition: "background-color 0.15s ease-in-out, color 0.15s ease-in-out",
  "&:hover": {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
}));

const RoleMenuItem = styled(MenuItem)(() => ({
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  fontSize: 12,
  fontWeight: 500,
  padding: "8px 12px",
  margin: "2px 8px",
  borderRadius: 8,
  "&.Mui-selected": {
    backgroundColor: "#f3f4f6",
    "&:hover": {
      backgroundColor: "#e5e7eb",
    },
  },
  "&:hover": {
    backgroundColor: "#f9fafb",
  },
}));

const AvailabilityChip = styled(Box)(() => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 12px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  "&:hover": {
    opacity: 0.8,
    transform: "translateY(-1px)",
  },
  "&.available": {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  "&.limited": {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
}));

const CertificationChip = styled(Box)(() => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 12px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  "&:hover": {
    opacity: 0.8,
    transform: "translateY(-1px)",
  },
  "&.not-certified": {
    backgroundColor: "transparent",
    color: "#31664a",
    border: "1px solid #31664a",
  },
  "&.pending": {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  "&.certified": {
    backgroundColor: "#31664a",
    color: "#ffffff",
  },
  "&.pip": {
    backgroundColor: "#dc2626",
    color: "#ffffff",
  },
}));

function EmployeesTableView({
  orgId,
  locationId,
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
  checkboxOnClass,
  checkboxOffClass,
  actionsCellClass,

  onCertifiedStatusChange,
  onAvailabilityChange,
  onFohChange,
  onBohChange,
  onRoleChange,
  onEdit,
  onDelete,
  onEmployeeCreate,
  onEmployeeUpdate,
  onEmployeeDelete,
}: RosterTableProps) {
  const [data, setData] = React.useState<RosterEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const inEditor = usePlasmicCanvasContext();
  
  // Role dropdown state
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  
  // Availability dropdown state
  const [availabilityMenuAnchor, setAvailabilityMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  
  // Certification status dropdown state
  const [certificationMenuAnchor, setCertificationMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  // Unchangeable roles
  const unchangeableRoles: Role[] = ["Operator", "Executive"];

  const cellPadding = density === "compact" ? 1 : 1.5;
  
  // Fetch employees from Supabase - memoized to avoid recreating on every render
  const fetchEmployees = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees?org_id=${orgId}&location_id=${locationId}`, {
        // Add cache headers for better performance
        headers: {
          'Cache-Control': 'max-age=60', // Cache for 60 seconds
        }
      });
      
      if (!response.ok) throw new Error(`Failed to fetch employees: ${response.status}`);
      
      const data = await response.json() as { employees: Employee[] };
      
      // Transform Supabase employees to RosterEntry format
      const transformedData: RosterEntry[] = data.employees.map((emp: Employee) => ({
        id: emp.id,
        name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
        currentRole: emp.role as Role,
        certifiedStatus: emp.certified_status || 'Not Certified',
        availability: emp.availability || 'Available',
        calculatedPay: emp.calculated_pay ?? null,
        foh: emp.is_foh ?? false,
        boh: emp.is_boh ?? false
      }));
      
      setData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [orgId, locationId]);

  // Fetch employees on mount and when orgId/locationId changes
  React.useEffect(() => {
    if (!orgId || !locationId) {
      if (inEditor) {
        setData(sampleData);
        setError(null);
      } else {
        setData([]);
        setError('Select a location to view the roster.');
      }
      setLoading(false);
      return;
    }

    fetchEmployees();
  }, [orgId, locationId, fetchEmployees, inEditor]);

  // Real-time subscription disabled - Realtime not enabled on employees table
  // If you need real-time updates, enable Realtime on the employees table in Supabase
  // Then uncomment the code below
  /*
  React.useEffect(() => {
    if (!orgId || !locationId) return;
    
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'employees',
          filter: `org_id=eq.${orgId}`
        }, 
        (payload) => {
          console.log('Employee data changed:', payload);
          // Refetch data when employees change
          fetch(`/api/employees?org_id=${orgId}&location_id=${locationId}`)
            .then(res => res.json() as Promise<{ employees: Employee[] }>)
            .then((data) => {
              const transformedData: RosterEntry[] = data.employees.map((emp: Employee) => ({
                id: emp.id,
                name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
                currentRole: emp.role as Role,
                foh: emp.is_foh ?? false,
                boh: emp.is_boh ?? false
              }));
              setData(transformedData);
            })
            .catch(console.error);
        }
      )
      .subscribe();

    return () => {
      const supabase = createSupabaseClient();
      supabase.removeChannel(channel);
    };
  }, [orgId, locationId]);
  */

  // Handle Certification status changes with API calls
  const handleCertificationStatusChange = async (id: string, newStatus: CertificationStatus) => {
    // Close menu
    setCertificationMenuAnchor(prev => ({ ...prev, [id]: null }));
    
    // Optimistically update UI
    setData(prev => prev.map(emp => 
      emp.id === id ? { ...emp, certifiedStatus: newStatus } : emp
    ));
    
    // Call Supabase
    try {
      const { createSupabaseClient } = await import("@/util/supabase/component");
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('employees')
        .update({ certified_status: newStatus })
        .eq('id', id);
      
      if (error) {
        console.error('Failed to update certification status:', error);
        // Revert on error
        fetchEmployees();
      } else if (onCertifiedStatusChange) {
        onCertifiedStatusChange(id, newStatus);
      }
    } catch (err) {
      console.error('Failed to update certification status:', err);
      fetchEmployees(); // Revert on error
    }
  };

  // Legacy handler for backwards compatibility (deprecated)
  // Converts boolean to certification status
  const handleCertifiedChange = async (id: string, checked: boolean) => {
    // Convert boolean to certification status
    const newStatus: CertificationStatus = checked ? 'Certified' : 'Not Certified';
    await handleCertificationStatusChange(id, newStatus);
  };

  const handleFohChange = async (id: string, checked: boolean) => {
    if (onFohChange) {
      onFohChange(id, checked);
    }
    
    // Optimistic update - update UI immediately
    const previousData = data.find(emp => emp.id === id);
    setData(prev => prev.map(emp => 
      emp.id === id 
        ? { ...emp, foh: checked }
        : emp
    ));
    
    // Update via API in the background
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id: id,
          is_foh: checked
        })
      });
      
      if (!response.ok) throw new Error('Failed to update employee');
      
      const result = await response.json();
      
      // Update with calculated_pay from API response
      setData(prev => prev.map(emp => 
        emp.id === id 
          ? { ...emp, calculatedPay: result.employee?.calculated_pay ?? emp.calculatedPay }
          : emp
      ));
    } catch (err) {
      console.error('Error updating FOH status:', err);
      // Revert on error
      if (previousData) {
        setData(prev => prev.map(emp => 
          emp.id === id 
            ? { ...emp, foh: previousData.foh }
            : emp
        ));
      }
    }
  };

  const handleBohChange = async (id: string, checked: boolean) => {
    if (onBohChange) {
      onBohChange(id, checked);
    }
    
    // Optimistic update - update UI immediately
    const previousData = data.find(emp => emp.id === id);
    setData(prev => prev.map(emp => 
      emp.id === id 
        ? { ...emp, boh: checked }
        : emp
    ));
    
    // Update via API in the background
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id: id,
          is_boh: checked
        })
      });
      
      if (!response.ok) throw new Error('Failed to update employee');
      
      const result = await response.json();
      
      // Update with calculated_pay from API response
      setData(prev => prev.map(emp => 
        emp.id === id 
          ? { ...emp, calculatedPay: result.employee?.calculated_pay ?? emp.calculatedPay }
          : emp
      ));
    } catch (err) {
      console.error('Error updating BOH status:', err);
      // Revert on error
      if (previousData) {
        setData(prev => prev.map(emp => 
          emp.id === id 
            ? { ...emp, boh: previousData.boh }
            : emp
        ));
      }
    }
  };

  // Availability dropdown handlers
  const handleAvailabilityMenuOpen = (event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setAvailabilityMenuAnchor(prev => ({ ...prev, [employeeId]: event.currentTarget }));
  };

  const handleAvailabilityMenuClose = (employeeId: string) => {
    setAvailabilityMenuAnchor(prev => ({ ...prev, [employeeId]: null }));
  };

  const handleAvailabilitySelect = async (id: string, availability: AvailabilityType) => {
    handleAvailabilityMenuClose(id);
    
    if (onAvailabilityChange) {
      onAvailabilityChange(id, availability);
    }

    // Optimistic update - update UI immediately
    const previousData = data.find(emp => emp.id === id);
    setData(prev => prev.map(emp =>
      emp.id === id 
        ? { ...emp, availability }
        : emp
    ));

    // Update via API in the background (which will trigger pay recalculation)
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id: id,
          availability: availability
        })
      });

      if (!response.ok) throw new Error('Failed to update employee');

      const result = await response.json();
      
      // Update calculated_pay from API response
      setData(prev => prev.map(emp =>
        emp.id === id 
          ? { ...emp, calculatedPay: result.employee?.calculated_pay ?? emp.calculatedPay }
          : emp
      ));
    } catch (err) {
      console.error('Error updating availability:', err);
      // Revert on error
      if (previousData) {
        setData(prev => prev.map(emp =>
          emp.id === id 
            ? { ...emp, availability: previousData.availability }
            : emp
        ));
      }
    }
  };

  // Role dropdown handlers
  const handleRoleMenuOpen = (event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setRoleMenuAnchor(prev => ({
      ...prev,
      [employeeId]: event.currentTarget
    }));
  };

  const handleRoleMenuClose = (employeeId: string) => {
    setRoleMenuAnchor(prev => ({
      ...prev,
      [employeeId]: null
    }));
  };

  const handleRoleSelect = async (employeeId: string, newRole: Role) => {
    // Close the menu immediately
    handleRoleMenuClose(employeeId);
    
    if (onRoleChange) {
      onRoleChange(employeeId, newRole);
    }

    // Optimistic update - update UI immediately
    const previousData = data.find(emp => emp.id === employeeId);
    setData(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, currentRole: newRole }
        : emp
    ));

    // Update via API in the background
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id: employeeId,
          role: newRole
        })
      });
      
      if (!response.ok) throw new Error('Failed to update employee role');
      
      const result = await response.json();
      
      // Update with calculated_pay from API response
      setData(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, calculatedPay: result.employee?.calculated_pay ?? emp.calculatedPay }
          : emp
      ));
    } catch (err) {
      console.error('Error updating employee role:', err);
      // Revert on error
      if (previousData) {
        setData(prev => prev.map(emp => 
          emp.id === employeeId 
            ? { ...emp, currentRole: previousData.currentRole }
            : emp
        ));
      }
    }
  };

  if (loading && data.length === 0) {
    return (
      <EmployeeTableSkeleton
        className={className}
        rows={10}
        showActions={showActions}
      />
    );
  }

  if (error && data.length === 0) {
    return (
      <StyledContainer
        className={`roster-table-container ${className}`}
        data-plasmic-name="roster-table-container"
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent="center"
          sx={{ py: 6, px: 4 }}
        >
          <Typography
            variant="body2"
            sx={{ color: "#b91c1c", fontFamily }}
          >
            {error}
          </Typography>
        </Stack>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer
      className={`roster-table-container ${className}`}
      data-plasmic-name="roster-table-container"
    >
      <StyledTable
        className={`roster-table ${tableClass}`}
        data-plasmic-name="roster-table"
      >
        <TableHead data-plasmic-name="table-header">
          <TableRow
            data-plasmic-name="header-row"
            className={headerRowClass}
          >
            <TableCell
              data-plasmic-name="name-header"
              className={headerCellClass}
            >
              Name
            </TableCell>
            <TableCell
              data-plasmic-name="role-header"
              className={headerCellClass}
            >
              Current Role
            </TableCell>
            <TableCell
              data-plasmic-name="foh-header"
              className={headerCellClass}
              align="center"
            >
              FOH
            </TableCell>
            <TableCell
              data-plasmic-name="boh-header"
              className={headerCellClass}
              align="center"
            >
              BOH
            </TableCell>
            <TableCell
              data-plasmic-name="availability-header"
              className={headerCellClass}
              align="center"
            >
              Availability
            </TableCell>
            <TableCell
              data-plasmic-name="certified-header"
              className={headerCellClass}
              align="center"
            >
              Certified
            </TableCell>
            <TableCell
              data-plasmic-name="pay-header"
              className={headerCellClass}
              align="center"
            >
              Suggested Pay
            </TableCell>
            {showActions && (
              <TableCell
                data-plasmic-name="actions-header"
                className={headerCellClass}
                align="right"
              ></TableCell>
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((e) => (
            <TableRow
              key={e.id}
              hover
              className={rowClass}
            >
              <TableCell
                className={`name-cell ${nameCellClass || ""}`}
                sx={{ py: cellPadding }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ fontFamily, fontWeight: 600, color: "#111827" }}
                >
                  {e.name}
                </Typography>
              </TableCell>
              <TableCell
                className={cellClass}
                sx={{ py: cellPadding }}
              >
                {unchangeableRoles.includes(e.currentRole) ? (
                  <RolePill
                    role={e.currentRole}
                    className={roleBadgeClass}
                  />
                ) : (
                  <>
                    <Box
                      onClick={(event) => handleRoleMenuOpen(event, e.id)}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                      }}
                    >
                      <RolePill
                        role={e.currentRole}
                        className={roleBadgeClass}
                      />
                      <ExpandMoreIcon sx={{ fontSize: 16, color: '#6b7280' }} />
                    </Box>
                    
                    <Menu
                      anchorEl={roleMenuAnchor[e.id]}
                      open={Boolean(roleMenuAnchor[e.id])}
                      onClose={() => handleRoleMenuClose(e.id)}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                      PaperProps={{
                        sx: {
                          fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
                          borderRadius: 2,
                          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                          border: "1px solid #e5e7eb",
                        }
                      }}
                    >
                      {(["New Hire", "Team Member", "Trainer", "Team Lead", "Director"] as Role[]).map((role) => (
                        <RoleMenuItem
                          key={role}
                          onClick={() => handleRoleSelect(e.id, role)}
                          selected={e.currentRole === role}
                        >
                          <RolePill role={role} className={roleBadgeClass} />
                        </RoleMenuItem>
                      ))}
                    </Menu>
                  </>
                )}
              </TableCell>
              <TableCell
                className={cellClass}
                align="center"
                sx={{ py: cellPadding }}
              >
                <BrandCheckbox
                  checked={e.foh}
                  onChange={(_, checked) => handleFohChange(e.id, checked)}
                  className={
                    checkboxOnClass || checkboxOffClass
                      ? e.foh
                        ? checkboxOnClass
                        : checkboxOffClass
                      : undefined
                  }
                  inputProps={{ "aria-label": `FOH access for ${e.name}` }}
                />
              </TableCell>
              <TableCell
                className={cellClass}
                align="center"
                sx={{ py: cellPadding }}
              >
                <BrandCheckbox
                  checked={e.boh}
                  onChange={(_, checked) => handleBohChange(e.id, checked)}
                  className={
                    checkboxOnClass || checkboxOffClass
                      ? e.boh
                        ? checkboxOnClass
                        : checkboxOffClass
                      : undefined
                  }
                  inputProps={{ "aria-label": `BOH access for ${e.name}` }}
                />
              </TableCell>
              <TableCell
                className={cellClass}
                align="center"
                sx={{ py: cellPadding }}
              >
                <AvailabilityChip
                  className={e.availability.toLowerCase()}
                  onClick={(event) => handleAvailabilityMenuOpen(event, e.id)}
                >
                  {e.availability}
                  <ExpandMoreIcon sx={{ fontSize: 14, ml: 0.5 }} />
                </AvailabilityChip>
                
                <Menu
                  anchorEl={availabilityMenuAnchor[e.id]}
                  open={Boolean(availabilityMenuAnchor[e.id])}
                  onClose={() => handleAvailabilityMenuClose(e.id)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  PaperProps={{
                    sx: {
                      fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
                      borderRadius: 2,
                      boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                      border: "1px solid #e5e7eb",
                    }
                  }}
                >
                  {(['Available', 'Limited'] as AvailabilityType[]).map((avail) => (
                    <RoleMenuItem
                      key={avail}
                      onClick={() => handleAvailabilitySelect(e.id, avail)}
                      selected={e.availability === avail}
                    >
                      <AvailabilityChip
                        className={avail.toLowerCase()}
                        sx={{ 
                          cursor: "default",
                          "&:hover": { 
                            opacity: 1, 
                            transform: "none" 
                          }
                        }}
                      >
                        {avail}
                      </AvailabilityChip>
                    </RoleMenuItem>
                  ))}
                </Menu>
              </TableCell>
              <TableCell
                className={cellClass}
                align="center"
                sx={{ py: cellPadding }}
              >
                <CertificationChip
                  className={e.certifiedStatus.toLowerCase().replace(' ', '-')}
                  onClick={(event) => {
                    setCertificationMenuAnchor(prev => ({ ...prev, [e.id]: event.currentTarget }));
                  }}
                >
                  {e.certifiedStatus}
                  <ExpandMoreIcon sx={{ fontSize: 16, ml: 0.5 }} />
                </CertificationChip>
                <Menu
                  anchorEl={certificationMenuAnchor[e.id]}
                  open={Boolean(certificationMenuAnchor[e.id])}
                  onClose={() => setCertificationMenuAnchor(prev => ({ ...prev, [e.id]: null }))}
                  PaperProps={{
                    sx: {
                      mt: 0.5,
                      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                      borderRadius: 2,
                    },
                  }}
                >
                  {(['Not Certified', 'Pending', 'Certified', 'PIP'] as CertificationStatus[]).map((status) => (
                    <RoleMenuItem
                      key={status}
                      selected={e.certifiedStatus === status}
                      onClick={() => handleCertificationStatusChange(e.id, status)}
                    >
                      {status}
                    </RoleMenuItem>
                  ))}
                </Menu>
              </TableCell>
              <TableCell
                className={cellClass}
                align="center"
                sx={{ py: cellPadding }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ 
                    fontFamily, 
                    fontWeight: 600, 
                    color: e.calculatedPay ? "#166534" : "#9ca3af",
                    fontSize: 14
                  }}
                >
                  {e.calculatedPay ? `$${e.calculatedPay.toFixed(2)}/hr` : '—'}
                </Typography>
              </TableCell>
              {showActions && (
                <TableCell
                  className={actionsCellClass || cellClass}
                  align="right"
                  sx={{ py: cellPadding }}
                >
                  <ActionsButton
                    onClick={() => onEdit?.(e.id)}
                    className="actions-button"
                    aria-label={`Actions for ${e.name}`}
                  >
                    <MoreVertIcon fontSize="small" />
                  </ActionsButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </StyledTable>
    </StyledContainer>
  );
}
