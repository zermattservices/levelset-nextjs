import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";

export interface DisciplineEntry {
  id: string;
  full_name: string;
  role: string;
  last_infraction: string | null;
  current_points: number;
}

export interface DisciplineTableProps {
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
  pointsBadgeClass?: string;
  actionsCellClass?: string;

  // handlers
  onViewDetails?: (id: string) => void;
  onAddInfraction?: (id: string) => void;
  onRowClick?: (employee: DisciplineEntry) => void;
}

// Role badge helper
const roleChip = (role: string) => {
  const base = "role-badge";
  const normalized = role.toLowerCase();
  
  if (normalized.includes("new hire")) return `${base} new-hire`;
  if (normalized.includes("team lead") || normalized.includes("lead")) return `${base} team-lead`;
  if (normalized.includes("operator")) return `${base} operator`;
  if (normalized.includes("trainer")) return `${base} trainer`;
  if (normalized.includes("director")) return `${base} director`;
  return `${base} team-member`;
};

// Points badge helper - color based on discipline actions
const pointsBadge = (points: number, disciplineActions: any[], customClass?: string) => {
  let badgeClass = "role-badge points-badge";
  
  if (points === 0) {
    badgeClass += " points-0"; // Keep 0 points styling as is
  } else {
    // Find the highest threshold that the points exceed
    const applicableAction = disciplineActions
      .filter(action => points >= action.points_threshold)
      .sort((a, b) => b.points_threshold - a.points_threshold)[0];
    
    if (applicableAction) {
      // Map action names to CSS classes
      const actionName = applicableAction.action.toLowerCase();
      if (actionName.includes('documented warning')) {
        badgeClass += " points-10"; // Light red/pink
      } else if (actionName.includes('write up 1')) {
        badgeClass += " points-30"; // Medium red/pink
      } else if (actionName.includes('write up 2')) {
        badgeClass += " points-50"; // Medium red
      } else if (actionName.includes('write up 3')) {
        badgeClass += " points-75"; // Darker red
      } else if (actionName.includes('termination')) {
        badgeClass += " points-100"; // Darkest red
      } else {
        // Default fallback based on points
        if (points <= 10) badgeClass += " points-10";
        else if (points <= 30) badgeClass += " points-30";
        else if (points <= 50) badgeClass += " points-50";
        else if (points <= 75) badgeClass += " points-75";
        else badgeClass += " points-100";
      }
    } else {
      // Fallback if no actions match
      if (points <= 10) badgeClass += " points-10";
      else if (points <= 30) badgeClass += " points-30";
      else if (points <= 50) badgeClass += " points-50";
      else if (points <= 75) badgeClass += " points-75";
      else badgeClass += " points-100";
    }
  }
  
  return `${badgeClass} ${customClass || ""}`;
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
}: DisciplineTableProps) {
  const [data, setData] = React.useState<DisciplineEntry[]>([]);
  const [disciplineActions, setDisciplineActions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const supabase = createSupabaseClient();

  const padY = density === "compact" ? "py-2" : "py-3";
  
  // Fetch discipline data from Supabase
  const fetchDisciplineData = React.useCallback(async () => {
        try {
          setLoading(true);
          console.log('Fetching discipline data for org:', orgId, 'location:', locationId);
          
          // First try the view, then fallback to manual query
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
          
          try {
            // Try the v_employee_infraction_rollup view first
            let query = supabase
              .from('v_employee_infraction_rollup')
              .select('*');
            
            if (orgId) {
              query = query.eq('org_id', orgId);
            }
            if (locationId) {
              query = query.eq('location_id', locationId);
            }
            
            const { data: viewData, error: viewError } = await query.order('current_points', { ascending: false });
            
            if (!viewError && viewData) {
              console.log('Loaded discipline data from view:', viewData.length, 'entries');
              
              // Transform view data to DisciplineEntry format
              transformedData = viewData.map((entry: any) => ({
                id: entry.employee_id || entry.id,
                full_name: entry.full_name || 'Unknown',
                role: entry.role || 'Team Member',
                last_infraction: entry.last_infraction || null,
                current_points: entry.current_points || 0
              }));
            } else {
              throw new Error('View not available, trying manual query');
            }
          } catch (viewErr) {
            console.log('View not available, fetching from tables manually:', viewErr);
            
            // Fallback: fetch employees and their infractions manually
            const { data: employees, error: empError } = await supabase
              .from('employees')
              .select('id, full_name, role, org_id, location_id')
              .eq('org_id', orgId)
              .eq('location_id', locationId)
              .eq('active', true);
              
            if (empError) throw empError;
            
            if (employees && employees.length > 0) {
              // Get infractions for all employees
              const employeeIds = employees.map(emp => emp.id);
              
              const { data: infractions, error: infError } = await supabase
                .from('infractions')
                .select('employee_id, points, infraction_date')
                .in('employee_id', employeeIds)
                .eq('org_id', orgId)
                .eq('location_id', locationId)
                .order('infraction_date', { ascending: false });
                
              if (infError) throw infError;
              
              // Calculate current points and last infraction for each employee
              transformedData = employees.map(emp => {
                const empInfractions = infractions?.filter(inf => inf.employee_id === emp.id) || [];
                const current_points = empInfractions.reduce((sum, inf) => sum + (inf.points || 0), 0);
                const last_infraction = empInfractions.length > 0 ? empInfractions[0].infraction_date : null;
                
                return {
                  id: emp.id,
                  full_name: emp.full_name || 'Unknown',
                  role: emp.role || 'Team Member',
                  last_infraction,
                  current_points
                };
              }).sort((a, b) => a.full_name.localeCompare(b.full_name)); // Sort by name alphabetically
              
              console.log('Loaded discipline data from tables:', transformedData.length, 'entries');
            }
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
    }, [orgId, locationId]);
    
  // Initial fetch
  React.useEffect(() => {
    if (orgId && locationId) {
      fetchDisciplineData();
    } else {
      setData([]);
      setLoading(false);
    }
  }, [orgId, locationId, fetchDisciplineData]);

  // Set up real-time subscription for infraction changes
  React.useEffect(() => {
    if (!orgId || !locationId) return;
    
    const channel = supabase
      .channel('infractions-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'infractions',
          filter: `org_id=eq.${orgId}`
        }, 
        (payload) => {
          console.log('Infraction data changed:', payload);
          // Refetch data when infractions change
          // Use the same fallback logic as the initial fetch
          fetchDisciplineData();
        }
      )
      .subscribe();

    return () => {
      const supabase = createSupabaseClient();
      supabase.removeChannel(channel);
    };
  }, [orgId, locationId]);

  if (loading && data.length === 0) {
    return (
      <div className={`roster-table-container scrollable loading ${className}`} data-plasmic-name="discipline-table-container">
        <table className={`roster-table ${tableClass}`} data-plasmic-name="discipline-table">
          <thead data-plasmic-name="table-header">
            <tr className={headerRowClass} data-plasmic-name="header-row">
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="name-header">Name</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="role-header">Role</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="last-infraction-header">Last Infraction</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="points-header">Current Points</th>
              {showActions && <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="actions-header"></th>}
            </tr>
          </thead>
          <tbody>
            {/* Empty rows to show table structure while loading */}
            {Array.from({ length: 10 }).map((_, index) => (
              <tr key={index} className={rowClass}>
                <td className={`name-cell ${nameCellClass || ""} ${cellClass || ""}`}></td>
                <td className={`centered ${cellClass || ""}`}></td>
                <td className={`centered ${cellClass || ""}`}></td>
                <td className={`centered ${cellClass || ""}`}></td>
                {showActions && <td className={`centered ${cellClass || ""} ${actionsCellClass || ""}`}></td>}
              </tr>
            ))}
          </tbody>
        </table>
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

  if (data.length === 0 && !loading) {
    return (
      <div className={`roster-table-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">No discipline data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`roster-table-container scrollable ${className}`} data-plasmic-name="discipline-table-container">
      <table className={`roster-table ${tableClass}`} data-plasmic-name="discipline-table">
          <thead data-plasmic-name="table-header">
            <tr className={headerRowClass} data-plasmic-name="header-row">
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="name-header">Name</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="role-header">Role</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="last-infraction-header">Last Infraction</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="points-header">Current Points</th>
              {showActions && <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="actions-header"></th>}
            </tr>
          </thead>

          <tbody>
            {data.map((e) => (
              <tr 
                key={e.id} 
                className={`${rowClass} ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => onRowClick?.(e)}
              >
                <td className={`name-cell ${nameCellClass || ""} ${cellClass || ""}`} style={{ fontWeight: '600' }}>
                  {e.full_name}
                </td>
                <td className={`centered ${cellClass || ""}`}>
                  <span className={`${roleChip(e.role)} ${roleBadgeClass || ""}`}>
                    {e.role}
                  </span>
                </td>
                <td className={`centered ${cellClass || ""}`}>
                  {e.last_infraction 
                    ? new Date(e.last_infraction).toLocaleDateString()
                    : '-'
                  }
                </td>
                <td className={`centered ${cellClass || ""}`}>
                  <span className={`${pointsBadge(e.current_points, disciplineActions, pointsBadgeClass)}`}>
                    {e.current_points}
                  </span>
                </td>
                {showActions && (
                  <td className={`centered ${cellClass || ""} ${actionsCellClass || ""}`}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation(); // Prevent row click when clicking button
                        onViewDetails?.(e.id);
                      }}
                      className="actions-button arrow-button"
                      aria-label="View details"
                      title="View details"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}

