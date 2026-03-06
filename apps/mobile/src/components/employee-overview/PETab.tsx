/**
 * PETab Component
 * Positional Excellence tab for the Employee Overview screen.
 * Shows position averages and individual ratings with search/filter support.
 */

import React, { useState, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Rocket } from "lucide-react-native";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";
import { GlassCard } from "../glass";
import { AppIcon } from "../ui";
import { getRatingColor } from "../../lib/rating-colors";
import { formatRelativeDate } from "../../lib/date-utils";
import type { EmployeeProfileResponse, EmployeeProfileRating } from "../../lib/api";
import { FolderTabs } from "./FolderTabs";
import { SearchBar } from "./SearchBar";
import { PositionCard } from "./PositionCard";
import { PEFilterDrawer, PEFilterState } from "./PEFilterDrawer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PETabProps {
  data: EmployeeProfileResponse;
  locationId: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onDateRangeLabelChange?: (label: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOH_COLOR = "#006391";
const BOH_COLOR = "#ffcc5b";

const DEFAULT_FILTERS: PEFilterState = {
  position: null,
  rater: null,
  zone: null,
  dateRange: "90d",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeDateRange(filters: PEFilterState): { startDate: string; endDate: string } {
  const today = new Date();
  const endDate = formatDateISO(today);

  if (filters.dateRange === "custom" && filters.customStartDate && filters.customEndDate) {
    return { startDate: filters.customStartDate, endDate: filters.customEndDate };
  }

  const daysAgo = filters.dateRange === "30d" ? 30 : 90;
  const start = new Date(today);
  start.setDate(start.getDate() - daysAgo);
  return { startDate: formatDateISO(start), endDate };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PETab({ data, locationId, onDateRangeChange, onDateRangeLabelChange }: PETabProps) {
  const router = useRouter();
  const colors = useColors();
  const { t } = useTranslation();

  // State
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [filters, setFilters] = useState<PEFilterState>(DEFAULT_FILTERS);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  // Compute position averages from ratings when server-side averages are empty
  const effectivePositionAverages = useMemo(() => {
    if (data.position_averages && data.position_averages.length > 0) {
      return data.position_averages;
    }
    // Fall back: compute from ratings
    const posMap: Record<string, { total: number; count: number; zone: string | null }> = {};
    data.ratings.forEach((r) => {
      if (!r.position || r.rating_avg == null) return;
      if (!posMap[r.position]) {
        posMap[r.position] = { total: 0, count: 0, zone: r.zone ?? null };
      }
      posMap[r.position].total += r.rating_avg;
      posMap[r.position].count += 1;
    });
    return Object.entries(posMap).map(([position, { total, count, zone }]) => ({
      position,
      average: Math.round((total / count) * 100) / 100,
      count,
      zone,
    }));
  }, [data.position_averages, data.ratings]);

  const uniquePositions = useMemo(() => {
    const set = new Set<string>();
    data.ratings.forEach((r) => {
      if (r.position) set.add(r.position);
    });
    return Array.from(set).sort();
  }, [data.ratings]);

  const uniqueRaters = useMemo(() => {
    const set = new Set<string>();
    data.ratings.forEach((r) => {
      if (r.rater_name) set.add(r.rater_name);
    });
    return Array.from(set).sort();
  }, [data.ratings]);

  const filteredRatings = useMemo(() => {
    return data.ratings.filter((r) => {
      // Search filter
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const matchesPosition = r.position?.toLowerCase().includes(q);
        const matchesRater = r.rater_name?.toLowerCase().includes(q);
        const matchesZone = r.zone?.toLowerCase().includes(q);
        if (!matchesPosition && !matchesRater && !matchesZone) return false;
      }

      // Position filter
      if (filters.position !== null && r.position !== filters.position) return false;

      // Rater filter
      if (filters.rater !== null && r.rater_name !== filters.rater) return false;

      // Zone filter
      if (filters.zone !== null && r.zone !== filters.zone) return false;

      return true;
    });
  }, [data.ratings, searchText, filters]);

  const filterActive =
    filters.position !== null ||
    filters.rater !== null ||
    filters.zone !== null ||
    filters.dateRange !== "90d";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleDateRangeFilter = (f: PEFilterState) => {
    const { startDate, endDate } = computeDateRange(f);
    onDateRangeChange(startDate, endDate);
  };

  const getDateRangeLabel = (f: PEFilterState): string => {
    if (f.dateRange === "30d") return "Last 30 Days";
    if (f.dateRange === "90d") return "Last 90 Days";
    if (f.dateRange === "custom" && f.customStartDate && f.customEndDate) {
      const fmt = (d: string) => {
        const date = new Date(d + "T00:00:00");
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      };
      return `${fmt(f.customStartDate)} – ${fmt(f.customEndDate)}`;
    }
    return "Last 90 Days";
  };

  const handleApplyFilters = (f: PEFilterState) => {
    setFilters(f);
    setFilterDrawerVisible(false);
    handleDateRangeFilter(f);
    onDateRangeLabelChange?.(getDateRangeLabel(f));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setFilterDrawerVisible(false);
    handleDateRangeFilter(DEFAULT_FILTERS);
    onDateRangeLabelChange?.(getDateRangeLabel(DEFAULT_FILTERS));
  };

  const handlePositionCardPress = (positionName: string) => {
    setActiveSubTab(1);
    setFilters((prev) => ({ ...prev, position: positionName }));
  };

  // ---------------------------------------------------------------------------
  // Sub-tab content
  // ---------------------------------------------------------------------------

  const renderPositionsTab = () => {
    if (effectivePositionAverages.length === 0) {
      return (
        <GlassCard>
          <View style={{ alignItems: "center", gap: spacing[2], paddingVertical: spacing[4] }}>
            <AppIcon name="chart.bar" size={32} tintColor={colors.onSurfaceDisabled} />
            <Text
              style={{
                ...typography.bodyMedium,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              No position data yet
            </Text>
          </View>
        </GlassCard>
      );
    }

    return (
      <View style={{ gap: spacing[3] }}>
        {effectivePositionAverages.map((pa) => (
          <PositionCard
            key={pa.position}
            position={pa.position}
            average={pa.average}
            ratingCount={pa.count}
            zone={pa.zone}
            thresholds={data.thresholds ?? undefined}
            onPress={() => handlePositionCardPress(pa.position)}
          />
        ))}
      </View>
    );
  };

  const renderRatingCard = (rating: EmployeeProfileRating) => {
    const ratingConfig = {
      color: colors.success,
      bgColor: colors.successTransparent,
    };

    return (
      <GlassCard
        key={rating.id}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/(home)/rating-detail",
            params: { ratingId: rating.id, locationId },
          })
        }
      >
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
              backgroundColor: ratingConfig.bgColor,
              paddingHorizontal: spacing[2],
              paddingVertical: 3,
              borderRadius: borderRadius.sm,
              borderCurve: "continuous" as const,
            }}
          >
            <Rocket size={12} color={ratingConfig.color} strokeWidth={1.5} />
            <Text
              style={{
                ...typography.labelSmall,
                fontWeight: fontWeights.semibold,
                color: ratingConfig.color,
              }}
            >
              Rating
            </Text>
          </View>
          <Text
            style={{
              ...typography.labelSmall,
              color: colors.onSurfaceDisabled,
            }}
          >
            {formatRelativeDate(rating.created_at)}
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
          {/* Left: position + rater */}
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
              <Text
                style={{
                  ...typography.labelLarge,
                  fontWeight: fontWeights.semibold,
                  color: colors.onSurface,
                }}
                numberOfLines={1}
              >
                {rating.position}
              </Text>
              {rating.zone && (
                <View
                  style={{
                    paddingHorizontal: 6,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: rating.zone === "FOH" ? FOH_COLOR : BOH_COLOR,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: fontWeights.semibold,
                      color: "#ffffff",
                    }}
                  >
                    {rating.zone}
                  </Text>
                </View>
              )}
            </View>
            {rating.rater_name && (
              <Text
                style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
                numberOfLines={1}
              >
                {rating.rater_name}
              </Text>
            )}
          </View>

          {/* Right: color-coded score tag */}
          {rating.rating_avg != null && (
            <View
              style={{
                backgroundColor: getRatingColor(rating.rating_avg, data.thresholds ?? undefined),
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 10,
                borderCurve: "continuous" as const,
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
                {rating.rating_avg.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </GlassCard>
    );
  };

  const renderAllRatingsTab = () => (
    <View style={{ gap: spacing[3] }}>
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search ratings..."
        onFilterPress={() => setFilterDrawerVisible(true)}
        filterActive={filterActive}
      />

      {filteredRatings.length === 0 ? (
        <GlassCard>
          <View style={{ alignItems: "center", gap: spacing[2], paddingVertical: spacing[4] }}>
            <AppIcon name="chart.bar" size={32} tintColor={colors.onSurfaceDisabled} />
            <Text
              style={{
                ...typography.bodyMedium,
                color: colors.onSurfaceDisabled,
                textAlign: "center",
              }}
            >
              No ratings found
            </Text>
          </View>
        </GlassCard>
      ) : (
        filteredRatings.map(renderRatingCard)
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={{ gap: spacing[3] }}>
      <FolderTabs
        tabs={["Positions", "All Ratings"]}
        activeIndex={activeSubTab}
        onTabChange={setActiveSubTab}
      />

      {activeSubTab === 0 ? renderPositionsTab() : renderAllRatingsTab()}

      <PEFilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
        positions={uniquePositions}
        raters={uniqueRaters}
      />
    </View>
  );
}

export default PETab;
