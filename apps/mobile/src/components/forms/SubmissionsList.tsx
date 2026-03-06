/**
 * SubmissionsList
 * Chronological list of all form submissions at the current location.
 * Reuses the ActivityCard component for consistent card rendering.
 * Supports pull-to-refresh and pagination.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { useLocation } from "../../context/LocationContext";
import { useAuth } from "../../context/AuthContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";
import { AppIcon } from "../ui/AppIcon";
import { ActivityCard } from "../ActivityCard";
import {
  fetchSubmissionsAuth,
  SubmissionRecord,
  SubmissionsFilters,
  RecentActivity,
} from "../../lib/api";

interface SubmissionsListProps {
  filters?: SubmissionsFilters;
  onFilterPress?: () => void;
  activeFilterCount?: number;
}

// ---------------------------------------------------------------------------
// Map SubmissionRecord → RecentActivity so we can reuse ActivityCard
// ---------------------------------------------------------------------------

function mapToActivity(sub: SubmissionRecord): RecentActivity {
  const typeMap: Record<SubmissionRecord["form_type"], RecentActivity["type"]> = {
    ratings: "rating",
    infractions: "infraction",
    disc_actions: "disc_action",
  };

  return {
    id: sub.id,
    type: typeMap[sub.form_type],
    date: sub.created_at,
    // Rating fields
    position: sub.position,
    rating_avg: sub.overall_score ?? undefined,
    rater_name: sub.form_type === "ratings" ? sub.submitted_by_name : undefined,
    // Infraction fields
    infraction_name: sub.infraction_name,
    points: sub.point_value,
    leader_name: sub.form_type !== "ratings" ? sub.submitted_by_name : undefined,
    // Disc action fields
    action_type: sub.action_name,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SubmissionsList({
  filters,
  onFilterPress,
  activeFilterCount = 0,
}: SubmissionsListProps) {
  const colors = useColors();
  const { selectedLocationId } = useLocation();
  const { session } = useAuth();

  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (!selectedLocationId || !session?.access_token) return;

      try {
        if (isRefresh) setIsRefreshing(true);
        else if (pageNum === 1) setIsLoading(true);

        const result = await fetchSubmissionsAuth(
          session.access_token,
          selectedLocationId,
          filters,
          pageNum
        );

        if (pageNum === 1 || isRefresh) {
          setSubmissions(result.submissions);
        } else {
          setSubmissions((prev) => [...prev, ...result.submissions]);
        }

        setTotal(result.total);
        setHasMore(result.submissions.length === result.limit);
        setPage(pageNum);
      } catch (err) {
        console.error("[SubmissionsList] Error fetching submissions:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedLocationId, session?.access_token, filters]
  );

  // Initial fetch and re-fetch on filter/location change
  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData(1, true);
  }, [fetchData]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading && !isRefreshing) {
      fetchData(page + 1);
    }
  }, [hasMore, isLoading, isRefreshing, page, fetchData]);

  const renderSubmission = ({
    item,
    index,
  }: {
    item: SubmissionRecord;
    index: number;
  }) => {
    const activity = mapToActivity(item);

    return (
      <Animated.View entering={FadeIn.delay(Math.min(index * 50, 300))}>
        {/* Employee name label above the card */}
        <Text
          style={{
            ...typography.labelSmall,
            color: colors.onSurfaceDisabled,
            marginBottom: 4,
            marginLeft: spacing[1],
          }}
          numberOfLines={1}
        >
          {item.employee_name}
        </Text>
        <ActivityCard
          activity={activity}
          locationId={selectedLocationId!}
        />
      </Animated.View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: spacing[12],
          gap: spacing[3],
        }}
      >
        <AppIcon
          name="doc.text.magnifyingglass"
          size={48}
          tintColor={colors.onSurfaceDisabled}
        />
        <Text style={[typography.h3, { color: colors.onSurface }]}>
          No submissions yet
        </Text>
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onSurfaceVariant, textAlign: "center" },
          ]}
        >
          Form submissions will appear here
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore || submissions.length === 0) return null;

    return (
      <View style={{ paddingVertical: spacing[4], alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  if (isLoading && submissions.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={submissions}
      keyExtractor={(item) => `${item.form_type}-${item.id}`}
      renderItem={renderSubmission}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      contentContainerStyle={{
        padding: spacing[4],
        gap: spacing[3],
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
    />
  );
}

export default SubmissionsList;
