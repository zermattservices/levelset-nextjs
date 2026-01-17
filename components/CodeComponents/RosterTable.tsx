import * as React from "react";
import type { Employee, AvailabilityType, CertificationStatus } from "@/lib/supabase.types";
import {
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
  Dialog,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import SyncIcon from "@mui/icons-material/Sync";
import { EmployeeTableSkeleton } from "./Skeletons/EmployeeTableSkeleton";
import { EvaluationsTable } from "./EvaluationsTable";
import { PIPTable } from "./PIPTable";
import { RolePill } from "./shared/RolePill";
import { DataGridPro, GridColDef, gridClasses } from "@mui/x-data-grid-pro";
import { Button } from "@mui/material";
import { AddEmployeeModal } from "./AddEmployeeModal";
import { SyncEmployeesModal } from "./SyncEmployeesModal";
import { SyncHireDateModal } from "./SyncHireDateModal";
import { EmployeeModal } from "./EmployeeModal";
import { useLocationContext } from "./LocationContext";
import { createSupabaseClient } from "@/util/supabase/component";
import type { OrgRole } from "@/lib/role-utils";
import { usePermissions, P } from "@/lib/providers/PermissionsProvider";

// Feature toggles interface
interface OrgFeatureToggles {
  enable_certified_status: boolean;
  enable_evaluations: boolean;
  enable_pip_logic: boolean;
}

// Role type is now dynamic - this is a fallback type for backwards compatibility
export type Role = string;

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
  const { locationId, currentUserRoleProp } = props;
  const { selectedLocationOrgId, userHierarchyLevel } = useLocationContext();
  const { has } = usePermissions();
  const [activeTab, setActiveTab] = React.useState<'employees' | 'evaluations' | 'pip'>('employees');
  const [hasPlannedEvaluations, setHasPlannedEvaluations] = React.useState(false);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = React.useState(false);
  const [syncEmployeesModalOpen, setSyncEmployeesModalOpen] = React.useState(false);
  const [syncHireDateModalOpen, setSyncHireDateModalOpen] = React.useState(false);
  const [syncMenuAnchor, setSyncMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [featureToggles, setFeatureToggles] = React.useState<OrgFeatureToggles>({
    enable_certified_status: false,
    enable_evaluations: false,
    enable_pip_logic: false,
  });
  
  // Permission-based access control for roster operations
  const canViewRoster = has(P.ROSTER_VIEW);
  const canEditFohBoh = has(P.ROSTER_EDIT_FOH_BOH);
  const canEditAvailability = has(P.ROSTER_EDIT_AVAILABILITY);
  const canEditRoles = has(P.ROSTER_EDIT_ROLES);
  const canEditEmployee = has(P.ROSTER_EDIT_EMPLOYEE);
  const canSyncEmployees = has(P.ROSTER_SYNC);
  const canManagePaySettings = has(P.ROSTER_MANAGE_PAY);
  const canTerminate = has(P.ROSTER_TERMINATE);
  
  // Determine if user can edit more than just FOH/BOH
  // Level 0, 1, and Levelset Admin can edit everything
  // Level 2+ can only edit FOH/BOH (and view evaluations/PIP read-only)
  // Replaced with permission-based checks above
  const canEditFullRoster = React.useMemo(() => {
    if (currentUserRoleProp === 'Levelset Admin') return true;
    if (userHierarchyLevel === null) return false;
    return userHierarchyLevel <= 1;
  }, [currentUserRoleProp, userHierarchyLevel]);

  // Fetch feature toggles for the current organization
  React.useEffect(() => {
    const fetchFeatureToggles = async () => {
      if (!selectedLocationOrgId) return;
      
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from('org_feature_toggles')
        .select('enable_certified_status, enable_evaluations, enable_pip_logic')
        .eq('org_id', selectedLocationOrgId)
        .single();
      
      if (!error && data) {
        setFeatureToggles({
          enable_certified_status: data.enable_certified_status ?? false,
          enable_evaluations: data.enable_evaluations ?? false,
          enable_pip_logic: data.enable_pip_logic ?? false,
        });
      }
    };
    
    fetchFeatureToggles();
  }, [selectedLocationOrgId]);

  const handleTabChange = (_event: React.SyntheticEvent, value: string) => {
    setActiveTab((value as 'employees' | 'evaluations' | 'pip') ?? 'employees');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TabContainer>
        <StyledTabs value={activeTab} onChange={handleTabChange} sx={{ flex: 1 }}>
          <StyledTab label="Employees" value="employees" />
          {featureToggles.enable_evaluations && (
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
          )}
          {featureToggles.enable_pip_logic && (
            <StyledTab label="PIP" value="pip" />
          )}
        </StyledTabs>
        <ButtonContainer>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddEmployeeModalOpen(true)}
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              color: '#6b7280',
              borderColor: '#d1d5db',
              borderRadius: '8px',
              '&:hover': {
                borderColor: '#9ca3af',
                backgroundColor: '#f9fafb',
              },
            }}
          >
            Add Employee
          </Button>
          <Button
            variant="contained"
            startIcon={<SyncIcon />}
            endIcon={<ExpandMoreIcon />}
            onClick={(e) => {
              setSyncMenuAnchor(e.currentTarget);
            }}
            sx={{
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              backgroundColor: '#31664a',
              color: '#ffffff',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: '#2d5a42',
              },
            }}
          >
            Sync Employees
          </Button>
          <Menu
            anchorEl={syncMenuAnchor}
            open={Boolean(syncMenuAnchor)}
            onClose={() => setSyncMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                fontFamily,
                borderRadius: 2,
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e5e7eb",
                minWidth: 200,
              },
            }}
          >
            <MenuItem
              onClick={() => {
                setSyncMenuAnchor(null);
                setSyncEmployeesModalOpen(true);
              }}
              sx={{
                fontFamily,
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 16px",
              }}
            >
              HotSchedules
            </MenuItem>
            <MenuItem
              onClick={() => {
                setSyncMenuAnchor(null);
                setSyncHireDateModalOpen(true);
              }}
              sx={{
                fontFamily,
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 16px",
              }}
            >
              HR/Payroll Report
            </MenuItem>
          </Menu>
        </ButtonContainer>
      </TabContainer>

      <Box sx={{ mt: 2 }}>
        {activeTab === 'employees' ? (
          <EmployeesTableView {...props} key={refreshKey} featureToggles={featureToggles} />
        ) : activeTab === 'evaluations' ? (
          <EvaluationsTable
            locationId={locationId}
            className={props.className}
            onPlannedStatusChange={setHasPlannedEvaluations}
            readOnly={!canEditFullRoster}
          />
        ) : (
          <PIPTable
            locationId={locationId}
            className={props.className}
          />
        )}
      </Box>

      <AddEmployeeModal
        open={addEmployeeModalOpen}
        onClose={() => setAddEmployeeModalOpen(false)}
        locationId={locationId}
        onEmployeeCreated={() => {
          setAddEmployeeModalOpen(false);
          // Trigger refresh by changing key
          setRefreshKey(prev => prev + 1);
        }}
      />

      <SyncEmployeesModal
        open={syncEmployeesModalOpen}
        onClose={() => setSyncEmployeesModalOpen(false)}
        locationId={locationId}
        orgId={selectedLocationOrgId || undefined}
        onSyncComplete={() => {
          setRefreshKey(prev => prev + 1);
        }}
      />

      <SyncHireDateModal
        open={syncHireDateModalOpen}
        onClose={() => setSyncHireDateModalOpen(false)}
        locationId={locationId}
        orgId={selectedLocationOrgId || undefined}
        onSyncComplete={() => {
          setRefreshKey(prev => prev + 1);
        }}
      />

    </Box>
  );
}

