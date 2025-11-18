"use client";

import * as React from "react";
import {
  Box,
  Typography,
  Button,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import type { RecommendedAction } from "@/lib/discipline-recommendations";
import type { Employee, Infraction } from "@/lib/supabase.types";
import { createSupabaseClient } from "@/util/supabase/component";
import { RecordActionModal } from "./RecordActionModal";
import { EmployeeModal } from "./EmployeeModal";
import { DismissConfirmationModal } from "./DismissConfirmationModal";
import { InfractionEditModal } from "./InfractionEditModal";
import { useLocationContext } from "./LocationContext";

export interface DisciplineNotificationsProps {
  locationId: string;
  currentUser: Employee | null;
  currentUserId?: string; // Alternative: auth user ID to look up in app_users
  className?: string;
  maxWidth?: string | number;
  width?: string | number;
}

// For backwards compatibility
export type RecommendedActionsProps = DisciplineNotificationsProps;

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = '#31664a';

// Infraction Card Component - for Infractions This Week section
function InfractionCard({ 
  infraction, 
  onClick 
}: { 
  infraction: Infraction; 
  onClick?: () => void;
}) {
  const isPositive = (infraction.points || 0) < 0;
  const pointColor = isPositive ? "#178459" : "#d23230";

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid #e9eaeb",
        backgroundColor: "#ffffff",
        minWidth: 0,
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick ? {
          backgroundColor: "#f9fafb",
        } : undefined,
      }}
    >
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
        {/* Employee Name - Bold on top row for Infractions This Week */}
        {infraction.employee_name && (
          <Typography
            sx={{
              fontFamily: "Satoshi",
              fontSize: "14px",
              fontWeight: 700,
              color: "#111827",
              lineHeight: "20px",
            }}
          >
            {infraction.employee_name}
          </Typography>
        )}
        
        {/* Infraction Name */}
        <Typography
          sx={{
            fontFamily: "Satoshi",
            fontSize: "14px",
            fontWeight: 500,
            color: "#414651",
            lineHeight: "20px",
          }}
        >
          {infraction.infraction || infraction.description || "Infraction"}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CalendarIcon sx={{ fontSize: "1em", color: "#535862" }} />
            <Typography
              sx={{
                fontFamily: "Satoshi",
                fontSize: "14px",
                fontWeight: 500,
                color: "#535862",
                lineHeight: "20px",
              }}
            >
              {new Date(infraction.infraction_date).toLocaleDateString()}
            </Typography>
          </Box>

          {infraction.leader_name && (
            <>
              <Box sx={{ width: "2px", height: "14px", backgroundColor: "#e9eaeb" }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <PersonIcon sx={{ fontSize: "1em", color: "#535862" }} />
                <Typography
                  sx={{
                    fontFamily: "Satoshi",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#535862",
                    lineHeight: "20px",
                  }}
                >
                  {infraction.leader_name}
                </Typography>
              </Box>
            </>
          )}

          <Box sx={{ width: "2px", height: "14px", backgroundColor: "#e9eaeb" }} />
          <Typography
            sx={{
              fontFamily: "Satoshi",
              fontSize: "14px",
              fontWeight: 500,
              color: "#535862",
              lineHeight: "20px",
            }}
          >
            {infraction.ack_bool ? 'Notified' : 'Not notified'}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "24px",
            fontWeight: 600,
            color: pointColor,
            lineHeight: "32px",
            textAlign: "center",
          }}
        >
          {infraction.points}
        </Typography>
        <Typography
          sx={{
            fontFamily: "Satoshi",
            fontSize: "12px",
            fontWeight: 500,
            color: "#414651",
            lineHeight: "18px",
            textAlign: "center",
          }}
        >
          points
        </Typography>
      </Box>
    </Box>
  );
}

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

