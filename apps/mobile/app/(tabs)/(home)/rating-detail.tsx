/**
 * Rating Detail Screen
 * Shows full rating breakdown with criteria bars, overall average,
 * rater info, criteria info modal, and last-4 historical average.
 * Layout mirrors infraction-detail: left-justified info, tag on right.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../src/context/AuthContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius } from "../../../src/lib/theme";
import { GlassCard } from "../../../src/components/glass";
import { useGlass } from "../../../src/hooks/useGlass";
import { AppIcon } from "../../../src/components/ui";
import { fetchRatingDetailAuth } from "../../../src/lib/api";
import type { RatingDetailData } from "../../../src/lib/api";
import { getRatingColor as getThresholdColor } from "../../../src/lib/rating-colors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FOH_COLOR = "#006391";
const BOH_COLOR = "#ffcc5b";

const DEFAULT_LABELS = [
  "Criteria 1",
  "Criteria 2",
  "Criteria 3",
  "Criteria 4",
  "Criteria 5",
];

function formatFullTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return (
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RatingDetailScreen() {
  const { ratingId, locationId } = useLocalSearchParams<{
    ratingId: string;
    locationId: string;
  }>();
  const { session } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { t, i18n } = useTranslation();
  const { GlassView } = useGlass();
  const [data, setData] = useState<RatingDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criteriaModalVisible, setCriteriaModalVisible] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !locationId || !ratingId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await fetchRatingDetailAuth(
          session.access_token,
          locationId,
          ratingId
        );
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, locationId, ratingId]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
          gap: spacing[2],
        }}
      >
        <AppIcon
          name="exclamationmark.circle"
          size={32}
          tintColor={colors.onSurfaceDisabled}
        />
        <Text
          selectable
          style={{ ...typography.bodySmall, color: colors.onSurfaceDisabled }}
        >
          {error || "Rating not found"}
        </Text>
      </View>
    );
  }

  const isEs = i18n.language === "es";
  const { rating, labels, criteria, last4_avg } = data;

  // Build criteria labels: prefer position_big5_labels, then position_criteria names, then defaults
  const criteriaLabels = labels
    ? isEs
      ? [
          labels.label_1_es || labels.label_1,
          labels.label_2_es || labels.label_2,
          labels.label_3_es || labels.label_3,
          labels.label_4_es || labels.label_4,
          labels.label_5_es || labels.label_5,
        ]
      : [
          labels.label_1,
          labels.label_2,
          labels.label_3,
          labels.label_4,
          labels.label_5,
        ]
    : criteria && criteria.length > 0
      ? criteria.map((c) => isEs ? (c.name_es || c.name) : c.name)
      : DEFAULT_LABELS;
  const criteriaValues = [
    rating.rating_1,
    rating.rating_2,
    rating.rating_3,
    rating.rating_4,
    rating.rating_5,
  ];

  const avgColor =
    rating.rating_avg != null
      ? getThresholdColor(rating.rating_avg, data.thresholds)
      : colors.onSurfaceDisabled;

  // Glass close button for modal (circular, like the nav back button)
  const closeButton = GlassView ? (
    <GlassView
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
      isInteractive
    >
      <Pressable
        onPress={() => setCriteriaModalVisible(false)}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppIcon name="xmark" size={14} tintColor={colors.onSurface} />
      </Pressable>
    </GlassView>
  ) : (
    <Pressable
      onPress={() => setCriteriaModalVisible(false)}
      hitSlop={8}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceDisabled,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppIcon name="xmark" size={14} tintColor={colors.onSurface} />
    </Pressable>
  );

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          padding: spacing[5],
          gap: spacing[4],
          paddingBottom: spacing[10],
        }}
      >
        {/* Combined Rating Card: header + criteria + notes */}
        <GlassCard>
          <View style={{ gap: spacing[4] }}>
            {/* Centered rating avg + info rows */}
            <View style={{ alignItems: "center", gap: spacing[2] }}>
              {/* Rating avg tag */}
              {rating.rating_avg != null && (
                <View
                  style={{
                    backgroundColor: avgColor,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderCurve: "continuous",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.h2.fontFamily,
                      fontSize: 28,
                      fontWeight: fontWeights.bold,
                      color: "#ffffff",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {rating.rating_avg.toFixed(1)}
                  </Text>
                </View>
              )}
              {rating.employee_name && (
                <Text
                  style={{
                    ...typography.h3,
                    color: colors.onSurface,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {rating.employee_name}
                </Text>
              )}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <Text
                  style={{
                    ...typography.labelLarge,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                    flexShrink: 1,
                  }}
                  numberOfLines={2}
                >
                  {rating.position}
                </Text>
                {rating.zone && <ZoneTag zone={rating.zone} />}
              </View>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.onSurfaceVariant,
                }}
              >
                {formatFullTimestamp(rating.created_at)}
              </Text>
              {rating.rater_name && (
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  {t("recentActivities.ratedBy", {
                    name: rating.rater_name,
                  })}
                </Text>
              )}
            </View>

            {/* Divider before criteria */}
            <View style={{ height: 1, backgroundColor: colors.outline }} />

            {/* Criteria Breakdown */}
            <View style={{ gap: spacing[3] }}>
              {/* Header row with label and info button */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    ...typography.labelLarge,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                  }}
                >
                  {t("recentActivities.criteriaBreakdown")}
                </Text>
                {criteria && criteria.length > 0 && (
                  <Pressable
                    onPress={() => setCriteriaModalVisible(true)}
                    hitSlop={8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AppIcon
                      name="info.circle"
                      size={16}
                      tintColor={colors.primary}
                    />
                    <Text
                      style={{
                        ...typography.labelSmall,
                        color: colors.primary,
                        fontWeight: fontWeights.semibold,
                      }}
                    >
                      Criteria
                    </Text>
                  </Pressable>
                )}
              </View>
              {criteriaLabels.map((label, i) => (
                <CriteriaRow
                  key={i}
                  label={label}
                  value={criteriaValues[i]}
                  colors={colors}
                  thresholds={data.thresholds}
                />
              ))}
            </View>

            {/* Notes (below criteria) */}
            {rating.notes && (
              <>
                <View
                  style={{ height: 1, backgroundColor: colors.outline }}
                />
                <View style={{ gap: spacing[2] }}>
                  <Text
                    style={{
                      ...typography.labelLarge,
                      fontWeight: fontWeights.semibold,
                      color: colors.onSurface,
                    }}
                  >
                    {t("recentActivities.notes")}
                  </Text>
                  <Text
                    selectable
                    style={{
                      ...typography.bodyMedium,
                      color: colors.onSurfaceVariant,
                    }}
                  >
                    {rating.notes}
                  </Text>
                </View>
              </>
            )}
          </View>
        </GlassCard>

        {/* Rolling Average Card — taps to employee overview */}
        {last4_avg != null && (
          <GlassCard
            onPress={() => {
              if (rating.employee_id) {
                router.push({
                  pathname: "/(tabs)/(home)/employee-overview",
                  params: { employeeId: rating.employee_id, locationId },
                });
              }
            }}
          >
            <View style={{ alignItems: "center", gap: spacing[2] }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <Text
                  style={{
                    ...typography.labelLarge,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {rating.position}
                </Text>
                {rating.zone && <ZoneTag zone={rating.zone} />}
                <Text
                  style={{
                    ...typography.labelLarge,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  ·
                </Text>
                <Text
                  style={{
                    ...typography.labelLarge,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                  }}
                >
                  Rolling Average
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: typography.h1.fontFamily,
                  fontSize: 48,
                  fontWeight: fontWeights.bold,
                  color: getThresholdColor(last4_avg, data.thresholds),
                  fontVariant: ["tabular-nums"],
                }}
              >
                {last4_avg.toFixed(2)}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[1],
                }}
              >
                <Text
                  style={{
                    ...typography.labelSmall,
                    color: colors.onSurfaceDisabled,
                  }}
                >
                  See all ratings
                </Text>
                <AppIcon
                  name="chevron.right"
                  size={10}
                  tintColor={colors.onSurfaceDisabled}
                />
              </View>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Criteria Descriptions Modal — centered glass container */}
      <Modal
        visible={criteriaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCriteriaModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing[5],
          }}
          onPress={() => setCriteriaModalVisible(false)}
        >
          <CriteriaModalContent
            rating={rating}
            criteria={criteria}
            colors={colors}
            closeButton={closeButton}
            GlassView={GlassView}
            onClose={() => setCriteriaModalVisible(false)}
          />
        </Pressable>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Criteria Modal Content
// ---------------------------------------------------------------------------

function CriteriaModalContent({
  rating,
  criteria,
  colors,
  closeButton,
  GlassView,
  onClose,
}: {
  rating: RatingDetailData["rating"];
  criteria: RatingDetailData["criteria"];
  colors: ReturnType<typeof useColors>;
  closeButton: React.ReactNode;
  GlassView: any;
  onClose: () => void;
}) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === "es";

  const modalInner = (
    <>
      {/* Header row: title + glass close button */}
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: spacing[4],
          paddingBottom: spacing[2],
        }}
      >
        <View style={{ gap: 2, flex: 1, marginRight: spacing[3] }}>
          <Text
            style={{
              ...typography.h3,
              color: colors.onSurface,
            }}
          >
            Position Criteria
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <Text
              style={{
                ...typography.labelMedium,
                color: colors.onSurfaceVariant,
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {rating.position}
            </Text>
            {rating.zone && (
              <ZoneTag zone={rating.zone} />
            )}
          </View>
        </View>
        {closeButton}
      </Pressable>

      {/* Scrollable criteria cards */}
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{
          padding: spacing[3],
          paddingTop: spacing[2],
          gap: spacing[3],
        }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {criteria?.map((c, i) => (
          <Pressable key={i} onPress={(e) => e.stopPropagation()}>
            <GlassCard>
              <View style={{ gap: spacing[2] }}>
                <Text
                  style={{
                    ...typography.labelLarge,
                    fontWeight: fontWeights.semibold,
                    color: colors.onSurface,
                  }}
                >
                  {isEs ? (c.name_es || c.name) : c.name}
                </Text>
                <Text
                  style={{
                    ...typography.bodySmall,
                    color: colors.onSurfaceVariant,
                    lineHeight: 20,
                  }}
                >
                  {isEs ? (c.description_es || c.description) : c.description}
                </Text>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );

  // Use a plain View wrapper — GlassView as the outermost container doesn't
  // support flex children properly. Instead, we use GlassCard for each
  // criteria item inside, and the container gets a solid surface background.
  return (
    <Pressable
      onPress={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxHeight: "80%",
        borderRadius: borderRadius.lg,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: colors.surface,
      }}
    >
      {modalInner}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Zone Tag (matches today card's ShiftHeaderRow)
// ---------------------------------------------------------------------------

function ZoneTag({ zone }: { zone: "FOH" | "BOH" }) {
  return (
    <View
      style={{
        paddingHorizontal: 8,
        height: 24,
        borderRadius: 999,
        backgroundColor: zone === "FOH" ? FOH_COLOR : BOH_COLOR,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          ...typography.bodySmall,
          fontWeight: fontWeights.semibold,
          color: "#ffffff",
          fontSize: 11,
        }}
      >
        {zone}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Criteria Row
// ---------------------------------------------------------------------------

function CriteriaRow({
  label,
  value,
  colors,
  thresholds,
}: {
  label: string;
  value: number | null;
  colors: ReturnType<typeof useColors>;
  thresholds?: import("../../../src/lib/api").RatingThresholds;
}) {
  const displayValue = value ?? 0;
  const barColor = getThresholdColor(displayValue, thresholds);

  return (
    <View style={{ gap: spacing[1] }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            ...typography.labelMedium,
            color: colors.onSurface,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={{
            ...typography.labelMedium,
            fontWeight: fontWeights.bold,
            color: barColor,
            fontVariant: ["tabular-nums"],
            minWidth: 30,
            textAlign: "right",
          }}
        >
          {displayValue.toFixed(1)}
        </Text>
      </View>
      {/* 3-step bar: ratings are 1, 2, or 3 */}
      <View
        style={{
          flexDirection: "row",
          gap: 3,
        }}
      >
        {[1, 2, 3].map((step) => (
          <View
            key={step}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              borderCurve: "continuous",
              backgroundColor:
                displayValue >= step ? barColor : colors.surfaceDisabled,
            }}
          />
        ))}
      </View>
    </View>
  );
}
