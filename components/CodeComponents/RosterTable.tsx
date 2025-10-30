import * as React from "react";
import type { Employee, AvailabilityType } from "@/lib/supabase.types";
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
  Button,
  Box,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

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
  certified: boolean;
  availability: AvailabilityType;
  calculatedPay: number | null;
  foh: boolean;
  boh: boolean;
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
  onCertifiedChange?: (id: string, checked: boolean) => void;
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
  { id: "1", name: "Alexandra Nolasco", currentRole: "New Hire", certified: false, availability: "Available", calculatedPay: 15, foh: true,  boh: false },
  { id: "2", name: "Amanda Luna",       currentRole: "Team Lead", certified: true, availability: "Available", calculatedPay: 25, foh: true,  boh: false },
  { id: "3", name: "Angeles Carbajal",  currentRole: "Team Lead", certified: true, availability: "Available", calculatedPay: 25, foh: false, boh: true  },
  { id: "4", name: "Ashley Ramirez",    currentRole: "Team Lead", certified: true, availability: "Available", calculatedPay: 25, foh: true,  boh: false },
  { id: "5", name: "Caidyn Spann",      currentRole: "Team Member", certified: false, availability: "Limited", calculatedPay: 14, foh: true, boh: false },
  { id: "6", name: "Casey Howard",      currentRole: "Director",  certified: true, availability: "Available", calculatedPay: 30, foh: true,  boh: true  },
  { id: "7", name: "Celia Barrera",     currentRole: "New Hire",  certified: false, availability: "Available", calculatedPay: 15, foh: true,  boh: false },
  { id: "8", name: "Daniel Millan",     currentRole: "Team Member", certified: true, availability: "Available", calculatedPay: 18, foh: true, boh: false },
  { id: "9", name: "Sarah Johnson",     currentRole: "Trainer",   certified: true, availability: "Available", calculatedPay: 20, foh: true,  boh: true  },
  { id: "10", name: "Michael Chen",     currentRole: "Executive", certified: true, availability: "Available", calculatedPay: 36, foh: true,  boh: true  },
  { id: "11", name: "Lisa Rodriguez",   currentRole: "Operator",  certified: true, availability: "Available", calculatedPay: null, foh: true,  boh: true  },
];

// role → chip colors (can still be overridden via roleBadgeClass)
const roleChip = (role: Role) => {
  const base = "role-badge";
  switch (role) {
    case "New Hire":
      return `${base} new-hire`;
    case "Team Member":
      return `${base} team-member`;
    case "Trainer":
      return `${base} trainer`;
    case "Team Lead":
      return `${base} team-lead`;
    case "Director":
      return `${base} director`;
    case "Executive":
      return `${base} executive`;
    case "Operator":
      return `${base} operator`;
    default:
      return `${base} new-hire`;
  }
};

