"use client";

import * as React from "react";
import { Box, Typography, Button, Skeleton } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { calculateRecommendations } from "@/lib/discipline-recommendations";
import type { RecommendedAction } from "@/lib/discipline-recommendations";
import type { Employee } from "@/lib/supabase.types";
import { createSupabaseClient } from "@/util/supabase/component";
import { RecordActionModal } from "./RecordActionModal";
import { EmployeeModal } from "./EmployeeModal";

export interface RecommendedActionsProps {
  orgId: string;
  locationId: string;
  currentUser: Employee | null;
  className?: string;
  maxWidth?: string | number;
  width?: string | number;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

// Points Badge Component - matching DisciplineTable styling
const PointsBadge = ({ points, disciplineActions }: { points: number; disciplineActions: any[] }) => {
  const getBadgeColor = () => {
    if (points === 0) {
      return { bg: '#f3f4f6', color: '#111827' };
    }
    
    const applicableAction = disciplineActions
      .filter(action => points >= action.points_threshold)
      .sort((a, b) => b.points_threshold - a.points_threshold)[0];
    
    if (applicableAction) {
      const actionName = applicableAction.action.toLowerCase();
      if (actionName.includes('documented warning')) {
        return { bg: '#fee2e2', color: '#991b1b' };
      } else if (actionName.includes('write up 1')) {
        return { bg: '#fecaca', color: '#991b1b' };
      } else if (actionName.includes('write up 2')) {
        return { bg: '#fca5a5', color: '#7f1d1d' };
      } else if (actionName.includes('write up 3')) {
        return { bg: '#f87171', color: '#7f1d1d' };
      } else if (actionName.includes('termination')) {
        return { bg: '#dc2626', color: '#ffffff' };
      }
    }
    
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
        flexShrink: 0,
      }}
    >
      {points}
    </Box>
  );
};

