import * as React from "react";
import type { Employee } from "@/lib/supabase.types";
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
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";

export type Role =
  | "New Hire"
  | "Team Member"
  | "Team Lead"
  | "Director";

export interface RosterEntry {
  id: string;
  name: string;
  currentRole: Role;
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
  onFohChange?: (id: string, checked: boolean) => void;
  onBohChange?: (id: string, checked: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEmployeeCreate?: (employee: Partial<Employee>) => void;
  onEmployeeUpdate?: (id: string, employee: Partial<Employee>) => void;
  onEmployeeDelete?: (id: string) => void;
}

// sample data (design preview)
const sampleData: RosterEntry[] = [
  { id: "1", name: "Alexandra Nolasco", currentRole: "New Hire", foh: true,  boh: false },
  { id: "2", name: "Amanda Luna",       currentRole: "Team Lead", foh: true,  boh: false },
  { id: "3", name: "Angeles Carbajal",  currentRole: "Team Lead", foh: false, boh: true  },
  { id: "4", name: "Ashley Ramirez",    currentRole: "Team Lead", foh: true,  boh: false },
  { id: "5", name: "Caidyn Spann",      currentRole: "Team Member", foh: true, boh: false },
  { id: "6", name: "Casey Howard",      currentRole: "Director",  foh: true,  boh: true  },
  { id: "7", name: "Celia Barrera",     currentRole: "New Hire",  foh: true,  boh: false },
  { id: "8", name: "Daniel Millan",     currentRole: "Team Member", foh: true, boh: false },
];

// role → chip colors (can still be overridden via roleBadgeClass)
const roleChip = (role: Role) => {
  const base = "role-badge";
  switch (role) {
    case "New Hire":
      return `${base} new-hire`;
    case "Team Lead":
      return `${base} team-lead`;
    case "Team Member":
      return `${base} team-member`;
    case "Director":
      return `${base} director`;
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

  onFohChange,
  onBohChange,
  onEdit,
  onDelete,
  onEmployeeCreate,
  onEmployeeUpdate,
  onEmployeeDelete,
}: RosterTableProps) {
  const [data, setData] = React.useState<RosterEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  // Handle FOH/BOH changes with API calls
  const handleFohChange = async (id: string, checked: boolean) => {
    if (onFohChange) {
      onFohChange(id, checked);
    }
    
    // Update via API
    try {
      const formData = new FormData();
      formData.append('intent', 'update');
      formData.append('id', id);
      formData.append('is_foh', checked.toString());
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        body: formData
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
      const formData = new FormData();
      formData.append('intent', 'update');
      formData.append('id', id);
      formData.append('is_boh', checked.toString());
      
      const response = await fetch('/api/employees', {
        method: 'POST',
        body: formData
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
                <span
                  className={`${roleChip(e.currentRole)} ${
                    roleBadgeClass || ""
                  }`}
                >
                  {e.currentRole}
                </span>
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
