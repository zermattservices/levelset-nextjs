/**
 * EmployeesScreen
 * Displays employees for the selected location with filters. Tapping navigates to employee detail page.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useLocation } from "../../context/LocationContext";
import { useEmployees } from "../../context/EmployeesContext";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassCard, GlassButton, GlassModal } from "../../components/glass";
import { AppIcon } from "../../components/ui";
import {
  type EmployeeListItem,
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
// Main Screen
// =============================================================================

export default function EmployeesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { selectedLocationId } = useLocation();
  const { employees, loading: isLoading, refreshEmployees } = useEmployees();

  const [error] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    for (const e of employees) if (e.role) roles.add(e.role);
    return Array.from(roles).sort();
  }, [employees]);

  const filtered = useMemo(() => applyFilters(employees, filters), [employees, filters]);
  const activeFilterCount = countActiveFilters(filters);

  const openProfile = useCallback((id: string) => {
    if (!selectedLocationId) return;
    router.push({
      pathname: '/(tabs)/(home)/employee-overview',
      params: { employeeId: id, locationId: selectedLocationId },
    });
  }, [router, selectedLocationId]);

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
            onRefresh={refreshEmployees}
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

});
