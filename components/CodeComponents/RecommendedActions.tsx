"use client";

import * as React from "react";
import { Box, Typography, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { createSupabaseClient } from "@/util/supabase/component";
import type { RecommendedAction } from "@/lib/supabase.types";
import { calculateRecommendedActions, createRecommendedActions } from "@/lib/discipline-recommendations";
import { RecordActionModal } from "./RecordActionModal";

export interface RecommendedActionsProps {
  orgId: string;
  locationId: string;
  className?: string;
  onActionRecorded?: () => void;
}

export function RecommendedActions({
  orgId,
  locationId,
  className = "",
  onActionRecorded,
}: RecommendedActionsProps) {
  const [recommendations, setRecommendations] = React.useState<RecommendedAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<RecommendedAction | null>(null);
  const supabase = createSupabaseClient();

  // Fetch pending recommendations from database
  const fetchRecommendations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate what should be recommended
      const calculated = await calculateRecommendedActions(supabase, orgId, locationId);

      // Create recommendations in database if they don't exist
      if (calculated.length > 0) {
        // Get current user's employee_id for created_by
        const { data: { user } } = await supabase.auth.getUser();
        let createdBy: string | undefined;
        
        if (user?.email) {
          const { data: employee } = await supabase
            .from('employees')
            .select('id')
            .eq('email', user.email)
            .eq('org_id', orgId)
            .eq('location_id', locationId)
            .single();
          
          if (employee) {
            createdBy = employee.id;
          }
        }

        await createRecommendedActions(supabase, calculated, orgId, locationId, createdBy);
      }

      // Fetch pending recommendations from database
      const { data: recommendedData, error: fetchError } = await supabase
        .from('recommended_actions')
        .select(`
          *,
          employee:employees!recommended_actions_employee_id_fkey(id, full_name),
          action:disc_actions_rubric!recommended_actions_action_id_fkey(id, action)
        `)
        .eq('org_id', orgId)
        .eq('location_id', locationId)
        .is('acknowledged_at', null)
        .is('action_taken_at', null)
        .order('employee_points', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform the data
      const transformed = (recommendedData || []).map((rec: any) => ({
        ...rec,
        employee_name: rec.employee?.full_name || 'Unknown',
        action_name: rec.action?.action || 'Unknown Action',
      })) as RecommendedAction[];

      setRecommendations(transformed);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
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

  // Handle ignore/dismiss
  const handleIgnore = async (recommendationId: string) => {
    try {
      // Get current user's employee_id
      const { data: { user } } = await supabase.auth.getUser();
      let acknowledgedBy: string | undefined;
      
      if (user?.email) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('email', user.email)
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .single();
        
        if (employee) {
          acknowledgedBy = employee.id;
        }
      }

      const { error } = await supabase
        .from('recommended_actions')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: acknowledgedBy || null,
        })
        .eq('id', recommendationId);

      if (error) throw error;

      // Refresh recommendations
      await fetchRecommendations();
    } catch (err) {
      console.error('Error ignoring recommendation:', err);
      alert('Failed to dismiss recommendation. Please try again.');
    }
  };

  // Handle record action
  const handleRecordAction = (recommendation: RecommendedAction) => {
    setSelectedRecommendation(recommendation);
    setRecordModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = async (success?: boolean) => {
    setRecordModalOpen(false);
    setSelectedRecommendation(null);
    if (success) {
      await fetchRecommendations();
      onActionRecorded?.();
    }
  };

  if (loading && recommendations.length === 0) {
    return null; // Don't show anything while loading
  }

  if (recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <>
      <Box
        sx={{
          width: '100%',
          backgroundColor: '#fff9e6', // Light yellow/amber background
          border: '1px solid #ffd700', // Gold border
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          boxShadow: '0px 1px 1px rgba(10, 13, 18, 0.05)',
        }}
        className={className}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: 'Satoshi',
                fontSize: '18px',
                fontWeight: 600,
                color: '#414651',
                mb: 0.5,
              }}
            >
              Recommended Disciplinary Actions
            </Typography>
            <Typography
              sx={{
                fontFamily: 'Satoshi',
                fontSize: '14px',
                fontWeight: 400,
                color: '#535862',
              }}
            >
              {recommendations.length} employee{recommendations.length !== 1 ? 's' : ''} need{recommendations.length === 1 ? 's' : ''} disciplinary action based on their point totals
            </Typography>
          </Box>
        </Box>

        {/* Recommendations List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {recommendations.map((rec) => (
            <Box
              key={rec.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e9eaeb',
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontFamily: 'Satoshi',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#414651',
                    mb: 0.5,
                  }}
                >
                  {rec.employee_name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'Satoshi',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: '#535862',
                  }}
                >
                  {rec.employee_points} points - Recommended: {rec.action_name} ({rec.points_threshold} points)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleIgnore(rec.id)}
                  sx={{
                    fontFamily: 'Satoshi',
                    fontSize: '14px',
                    fontWeight: 500,
                    textTransform: 'none',
                    borderColor: '#e9eaeb',
                    color: '#535862',
                    '&:hover': {
                      borderColor: '#d1d5db',
                      backgroundColor: '#f9fafb',
                    },
                  }}
                >
                  Ignore
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleRecordAction(rec)}
                  sx={{
                    fontFamily: 'Satoshi',
                    fontSize: '14px',
                    fontWeight: 500,
                    textTransform: 'none',
                    backgroundColor: '#31664a', // Levelset green
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#28523e',
                    },
                  }}
                >
                  Record Action
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Record Action Modal */}
      {selectedRecommendation && (
        <RecordActionModal
          open={recordModalOpen}
          onClose={handleModalClose}
          recommendation={selectedRecommendation}
          orgId={orgId}
          locationId={locationId}
        />
      )}
    </>
  );
}
