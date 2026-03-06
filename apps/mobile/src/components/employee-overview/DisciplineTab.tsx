/**
 * DisciplineTab Component
 * Shows a merged, filterable list of infractions and discipline actions
 * for an employee profile.
 */

import React, { useState, useMemo } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Gavel } from "lucide-react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassCard } from "../glass";
import { AppIcon } from "../ui";
import { formatRelativeDate } from "../../lib/date-utils";
import type {
  EmployeeProfileResponse,
  EmployeeProfileInfraction,
  EmployeeProfileDiscAction,
} from "../../lib/api";
import { SearchBar } from "./SearchBar";
import {
  DisciplineFilterDrawer,
  DEFAULT_DISCIPLINE_FILTERS,
  type DisciplineFilterState,
} from "./DisciplineFilterDrawer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DisciplineTabProps {
  data: EmployeeProfileResponse;
  locationId: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

type DisciplineItem =
  | { kind: "infraction"; data: EmployeeProfileInfraction; date: string }
  | { kind: "action"; data: EmployeeProfileDiscAction; date: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PENALTY_RED = "#dc2626";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateRange(
  dateRange: DisciplineFilterState["dateRange"],
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = today.toISOString().split("T")[0];

  switch (dateRange) {
    case "7d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString().split("T")[0], endDate };
    }
    case "30d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString().split("T")[0], endDate };
    }
    case "90d": {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return { startDate: start.toISOString().split("T")[0], endDate };
    }
    case "custom":
      return {
        startDate: customStart || endDate,
        endDate: customEnd || endDate,
      };
  }
}

// ---------------------------------------------------------------------------
// DisciplineCard (inline)
// ---------------------------------------------------------------------------

