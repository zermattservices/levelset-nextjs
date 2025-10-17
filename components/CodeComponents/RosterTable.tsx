import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee } from "@/lib/supabase.types";

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
    case "New Hire":   return `${base} new-hire`;
    case "Team Lead":  return `${base} team-lead`;
    case "Team Member":return `${base} team-member`;
    case "Director":   return `${base} director`;
    default:           return `${base} new-hire`;
  }
};

// pill checkbox
function Pill({ checked, onToggle, onLabel, offLabel, onClass, offClass }:{
  checked: boolean;
  onToggle?: (next: boolean)=>void;
  onLabel?: string;
  offLabel?: string;
  onClass?: string;
  offClass?: string;
}) {
  const baseClass = onClass || offClass ? "pill-checkbox" : "pill-checkbox";
  const checkedClass = checked ? "checked" : "unchecked";
  return (
    <button
      type="button"
      onClick={() => onToggle?.(!checked)}
      aria-pressed={checked}
      className={`${baseClass} ${checkedClass}`}
      style={onClass || offClass ? {
        backgroundColor: checked ? '#059669' : 'white',
        color: checked ? 'white' : '#6b7280',
        borderColor: checked ? '#059669' : '#d1d5db'
      } : undefined}
    >
      {checked ? (
        // checkmark
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        // empty
        <span style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
          {offLabel || "Unchecked"}
        </span>
      )}
    </button>
  );
}

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

  const padY = density === "compact" ? "py-2" : "py-3";
  
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
      <div className={`roster-table-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Loading roster...</div>
        </div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className={`roster-table-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`roster-table-container ${className}`} data-plasmic-name="roster-table-container">
      <div style={{ overflowX: 'auto' }} data-plasmic-name="table-wrapper">
        <table className={`roster-table ${tableClass}`} data-plasmic-name="roster-table">
          <thead data-plasmic-name="table-header">
            <tr data-plasmic-name="header-row">
              <th data-plasmic-name="name-header">Name</th>
              <th data-plasmic-name="role-header">Current Role</th>
              <th data-plasmic-name="foh-header">FOH</th>
              <th data-plasmic-name="boh-header">BOH</th>
              {showActions && <th style={{ textAlign: 'right' }} data-plasmic-name="actions-header"></th>}
            </tr>
          </thead>

          <tbody>
            {data.map((e, i) => (
              <tr key={e.id}>
                <td className="name-cell">{e.name}</td>
                <td>
                  <span className={`${roleChip(e.currentRole)} ${roleBadgeClass || ""}`}>{e.currentRole}</span>
                </td>
                <td>
                  <Pill
                    checked={e.foh}
                    onToggle={(next)=> handleFohChange(e.id, next)}
                    onClass={checkboxOnClass}
                    offClass={checkboxOffClass}
                    onLabel="FOH on" offLabel="FOH off"
                  />
                </td>
                <td>
                  <Pill
                    checked={e.boh}
                    onToggle={(next)=> handleBohChange(e.id, next)}
                    onClass={checkboxOnClass}
                    offClass={checkboxOffClass}
                    onLabel="BOH on" offLabel="BOH off"
                  />
                </td>
                {showActions && (
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => onEdit?.(e.id)}
                      className="actions-button"
                      aria-label={`Actions for ${e.name}`}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 4a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z"/>
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}