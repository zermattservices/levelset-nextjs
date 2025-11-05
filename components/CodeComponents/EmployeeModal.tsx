"use client";

import * as React from "react";
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Skeleton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee, Infraction, DisciplinaryAction } from "@/lib/supabase.types";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";
import { InfractionEditModal } from "./InfractionEditModal";
import { AddInfractionModal } from "./AddInfractionModal";
import { AddActionModal } from "./AddActionModal";
import { EditActionModal } from "./EditActionModal";

export interface EmployeeModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  orgId: string;
  locationId: string;
  initialTab?: "pathway" | "pe" | "evaluations" | "discipline";
  onRecordAction?: () => void;
  currentUserId?: string; // For prefilling acting leader
  className?: string;
}

interface InfractionListItemProps {
  infraction: Infraction;
  onClick?: () => void;
}

function InfractionListItem({ infraction, onClick }: InfractionListItemProps) {
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

          <Box
            sx={{
              width: "2px",
              height: "14px",
              backgroundColor: "#e9eaeb",
            }}
          />

          {infraction.leader_name && (
            <>
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

interface DisciplinaryActionListItemProps {
  action: DisciplinaryAction;
  onClick?: () => void;
}

function DisciplinaryActionListItem({ action, onClick }: DisciplinaryActionListItemProps) {
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
        <Typography
          sx={{
            fontFamily: "Satoshi",
            fontSize: "14px",
            fontWeight: 500,
            color: "#414651",
            lineHeight: "20px",
          }}
        >
          {action.action}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
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
              {new Date(action.action_date).toLocaleDateString()}
            </Typography>
          </Box>

          {action.leader_name && (
            <>
              <Box
                sx={{
                  width: "2px",
                  height: "14px",
                  backgroundColor: "#e9eaeb",
                }}
              />
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
                  {action.leader_name}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function EmployeeModal({
  open,
  employee,
  onClose,
  orgId,
  locationId,
  initialTab = "discipline",
  onRecordAction,
  currentUserId,
  className = "",
}: EmployeeModalProps) {
  const [currentTab, setCurrentTab] = React.useState(initialTab);
  const [infractions, setInfractions] = React.useState<Infraction[]>([]);
  const [disciplinaryActions, setDisciplinaryActions] = React.useState<DisciplinaryAction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [infractionModalOpen, setInfractionModalOpen] = React.useState(false);
  const [selectedInfraction, setSelectedInfraction] = React.useState<Infraction | null>(null);
  const [addInfractionModalOpen, setAddInfractionModalOpen] = React.useState(false);
  const [addActionModalOpen, setAddActionModalOpen] = React.useState(false);
  const [editActionModalOpen, setEditActionModalOpen] = React.useState(false);
  const [selectedAction, setSelectedAction] = React.useState<DisciplinaryAction | null>(null);
  const supabase = createSupabaseClient();

  // Reset to discipline tab when modal opens
  React.useEffect(() => {
    if (open && employee) {
      setCurrentTab(initialTab);
    }
  }, [open, employee, initialTab]);

  // Fetch infractions and disciplinary actions for the selected employee
  const fetchEmployeeData = React.useCallback(async () => {
    if (!open || !employee?.id || !orgId || !locationId) {
      setInfractions([]);
      setDisciplinaryActions([]);
      return;
    }

    try {
      setLoading(true);

      // Fetch infractions for this employee (last 90 days)
      try {
        const { data: infractionsData, error: infractionsError } = await supabase
          .from('infractions')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .gte('infraction_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('infraction_date', { ascending: false });

        if (!infractionsError && infractionsData) {
          setInfractions(infractionsData as Infraction[]);
        } else {
          console.error('Error fetching infractions:', infractionsError);
          setInfractions([]);
        }
      } catch (err) {
        console.error('Error fetching infractions:', err);
        setInfractions([]);
      }

      // Fetch disciplinary actions for this employee (last 90 days)
      try {
        const { data: actionsData, error: actionsError } = await supabase
          .from('disc_actions')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('org_id', orgId)
          .eq('location_id', locationId)
          .gte('action_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('action_date', { ascending: false });

        if (!actionsError && actionsData) {
          setDisciplinaryActions(actionsData as DisciplinaryAction[]);
        } else {
          console.error('Error fetching disciplinary actions:', actionsError);
          setDisciplinaryActions([]);
        }
      } catch (err) {
        console.error('Error fetching disciplinary actions:', err);
        setDisciplinaryActions([]);
      }
    } catch (err) {
      console.error('Error fetching employee discipline data:', err);
    } finally {
      setLoading(false);
    }
  }, [open, employee?.id, orgId, locationId, supabase]);

  // Fetch data when modal opens or employee changes
  React.useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  // Calculate total points from infractions
  const totalPoints = React.useMemo(() => {
    return infractions.reduce((sum, inf) => sum + (inf.points || 0), 0);
  }, [infractions]);

  const infractionCount = infractions.length;

  // Tab content components
  const renderDisciplineTab = () => {
    if (loading) {
      return (
        <Box sx={{ p: 3, backgroundColor: "#ffffff" }}>
          <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Skeleton variant="rounded" width="50%" height={100} />
            <Skeleton variant="rounded" width="50%" height={100} />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" width="100%" height={150} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" width="100%" height={150} />
            </Box>
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 3, backgroundColor: "#ffffff" }}>
        {/* Current Period Summary */}
        <Box>
          <Typography
            sx={{
              fontFamily: "Satoshi",
              fontSize: "14px",
              fontWeight: 600,
              color: "#414651",
              mb: 2,
            }}
          >
            Current Period (last 90 days)
          </Typography>
          <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
            {/* Infractions Card */}
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#ffffff",
                boxShadow: "inset 0px 0px 0px 1px rgba(233, 234, 235, 1)",
                filter: "drop-shadow(0px 1px 1px rgba(10, 13, 18, 0.05))",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#414651",
                  textAlign: "center",
                  lineHeight: "28px",
                }}
              >
                Infractions
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "#414651",
                  textAlign: "center",
                  lineHeight: "38px",
                }}
              >
                {infractionCount}
              </Typography>
            </Box>

            {/* Discipline Points Card */}
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#ffffff",
                boxShadow: "inset 0px 0px 0px 1px rgba(233, 234, 235, 1)",
                filter: "drop-shadow(0px 1px 1px rgba(10, 13, 18, 0.05))",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#414651",
                  textAlign: "center",
                  lineHeight: "28px",
                }}
              >
                Discipline Points
              </Typography>
              <Typography
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "30px",
                  fontWeight: 700,
                  color: "#414651",
                  textAlign: "center",
                  lineHeight: "38px",
                }}
              >
                {totalPoints}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Side-by-Side Layout: Infractions and Disciplinary Actions */}
        <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0, width: "100%" }}>
          {/* Left Column: Infractions */}
          <Box sx={{ flex: "1 1 50%", display: "flex", flexDirection: "column", minWidth: 0, maxWidth: "50%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#414651",
                }}
              >
                Infractions
              </Typography>
              <Button
                onClick={() => setAddInfractionModalOpen(true)}
                startIcon={<AddIcon />}
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "13px",
                  fontWeight: 500,
                  textTransform: "none",
                  color: "#31664a",
                  padding: "4px 12px",
                  minWidth: "auto",
                  "&:hover": {
                    backgroundColor: "rgba(49, 102, 74, 0.04)",
                  },
                }}
              >
                Infraction
              </Button>
            </Box>
            {infractions.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e9eaeb",
                  backgroundColor: "#ffffff",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "60px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "Satoshi",
                    fontSize: "14px",
                    color: "#535862",
                    textAlign: "center",
                  }}
                >
                  No infractions in the last 90 days
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, overflow: "auto" }}>
                {infractions.map((infraction) => (
                  <InfractionListItem
                    key={infraction.id}
                    infraction={infraction}
                    onClick={() => {
                      setSelectedInfraction(infraction);
                      setInfractionModalOpen(true);
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Right Column: Disciplinary Actions */}
          <Box sx={{ flex: "1 1 50%", display: "flex", flexDirection: "column", minWidth: 0, maxWidth: "50%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#414651",
                }}
              >
                Disciplinary Actions
              </Typography>
              <Button
                onClick={() => setAddActionModalOpen(true)}
                startIcon={<AddIcon />}
                sx={{
                  fontFamily: "Satoshi",
                  fontSize: "13px",
                  fontWeight: 500,
                  textTransform: "none",
                  color: "#31664a",
                  padding: "4px 12px",
                  minWidth: "auto",
                  "&:hover": {
                    backgroundColor: "rgba(49, 102, 74, 0.04)",
                  },
                }}
              >
                Action
              </Button>
              {onRecordAction && false && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={onRecordAction}
                  sx={{
                    backgroundColor: "#31664a",
                    textTransform: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    fontFamily: "Satoshi",
                    "&:hover": {
                      backgroundColor: "#264d38",
                    },
                  }}
                >
                  Record an Action
                </Button>
              )}
            </Box>
            {disciplinaryActions.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e9eaeb",
                  backgroundColor: "#ffffff",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "60px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "Satoshi",
                    fontSize: "14px",
                    color: "#535862",
                    textAlign: "center",
                  }}
                >
                  No disciplinary actions in the last 90 days
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, overflow: "auto" }}>
                {disciplinaryActions.map((action) => (
                  <DisciplinaryActionListItem 
                    key={action.id} 
                    action={action}
                    onClick={() => {
                      setSelectedAction(action);
                      setEditActionModalOpen(true);
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderPathwayTab = () => {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontFamily: "Satoshi", fontSize: "14px", color: "#535862" }}>
          Coming soon!
        </Typography>
      </Box>
    );
  };

  const renderPETab = () => {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontFamily: "Satoshi", fontSize: "14px", color: "#535862" }}>
          Coming soon!
        </Typography>
      </Box>
    );
  };

  const renderEvaluationsTab = () => {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontFamily: "Satoshi", fontSize: "14px", color: "#535862" }}>
          Coming soon!
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "80%",
          maxWidth: "1100px",
          height: "80%",
          maxHeight: "90vh",
          borderRadius: "16px",
          fontFamily: "Satoshi",
        },
      }}
      className={className}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "24px",
          borderBottom: "1px solid #e9eaeb",
          backgroundColor: "#ffffff",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography
            sx={{
              fontFamily: "Satoshi",
              fontSize: "24px",
              fontWeight: 600,
              color: "#181d27",
              lineHeight: "32px",
            }}
          >
            {employee?.full_name || "Employee"}
          </Typography>
          <Typography
            sx={{
              fontFamily: "Satoshi",
              fontSize: "18px",
              fontWeight: 400,
              color: "#535862",
              lineHeight: "28px",
            }}
          >
            {employee?.role || "Team Member"}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "#6b7280",
            "&:hover": {
              backgroundColor: "#f3f4f6",
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Tabs */}
      <Box sx={{ borderBottom: "1px solid #e9eaeb", backgroundColor: "#ffffff" }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            px: 1,
            minHeight: 48,
            backgroundColor: "#ffffff",
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "Satoshi",
              minHeight: 48,
              color: "#6b7280",
              "&.Mui-selected": {
                color: "#31664a",
              },
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#31664a",
              height: 2,
            },
          }}
        >
          <Tab label="Pathway" value="pathway" />
          <Tab label="Positional Excellence" value="pe" />
          <Tab label="Evaluations" value="evaluations" />
          <Tab label="Discipline" value="discipline" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ overflow: "auto", flex: 1, backgroundColor: "#ffffff" }}>
        {currentTab === "pathway" && renderPathwayTab()}
        {currentTab === "pe" && renderPETab()}
        {currentTab === "evaluations" && renderEvaluationsTab()}
        {currentTab === "discipline" && renderDisciplineTab()}
      </Box>
      
      {/* Infraction Edit Modal */}
      <InfractionEditModal
        open={infractionModalOpen}
        infraction={selectedInfraction}
        onClose={() => {
          setInfractionModalOpen(false);
          setSelectedInfraction(null);
        }}
        onSave={(updatedInfraction) => {
          // Update the infraction in the list
          setInfractions(prev =>
            prev.map(inf => inf.id === updatedInfraction.id ? updatedInfraction : inf)
          );
          // Optionally refetch data
          fetchEmployeeData();
        }}
        orgId={orgId}
        locationId={locationId}
      />

      {/* Add Infraction Modal */}
      <AddInfractionModal
        open={addInfractionModalOpen}
        employee={employee}
        onClose={() => setAddInfractionModalOpen(false)}
        onSave={(newInfraction) => {
          // Add to the list
          setInfractions(prev => [newInfraction, ...prev]);
          // Refetch data to update counts
          fetchEmployeeData();
        }}
        currentUserId={currentUserId}
        orgId={orgId}
        locationId={locationId}
      />

      {/* Add Action Modal */}
      <AddActionModal
        open={addActionModalOpen}
        employee={employee}
        onClose={() => setAddActionModalOpen(false)}
        onSave={(newAction) => {
          // Add to the list
          setDisciplinaryActions(prev => [newAction, ...prev]);
          // Refetch data to update counts
          fetchEmployeeData();
        }}
        currentUserId={currentUserId}
        orgId={orgId}
        locationId={locationId}
      />

      {/* Edit Action Modal */}
      <EditActionModal
        open={editActionModalOpen}
        action={selectedAction}
        onClose={() => {
          setEditActionModalOpen(false);
          setSelectedAction(null);
        }}
        onSave={(updatedAction) => {
          // Update the action in the list
          setDisciplinaryActions(prev =>
            prev.map(act => act.id === updatedAction.id ? updatedAction : act)
          );
          // Refetch data
          fetchEmployeeData();
        }}
        orgId={orgId}
        locationId={locationId}
      />
    </Dialog>
  );
}

