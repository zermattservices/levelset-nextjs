"use client";

import * as React from "react";
import { Box, Typography, Tabs, Tab, Button } from "@mui/material";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee, Infraction, DisciplinaryAction } from "@/lib/supabase.types";
import { Skeleton } from "@mui/material";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import PersonIcon from "@mui/icons-material/Person";

export interface DrawerTabContainerProps {
  employee?: Employee | null;
  className?: string;
  initialTab?: "pathway" | "pe" | "evaluations" | "discipline";
  orgId?: string;
  locationId?: string;
  onRecordAction?: () => void;
}

interface InfractionListItemProps {
  infraction: Infraction;
}

function InfractionListItem({ infraction }: InfractionListItemProps) {
  const isPositive = (infraction.points || 0) < 0;
  const pointColor = isPositive ? "#178459" : "#d23230"; // Exact colors from Plasmic

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid #e9eaeb", // --token-bGw1ZBUIaR08
        backgroundColor: "#ffffff",
        width: "100%",
        maxWidth: "491px",
      }}
    >
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Item name */}
        <Typography
          sx={{
            fontFamily: "Satoshi",
            fontSize: "14px",
            fontWeight: 500,
            color: "#414651", // rgba(65, 70, 81, 1)
            lineHeight: "20px",
          }}
        >
          {infraction.infraction || infraction.description || "Infraction"}
        </Typography>

        {/* Further details */}
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
          {/* Date */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CalendarIcon sx={{ fontSize: "1em", color: "#535862" }} />
            <Typography
              sx={{
                fontFamily: "Satoshi",
                fontSize: "14px",
                fontWeight: 500,
                color: "#535862", // rgba(83, 88, 98, 1)
                lineHeight: "20px",
              }}
            >
              {new Date(infraction.infraction_date).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Divider */}
          <Box
            sx={{
              width: "2px",
              height: "14px",
              backgroundColor: "#e9eaeb",
            }}
          />

          {/* Leader */}
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

              <Box
                sx={{
                  width: "2px",
                  height: "14px",
                  backgroundColor: "#e9eaeb",
                }}
              />
            </>
          )}

          {/* Acknowledgement */}
          {infraction.acknowledgement && (
            <Typography
              sx={{
                fontFamily: "Satoshi",
                fontSize: "14px",
                fontWeight: 500,
                color: "#535862",
                lineHeight: "20px",
              }}
            >
              {infraction.acknowledgement}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Points */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "stretch",
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
}

function DisciplinaryActionListItem({ action }: DisciplinaryActionListItemProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: "12px",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid #e9eaeb",
        backgroundColor: "#ffffff",
        width: "100%",
        maxWidth: "491px",
      }}
    >
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
        {/* Item name */}
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

        {/* Further details */}
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
          {/* Date */}
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

          {/* Divider */}
          {action.leader_name && (
            <Box
              sx={{
                width: "2px",
                height: "14px",
                backgroundColor: "#e9eaeb",
              }}
            />
          )}

          {/* Leader */}
          {action.leader_name && (
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
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function DrawerTabContainer({
  employee,
  className = "",
  initialTab = "discipline",
  orgId,
  locationId,
  onRecordAction,
}: DrawerTabContainerProps) {
  const [currentTab, setCurrentTab] = React.useState(initialTab);
  const [infractions, setInfractions] = React.useState<Infraction[]>([]);
  const [disciplinaryActions, setDisciplinaryActions] = React.useState<DisciplinaryAction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const supabase = createSupabaseClient();

  // Fetch infractions and disciplinary actions for the selected employee
  const fetchEmployeeData = React.useCallback(async () => {
    if (!employee?.id || !orgId || !locationId) return;

    try {
      setLoading(true);

      // Fetch infractions for this employee (last 90 days)
      // The table already includes employee_name and leader_name (from view or computed columns)
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
          console.log('Loaded infractions:', infractionsData.length);
        } else {
          console.error('Error fetching infractions:', infractionsError);
          setInfractions([]);
        }
      } catch (err) {
        console.error('Error fetching infractions:', err);
        setInfractions([]);
      }

      // Fetch disciplinary actions for this employee (last 90 days)
      // The table already includes employee_name and leader_name (from view or computed columns)
      // Note: leader field is called 'acting_leader' in the database
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
          console.log('Loaded disciplinary actions:', actionsData.length);
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
  }, [employee?.id, orgId, locationId, supabase]);

  // Fetch data when employee changes
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
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width="60%" height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Skeleton variant="rounded" width="50%" height={100} />
            <Skeleton variant="rounded" width="50%" height={100} />
          </Box>
          <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" width="100%" height={150} />
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 2 }}>
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
          <Box sx={{ display: "flex", gap: 2 }}>
            {/* Infractions Card - Exact Plasmic styling */}
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#ffffff",
                boxShadow: "inset 0px 0px 0px 1px rgba(233, 234, 235, 1)",
                filter: "drop-shadow(0px 1px 1px rgba(10, 13, 18, 0.05))",
                borderRadius: "12px",
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
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

            {/* Discipline Points Card - Exact Plasmic styling */}
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#ffffff",
                boxShadow: "inset 0px 0px 0px 1px rgba(233, 234, 235, 1)",
                filter: "drop-shadow(0px 1px 1px rgba(10, 13, 18, 0.05))",
                borderRadius: "12px",
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
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

        {/* Infractions Section */}
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
            Infractions
          </Typography>
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {infractions.map((infraction) => (
                <InfractionListItem key={infraction.id} infraction={infraction} />
              ))}
            </Box>
          )}
        </Box>

        {/* Disciplinary Actions Section */}
        <Box>
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
            {onRecordAction && (
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {disciplinaryActions.map((action) => (
                <DisciplinaryActionListItem key={action.id} action={action} />
              ))}
            </Box>
          )}
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
    <Box className={className} sx={{ display: "flex", flexDirection: "column", height: "100%" }} data-plasmic-name="drawer-tab-container">
      {/* Tabs */}
      <Box sx={{ borderBottom: "1px solid #e9eaeb" }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            px: 1,
            minHeight: 48,
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
      <Box sx={{ overflow: "auto", flex: 1 }}>
        {currentTab === "pathway" && renderPathwayTab()}
        {currentTab === "pe" && renderPETab()}
        {currentTab === "evaluations" && renderEvaluationsTab()}
        {currentTab === "discipline" && renderDisciplineTab()}
      </Box>
    </Box>
  );
}