export function RecommendedActions({
  orgId,
  locationId,
  currentUser,
  className = "",
  maxWidth = "1200px",
  width = "100%",
}: RecommendedActionsProps) {
  const [recommendations, setRecommendations] = React.useState<RecommendedAction[]>([]);
  const [disciplineActions, setDisciplineActions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState(true);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<RecommendedAction | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const supabase = createSupabaseClient();

  // Fetch recommendations and discipline actions
  const fetchRecommendations = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch discipline actions rubric for points badge coloring
      const { data: actionsData, error: actionsError } = await supabase
        .from('disc_actions_rubric')
        .select('*')
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .order('points_threshold', { ascending: true });
        
      if (!actionsError && actionsData) {
        setDisciplineActions(actionsData);
      }
      
      const recs = await calculateRecommendations(orgId, locationId);
      
      // Filter out recommendations that have been dismissed or actioned
      const { data: dismissedRecs, error: dismissedError } = await supabase
        .from('recommended_disc_actions')
        .select('employee_id, recommended_action_id')
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .not('action_taken', 'is', null);

      if (dismissedError) {
        console.warn('Error fetching dismissed recommendations:', dismissedError);
      }

      // Create a set of dismissed recommendation keys for quick lookup
      const dismissedSet = new Set(
        (dismissedRecs || []).map(r => `${r.employee_id}:${r.recommended_action_id}`)
      );

      // Filter out dismissed/actioned recommendations
      const activeRecs = recs.filter(rec => 
        !dismissedSet.has(`${rec.employee_id}:${rec.action_id}`)
      );

      setRecommendations(activeRecs);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, locationId, supabase]);

  React.useEffect(() => {
    if (orgId && locationId) {
      fetchRecommendations();
    }
  }, [orgId, locationId, fetchRecommendations]);

  const handleDismiss = async (recommendation: RecommendedAction) => {
    try {
      // Create or update recommendation record as dismissed
      const { error } = await supabase
        .from('recommended_disc_actions')
        .upsert({
          employee_id: recommendation.employee_id,
          org_id: orgId,
          location_id: locationId,
          recommended_action_id: recommendation.action_id,
          recommended_action: recommendation.recommended_action,
          points_when_recommended: recommendation.current_points,
          action_taken: 'dismissed',
          action_taken_at: new Date().toISOString(),
          action_taken_by: currentUser?.id || null,
        }, {
          onConflict: 'employee_id,recommended_action_id,org_id,location_id,created_at',
        });

      if (error) throw error;

      // Remove from local state
      setRecommendations(prev => prev.filter(r => r.employee_id !== recommendation.employee_id));
    } catch (err) {
      console.error('Error dismissing recommendation:', err);
      alert('Failed to dismiss recommendation. Please try again.');
    }
  };

  const handleRecordAction = async (recommendation: RecommendedAction) => {
    // Create recommendation record if it doesn't exist
    try {
      await supabase
        .from('recommended_disc_actions')
        .upsert({
          employee_id: recommendation.employee_id,
          org_id: orgId,
          location_id: locationId,
          recommended_action_id: recommendation.action_id,
          recommended_action: recommendation.recommended_action,
          points_when_recommended: recommendation.current_points,
        }, {
          onConflict: 'employee_id,recommended_action_id,org_id,location_id,created_at',
          ignoreDuplicates: true,
        });
    } catch (err) {
      console.warn('Error creating recommendation record:', err);
    }

    setSelectedRecommendation(recommendation);
    setRecordModalOpen(true);
  };

  // Get comma-separated names for collapsed view
  const employeeNames = React.useMemo(() => {
    return recommendations.map(r => r.employee_name).join(', ');
  }, [recommendations]);

  if (loading) {
    return (
      <Box 
        className={className} 
        sx={{ 
          mb: 3, 
          width,
          maxWidth,
          mx: 'auto',
        }}
      >
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Box 
      className={className} 
      sx={{ 
        mb: 3,
        width,
        maxWidth,
        mx: 'auto',
      }}
    >
      {/* Header */}
      <Typography
        sx={{
          fontFamily,
          fontSize: 18,
          fontWeight: 600,
          color: '#111827',
          mb: 2,
        }}
      >
        Recommended Disciplinary Actions ({recommendations.length})
      </Typography>

      {/* Collapsible Grey Container */}
      <Box
        sx={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Collapsed View - Shows comma-separated names */}
        {!expanded && (
          <Box sx={{ padding: "16px" }}>
            <Typography
              sx={{
                fontFamily,
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              {employeeNames}
            </Typography>
          </Box>
        )}

        {/* Expanded View - Shows all cards */}
        {expanded && (
          <Box sx={{ padding: "16px", display: "flex", flexDirection: "column", gap: 2 }}>
            {recommendations.map((rec) => (
              <Box
                key={rec.employee_id}
                sx={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e9eaeb",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {/* Employee Name and Role */}
                <Box sx={{ minWidth: 180 }}>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#111827',
                      lineHeight: 1.2,
                    }}
                  >
                    {rec.employee_name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 12,
                      color: '#6b7280',
                      lineHeight: 1.2,
                    }}
                  >
                    {rec.employee_role}
                  </Typography>
                </Box>

                {/* Points Badge */}
                <PointsBadge points={rec.current_points} disciplineActions={disciplineActions} />

                {/* Recommended Action Card */}
                <Box
                  sx={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e9eaeb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {rec.recommended_action}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: 11,
                      color: '#6b7280',
                    }}
                  >
                    Threshold: {rec.points_threshold} pts (exceeded by {rec.threshold_exceeded_by})
                  </Typography>
                </Box>

                {/* Dismiss Button */}
                <Button
                  onClick={() => handleDismiss(rec)}
                  variant="outlined"
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    textTransform: "none",
                    color: "#6b7280",
                    borderColor: "#d1d5db",
                    padding: "6px 16px",
                    minWidth: 100,
                    flexShrink: 0,
                    "&:hover": {
                      backgroundColor: "#f3f4f6",
                      borderColor: "#9ca3af",
                    },
                  }}
                >
                  Dismiss
                </Button>

                {/* Record Action Button */}
                <Button
                  onClick={() => handleRecordAction(rec)}
                  variant="contained"
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    textTransform: "none",
                    backgroundColor: levelsetGreen,
                    padding: "6px 16px",
                    minWidth: 120,
                    flexShrink: 0,
                    "&:hover": {
                      backgroundColor: "#264d38",
                    },
                  }}
                >
                  Record Action
                </Button>
              </Box>
            ))}
          </Box>
        )}

        {/* Toggle Button at Bottom */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            borderTop: "1px solid #e5e7eb",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            cursor: "pointer",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
          }}
        >
          <Typography
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 500,
              color: levelsetGreen,
            }}
          >
            {expanded ? "Show Less" : "Show All"}
          </Typography>
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 18, color: levelsetGreen }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 18, color: levelsetGreen }} />
          )}
        </Box>
      </Box>

      {/* Record Action Modal */}
      {selectedRecommendation && (
        <RecordActionModal
          open={recordModalOpen}
          employee={selectedRecommendation.employee || null}
          recommendedAction={selectedRecommendation.recommended_action}
          recommendedActionId={selectedRecommendation.action_id}
          currentUser={currentUser}
          onClose={() => {
            setRecordModalOpen(false);
            setSelectedRecommendation(null);
          }}
          onSuccess={(employeeId) => {
            // Refresh recommendations
            fetchRecommendations();
            // Open employee modal with the employee who had action recorded
            const emp = recommendations.find(r => r.employee_id === employeeId)?.employee;
            if (emp) {
              setSelectedEmployee(emp);
              setEmployeeModalOpen(true);
            }
          }}
          orgId={orgId}
          locationId={locationId}
        />
      )}

      {/* Employee Modal */}
      <EmployeeModal
        open={employeeModalOpen}
        employee={selectedEmployee}
        onClose={() => {
          setEmployeeModalOpen(false);
          setSelectedEmployee(null);
        }}
        orgId={orgId}
        locationId={locationId}
        initialTab="discipline"
      />
    </Box>
  );
}
