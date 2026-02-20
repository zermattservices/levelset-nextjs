/**
 * EmployeesScreen
 * Displays employees for the selected location with filters and profile drawer.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassCard, GlassButton, GlassDrawer, GlassModal } from "../../components/glass";
import { AppIcon } from "../../components/ui";
import {
  fetchEmployeesAuth,
  fetchEmployeeProfileAuth,
  ApiError,
  type EmployeeListItem,
  type EmployeeProfileResponse,
  type EmployeeProfileRating,
  type EmployeeProfileInfraction,
  type EmployeeProfileDiscAction,
  type ScheduleShift,
} from "../../lib/api";

// =============================================================================
// Helpers
// =============================================================================

function formatTenure(hireDate: string | null): string {
  if (!hireDate) return "";
  const hired = new Date(hireDate + "T12:00:00");
  const now = new Date();
  const months = (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth());
  if (months < 1) return "New";
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  return remaining > 0 ? `${years}yr ${remaining}mo` : `${years}yr`;
}

function tenureMonths(hireDate: string | null): number {
  if (!hireDate) return 0;
  const hired = new Date(hireDate + "T12:00:00");
  const now = new Date();
  return (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth());
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

const AVATAR_COLORS = [
  "#4F46E5", "#0891B2", "#059669", "#D97706", "#DC2626",
  "#7C3AED", "#DB2777", "#2563EB", "#65A30D", "#EA580C",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function ratingColor(avg: number | null): string {
  if (avg == null) return "#9CA3AF";
  if (avg >= 2.75) return "#16A34A";
  if (avg >= 1.75) return "#CA8A04";
  return "#DC2626";
}

// =============================================================================
// Filter types
// =============================================================================

type TenureFilter = "any" | "lt3" | "3to12" | "1to3y" | "3yplus";

interface Filters {
  roles: Set<string>;
  worksToday: boolean;
  tenure: TenureFilter;
}

const EMPTY_FILTERS: Filters = { roles: new Set(), worksToday: false, tenure: "any" };

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.roles.size > 0) n++;
  if (f.worksToday) n++;
  if (f.tenure !== "any") n++;
  return n;
}

function applyFilters(employees: EmployeeListItem[], filters: Filters): EmployeeListItem[] {
  return employees.filter((e) => {
    if (filters.roles.size > 0 && !filters.roles.has(e.role ?? "")) return false;
    if (filters.worksToday && !e.works_today) return false;
    if (filters.tenure !== "any") {
      const m = tenureMonths(e.hire_date);
      switch (filters.tenure) {
        case "lt3": if (m >= 3) return false; break;
        case "3to12": if (m < 3 || m >= 12) return false; break;
        case "1to3y": if (m < 12 || m >= 36) return false; break;
        case "3yplus": if (m < 36) return false; break;
      }
    }
    return true;
  });
}

// =============================================================================
// EmployeeRow
// =============================================================================

function EmployeeRow({
  item,
  index,
  onPress,
}: {
  item: EmployeeListItem;
  index: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const tenure = formatTenure(item.hire_date);

  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(250)}>
      <Pressable
        onPress={() => { haptics.light(); onPress(); }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? colors.surfaceVariant : "transparent" },
        ]}
      >
        {item.profile_image ? (
          <Image
            source={{ uri: item.profile_image }}
            style={[styles.avatar, { backgroundColor: colors.surfaceVariant }]}
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: avatarColor(item.full_name) }]}>
            <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
          </View>
        )}
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: colors.onSurface }]} numberOfLines={1}>
            {item.full_name}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
            {[item.role, tenure].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
      </Pressable>
    </Animated.View>
  );
}

// =============================================================================
// FilterModal
// =============================================================================

function FilterModal({
  visible,
  onClose,
  filters,
  onApply,
  availableRoles,
}: {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (f: Filters) => void;
  availableRoles: string[];
}) {
  const colors = useColors();
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => {
    if (visible) setDraft({ ...filters, roles: new Set(filters.roles) });
  }, [visible]);

  const toggleRole = (role: string) => {
    setDraft((prev) => {
      const next = new Set(prev.roles);
      next.has(role) ? next.delete(role) : next.add(role);
      return { ...prev, roles: next };
    });
  };

  const TENURE_OPTIONS: { value: TenureFilter; label: string }[] = [
    { value: "any", label: "Any" },
    { value: "lt3", label: "< 3mo" },
    { value: "3to12", label: "3–12mo" },
    { value: "1to3y", label: "1–3yr" },
    { value: "3yplus", label: "3yr+" },
  ];

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title="Filter Employees"
      scrollable={false}
      footer={
        <View style={styles.filterFooter}>
          <GlassButton
            label="Reset"
            variant="outline"
            size="compact"
            onPress={() => { onApply(EMPTY_FILTERS); onClose(); }}
          />
          <GlassButton
            label="Apply"
            variant="primary"
            size="compact"
            onPress={() => { onApply(draft); onClose(); }}
          />
        </View>
      }
    >
      <View style={styles.filterContent}>
        {/* Role filter */}
        {availableRoles.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.onSurfaceVariant }]}>Role</Text>
            <View style={styles.chipRow}>
              {availableRoles.map((role) => {
                const active = draft.roles.has(role);
                return (
                  <Pressable
                    key={role}
                    onPress={() => { haptics.selection(); toggleRole(role); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                        borderColor: active ? colors.primary : colors.outline,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.onPrimary : colors.onSurfaceVariant },
                      ]}
                    >
                      {role}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Works Today */}
        <View style={styles.filterSection}>
          <Pressable
            onPress={() => { haptics.selection(); setDraft((p) => ({ ...p, worksToday: !p.worksToday })); }}
            style={styles.toggleRow}
          >
            <Text style={[styles.filterLabel, { color: colors.onSurfaceVariant, flex: 1 }]}>
              Works Today
            </Text>
            <View
              style={[
                styles.checkBox,
                {
                  backgroundColor: draft.worksToday ? colors.primary : "transparent",
                  borderColor: draft.worksToday ? colors.primary : colors.outline,
                },
              ]}
            >
              {draft.worksToday && <AppIcon name="checkmark" size={12} tintColor={colors.onPrimary} />}
            </View>
          </Pressable>
        </View>

        {/* Tenure */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterLabel, { color: colors.onSurfaceVariant }]}>Tenure</Text>
          <View style={styles.chipRow}>
            {TENURE_OPTIONS.map((opt) => {
              const active = draft.tenure === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => { haptics.selection(); setDraft((p) => ({ ...p, tenure: opt.value })); }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceVariant,
                      borderColor: active ? colors.primary : colors.outline,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? colors.onPrimary : colors.onSurfaceVariant },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </GlassModal>
  );
}

// =============================================================================
// Profile Drawer — Tab Content
// =============================================================================

function ScheduleTab({ schedule }: { schedule: EmployeeProfileResponse["schedule"] }) {
  const colors = useColors();
  if (!schedule || schedule.shifts.length === 0) {
    return (
      <View style={styles.tabEmpty}>
        <Text style={[styles.tabEmptyText, { color: colors.onSurfaceVariant }]}>
          No shifts this week
        </Text>
      </View>
    );
  }

  const grouped = new Map<string, ScheduleShift[]>();
  for (const s of schedule.shifts) {
    const arr = grouped.get(s.shift_date) || [];
    arr.push(s);
    grouped.set(s.shift_date, arr);
  }

  return (
    <View style={styles.tabContent}>
      {Array.from(grouped.entries()).map(([date, shifts]) => (
        <GlassCard key={date}>
          <Text style={[styles.schedDayLabel, { color: colors.onSurface }]}>
            {formatDayLabel(date)}
          </Text>
          {shifts.map((s) => (
            <View key={s.id} style={styles.schedShiftRow}>
              <Text style={[styles.schedPosition, { color: colors.onSurface }]}>
                {s.position?.name ?? "Shift"}
              </Text>
              <Text style={[styles.schedTime, { color: colors.onSurfaceVariant }]}>
                {formatTime(s.start_time)} – {formatTime(s.end_time)}
              </Text>
            </View>
          ))}
        </GlassCard>
      ))}
    </View>
  );
}

function PETab({ ratings, summary }: { ratings: EmployeeProfileRating[]; summary: EmployeeProfileResponse["summary"] }) {
  const colors = useColors();
  if (ratings.length === 0) {
    return (
      <View style={styles.tabEmpty}>
        <Text style={[styles.tabEmptyText, { color: colors.onSurfaceVariant }]}>
          No ratings in the last 90 days
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.tabContent}>
      <Text style={[styles.tabSummary, { color: colors.onSurfaceVariant }]}>
        {ratings.length} rating{ratings.length !== 1 ? "s" : ""} · Avg{" "}
        <Text style={{ color: ratingColor(summary.avg_rating), fontWeight: fontWeights.bold }}>
          {summary.avg_rating?.toFixed(2) ?? "—"}
        </Text>
      </Text>
      {ratings.map((r) => (
        <GlassCard key={r.id}>
          <View style={styles.ratingHeader}>
            <Text style={[styles.ratingPosition, { color: colors.onSurface }]}>{r.position}</Text>
            <Text style={[styles.ratingAvg, { color: ratingColor(r.rating_avg) }]}>
              {r.rating_avg?.toFixed(2) ?? "—"}
            </Text>
          </View>
          <View style={styles.ratingScores}>
            {[r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5].map((v, i) => (
              <View key={i} style={[styles.scorePill, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.scoreText, { color: colors.onSurfaceVariant }]}>
                  {v ?? "—"}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.ratingMeta, { color: colors.onSurfaceDisabled }]}>
            {formatDate(r.created_at)}{r.rater_name ? ` · ${r.rater_name}` : ""}
          </Text>
          {r.notes ? (
            <Text style={[styles.ratingNotes, { color: colors.onSurfaceVariant }]}>{r.notes}</Text>
          ) : null}
        </GlassCard>
      ))}
    </View>
  );
}

function DisciplineTab({
  infractions,
  discActions,
  summary,
}: {
  infractions: EmployeeProfileInfraction[];
  discActions: EmployeeProfileDiscAction[];
  summary: EmployeeProfileResponse["summary"];
}) {
  const colors = useColors();
  if (infractions.length === 0 && discActions.length === 0) {
    return (
      <View style={styles.tabEmpty}>
        <Text style={[styles.tabEmptyText, { color: colors.onSurfaceVariant }]}>
          No infractions or actions in the last 90 days
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.tabContent}>
      <View style={styles.discSummaryRow}>
        <GlassCard style={styles.discSummaryCard}>
          <Text style={[styles.discSummaryValue, { color: colors.onSurface }]}>
            {summary.infraction_count}
          </Text>
          <Text style={[styles.discSummaryLabel, { color: colors.onSurfaceVariant }]}>
            Infractions
          </Text>
        </GlassCard>
        <GlassCard style={styles.discSummaryCard}>
          <Text
            style={[
              styles.discSummaryValue,
              { color: summary.total_points > 0 ? "#DC2626" : colors.onSurface },
            ]}
          >
            {summary.total_points}
          </Text>
          <Text style={[styles.discSummaryLabel, { color: colors.onSurfaceVariant }]}>
            Total Points
          </Text>
        </GlassCard>
      </View>

      {infractions.length > 0 && (
        <>
          <Text style={[styles.discSectionTitle, { color: colors.onSurfaceVariant }]}>Infractions</Text>
          {infractions.map((inf) => (
            <GlassCard key={inf.id}>
              <View style={styles.discRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.discTitle, { color: colors.onSurface }]}>{inf.infraction}</Text>
                  {inf.description ? (
                    <Text style={[styles.discDesc, { color: colors.onSurfaceVariant }]}>{inf.description}</Text>
                  ) : null}
                  <Text style={[styles.discMeta, { color: colors.onSurfaceDisabled }]}>
                    {formatDate(inf.infraction_date)}{inf.leader_name ? ` · ${inf.leader_name}` : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pointsBadge,
                    { backgroundColor: inf.points > 0 ? "#FEE2E2" : colors.surfaceVariant },
                  ]}
                >
                  <Text
                    style={[
                      styles.pointsText,
                      { color: inf.points > 0 ? "#DC2626" : colors.onSurfaceVariant },
                    ]}
                  >
                    {inf.points}pt{inf.points !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </>
      )}

      {discActions.length > 0 && (
        <>
          <Text style={[styles.discSectionTitle, { color: colors.onSurfaceVariant }]}>
            Disciplinary Actions
          </Text>
          {discActions.map((da) => (
            <GlassCard key={da.id}>
              <Text style={[styles.discTitle, { color: colors.onSurface }]}>{da.action}</Text>
              <Text style={[styles.discMeta, { color: colors.onSurfaceDisabled }]}>
                {formatDate(da.action_date)}{da.leader_name ? ` · ${da.leader_name}` : ""}
              </Text>
            </GlassCard>
          ))}
        </>
      )}
    </View>
  );
}

function ComingSoonTab({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.tabEmpty}>
      <GlassCard style={{ alignItems: "center", paddingVertical: spacing[10] } as any}>
        <Text style={{ fontSize: 48, marginBottom: spacing[3] }}>🚧</Text>
        <Text style={[styles.tabEmptyText, { color: colors.onSurfaceVariant }]}>
          {label} — Coming Soon
        </Text>
      </GlassCard>
    </View>
  );
}

// =============================================================================
// Profile Drawer
// =============================================================================

const PROFILE_TABS = ["Schedule", "PE", "Discipline", "Pathway", "Evaluations"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function EmployeeProfileDrawer({
  visible,
  onClose,
  employeeId,
}: {
  visible: boolean;
  onClose: () => void;
  employeeId: string | null;
}) {
  const colors = useColors();
  const { session } = useAuth();
  const { selectedLocationId } = useLocation();
  const [data, setData] = useState<EmployeeProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("Schedule");

  useEffect(() => {
    if (!visible || !employeeId || !session?.access_token || !selectedLocationId) {
      setData(null);
      setActiveTab("Schedule");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchEmployeeProfileAuth(session.access_token, selectedLocationId, employeeId)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, employeeId, session?.access_token, selectedLocationId]);

  const renderTabContent = () => {
    if (!data) return null;
    switch (activeTab) {
      case "Schedule":
        return <ScheduleTab schedule={data.schedule} />;
      case "PE":
        return <PETab ratings={data.ratings} summary={data.summary} />;
      case "Discipline":
        return <DisciplineTab infractions={data.infractions} discActions={data.disc_actions} summary={data.summary} />;
      case "Pathway":
        return <ComingSoonTab label="Pathway" />;
      case "Evaluations":
        return <ComingSoonTab label="Evaluations" />;
    }
  };

  return (
    <GlassDrawer
      visible={visible}
      onClose={onClose}
      title={data?.employee.full_name ?? "Employee"}
      fullScreen
      scrollable={false}
    >
      {loading ? (
        <View style={styles.drawerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : data ? (
        <View style={{ flex: 1 }}>
          {/* Profile header */}
          <View style={styles.profileHeader}>
            {data.employee.profile_image ? (
              <Image
                source={{ uri: data.employee.profile_image }}
                style={[styles.profileAvatar, { backgroundColor: colors.surfaceVariant }]}
                cachePolicy="disk"
              />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: avatarColor(data.employee.full_name) }]}>
                <Text style={styles.profileAvatarText}>{getInitials(data.employee.full_name)}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.onSurface }]}>
                {data.employee.full_name}
              </Text>
              {data.employee.role && (
                <View style={[styles.rolePill, { backgroundColor: colors.primaryTransparent }]}>
                  <Text style={[styles.rolePillText, { color: colors.primary }]}>
                    {data.employee.role}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tab bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
            style={{ flexGrow: 0 }}
          >
            {PROFILE_TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => { haptics.selection(); setActiveTab(tab); }}
                  style={[
                    styles.tabItem,
                    active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: active ? colors.primary : colors.onSurfaceVariant },
                      active && { fontWeight: fontWeights.semibold },
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Tab content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[10] }}
            showsVerticalScrollIndicator={false}
          >
            {renderTabContent()}
          </ScrollView>
        </View>
      ) : null}
    </GlassDrawer>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export default function EmployeesScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { selectedLocationId } = useLocation();

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const loadEmployees = useCallback(async () => {
    if (!session?.access_token || !selectedLocationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchEmployeesAuth(session.access_token, selectedLocationId);
      setEmployees(res.employees);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load employees");
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, selectedLocationId]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const e of employees) if (e.role) roles.add(e.role);
    return Array.from(roles).sort();
  }, [employees]);

  const filtered = useMemo(() => applyFilters(employees, filters), [employees, filters]);
  const activeFilterCount = countActiveFilters(filters);

  const openProfile = useCallback((id: string) => {
    setSelectedEmployeeId(id);
    setDrawerVisible(true);
  }, []);

  const closeProfile = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: EmployeeListItem; index: number }) => (
      <EmployeeRow item={item} index={index} onPress={() => openProfile(item.id)} />
    ),
    [openProfile]
  );

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: spacing[4] }}>⚠️</Text>
        <Text style={[typography.h4, { color: colors.error, marginBottom: spacing[2] }]}>
          Something went wrong
        </Text>
        <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: "center" }]}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header row: count + filter button */}
      <View style={styles.listHeader}>
        <Text style={[styles.countLabel, { color: colors.onSurfaceVariant }]}>
          {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
        </Text>
        <GlassButton
          label="Filter"
          size="small"
          icon={<AppIcon name="line.3.horizontal.decrease" size={14} tintColor={colors.onSurfaceVariant} />}
          onPress={() => { haptics.light(); setFilterVisible(true); }}
        />
        {activeFilterCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </View>

      {/* Employee list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadEmployees}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : undefined}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.centered}>
              <GlassCard style={{ alignItems: "center", paddingVertical: spacing[10] } as any}>
                <Text style={{ fontSize: 56, marginBottom: spacing[4] }}>👥</Text>
                <Text style={[typography.h3, { color: colors.onSurface, marginBottom: spacing[2] }]}>
                  No Employees
                </Text>
                <Text
                  style={[
                    typography.bodyMedium,
                    { color: colors.onSurfaceVariant, textAlign: "center" },
                  ]}
                >
                  {activeFilterCount > 0
                    ? "No employees match the current filters."
                    : "Employee information will appear here once the system is connected."}
                </Text>
              </GlassCard>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Filter modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={setFilters}
        availableRoles={availableRoles}
      />

      {/* Profile drawer */}
      <EmployeeProfileDrawer
        visible={drawerVisible}
        onClose={closeProfile}
        employeeId={selectedEmployeeId}
      />
    </View>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },

  // List header
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  countLabel: {
    ...typography.labelMedium,
    flex: 1,
  },
  badge: {
    position: "absolute",
    right: spacing[4] - 4,
    top: spacing[2] - 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  rowInfo: { flex: 1 },
  rowName: {
    ...typography.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  rowMeta: {
    ...typography.bodySmall,
    marginTop: 1,
  },

  // Filter modal
  filterContent: { padding: spacing[4], gap: spacing[5] },
  filterSection: { gap: spacing[2] },
  filterLabel: { ...typography.labelMedium },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderCurve: "continuous",
  },
  chipText: { ...typography.labelSmall },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  filterFooter: { flexDirection: "row", gap: spacing[3], justifyContent: "flex-end" },

  // Profile drawer
  drawerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[4],
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  profileInfo: { flex: 1, gap: spacing[1] },
  profileName: {
    ...typography.h3,
  },
  rolePill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderCurve: "continuous",
  },
  rolePillText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.semibold,
  },

  // Tab bar
  tabBar: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  tabItem: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  tabLabel: {
    ...typography.labelMedium,
  },

  // Tab content shared
  tabContent: { gap: spacing[3] },
  tabEmpty: {
    paddingVertical: spacing[10],
    alignItems: "center",
  },
  tabEmptyText: {
    ...typography.bodyMedium,
    textAlign: "center",
  },
  tabSummary: {
    ...typography.labelMedium,
    marginBottom: spacing[1],
  },

  // Schedule tab
  schedDayLabel: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing[1],
  },
  schedShiftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[1],
  },
  schedPosition: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
    minWidth: 80,
  },
  schedTime: {
    ...typography.bodySmall,
    fontVariant: ["tabular-nums"],
  },

  // PE tab
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  ratingPosition: {
    ...typography.bodyLarge,
    fontWeight: fontWeights.semibold,
  },
  ratingAvg: {
    ...typography.h4,
    fontWeight: fontWeights.bold,
  },
  ratingScores: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  scorePill: {
    width: 36,
    height: 28,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.semibold,
    fontVariant: ["tabular-nums"],
  },
  ratingMeta: {
    ...typography.bodySmall,
  },
  ratingNotes: {
    ...typography.bodySmall,
    fontStyle: "italic",
    marginTop: spacing[1],
  },

  // Discipline tab
  discSummaryRow: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  discSummaryCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[4],
  },
  discSummaryValue: {
    ...typography.h2,
    marginBottom: spacing[1],
  },
  discSummaryLabel: {
    ...typography.labelSmall,
  },
  discSectionTitle: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  discRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  discTitle: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  discDesc: {
    ...typography.bodySmall,
    marginBottom: 2,
  },
  discMeta: {
    ...typography.bodySmall,
  },
  pointsBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
  },
  pointsText: {
    ...typography.labelSmall,
    fontWeight: fontWeights.bold,
  },
});