const fontFamily = `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

const StyledContainer = styled(TableContainer)(() => ({
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflow: "hidden",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
}));

const StyledTable = styled(Table)(() => ({
  "& th": {
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "#111827",
    lineHeight: 1.2,
    fontFamily,
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

const RoleChip = styled(Box)(() => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
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
  "&.new-hire": {
    backgroundColor: "#f0fdf4",
    color: "#166534",
  },
  "&.team-member": {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
  },
  "&.trainer": {
    backgroundColor: "#fef2f2",
    color: "#dc2626",
  },
  "&.team-lead": {
    backgroundColor: "#fef3c7",
    color: "#d97706",
  },
  "&.director": {
    backgroundColor: "#f3e8ff",
    color: "#7c3aed",
  },
  "&.executive": {
    backgroundColor: "#F0F0FF",
    color: "#483D8B",
  },
  "&.operator": {
    backgroundColor: "#F0F0FF",
    color: "#483D8B",
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

const SaveButton = styled(Button)(() => ({
  marginTop: 8,
  backgroundColor: "#31664a",
  color: "white",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  padding: "6px 12px",
  borderRadius: 6,
  textTransform: "none",
  "&:hover": {
    backgroundColor: "#2d5a42",
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

export function RosterTable({
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

  onCertifiedChange,
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
  
  // Role dropdown state
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  const [pendingRoleChanges, setPendingRoleChanges] = React.useState<{ [key: string]: Role }>({});
  
  // Availability dropdown state
  const [availabilityMenuAnchor, setAvailabilityMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  // Unchangeable roles
  const unchangeableRoles: Role[] = ["Operator", "Executive"];

  const cellPadding = density === "compact" ? 1 : 1.5;
  
  // Fetch employees from Supabase
  React.useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoading(true);
        const response = await fetch(`/api/employees?org_id=${orgId}&location_id=${locationId}`);
        
        if (!response.ok) throw new Error(`Failed to fetch employees: ${response.status}`);
        
        const data = await response.json() as { employees: Employee[] };
        
        // Transform Supabase employees to RosterEntry format
        const transformedData: RosterEntry[] = data.employees.map((emp: Employee) => ({
          id: emp.id,
          name: emp.full_name || `${emp.first_name} ${emp.last_name || ''}`.trim(),
          currentRole: emp.role as Role,
          certified: emp.is_certified ?? false,
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
        setData(sampleData); // Fallback to sample data
      } finally {
        setLoading(false);
      }
    }
    
    if (orgId && locationId) {
      fetchEmployees();
    } else {
      setData(sampleData);
      setLoading(false);
    }
  }, [orgId, locationId]);

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

  // Handle Certified/FOH/BOH changes with API calls
  const handleCertifiedChange = async (id: string, checked: boolean) => {
    if (onCertifiedChange) {
      onCertifiedChange(id, checked);
    }
    
    // Update via API
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id: id,
          is_certified: checked
        })
      });
      
      if (!response.ok) throw new Error('Failed to update employee');
      
      // Optimistic update
      setData(prev => prev.map(emp => 
        emp.id === id ? { ...emp, certified: checked } : emp
      ));
    } catch (err) {
      console.error('Error updating Certified status:', err);
    }
  };

  const handleFohChange = async (id: string, checked: boolean) => {
    if (onFohChange) {
      onFohChange(id, checked);
    }
    
    // Update via API
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
      
      // Optimistic update
      setData(prev => prev.map(emp => 
        emp.id === id ? { ...emp, foh: checked } : emp
      ));
    } catch (err) {
      console.error('Error updating FOH status:', err);
    }
  };

  const handleBohChange = async (id: string, checked: boolean) => {
    if (onBohChange) {
      onBohChange(id, checked);
    }
    
    // Update via API
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
      
      // Optimistic update
      setData(prev => prev.map(emp => 
        emp.id === id ? { ...emp, boh: checked } : emp
      ));
    } catch (err) {
      console.error('Error updating BOH status:', err);
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

    // Update via API (which will trigger pay recalculation)
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
      
      // Update both availability and calculated_pay from API response
      setData(prev => prev.map(emp =>
        emp.id === id 
          ? { ...emp, availability, calculatedPay: result.employee?.calculated_pay ?? emp.calculatedPay }
          : emp
      ));
    } catch (err) {
      console.error('Error updating availability:', err);
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
    // Clear pending changes when closing without saving
    setPendingRoleChanges(prev => {
      const newPending = { ...prev };
      delete newPending[employeeId];
      return newPending;
    });
  };

  const handleRoleSelect = (employeeId: string, newRole: Role) => {
    setPendingRoleChanges(prev => ({
      ...prev,
      [employeeId]: newRole
    }));
  };

  const handleSaveRoleChange = async (employeeId: string) => {
    const newRole = pendingRoleChanges[employeeId];
    if (!newRole) return;

    if (onRoleChange) {
      onRoleChange(employeeId, newRole);
    }

    // Update via API
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
      
      // Optimistic update
      setData(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, currentRole: newRole } : emp
      ));
      
      // Clear pending changes and close menu
      setPendingRoleChanges(prev => {
        const newPending = { ...prev };
        delete newPending[employeeId];
        return newPending;
      });
      handleRoleMenuClose(employeeId);
    } catch (err) {
      console.error('Error updating employee role:', err);
    }
  };

  if (loading && data.length === 0) {
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
          <CircularProgress size={20} thickness={5} sx={{ color: "#31664a" }} />
          <Typography
            variant="body2"
            sx={{ color: "#6b7280", fontFamily }}
          >
            Loading roster...
          </Typography>
        </Stack>
      </StyledContainer>
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
                  sx={{ fontFamily, fontWeight: 500, color: "#111827" }}
                >
                  {e.name}
                </Typography>
              </TableCell>
              <TableCell
                className={cellClass}
                sx={{ py: cellPadding }}
              >
                {unchangeableRoles.includes(e.currentRole) ? (
                  <RoleChip
                    className={`${roleChip(e.currentRole)} ${roleBadgeClass || ""}`}
                    sx={{ 
                      cursor: "default",
                      outline: "none",
                      "&:hover": { 
                        opacity: 1, 
                        transform: "none",
                        outline: "none"
                      },
                      "&:focus": {
                        outline: "none"
                      }
                    }}
                  >
                    {e.currentRole}
                  </RoleChip>
                ) : (
                  <>
                    <RoleChip
                      className={`${roleChip(pendingRoleChanges[e.id] || e.currentRole)} ${roleBadgeClass || ""}`}
                      onClick={(event) => handleRoleMenuOpen(event, e.id)}
                    >
                      {pendingRoleChanges[e.id] || e.currentRole}
                      <ExpandMoreIcon sx={{ fontSize: 14, ml: 0.5 }} />
                    </RoleChip>
                    
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
                          selected={pendingRoleChanges[e.id] === role}
                        >
                          <RoleChip
                            className={`${roleChip(role)} ${roleBadgeClass || ""}`}
                            sx={{ 
                              cursor: "default",
                              "&:hover": { 
                                opacity: 1, 
                                transform: "none" 
                              }
                            }}
                          >
                            {role}
                          </RoleChip>
                        </RoleMenuItem>
                      ))}
                      
                      {pendingRoleChanges[e.id] && (
                        <Box sx={{ px: 2, py: 1, borderTop: '1px solid #e5e7eb' }}>
                          <SaveButton
                            fullWidth
                            onClick={() => handleSaveRoleChange(e.id)}
                            size="small"
                          >
                            Save Changes
                          </SaveButton>
                        </Box>
                      )}
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
                <BrandCheckbox
                  checked={e.certified}
                  onChange={(_, checked) => handleCertifiedChange(e.id, checked)}
                  className={
                    checkboxOnClass || checkboxOffClass
                      ? e.certified
                        ? checkboxOnClass
                        : checkboxOffClass
                      : undefined
                  }
                  inputProps={{ "aria-label": `Certified status for ${e.name}` }}
                />
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
