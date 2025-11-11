import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";
import { Skeleton, Box } from "@mui/material";

export interface DisciplineAction {
  id: string;
  action: string;
  points_threshold: number;
  org_id: string;
  location_id: string;
}

export interface DisciplineActionsTableProps {
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
  actionCellClass?: string;
  pointsBadgeClass?: string;
  actionsCellClass?: string;

  // handlers
  onEdit?: (id: string) => void;
}

// Points threshold badge helper - same red gradient as DisciplineTable
const pointsBadge = (points: number, customClass?: string) => {
  let badgeClass = "role-badge points-badge";
  
  if (points <= 20) {
    badgeClass += " points-10"; // Light red/pink
  } else if (points <= 30) {
    badgeClass += " points-30"; // Medium red/pink
  } else if (points <= 50) {
    badgeClass += " points-50"; // Medium red
  } else if (points <= 75) {
    badgeClass += " points-75"; // Darker red
  } else {
    badgeClass += " points-100"; // Darkest red
  }
  
  return `${badgeClass} ${customClass || ""}`;
};

export function DisciplineActionsTable({
  locationId,
  className = "",
  density = "comfortable",
  showActions = true,

  tableClass = "rounded-2xl overflow-hidden",
  headerRowClass = "bg-gray-50",
  headerCellClass,
  rowClass = "border-gray-200",
  cellClass,
  actionCellClass,
  pointsBadgeClass,
  actionsCellClass,

  onEdit,
}: DisciplineActionsTableProps) {
  const [data, setData] = React.useState<DisciplineAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const supabase = createSupabaseClient();

  const padY = density === "compact" ? "py-2" : "py-3";
  
  // Fetch discipline actions from Supabase
  const fetchDisciplineActions = React.useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching discipline actions for location:', locationId);
      
      const { data: actionsData, error: actionsError } = await supabase
        .from('disc_actions_rubric')
        .select('*')
        .eq('location_id', locationId)
        .order('points_threshold', { ascending: true });
        
      if (actionsError) throw actionsError;
      
      console.log('Loaded discipline actions:', actionsData?.length || 0, 'entries');
      
      const transformedData: DisciplineAction[] = (actionsData || []).map((action: any) => ({
        id: action.id,
        action: action.action || 'Unknown Action',
        points_threshold: action.points_threshold || 0,
        org_id: action.org_id,
        location_id: action.location_id
      }));
      
      setData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching discipline actions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load discipline actions');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [locationId]);
  
  // Initial fetch
  React.useEffect(() => {
    if (locationId) {
      fetchDisciplineActions();
    } else {
      setData([]);
      setLoading(false);
    }
  }, [locationId, fetchDisciplineActions]);

  // Real-time subscription disabled - Realtime not enabled on disc_actions_rubric table
  // If you need real-time updates, enable Realtime on the disc_actions_rubric table in Supabase
  // Then uncomment the code below
  /*
  React.useEffect(() => {
    if (!locationId) return;
    
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel('discipline-actions-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'disc_actions_rubric',
          filter: `location_id=eq.${locationId}`
        }, 
        (payload) => {
          console.log('Discipline actions data changed:', payload);
          fetchDisciplineActions();
        }
      )
      .subscribe();

    return () => {
      const supabase = createSupabaseClient();
      supabase.removeChannel(channel);
    };
  }, [locationId, fetchDisciplineActions]);
  */

  if (loading && data.length === 0) {
    return (
      <div className={`roster-table-container loading ${className}`} data-plasmic-name="discipline-actions-container">
        <table className={`roster-table ${tableClass}`} data-plasmic-name="discipline-actions-table">
          <thead data-plasmic-name="table-header">
            <tr className={headerRowClass} data-plasmic-name="header-row">
              <th className={headerCellClass} style={{ textAlign: 'center', padding: '12px' }} data-plasmic-name="action-header">Action</th>
              <th className={headerCellClass} style={{ textAlign: 'center', padding: '12px' }} data-plasmic-name="points-header">Points</th>
              {showActions && <th className={headerCellClass} style={{ textAlign: 'center', padding: '12px' }} data-plasmic-name="actions-header"></th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={`skeleton-${index}`} className={rowClass}>
                <td className={`${actionCellClass || ""} ${cellClass || ""}`} style={{ padding: '12px' }}>
                  <Skeleton variant="text" width="80%" height={20} />
                </td>
                <td className={`centered ${cellClass || ""}`} style={{ padding: '12px' }}>
                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Skeleton variant="rounded" width={50} height={28} sx={{ borderRadius: 14 }} />
                  </Box>
                </td>
                {showActions && (
                  <td className={`centered ${cellClass || ""} ${actionsCellClass || ""}`} style={{ padding: '12px' }}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <Skeleton variant="rounded" width={80} height={32} sx={{ borderRadius: 8 }} />
                    </Box>
                  </td>
                )}
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
          <div className="text-gray-500">No disciplinary actions configured</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`roster-table-container ${className}`} data-plasmic-name="discipline-actions-container">
      <div style={{ overflowX: 'auto' }} data-plasmic-name="table-wrapper">
        <table className={`roster-table ${tableClass}`} data-plasmic-name="discipline-actions-table">
          <thead data-plasmic-name="table-header">
            <tr className={headerRowClass} data-plasmic-name="header-row">
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="action-header">Action</th>
              <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="points-header">Points</th>
              {showActions && <th className={headerCellClass} style={{ textAlign: 'center' }} data-plasmic-name="actions-header"></th>}
            </tr>
          </thead>

          <tbody>
            {data.map((action) => (
              <tr key={action.id} className={rowClass}>
                <td className={`${actionCellClass || ""} ${cellClass || ""}`} style={{ fontWeight: '600' }}>
                  {action.action}
                </td>
                <td className={`centered ${cellClass || ""}`}>
                  <span className={`${pointsBadge(action.points_threshold, pointsBadgeClass)}`}>
                    {action.points_threshold}
                  </span>
                </td>
                {showActions && (
                  <td className={`centered ${cellClass || ""} ${actionsCellClass || ""}`}>
                    <button
                      type="button"
                      onClick={() => onEdit?.(action.id)}
                      className="actions-button edit-button"
                      aria-label="Edit action"
                      title="Edit action"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
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
