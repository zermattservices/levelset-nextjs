/**
 * SubmissionsList
 * Chronological list of all form submissions at the current location.
 * Shows ratings, infractions, and disciplinary actions in a unified list.
 * Supports pull-to-refresh and pagination.
 */

import React, { useState, useEffect, useCallback } from "react";
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
import { spacing, borderRadius } from "../../lib/theme";
import { GlassCard } from "../glass/GlassCard";
import { AppIcon } from "../ui/AppIcon";
import {
  fetchSubmissionsAuth,
  SubmissionRecord,
  SubmissionsFilters,
} from "../../lib/api";

interface SubmissionsListProps {
  filters?: SubmissionsFilters;
  onFilterPress?: () => void;
  activeFilterCount?: number;
}

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

  const getFormTypeConfig = (formType: SubmissionRecord["form_type"]) => {
    switch (formType) {
      case "ratings":
        return {
          icon: "star.fill",
          iconColor: colors.warning,
          iconBg: colors.warningTransparent,
          label: "Rating",
        };
      case "infractions":
        return {
          icon: "doc.text.fill",
          iconColor: colors.primary,
          iconBg: colors.primaryTransparent,
          label: "Infraction",
        };
      case "disc_actions":
        return {
          icon: "exclamationmark.shield.fill",
          iconColor: colors.error,
          iconBg: colors.errorTransparent,
          label: "Action",
        };
    }
  };

  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderSubmission = ({
    item,
    index,
  }: {
    item: SubmissionRecord;
    index: number;
  }) => {
    const config = getFormTypeConfig(item.form_type);

    // Build detail line based on form type
    let detailLine = "";
    if (item.form_type === "ratings") {
      const parts: string[] = [];
      if (item.position) parts.push(item.position);
      if (item.overall_score != null) parts.push(`${item.overall_score}/5.0`);
      detailLine = parts.join(" • ");
    } else if (item.form_type === "infractions") {
      const parts: string[] = [];
      if (item.infraction_name) parts.push(item.infraction_name);
      if (item.point_value != null) parts.push(`+${item.point_value} pts`);
      detailLine = parts.join(" • ");
    } else if (item.form_type === "disc_actions") {
      detailLine = item.action_name || "";
    }

    return (
      <Animated.View entering={FadeIn.delay(Math.min(index * 50, 300))}>
        <GlassCard>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[3],
            }}
          >
            {/* Form type icon */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.sm,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: config.iconBg,
              }}
            >
              <AppIcon
                name={config.icon}
                size={20}
                tintColor={config.iconColor}
              />
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Text
                  style={[
                    typography.labelLarge,
                    {
                      color: colors.onSurface,
                      fontWeight: fontWeights.semibold,
                      flex: 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.employee_name}
                </Text>
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.onSurfaceDisabled, marginLeft: spacing[2] },
                  ]}
                >
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>

              {detailLine ? (
                <Text
                  style={[
                    typography.bodySmall,
                    { color: colors.onSurfaceVariant, marginTop: 2 },
                  ]}
                  numberOfLines={1}
                >
                  {detailLine}
                </Text>
              ) : null}

              <Text
                style={[
                  typography.bodySmall,
                  {
                    color: colors.onSurfaceDisabled,
                    marginTop: 2,
                    fontSize: 11,
                  },
                ]}
                numberOfLines={1}
              >
                Submitted by {item.submitted_by_name}
              </Text>
            </View>
          </View>
        </GlassCard>
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
