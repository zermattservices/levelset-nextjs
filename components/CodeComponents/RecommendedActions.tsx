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
  const [expanded, setExpanded] = React.useState(false); // Start collapsed
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<RecommendedAction | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const supabase = createSupabaseClient();

  // Fetch recommendations from database (source of truth)
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
      
      // Fetch pending recommendations from database
      const { data: dbRecs, error: recsError } = await supabase
        .from('recommended_disc_actions')
        .select('*')
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .is('action_taken', null)
        .order('points_when_recommended', { ascending: false });

      if (recsError) {
        console.error('Error fetching recommendations:', recsError);
        setRecommendations([]);
        return;
      }

      // Fetch employee data to enrich recommendations
      if (dbRecs && dbRecs.length > 0) {
        const employeeIds = dbRecs.map(r => r.employee_id);
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('*')
          .in('id', employeeIds);

        if (empError) {
          console.warn('Error fetching employee data:', empError);
        }

        // Transform database records to RecommendedAction format
        const enrichedRecs: RecommendedAction[] = dbRecs.map(rec => {
          const employee = employees?.find(e => e.id === rec.employee_id);
          const threshold = actionsData?.find(a => a.id === rec.recommended_action_id);
          
          return {
            employee_id: rec.employee_id,
            employee_name: employee?.full_name || 'Unknown',
            employee_role: employee?.role || 'Team Member',
            current_points: rec.points_when_recommended,
            recommended_action: rec.recommended_action,
            action_id: rec.recommended_action_id,
            points_threshold: threshold?.points_threshold || 0,
            threshold_exceeded_by: rec.points_when_recommended - (threshold?.points_threshold || 0),
            has_existing_action: false, // Already filtered out in DB
            employee: employee as Employee,
          };
        });

        setRecommendations(enrichedRecs);
      } else {
        setRecommendations([]);
      }
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
      setExpanded(false); // Reset to collapsed on page load
    }
  }, [orgId, locationId, fetchRecommendations]);

  const handleDismiss = async (recommendation: RecommendedAction) => {
    try {
      // First, try to find existing recommendation
      const { data: existing } = await supabase
        .from('recommended_disc_actions')
        .select('id')
        .eq('employee_id', recommendation.employee_id)
        .eq('recommended_action_id', recommendation.action_id)
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .is('action_taken', null)
        .single();

      if (existing) {
        // Update existing recommendation
        const { error: updateError } = await supabase
          .from('recommended_disc_actions')
          .update({
            action_taken: 'dismissed',
            action_taken_at: new Date().toISOString(),
            action_taken_by: currentUser?.id || null,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new recommendation as dismissed
        const { error: insertError } = await supabase
          .from('recommended_disc_actions')
          .insert({
            employee_id: recommendation.employee_id,
            org_id: orgId,
            location_id: locationId,
            recommended_action_id: recommendation.action_id,
            recommended_action: recommendation.recommended_action,
            points_when_recommended: recommendation.current_points,
            action_taken: 'dismissed',
            action_taken_at: new Date().toISOString(),
            action_taken_by: currentUser?.id || null,
          });

        if (insertError) throw insertError;
      }

      // Remove from local state
      setRecommendations(prev => prev.filter(r => r.employee_id !== recommendation.employee_id));
    } catch (err: any) {
      console.error('Error dismissing recommendation:', err);
      alert(`Failed to dismiss recommendation: ${err?.message || 'Please try again.'}`);
    }
  };

  const handleRecordAction = async (recommendation: RecommendedAction) => {
    // Create recommendation record if it doesn't exist
    try {
      // Check if recommendation already exists
      const { data: existing } = await supabase
        .from('recommended_disc_actions')
        .select('id')
        .eq('employee_id', recommendation.employee_id)
        .eq('recommended_action_id', recommendation.action_id)
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .is('action_taken', null)
        .maybeSingle();

      if (!existing) {
        // Insert new recommendation
        const { error: insertError } = await supabase
          .from('recommended_disc_actions')
          .insert({
            employee_id: recommendation.employee_id,
            org_id: orgId,
            location_id: locationId,
            recommended_action_id: recommendation.action_id,
            recommended_action: recommendation.recommended_action,
            points_when_recommended: recommendation.current_points,
          });

        if (insertError) {
          console.warn('Error creating recommendation record:', insertError);
        }
      }
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
        <Box 
          sx={{ 
            padding: "16px",
            maxHeight: expanded ? '1000px' : '60px',
            opacity: expanded ? 0 : 1,
            transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out',
            overflow: 'hidden',
            display: expanded ? 'none' : 'block',
          }}
        >
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

        {/* Expanded View - Shows all cards */}
        <Box 
          sx={{ 
            padding: expanded ? "16px" : "0",
            maxHeight: expanded ? '2000px' : '0',
            opacity: expanded ? 1 : 0,
            transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, padding 0.3s ease-in-out',
            overflow: 'hidden',
            display: "flex", 
            flexDirection: "column", 
            gap: 2,
          }}
        >
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
          currentUserId={currentUser?.id}
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