export function DisciplineNotifications({
  locationId,
  currentUser,
  currentUserId,
  className = "",
  maxWidth = "1200px",
  width = "100%",
}: DisciplineNotificationsProps) {
  const [recommendations, setRecommendations] = React.useState<RecommendedAction[]>([]);
  const [weeklyInfractions, setWeeklyInfractions] = React.useState<Infraction[]>([]);
  const [disciplineActions, setDisciplineActions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [infractionsExpanded, setInfractionsExpanded] = React.useState(false);
  const [actionsExpanded, setActionsExpanded] = React.useState(false);
  const [recordModalOpen, setRecordModalOpen] = React.useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = React.useState<RecommendedAction | null>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [dismissModalOpen, setDismissModalOpen] = React.useState(false);
  const [recommendationToDismiss, setRecommendationToDismiss] = React.useState<RecommendedAction | null>(null);
  const [appUserId, setAppUserId] = React.useState<string | null>(null);
  const [infractionEditModalOpen, setInfractionEditModalOpen] = React.useState(false);
  const [selectedInfraction, setSelectedInfraction] = React.useState<Infraction | null>(null);
  const supabase = createSupabaseClient();
  const { selectedLocationOrgId } = useLocationContext();

  // Fetch app_user ID from auth_user_id
  React.useEffect(() => {
    if (!currentUserId) {
      setAppUserId(currentUser?.id || null);
      return;
    }

    const fetchAppUserId = async () => {
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('id')
          .eq('auth_user_id', currentUserId)
          .single();
        
        if (!error && data) {
          setAppUserId(data.id);
        }
      } catch (err) {
        console.error('Error fetching app_user ID:', err);
      }
    };

    fetchAppUserId();
  }, [currentUserId, currentUser, supabase]);

  // Fetch recommendations and infractions
  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch discipline actions rubric for points badge coloring
      const { data: actionsData, error: actionsError } = await supabase
        .from('disc_actions_rubric')
        .select('*')
        .eq('location_id', locationId)
        .order('points_threshold', { ascending: true });
        
      if (!actionsError && actionsData) {
        setDisciplineActions(actionsData);
      }
      
      // Fetch pending recommendations from database
      const { data: dbRecs, error: recsError } = await supabase
        .from('recommended_disc_actions')
        .select('*')
        .eq('location_id', locationId)
        .is('action_taken', null)
        .order('points_when_recommended', { ascending: false });

      if (!recsError && dbRecs && dbRecs.length > 0) {
        const employeeIds = dbRecs.map(r => r.employee_id);
        const { data: employees, error: empError } = await supabase
          .from('employees')
          .select('*')
          .in('id', employeeIds);

        if (!empError) {
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
              has_existing_action: false,
              employee: employee as Employee,
            };
          });
          setRecommendations(enrichedRecs);
        }
      } else {
        setRecommendations([]);
      }

      // Fetch infractions from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: infractionsData, error: infError } = await supabase
        .from('infractions')
        .select('*')
        .eq('location_id', locationId)
        .gte('infraction_date', sevenDaysAgo)
        .order('infraction_date', { ascending: false });

      if (!infError && infractionsData) {
        setWeeklyInfractions(infractionsData as Infraction[]);
      } else {
        setWeeklyInfractions([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setRecommendations([]);
      setWeeklyInfractions([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, supabase]);

  React.useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId, fetchData]);

  const handleDismissClick = (recommendation: RecommendedAction) => {
    setRecommendationToDismiss(recommendation);
    setDismissModalOpen(true);
  };

  const handleDismissConfirm = async () => {
    if (!recommendationToDismiss) return;
    
    const recommendation = recommendationToDismiss;
    try {
      const { data: existing } = await supabase
        .from('recommended_disc_actions')
        .select('id')
        .eq('employee_id', recommendation.employee_id)
        .eq('recommended_action_id', recommendation.action_id)
        .eq('location_id', locationId)
        .is('action_taken', null)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from('recommended_disc_actions')
          .update({
            action_taken: 'dismissed',
            action_taken_at: new Date().toISOString(),
            action_taken_by: appUserId || currentUser?.id || null,
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('recommended_disc_actions')
          .insert({
            employee_id: recommendation.employee_id,
            org_id: selectedLocationOrgId ?? currentUser?.org_id ?? null,
            location_id: locationId,
            recommended_action_id: recommendation.action_id,
            recommended_action: recommendation.recommended_action,
            points_when_recommended: recommendation.current_points,
            action_taken: 'dismissed',
            action_taken_at: new Date().toISOString(),
            action_taken_by: appUserId || currentUser?.id || null,
          });

        if (insertError) throw insertError;
      }

      setRecommendations(prev => prev.filter(r => r.employee_id !== recommendation.employee_id));
      setDismissModalOpen(false);
      setRecommendationToDismiss(null);
    } catch (err: any) {
      console.error('Error dismissing recommendation:', err);
      alert(`Failed to dismiss recommendation: ${err?.message || 'Please try again.'}`);
      setDismissModalOpen(false);
      setRecommendationToDismiss(null);
    }
  };

  const handleRecordAction = async (recommendation: RecommendedAction) => {
    try {
      const { data: existing } = await supabase
        .from('recommended_disc_actions')
        .select('id')
        .eq('employee_id', recommendation.employee_id)
        .eq('recommended_action_id', recommendation.action_id)
        .eq('location_id', locationId)
        .is('action_taken', null)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('recommended_disc_actions')
          .insert({
            employee_id: recommendation.employee_id,
            org_id: selectedLocationOrgId ?? currentUser?.org_id ?? null,
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

  if (loading) {
    return (
      <Box className={className} sx={{ mb: 3, width, maxWidth, mx: 'auto' }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ mb: 3, width, maxWidth, mx: 'auto' }}>
      {/* Infractions This Week Accordion */}
      {(
        <Accordion
          expanded={infractionsExpanded}
          onChange={() => setInfractionsExpanded(!infractionsExpanded)}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            '&.MuiAccordion-root': {
              backgroundColor: 'transparent',
              boxShadow: 'none',
            },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: levelsetGreen }} />}
            sx={{
              padding: 0,
              minHeight: 48,
              '&.Mui-expanded': {
                minHeight: 48,
              },
              '& .MuiAccordionSummary-content': {
                margin: '12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              },
              '& .MuiAccordionSummary-expandIconWrapper': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#111827' }}>
              Infractions This Week ({weeklyInfractions.length})
            </Typography>
            <Typography sx={{ fontFamily, fontSize: 13, color: levelsetGreen, fontWeight: 500, ml: 'auto', mr: 1 }}>
              {infractionsExpanded ? 'Collapse' : 'Expand'}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 0 }}>
            <Box
              sx={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {weeklyInfractions.length > 0 ? (
                weeklyInfractions.map((infraction) => (
                  <InfractionCard 
                    key={infraction.id} 
                    infraction={infraction}
                    onClick={() => {
                      setSelectedInfraction(infraction);
                      setInfractionEditModalOpen(true);
                    }}
                  />
                ))
              ) : (
                <Typography sx={{ fontFamily, fontSize: 14, color: '#6b7280', textAlign: 'center', py: 2 }}>
                  No infractions in the last 7 days
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Required Disciplinary Actions Accordion */}
      <Accordion
        expanded={actionsExpanded}
        onChange={() => setActionsExpanded(!actionsExpanded)}
        disableGutters
        elevation={0}
        sx={{
          '&:before': { display: 'none' },
          '&.MuiAccordion-root': {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            mt: 2,
          },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: levelsetGreen }} />}
          sx={{
            padding: 0,
            minHeight: 48,
            '&.Mui-expanded': {
              minHeight: 48,
            },
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            },
            '& .MuiAccordionSummary-expandIconWrapper': {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: '#111827' }}>
            Required Disciplinary Actions ({recommendations.length})
          </Typography>
          {recommendations.length > 0 && (
            <Chip
              label="Action Required"
              size="small"
              sx={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                height: 24,
              }}
            />
          )}
          <Typography sx={{ fontFamily, fontSize: 13, color: levelsetGreen, fontWeight: 500, ml: 'auto', mr: 1 }}>
            {actionsExpanded ? 'Collapse' : 'Expand'}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ padding: 0 }}>
          <Box
            sx={{
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {recommendations.length === 0 ? (
              <Typography
                sx={{
                  fontFamily,
                  fontSize: 14,
                  color: '#6b7280',
                  textAlign: 'center',
                  py: 2,
                }}
              >
                No disciplinary actions required.
              </Typography>
            ) : (
              recommendations.map((rec) => (
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

                  {/* Recommended Action */}
                  <Box
                    sx={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e9eaeb",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rec.recommended_action}
                    </Typography>
                  </Box>

                  {/* Spacer to push buttons right */}
                  <Box sx={{ flex: 1 }} />

                  {/* Dismiss Button */}
                  <Button
                    onClick={() => handleDismissClick(rec)}
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
              ))
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Record Action Modal */}
      {selectedRecommendation && (
        <RecordActionModal
          open={recordModalOpen}
          employee={selectedRecommendation.employee || null}
          recommendedAction={selectedRecommendation.recommended_action}
          recommendedActionId={selectedRecommendation.action_id}
          currentUser={currentUser}
          currentUserId={currentUserId}
          onClose={() => {
            setRecordModalOpen(false);
            setSelectedRecommendation(null);
          }}
          onSuccess={(employeeId) => {
            fetchData();
            const emp = recommendations.find(r => r.employee_id === employeeId)?.employee;
            if (emp) {
              setSelectedEmployee(emp);
              setEmployeeModalOpen(true);
            }
          }}
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
        locationId={locationId}
        initialTab="discipline"
        currentUserId={currentUserId}
        onRecommendationUpdate={() => {
          // Refresh recommendations when an action is recorded or dismissed in the modal
          fetchData();
        }}
      />

      {/* Dismiss Confirmation Modal */}
      <DismissConfirmationModal
        open={dismissModalOpen}
        employeeName={recommendationToDismiss?.employee_name || "this employee"}
        onConfirm={handleDismissConfirm}
        onCancel={() => {
          setDismissModalOpen(false);
          setRecommendationToDismiss(null);
        }}
      />

      {/* Infraction Edit Modal */}
      <InfractionEditModal
        open={infractionEditModalOpen}
        infraction={selectedInfraction}
        onClose={() => {
          setInfractionEditModalOpen(false);
          setSelectedInfraction(null);
        }}
        onSave={(updatedInfraction) => {
          // Refresh the weekly infractions list
          fetchData();
        }}
        onDelete={(infractionId) => {
          // Remove from local state and refresh
          setWeeklyInfractions(prev => prev.filter(inf => inf.id !== infractionId));
          fetchData();
        }}
        locationId={locationId}
      />
    </Box>
  );
}

// Export alias for backwards compatibility
export const RecommendedActions = DisciplineNotifications;
