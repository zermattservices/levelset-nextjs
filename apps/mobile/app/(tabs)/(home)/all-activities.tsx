/**
 * All Activities Screen
 * Full view of all recent activities with search, filter by type/direction/date.
 *
 * On initial load, uses the cached 90-day data already fetched by the home page.
 * Only re-fetches from the API when the date range filter is changed.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "../../../src/context/AuthContext";
import { useLocation } from "../../../src/context/LocationContext";
import { useColors } from "../../../src/context/ThemeContext";
import { fetchAllActivitiesAuth } from "../../../src/lib/api";
import type { RecentActivity, RatingThresholds } from "../../../src/lib/api";
import { ActivityCard } from "../../../src/components/ActivityCard";
import { GlassCard } from "../../../src/components/glass";
import { SearchBar } from "../../../src/components/employee-overview/SearchBar";
import {
  ActivityFilterDrawer,
  DEFAULT_ACTIVITY_FILTERS,
  type ActivityFilterState,
} from "../../../src/components/ActivityFilterDrawer";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeStartDate(filters: ActivityFilterState): string | undefined {
  if (filters.dateRange === "custom" && filters.customStartDate) {
    return filters.customStartDate;
  }
  const days = filters.dateRange === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDateISO(d);
}

export default function AllActivitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, employeeId } = useAuth();
  const { selectedLocation } = useLocation();

  const locationId = selectedLocation?.id;
  const accessToken = session?.access_token;

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [thresholds, setThresholds] = useState<RatingThresholds | undefined>();
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  const [searchText, setSearchText] = useState("");
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<ActivityFilterState>(DEFAULT_ACTIVITY_FILTERS);
  // Track the date range that triggered the last fetch so we only refetch on date changes
  const lastFetchedDateKey = useRef<string>("");

  // Build a key that represents the current date range filter
  const dateFilterKey = useMemo(() => {
    if (filters.dateRange === "custom") {
      return `custom:${filters.customStartDate || ""}:${filters.customEndDate || ""}`;
    }
    return filters.dateRange;
  }, [filters.dateRange, filters.customStartDate, filters.customEndDate]);

  // Fetch activities — only when date range changes (direction/type/search are client-side)
  const fetchActivities = useCallback(async () => {
    if (!accessToken || !locationId || !employeeId) return;

    setLoading(true);

    try {
      const startDate = computeStartDate(filters);
      const data = await fetchAllActivitiesAuth(accessToken, locationId, employeeId, {
        startDate,
        limit: 100,
      });
      setActivities(data.activities);
      setThresholds(data.thresholds);
      hasLoaded.current = true;
      lastFetchedDateKey.current = dateFilterKey;
    } catch (err) {
      console.warn("[AllActivities] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [accessToken, locationId, employeeId, filters, dateFilterKey]);

  // Initial load + refetch when date range changes
  useEffect(() => {
    if (dateFilterKey !== lastFetchedDateKey.current) {
      fetchActivities();
    }
  }, [dateFilterKey, fetchActivities]);

  // Client-side filtering (direction, type, search) — no network request
  const filtered = useMemo(() => {
    let list = activities;

    // Direction filter
    if (filters.direction === "incoming") {
      list = list.filter((a) => !a.is_outgoing);
    } else if (filters.direction === "outgoing") {
      list = list.filter((a) => a.is_outgoing);
    }

    // Type filter
    if (filters.activityType !== "all") {
      list = list.filter((a) => a.type === filters.activityType);
    }

    // Search
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter((a) => {
        const searchable = [
          a.position,
          a.infraction_name,
          a.action_type,
          a.evaluation_name,
          a.rater_name,
          a.leader_name,
          a.evaluator_name,
          a.recipient_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      });
    }

    return list;
  }, [activities, filters, searchText]);

  const isFiltered =
    filters.direction !== "all" ||
    filters.activityType !== "all" ||
    filters.dateRange !== "90d";

  const handleApplyFilters = (f: ActivityFilterState) => {
    setFilters(f);
    setFilterDrawerVisible(false);
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_ACTIVITY_FILTERS);
    setFilterDrawerVisible(false);
  };

  const renderItem = useCallback(
    ({ item }: { item: RecentActivity }) => (
      <ActivityCard
        activity={item}
        locationId={locationId!}
        thresholds={thresholds}
      />
    ),
    [locationId, thresholds]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 50 }]}>
      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search activities..."
          onFilterPress={() => setFilterDrawerVisible(true)}
          filterActive={isFiltered}
        />
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.onSurfaceVariant }]}>
          {loading
            ? " "
            : `${filtered.length} ${filtered.length === 1 ? "activity" : "activities"}`}
        </Text>
      </View>

      {/* Activity List */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonCards colors={colors} count={6} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppIcon name="clock" size={36} tintColor={colors.onSurfaceDisabled} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
            No activities found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
            {searchText || isFiltered
              ? "Try adjusting your search or filters."
              : "No recent activities to show."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.type}-${item.id}-${item.is_outgoing ? "out" : "in"}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
        />
      )}

      {/* Filter Drawer */}
      <ActivityFilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading (matches home page pattern)
// ---------------------------------------------------------------------------

function SkeletonCards({
  colors,
  count = 5,
}: {
  colors: ReturnType<typeof useColors>;
  count?: number;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  return (
    <View style={{ gap: spacing[3] }}>
      {Array.from({ length: count }, (_, i) => (
        <GlassCard key={i}>
          <View style={{ gap: spacing[2] }}>
            {/* Top row: badge + date */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SkeletonBone width={70} height={20} pulseOpacity={pulse} />
              <SkeletonBone width={50} height={14} pulseOpacity={pulse} />
            </View>
            {/* Primary text */}
            <SkeletonBone
              width={i % 3 === 0 ? 120 : i % 3 === 1 ? 100 : 140}
              height={16}
              pulseOpacity={pulse}
            />
            {/* Secondary text */}
            <SkeletonBone width={80} height={14} pulseOpacity={pulse} />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

function SkeletonBone({
  width,
  height,
  pulseOpacity,
}: {
  width: number;
  height: number;
  pulseOpacity: Animated.SharedValue<number>;
}) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 4,
          borderCurve: "continuous",
          backgroundColor: "rgba(120,120,128,0.12)",
        },
        animStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  countRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  countText: {
    ...typography.bodySmall,
  },
  skeletonContainer: {
    paddingHorizontal: spacing[4],
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[8],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 120, // extra space to clear the tab bar + FAB
    gap: spacing[3],
  },
});