export interface RosterTableProps {
  locationId: string;
  className?: string;
  
  // auth context props
  currentUserRoleProp?: string;
  currentUserEmployeeIdProp?: string;

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

const StyledContainer = styled(Box)(() => ({
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  backgroundColor: "#ffffff",
  overflow: "hidden",
  boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
  fontFamily,
  width: "100%",
  height: 650,
  display: "flex",
  flexDirection: "column",
}));

const StyledTabs = styled(Tabs)(() => ({
  marginBottom: 16,
  '& .MuiTabs-indicator': {
    backgroundColor: '#31664a',
    height: 3,
  },
}));

const TabContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
}));

const ButtonContainer = styled(Box)(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
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
  justifyContent: "center",
  gap: 6,
  padding: "0 16px",
  minHeight: 28,
  height: 28,
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  backgroundColor: "#f3f4f6",
  color: "#111827",
  "&:hover": {
    opacity: 0.9,
    transform: "translateY(-1px)",
  },
  "& svg": {
    fontSize: 16,
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
  justifyContent: "center",
  gap: 6,
  padding: "0 16px",
  minHeight: 28,
  height: 28,
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: `"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  backgroundColor: "#f3f4f6",
  color: "#374151",
  border: "1px solid transparent",
  "&:hover": {
    opacity: 0.9,
    transform: "translateY(-1px)",
  },
  "& svg": {
    fontSize: 16,
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
  locationId,
  className = "",
  currentUserRoleProp,
  currentUserEmployeeIdProp,
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
  featureToggles,
}: RosterTableProps & { featureToggles?: OrgFeatureToggles }) {
  const { selectedLocationOrgId, userHierarchyLevel } = useLocationContext();
  
  // Determine if user can edit more than just FOH/BOH
  // Level 0, 1, and Levelset Admin can edit everything
  // Level 2+ can only edit FOH/BOH
  const canEditFullRoster = React.useMemo(() => {
    if (currentUserRoleProp === 'Levelset Admin') return true;
    if (userHierarchyLevel === null) return false;
    return userHierarchyLevel <= 1;
  }, [currentUserRoleProp, userHierarchyLevel]);
  const [data, setData] = React.useState<RosterEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Dynamic roles from org_roles table
  const [orgRoles, setOrgRoles] = React.useState<OrgRole[]>([]);
  
  // Role dropdown state
  const [roleMenuAnchor, setRoleMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  
  // Availability dropdown state
  const [availabilityMenuAnchor, setAvailabilityMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});
  
  // Certification status dropdown state
  const [certificationMenuAnchor, setCertificationMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  // Actions menu state
  const [actionsMenuAnchor, setActionsMenuAnchor] = React.useState<{ [key: string]: HTMLElement | null }>({});

  // Employee modal state
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);

  // Terminate confirmation modal state
  const [terminateConfirmOpen, setTerminateConfirmOpen] = React.useState(false);
  const [employeeToTerminate, setEmployeeToTerminate] = React.useState<{ id: string; name: string } | null>(null);
  const [terminationReason, setTerminationReason] = React.useState<string>('');

  // Get current user's role and employee_id from props (passed from parent component)
  const currentUserRole = currentUserRoleProp || '';
  const currentUserEmployeeId = currentUserEmployeeIdProp || '';

  // Fetch org roles when org changes
  React.useEffect(() => {
    async function fetchOrgRoles() {
      if (!selectedLocationOrgId) return;
      
      const supabase = createSupabaseClient();
      const { data: rolesData, error: rolesError } = await supabase
        .from('org_roles')
        .select('*')
        .eq('org_id', selectedLocationOrgId)
        .order('hierarchy_level', { ascending: true });
      
      if (!rolesError && rolesData) {
        setOrgRoles(rolesData);
      }
    }
    
    fetchOrgRoles();
  }, [selectedLocationOrgId]);

  // Get all role names sorted by hierarchy level
  const allDynamicRoles = React.useMemo(() => {
    if (orgRoles.length === 0) {
      // Fallback to default roles if none loaded
      return ["Operator", "Executive", "Director", "Team Lead", "Trainer", "Team Member", "New Hire"];
    }
    return orgRoles.map(r => r.role_name);
  }, [orgRoles]);

  // Get color key for a role
  const getRoleColorKey = React.useCallback((roleName: string): string | undefined => {
    const role = orgRoles.find(r => r.role_name === roleName);
    return role?.color;
  }, [orgRoles]);

  // Find user's hierarchy level based on their role
  const getUserHierarchyLevel = React.useCallback((userRole: string): number => {
    // Levelset Admin has highest permissions (treat as -1 to always be above Operator)
    if (userRole === 'Levelset Admin') return -1;
    // Owner/Operator maps to Operator
    if (userRole === 'Owner/Operator') return 0;
    
    const role = orgRoles.find(r => r.role_name === userRole);
    return role?.hierarchy_level ?? 999;
  }, [orgRoles]);

  // Helper function to get available roles based on user permissions
  const getAvailableRoles = React.useCallback((employeeId: string, currentEmployeeRole: Role): Role[] => {
    const isEditingSelf = employeeId === currentUserEmployeeId;
    
    // Get current user's hierarchy level
    const userLevel = getUserHierarchyLevel(currentUserRole);
    
    // Cannot change own role
    if (isEditingSelf) return [];
    
    // Levelset Admin: Can change any employee's role to any role option
    if (currentUserRole === 'Levelset Admin') {
      return allDynamicRoles;
    }

    // Operator (level 0): Can change anyone else's role to any role
    if (userLevel === 0) {
      return allDynamicRoles;
    }

    // Level 1 (e.g., Executive): Can change to any role except Operator
    if (userLevel === 1) {
      return allDynamicRoles.filter(roleName => {
        const role = orgRoles.find(r => r.role_name === roleName);
        return role ? role.hierarchy_level > 0 : true;
      });
    }

    // Level 2 (e.g., Director): Can change to roles below them
    if (userLevel === 2) {
      return allDynamicRoles.filter(roleName => {
        const role = orgRoles.find(r => r.role_name === roleName);
        return role ? role.hierarchy_level > userLevel : false;
      });
    }

    // Default: No permissions to change roles
    return [];
  }, [currentUserRole, currentUserEmployeeId, allDynamicRoles, orgRoles, getUserHierarchyLevel]);

  // Helper function to check if a role can be changed
  const canChangeRole = React.useCallback((employeeId: string, currentEmployeeRole: Role): boolean => {
    const availableRoles = getAvailableRoles(employeeId, currentEmployeeRole);
    return availableRoles.length > 0;
  }, [getAvailableRoles]);

  // Fetch employees from Supabase - memoized to avoid recreating on every render
  const fetchEmployees = React.useCallback(async (bustCache = false) => {
    if (!locationId) {
      setData([]);
      setError('Select a location to view the roster.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Add cache-busting parameter when needed (after mutations)
      const url = bustCache 
        ? `/api/employees?location_id=${locationId}&_t=${Date.now()}`
        : `/api/employees?location_id=${locationId}`;
      const response = await fetch(url, {
        // Add cache headers for better performance
        headers: {
          'Cache-Control': bustCache ? 'no-cache' : 'max-age=60',
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
  }, [locationId]);

  // Fetch employees on mount and when location changes
  React.useEffect(() => {
    if (!locationId) {
      setData([]);
      setError('Select a location to view the roster.');
      setLoading(false);
      return;
    }

    fetchEmployees();
  }, [locationId, fetchEmployees]);

  // Real-time subscription disabled - Realtime not enabled on employees table
  // If you need real-time updates, enable Realtime on the employees table in Supabase
  // Then uncomment the code below
  /*
  React.useEffect(() => {
    if (!locationId) return;
    
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel('employees-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'employees',
          filter: `location_id=eq.${locationId}`
        }, 
        (payload) => {
          console.log('Employee data changed:', payload);
          // Refetch data when employees change
          fetch(`/api/employees?location_id=${locationId}`)
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
  }, [locationId]);
  */

  // Handle Certification status changes with API calls
  const handleCertificationStatusChange = async (id: string, newStatus: CertificationStatus) => {
    setCertificationMenuAnchor((prev) => ({ ...prev, [id]: null }));

    const previous = data.find((emp) => emp.id === id);

    setData((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, certifiedStatus: newStatus } : emp
      )
    );

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id,
          certified_status: newStatus,
        }),
      });

      if (!response.ok) throw new Error('Failed to update certification status');

      const result = await response.json();

      setData((prev) =>
        prev.map((emp) =>
          emp.id === id
            ? {
                ...emp,
                certifiedStatus: result.employee?.certified_status ?? newStatus,
                calculatedPay: result.employee?.calculated_pay ?? emp.calculatedPay,
              }
            : emp
        )
      );

      if (onCertifiedStatusChange) {
        onCertifiedStatusChange(id, result.employee?.certified_status ?? newStatus);
      }
    } catch (err) {
      console.error('Failed to update certification status:', err);
      if (previous) {
        setData((prev) =>
          prev.map((emp) =>
            emp.id === id ? { ...emp, certifiedStatus: previous.certifiedStatus, calculatedPay: previous.calculatedPay } : emp
          )
        );
      } else {
        fetchEmployees(true);
      }
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

  // Actions menu handlers
  const handleActionsMenuOpen = (event: React.MouseEvent<HTMLElement>, employeeId: string) => {
    setActionsMenuAnchor(prev => ({ ...prev, [employeeId]: event.currentTarget }));
  };

  const handleActionsMenuClose = (employeeId: string) => {
    setActionsMenuAnchor(prev => ({ ...prev, [employeeId]: null }));
  };

  const handleViewProfile = async (employeeId: string) => {
    handleActionsMenuClose(employeeId);
    
    try {
      // Fetch full employee data
      const response = await fetch(`/api/employees?location_id=${locationId}&id=${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch employee');
      
      const result = await response.json() as { employees: Employee[] };
      const employee = result.employees.find(emp => emp.id === employeeId);
      
      if (employee) {
        setSelectedEmployee(employee);
        setEmployeeModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      alert('Failed to load employee profile');
    }
  };

  const handleTerminateEmployee = (employeeId: string, employeeName: string) => {
    handleActionsMenuClose(employeeId);
    setEmployeeToTerminate({ id: employeeId, name: employeeName });
    setTerminateConfirmOpen(true);
  };

  const handleConfirmTerminate = async () => {
    if (!employeeToTerminate) return;
    
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'update',
          id: employeeToTerminate.id,
          active: false,
          termination_date: new Date().toISOString().split('T')[0],
          termination_reason: terminationReason || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to terminate employee');

      // Update local state
      setData(prev => prev.filter(emp => emp.id !== employeeToTerminate.id));
      
      setTerminateConfirmOpen(false);
      setEmployeeToTerminate(null);
      setTerminationReason('');
      
      // Refresh data with cache busting to get fresh data after mutation
      fetchEmployees(true);
    } catch (err) {
      console.error('Error terminating employee:', err);
      alert('Failed to terminate employee. Please try again.');
    }
  };

  const rows = React.useMemo(
    () =>
      data.map((e) => ({
        id: e.id,
        name: e.name,
        currentRole: e.currentRole,
        foh: e.foh,
        boh: e.boh,
        availability: e.availability,
        certifiedStatus: e.certifiedStatus,
        calculatedPay: e.calculatedPay,
      })),
    [data]
  );

  const columns = React.useMemo<GridColDef[]>(() => {
    const baseColumns: GridColDef[] = [
      {
        field: "name",
        headerName: "Employee",
        flex: 1.4,
        minWidth: 220,
        headerAlign: "left",
        align: "left",
        renderCell: (params) => (
          <Typography
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
              width: "100%",
              textAlign: "left",
            }}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: "currentRole",
        headerName: "Current Role",
        width: 180,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params) => {
          const employeeId = params.row.id as string;
          const role = params.value as Role;
          // Level 2+ users cannot change roles at all
          const canChange = canEditFullRoster && canChangeRole(employeeId, role);
          const availableRoles = getAvailableRoles(employeeId, role);
          const anchor = roleMenuAnchor[employeeId] ?? null;
          const roleColorKey = getRoleColorKey(role);
          return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              {!canChange ? (
                <RolePill role={role} colorKey={roleColorKey} />
              ) : (
                <>
                  <RolePill
                    role={role}
                    colorKey={roleColorKey}
                    endIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "#6b7280" }} />}
                    onClick={(event) => handleRoleMenuOpen(event, employeeId)}
                  />
                  <Menu
                    anchorEl={anchor}
                    open={Boolean(anchor)}
                    onClose={() => handleRoleMenuClose(employeeId)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                    PaperProps={{
                      sx: {
                        fontFamily,
                        borderRadius: 2,
                        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                        border: "1px solid #e5e7eb",
                      },
                    }}
                  >
                    {availableRoles.map((roleOption) => (
                      <RoleMenuItem
                        key={roleOption}
                        selected={role === roleOption}
                        onClick={() => handleRoleSelect(employeeId, roleOption)}
                      >
                        <RolePill role={roleOption} colorKey={getRoleColorKey(roleOption)} />
                      </RoleMenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>
          );
        },
      },
      {
        field: "foh",
        headerName: "FOH",
        width: 100,
        align: "center",
        headerAlign: "center",
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const employeeId = params.row.id as string;
          const checked = Boolean(params.value);
          return (
            <BrandCheckbox
              checked={checked}
              onChange={(_, state) => handleFohChange(employeeId, state)}
              inputProps={{ "aria-label": `FOH access for ${params.row.name}` }}
            />
          );
        },
      },
      {
        field: "boh",
        headerName: "BOH",
        width: 100,
        align: "center",
        headerAlign: "center",
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const employeeId = params.row.id as string;
          const checked = Boolean(params.value);
          return (
            <BrandCheckbox
              checked={checked}
              onChange={(_, state) => handleBohChange(employeeId, state)}
              inputProps={{ "aria-label": `BOH access for ${params.row.name}` }}
            />
          );
        },
      },
      {
        field: "availability",
        headerName: "Availability",
        width: 160,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params) => {
          const employeeId = params.row.id as string;
          const availability = params.value as AvailabilityType;
          const anchor = availabilityMenuAnchor[employeeId] ?? null;
          
          // Level 2+ users cannot change availability
          if (!canEditFullRoster) {
            return (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                <AvailabilityChip
                  className={availability.toLowerCase()}
                  sx={{ cursor: "default", '&:hover': { transform: 'none', opacity: 1 } }}
                >
                  {availability}
                </AvailabilityChip>
              </Box>
            );
          }
          
          return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
              <AvailabilityChip
                className={availability.toLowerCase()}
                onClick={(event) => handleAvailabilityMenuOpen(event, employeeId)}
              >
                {availability}
                <ExpandMoreIcon sx={{ fontSize: 14, ml: 0.5 }} />
              </AvailabilityChip>
              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => handleAvailabilityMenuClose(employeeId)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{
                  sx: {
                    fontFamily,
                    borderRadius: 2,
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e5e7eb",
                  },
                }}
              >
                {(["Available", "Limited"] as AvailabilityType[]).map((option) => (
                  <RoleMenuItem
                    key={option}
                    selected={availability === option}
                    onClick={() => handleAvailabilitySelect(employeeId, option)}
                  >
                    <AvailabilityChip
                      className={option.toLowerCase()}
                      sx={{ cursor: "default", transform: "none", '&:hover': { opacity: 1, transform: 'none' } }}
                    >
                      {option}
                    </AvailabilityChip>
                  </RoleMenuItem>
                ))}
              </Menu>
            </Box>
          );
        },
      },
      {
        field: "calculatedPay",
        headerName: "Suggested Pay",
        width: 170,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params) => {
          const pay = params.value as number | null;
          return (
            <Typography
              sx={{
                fontFamily,
                fontWeight: 600,
                color: pay ? "#166534" : "#9ca3af",
                fontSize: 14,
              }}
            >
              {pay ? `$${pay.toFixed(2)}/hr` : "—"}
            </Typography>
          );
        },
      },
    ];

    // Conditionally add certified status column based on feature toggles
    if (featureToggles?.enable_certified_status) {
      // Insert before calculatedPay column
      const calculatedPayIndex = baseColumns.findIndex(col => col.field === 'calculatedPay');
      if (calculatedPayIndex !== -1) {
        baseColumns.splice(calculatedPayIndex, 0, {
          field: "certifiedStatus",
          headerName: "Certified",
          width: 170,
          align: "center",
          headerAlign: "center",
          sortable: false,
          renderCell: (params) => {
            const employeeId = params.row.id as string;
            const status = params.value as CertificationStatus;
            const anchor = certificationMenuAnchor[employeeId] ?? null;
            
            // Level 2+ users cannot change certification status
            if (!canEditFullRoster) {
              return (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                  <CertificationChip
                    className={status.toLowerCase().replace(" ", "-")}
                    sx={{ cursor: "default", '&:hover': { transform: 'none', opacity: 1 } }}
                  >
                    {status}
                  </CertificationChip>
                </Box>
              );
            }
            
            return (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                <CertificationChip
                  className={status.toLowerCase().replace(" ", "-")}
                  onClick={(event) =>
                    setCertificationMenuAnchor((prev) => ({ ...prev, [employeeId]: event.currentTarget }))
                  }
                >
                  {status}
                  <ExpandMoreIcon sx={{ fontSize: 16, ml: 0.5 }} />
                </CertificationChip>
                <Menu
                  anchorEl={anchor}
                  open={Boolean(anchor)}
                  onClose={() => setCertificationMenuAnchor((prev) => ({ ...prev, [employeeId]: null }))}
                  PaperProps={{
                    sx: {
                      mt: 0.5,
                      boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                      borderRadius: 2,
                    },
                  }}
                >
                  {(["Not Certified", "Pending", "Certified", "PIP"] as CertificationStatus[]).map((option) => (
                    <RoleMenuItem
                      key={option}
                      selected={status === option}
                      onClick={() => handleCertificationStatusChange(employeeId, option)}
                    >
                      <CertificationChip className={option.toLowerCase().replace(" ", "-")}
                        sx={{ cursor: "default", transform: "none", '&:hover': { opacity: 1, transform: 'none' } }}
                      >
                        {option}
                      </CertificationChip>
                    </RoleMenuItem>
                  ))}
                </Menu>
              </Box>
            );
          },
        });
      }
    }

    if (showActions) {
      baseColumns.push({
        field: "actions",
        headerName: "",
        width: 72,
        align: "right",
        headerAlign: "right",
        sortable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const employeeId = params.row.id as string;
          const employeeName = params.row.name as string;
          const anchor = actionsMenuAnchor[employeeId] || null;
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: '100%' }}>
              <ActionsButton
                onClick={(e) => handleActionsMenuOpen(e, employeeId)}
                className="actions-button"
                aria-label={`Actions for ${employeeName}`}
              >
                <MoreVertIcon fontSize="small" />
              </ActionsButton>
              <Menu
                anchorEl={anchor}
                open={Boolean(anchor)}
                onClose={() => handleActionsMenuClose(employeeId)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                PaperProps={{
                  sx: {
                    fontFamily,
                    borderRadius: 2,
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e5e7eb",
                    minWidth: 180,
                  },
                }}
              >
                <RoleMenuItem
                  onClick={() => handleViewProfile(employeeId)}
                >
                  View profile
                </RoleMenuItem>
                <RoleMenuItem
                  onClick={() => handleTerminateEmployee(employeeId, employeeName)}
                  sx={{ color: '#dc2626' }}
                >
                  Terminate employee
                </RoleMenuItem>
              </Menu>
            </Box>
          );
        },
      });
    }

    return baseColumns;
  }, [
    availabilityMenuAnchor,
    certificationMenuAnchor,
    handleAvailabilityMenuClose,
    handleAvailabilityMenuOpen,
    handleAvailabilitySelect,
    handleBohChange,
    handleFohChange,
    handleRoleMenuClose,
    handleRoleMenuOpen,
    handleRoleSelect,
    handleCertificationStatusChange,
    roleMenuAnchor,
    showActions,
    onEdit,
    actionsMenuAnchor,
    handleActionsMenuOpen,
    handleActionsMenuClose,
    handleViewProfile,
    handleTerminateEmployee,
    canChangeRole,
    getAvailableRoles,
    getRoleColorKey,
    featureToggles,
    canEditFullRoster,
  ]);

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

  if (data.length === 0 && !loading) {
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
          <Typography variant="body2" sx={{ color: "#6b7280", fontFamily }}>
            No employees found.
          </Typography>
        </Stack>
      </StyledContainer>
    );
  }

  return (
    <>
      <StyledContainer
        className={`roster-table-container ${className}`}
        data-plasmic-name="roster-table-container"
      >
        <DataGridPro
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          loading={loading}
          hideFooter
          rowHeight={48}
          columnHeaderHeight={56}
          style={{ flex: 1, width: '100%' }}
          sx={{
            border: "none",
            fontFamily,
            [`& .${gridClasses.columnHeaders}`]: {
              borderBottom: "1px solid #e5e7eb",
            },
            [`& .${gridClasses.columnHeader}`]: {
              backgroundColor: "#f9fafb",
              fontWeight: 600,
              fontSize: 14,
              color: "#111827",
              '&:focus, &:focus-within': {
                outline: 'none',
              },
            },
            '& .MuiDataGrid-columnHeaderTitleContainer': {
              padding: '0 16px',
            },
            [`& .${gridClasses.columnSeparator}`]: {
              display: 'none',
            },
            [`& .${gridClasses.cell}`]: {
              borderBottom: '1px solid #f3f4f6',
              fontSize: 13,
              fontWeight: 500,
              color: '#111827',
              '&:focus, &:focus-within': {
                outline: 'none',
              },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 16px',
            },
            [`& .${gridClasses.row}:hover`]: {
              backgroundColor: '#f9fafb',
            },
            '& .MuiDataGrid-overlay': {
              fontFamily,
            },
          }}
        />
      </StyledContainer>

      {/* Employee Modal */}
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

      {/* Terminate Confirmation Modal */}
      <Dialog
        open={terminateConfirmOpen}
        onClose={() => {
          setTerminateConfirmOpen(false);
          setEmployeeToTerminate(null);
          setTerminationReason('');
        }}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            fontFamily,
            padding: '24px',
            maxWidth: '500px',
          },
        }}
      >
        <DialogTitle sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#111827', pb: 1 }}>
          Terminate Employee
        </DialogTitle>
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', mb: 2 }}>
            Are you sure you want to terminate {employeeToTerminate?.name}? This will mark them as inactive in your roster.
          </Typography>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel 
              id="termination-reason-label"
              sx={{ fontFamily, fontSize: 14 }}
            >
              Termination Reason (optional)
            </InputLabel>
            <Select
              labelId="termination-reason-label"
              value={terminationReason}
              label="Termination Reason (optional)"
              onChange={(e) => setTerminationReason(e.target.value)}
              sx={{
                fontFamily,
                fontSize: 14,
                borderRadius: '8px',
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="Voluntary - Resignation">Voluntary - Resignation</MenuItem>
              <MenuItem value="Voluntary - Job Abandonment">Voluntary - Job Abandonment</MenuItem>
              <MenuItem value="Involuntary - Performance">Involuntary - Performance</MenuItem>
              <MenuItem value="Involuntary - Attendance">Involuntary - Attendance</MenuItem>
              <MenuItem value="Involuntary - Policy Violation">Involuntary - Policy Violation</MenuItem>
              <MenuItem value="Involuntary - Other">Involuntary - Other</MenuItem>
              <MenuItem value="End of Seasonal Employment">End of Seasonal Employment</MenuItem>
              <MenuItem value="Transfer">Transfer</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              onClick={() => {
                setTerminateConfirmOpen(false);
                setEmployeeToTerminate(null);
                setTerminationReason('');
              }}
              sx={{
                fontFamily,
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'none',
                color: '#6b7280',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#f3f4f6',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirmTerminate}
              sx={{
                fontFamily,
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#b91c1c',
                },
              }}
            >
              Terminate
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