function DisciplineCard({
  item,
  locationId,
}: {
  item: DisciplineItem;
  locationId: string;
}) {
  const router = useRouter();
  const colors = useColors();
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const isInfraction = item.kind === "infraction";

  const handlePress = () => {
    haptics.light();
    if (isInfraction) {
      router.push({
        pathname: "/(tabs)/(home)/infraction-detail",
        params: { infractionId: item.data.id, locationId },
      });
    } else {
      router.push({
        pathname: "/(tabs)/(home)/infraction-detail",
        params: {
          infractionId: item.data.id,
          locationId,
          isDiscAction: "true",
        },
      });
    }
  };

  // Badge config
  const badgeConfig = isInfraction
    ? {
        color: colors.error,
        bgColor: colors.errorTransparent,
        label: "Infraction",
      }
    : {
        color: colors.warning,
        bgColor: colors.warningTransparent,
        label: "Action",
      };

  // Content text
  const primaryText = isInfraction
    ? isEs
      ? item.data.infraction_es || item.data.infraction
      : item.data.infraction
    : isEs
      ? (item.data as EmployeeProfileDiscAction).action_es ||
        (item.data as EmployeeProfileDiscAction).action
      : (item.data as EmployeeProfileDiscAction).action;

  const leaderName = item.data.leader_name;

  // Points (infractions only)
  const points = isInfraction
    ? (item.data as EmployeeProfileInfraction).points
    : null;

  return (
    <GlassCard onPress={handlePress}>
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
            backgroundColor: badgeConfig.bgColor,
            paddingHorizontal: spacing[2],
            paddingVertical: 3,
            borderRadius: borderRadius.sm,
            borderCurve: "continuous",
          }}
        >
          <Gavel size={12} color={badgeConfig.color} strokeWidth={1.5} />
          <Text
            style={{
              ...typography.labelSmall,
              fontWeight: fontWeights.semibold,
              color: badgeConfig.color,
            }}
          >
            {badgeConfig.label}
          </Text>
        </View>
        <Text
          style={{
            ...typography.labelSmall,
            color: colors.onSurfaceDisabled,
          }}
        >
          {formatRelativeDate(item.date)}
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
        {/* Left: name + leader */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              ...typography.labelLarge,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
            }}
            numberOfLines={1}
          >
            {primaryText}
          </Text>
          {leaderName && (
            <Text
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceDisabled,
              }}
              numberOfLines={1}
            >
              {leaderName}
            </Text>
          )}
        </View>

        {/* Right: points tag (infractions only) */}
        {points != null && (
          <View
            style={{
              backgroundColor: PENALTY_RED,
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
              {points > 0 ? "+" : ""}
              {points}
            </Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  const colors = useColors();

  return (
    <GlassCard>
      <View style={{ alignItems: "center", paddingVertical: spacing[6], gap: spacing[2] }}>
        <Gavel size={32} color={colors.onSurfaceDisabled} strokeWidth={1.5} />
        <Text
          style={{
            ...typography.bodyMedium,
            color: colors.onSurfaceDisabled,
          }}
        >
          No discipline records
        </Text>
      </View>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DisciplineTab({
  data,
  locationId,
  onDateRangeChange,
}: DisciplineTabProps) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const [searchText, setSearchText] = useState("");
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<DisciplineFilterState>(
    DEFAULT_DISCIPLINE_FILTERS
  );

  // Extract unique names for filter drawer
  const infractionNames = useMemo(() => {
    const names = new Set<string>();
    data.infractions.forEach((inf) => {
      const label = isEs
        ? inf.infraction_es || inf.infraction
        : inf.infraction;
      names.add(label);
    });
    return Array.from(names).sort();
  }, [data.infractions, isEs]);

  const actionNames = useMemo(() => {
    const names = new Set<string>();
    data.disc_actions.forEach((act) => {
      const label = isEs ? act.action_es || act.action : act.action;
      names.add(label);
    });
    return Array.from(names).sort();
  }, [data.disc_actions, isEs]);

  // Merge and sort all discipline items by date descending
  const allItems = useMemo<DisciplineItem[]>(() => {
    const infractions: DisciplineItem[] = data.infractions.map((inf) => ({
      kind: "infraction" as const,
      data: inf,
      date: inf.infraction_date,
    }));
    const actions: DisciplineItem[] = data.disc_actions.map((act) => ({
      kind: "action" as const,
      data: act,
      date: act.action_date,
    }));
    return [...infractions, ...actions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [data.infractions, data.disc_actions]);

  // Apply filters
  const filteredItems = useMemo(() => {
    let items = allItems;

    // Type filter
    if (filters.type === "infraction") {
      items = items.filter((it) => it.kind === "infraction");
    } else if (filters.type === "action") {
      items = items.filter((it) => it.kind === "action");
    }

    // Infraction name filter
    if (filters.infractionName) {
      items = items.filter((it) => {
        if (it.kind !== "infraction") return true;
        const label = isEs
          ? it.data.infraction_es || it.data.infraction
          : it.data.infraction;
        return label === filters.infractionName;
      });
    }

    // Action name filter
    if (filters.actionName) {
      items = items.filter((it) => {
        if (it.kind !== "action") return true;
        const actData = it.data as EmployeeProfileDiscAction;
        const label = isEs
          ? actData.action_es || actData.action
          : actData.action;
        return label === filters.actionName;
      });
    }

    // Search text filter
    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      items = items.filter((it) => {
        if (it.kind === "infraction") {
          const inf = it.data as EmployeeProfileInfraction;
          const name = (isEs ? inf.infraction_es || inf.infraction : inf.infraction).toLowerCase();
          const leader = (inf.leader_name || "").toLowerCase();
          return name.includes(query) || leader.includes(query);
        } else {
          const act = it.data as EmployeeProfileDiscAction;
          const name = (isEs ? act.action_es || act.action : act.action).toLowerCase();
          const leader = (act.leader_name || "").toLowerCase();
          return name.includes(query) || leader.includes(query);
        }
      });
    }

    return items;
  }, [allItems, filters, searchText, isEs]);

  // Determine if any filter is active (differs from default)
  const filterActive =
    filters.type !== DEFAULT_DISCIPLINE_FILTERS.type ||
    filters.infractionName !== DEFAULT_DISCIPLINE_FILTERS.infractionName ||
    filters.actionName !== DEFAULT_DISCIPLINE_FILTERS.actionName ||
    filters.dateRange !== DEFAULT_DISCIPLINE_FILTERS.dateRange;

  // Handle date range changes from filter
  const handleApplyFilters = (newFilters: DisciplineFilterState) => {
    setFilters(newFilters);

    // Notify parent of date range change
    if (newFilters.dateRange !== filters.dateRange ||
        newFilters.customStartDate !== filters.customStartDate ||
        newFilters.customEndDate !== filters.customEndDate) {
      const { startDate, endDate } = getDateRange(
        newFilters.dateRange,
        newFilters.customStartDate,
        newFilters.customEndDate
      );
      onDateRangeChange(startDate, endDate);
    }
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_DISCIPLINE_FILTERS);
    const { startDate, endDate } = getDateRange(
      DEFAULT_DISCIPLINE_FILTERS.dateRange
    );
    onDateRangeChange(startDate, endDate);
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search..."
        onFilterPress={() => setFilterDrawerVisible(true)}
        filterActive={filterActive}
      />

      {filteredItems.length === 0 ? (
        <EmptyState />
      ) : (
        filteredItems.map((item) => (
          <DisciplineCard
            key={item.data.id}
            item={item}
            locationId={locationId}
          />
        ))
      )}

      <DisciplineFilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        infractionNames={infractionNames}
        actionNames={actionNames}
      />
    </View>
  );
}

export default DisciplineTab;
