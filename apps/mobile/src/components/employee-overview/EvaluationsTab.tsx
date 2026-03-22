/**
 * EvaluationsTab — Employee profile evaluations list.
 * Shows evaluations for THIS employee with search + role filter.
 * Matches PETab card styling and SearchBar pattern.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { CalendarCheck } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";
import { formatRelativeDate } from "../../lib/date-utils";
import { GlassCard } from "../glass";
import { AppIcon } from "../ui";
import { SearchBar } from "./SearchBar";

interface EvaluationEntry {
  id: string;
  template_name: string;
  score: number | null;
  submitted_by_name: string | null;
  created_at: string;
  cadence: string | null;
}

interface EvaluationsTabProps {
  employeeId: string;
  locationId: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#FACC15";
  return "#D23230";
}

function formatCadence(c: string | null): string {
  switch (c) {
    case "monthly": return "Monthly";
    case "quarterly": return "Quarterly";
    case "semi_annual": return "Semi-Annual";
    case "annual": return "Annual";
    default: return "";
  }
}

export function EvaluationsTab({ employeeId, locationId }: EvaluationsTabProps) {
  const colors = useColors();
  const { session } = useAuth();
  const { selectedLocation } = useLocation();
  const orgId = selectedLocation?.org_id;

  const [evaluations, setEvaluations] = useState<EvaluationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!session?.access_token || !orgId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://app.levelset.io";
        const headers: Record<string, string> = {
          Authorization: `Bearer ${session!.access_token}`,
          "Content-Type": "application/json",
        };

        // Fetch evaluation submissions specifically for THIS employee
        const res = await fetch(
          `${API_BASE}/api/forms/submissions?org_id=${encodeURIComponent(orgId!)}&form_type=evaluation&employee_id=${encodeURIComponent(employeeId)}`,
          { headers }
        );

        if (!res.ok) throw new Error("Failed to load evaluations");
        const data = await res.json();
        const subs = Array.isArray(data) ? data : data.submissions ?? [];

        // Fetch evaluation rules for cadence info
        const rulesRes = await fetch(
          `${API_BASE}/api/evaluations/schedule-rules?org_id=${encodeURIComponent(orgId!)}`,
          { headers }
        );
        const cadenceMap = new Map<string, string>();
        if (rulesRes.ok) {
          const rulesData = await rulesRes.json();
          for (const rule of rulesData.rules ?? []) {
            cadenceMap.set(rule.form_template_id, rule.cadence);
          }
        }

        if (!cancelled) {
          setEvaluations(
            subs.map((s: any) => ({
              id: s.id,
              template_name: s.template?.name ?? "Evaluation",
              score: s.score,
              submitted_by_name: s.submitted_by_name ?? null,
              created_at: s.created_at,
              cadence: cadenceMap.get(s.template_id) ?? null,
            }))
          );
        }
      } catch (err) {
        console.warn("[EvaluationsTab] Load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session?.access_token, orgId, employeeId]);

  const filtered = useMemo(() => {
    if (!searchText) return evaluations;
    const q = searchText.toLowerCase();
    return evaluations.filter(
      (e) =>
        e.template_name.toLowerCase().includes(q) ||
        (e.submitted_by_name?.toLowerCase().includes(q) ?? false) ||
        formatCadence(e.cadence).toLowerCase().includes(q)
    );
  }, [evaluations, searchText]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[8] }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const evalConfig = {
    color: colors.primary,
    bgColor: colors.primaryTransparent,
  };

  return (
    <View style={{ gap: spacing[3] }}>
      {/* Search + Filter */}
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search evaluations..."
        onFilterPress={() => {
          // TODO: Role filter drawer
        }}
        filterActive={false}
      />

      {/* Evaluation cards */}
      {filtered.length === 0 ? (
        <View style={{ alignItems: "center", padding: spacing[8], gap: spacing[2] }}>
          <CalendarCheck size={36} color={colors.onSurfaceDisabled} strokeWidth={1} />
          <Text style={{ ...typography.h4, fontWeight: fontWeights.semibold, color: colors.onSurface }}>
            No evaluations
          </Text>
          <Text style={{ ...typography.bodyMedium, color: colors.onSurfaceVariant, textAlign: "center" }}>
            {searchText
              ? "No evaluations match your search."
              : "No evaluations have been completed for this employee."}
          </Text>
        </View>
      ) : (
        filtered.map((item) => {
          const title = item.template_name || "Evaluation";
          const scoreColor = item.score != null ? getScoreColor(item.score) : colors.onSurfaceDisabled;

          return (
            <GlassCard key={item.id}>
              {/* Top row: type badge + date */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: spacing[2],
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[2],
                    backgroundColor: evalConfig.bgColor,
                    paddingHorizontal: spacing[2],
                    paddingVertical: 3,
                    borderRadius: borderRadius.sm,
                    borderCurve: "continuous" as const,
                  }}
                >
                  <CalendarCheck size={12} color={evalConfig.color} strokeWidth={1.5} />
                  <Text
                    style={{
                      ...typography.labelSmall,
                      fontWeight: fontWeights.semibold,
                      color: evalConfig.color,
                    }}
                  >
                    Evaluation
                  </Text>
                </View>
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  {formatRelativeDate(item.created_at)}
                </Text>
              </View>

              {/* Content row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      ...typography.labelLarge,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurface,
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {item.submitted_by_name && (
                    <Text
                      style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
                      numberOfLines={1}
                    >
                      Rated by {item.submitted_by_name}
                    </Text>
                  )}
                </View>

                {/* Score badge */}
                {item.score != null && (
                  <View
                    style={{
                      backgroundColor: scoreColor,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      borderCurve: "continuous",
                      marginLeft: spacing[3],
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.h2.fontFamily,
                        fontSize: 22,
                        fontWeight: fontWeights.bold,
                        color: "#ffffff",
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {Math.round(item.score)}%
                    </Text>
                  </View>
                )}
              </View>
            </GlassCard>
          );
        })
      )}
    </View>
  );
}
