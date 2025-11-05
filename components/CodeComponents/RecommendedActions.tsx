"use client";

import * as React from "react";
import { Box, Typography, Button, Chip, Skeleton } from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { calculateRecommendations } from "@/lib/discipline-recommendations";
import type { RecommendedAction } from "@/lib/discipline-recommendations";
import type { Employee } from "@/lib/supabase.types";
import { createSupabaseClient } from "@/util/supabase/component";
import { RecordActionModal } from "./RecordActionModal";

export interface RecommendedActionsProps {
  orgId: string;
  locationId: string;
  currentUser: Employee | null;
  onEmployeeClick?: (employeeId: string) => void;
  className?: string;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

export function RecommendedActions({
  orgId,
  locationId,
  currentUser,
  onEmployeeClick,
  className = "",
}: RecommendedActionsProps) {
  const [recommendations, setRecommendations] = React.useState<RecommendedAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<RecommendedAction | null>(null);
  const supabase = createSupabaseClient();

  // Fetch recommendations
  const fetchRecommendations = React.useCallback(async () => {
    try {
      setLoading(true);
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

  if (loading) {
    return (
      <Box className={className} sx={{ mb: 3 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show anything if no recommendations
  }

  return (
    <Box className={className} sx={{ mb: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <WarningIcon sx={{ color: '#f59e0b', fontSize: 24 }} />
        <Typography
          sx={{
            fontFamily,
            fontSize: 18,
            fontWeight: 600,
            color: '#111827',
          }}
        >
          Recommended Disciplinary Actions ({recommendations.length})
        </Typography>
      </Box>

      {/* Recommendations Grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: 2,
        }}
      >
        {recommendations.map((rec) => (
          <Box
            key={rec.employee_id}
            sx={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fbbf24",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {/* Employee Name and Points */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Box>
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  {rec.employee_name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    color: '#6b7280',
                  }}
                >
                  {rec.employee_role}
                </Typography>
              </Box>
              <Chip
                label={`${rec.current_points} pts`}
                sx={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontFamily,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            </Box>

            {/* Recommended Action */}
            <Box
              sx={{
                backgroundColor: "#ffffff",
                border: "1px solid #e9eaeb",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 12,
                  color: '#6b7280',
                  mb: 0.5,
                }}
              >
                Recommended Action:
              </Typography>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                {rec.recommended_action}
              </Typography>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 12,
                  color: '#6b7280',
                  mt: 0.5,
                }}
              >
                Threshold: {rec.points_threshold} points (exceeded by {rec.threshold_exceeded_by})
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Button
                onClick={() => handleDismiss(rec)}
                variant="outlined"
                fullWidth
                sx={{
                  fontFamily,
                  fontSize: 13,
                  textTransform: "none",
                  color: "#6b7280",
                  borderColor: "#d1d5db",
                  "&:hover": {
                    backgroundColor: "#f3f4f6",
                    borderColor: "#9ca3af",
                  },
                }}
              >
                Dismiss
              </Button>
              <Button
                onClick={() => handleRecordAction(rec)}
                variant="contained"
                fullWidth
                sx={{
                  fontFamily,
                  fontSize: 13,
                  textTransform: "none",
                  backgroundColor: levelsetGreen,
                  "&:hover": {
                    backgroundColor: "#264d38",
                  },
                }}
              >
                Record Action
              </Button>
            </Box>
          </Box>
        ))}
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
            // Open employee modal
            if (onEmployeeClick) {
              onEmployeeClick(employeeId);
            }
          }}
          orgId={orgId}
          locationId={locationId}
        />
      )}
    </Box>
  );
}

