/**
 * TodayCard Component
 * Shows the employee's schedule status for today on the home screen.
 * Handles loading, error, time_off, not_scheduled, and working states.
 * Footer "Today's Setup" link is always visible.
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "../context/ThemeContext";
import { typography, fontWeights } from "../lib/fonts";
import { spacing, haptics } from "../lib/theme";
import { GlassCard } from "./glass";
import { AppIcon } from "./ui";
import type {
  MyTodayResponse,
  TodayEntry,
  TodaySetupAssignment,
  TodayShift,
} from "../lib/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format "09:00:00" -> "9:00 AM" */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TodayCardProps {
  data: MyTodayResponse | null;
  isLoading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TodayCard({ data, isLoading, error }: TodayCardProps) {
  const colors = useColors();
  const router = useRouter();
  const { height: viewportHeight } = useWindowDimensions();

  // ── Content area (changes based on state) ─────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            minHeight: 120,
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            minHeight: 120,
          }}
        >
          <AppIcon
            name="exclamationmark.circle"
            size={28}
            tintColor={colors.onSurfaceDisabled}
          />
          <Text
            selectable
            style={{
              ...typography.bodySmall,
              color: colors.onSurfaceDisabled,
              textAlign: "center",
            }}
          >
            Unable to load schedule
          </Text>
        </View>
      );
    }

    if (data?.status === "time_off") {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            minHeight: 120,
          }}
        >
          <AppIcon
            name="sun.max.fill"
            size={32}
            tintColor={colors.warning}
          />
          <Text
            selectable
            style={{
              ...typography.labelLarge,
              fontWeight: fontWeights.semibold,
              color: colors.onSurface,
              textAlign: "center",
            }}
          >
            Enjoy your time off!
          </Text>
          {data.timeOffNote ? (
            <Text
              selectable
              style={{
                ...typography.bodySmall,
                color: colors.onSurfaceVariant,
                textAlign: "center",
              }}
            >
              {data.timeOffNote}
            </Text>
          ) : null}
        </View>
      );
    }

    if (!data || data.status === "not_scheduled") {
      return (
        <View
          style={{
            padding: spacing[5],
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            minHeight: 120,
          }}
        >
          <AppIcon
            name="calendar.badge.minus"
            size={28}
            tintColor={colors.onSurfaceDisabled}
          />
          <Text
            selectable
            style={{
              ...typography.bodySmall,
              color: colors.onSurfaceDisabled,
              textAlign: "center",
            }}
          >
            Not scheduled today
          </Text>
        </View>
      );
    }

    // Working — prefer grouped shift rows with setup assignment children.
    // Fallback to flat entries for backward compatibility.
    const shifts = data.shifts ?? [];
    const entries = data.entries ?? [];
    return (
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
        {shifts.length > 0
          ? shifts.map((shift, idx) => (
              <React.Fragment key={`shift-${shift.id}-${idx}`}>
                <ShiftRow shift={shift} colors={colors} />
                {idx < shifts.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.outline,
                      marginVertical: spacing[3],
                    }}
                  />
                )}
              </React.Fragment>
            ))
          : entries.map((entry, idx) => (
          <React.Fragment key={`${entry.type}-${entry.label}-${idx}`}>
            <EntryRow entry={entry} colors={colors} />
            {idx < entries.length - 1 && (
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.outline,
                  marginVertical: spacing[3],
                }}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <GlassCard
      contentStyle={{ padding: 0 }}
      style={{ maxHeight: viewportHeight * 0.5 }}
    >
      {renderContent()}

      {/* Footer — Today's Setup link (always visible) */}
      <Pressable
        onPress={() => {
          haptics.light();
          router.push("/(tabs)/(home)/todays-setup");
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          marginTop: spacing[3],
          borderTopWidth: 1,
          borderTopColor: colors.outline,
        }}
      >
        <Text
          style={{
            ...typography.labelMedium,
            color: colors.onSurfaceVariant,
          }}
        >
          Today's Setup
        </Text>
        <AppIcon
          name="chevron.right"
          size={14}
          tintColor={colors.onSurfaceVariant}
        />
      </Pressable>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// EntryRow — a single position or shift entry
// ---------------------------------------------------------------------------

function EntryRow({
  entry,
  colors,
}: {
  entry: TodayEntry;
  colors: ReturnType<typeof useColors>;
}) {
  const dotColor = entry.type === "position" ? colors.primary : colors.info;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
      }}
    >
      {/* Colored dot */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          borderCurve: "continuous",
          backgroundColor: dotColor,
        }}
      />

      {/* Label */}
      <Text
        selectable
        style={{
          ...typography.bodyMedium,
          fontWeight: fontWeights.medium,
          color: colors.onSurface,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {entry.label}
      </Text>

      {/* Time range */}
      <Text
        selectable
        style={{
          ...typography.bodySmall,
          color: colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
      </Text>
    </View>
  );
}

function ShiftRow({
  shift,
  colors,
}: {
  shift: TodayShift;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ gap: spacing[2] }}>
      <EntryRow
        entry={{
          type: "shift",
          label: shift.label,
          start_time: shift.start_time,
          end_time: shift.end_time,
        }}
        colors={colors}
      />
      {shift.setup_assignments.map((assignment) => (
        <SetupAssignmentRow
          key={`setup-${assignment.id}`}
          assignment={assignment}
          colors={colors}
        />
      ))}
    </View>
  );
}

function SetupAssignmentRow({
  assignment,
  colors,
}: {
  assignment: TodaySetupAssignment;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        paddingLeft: spacing[5],
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          borderCurve: "continuous",
          backgroundColor: colors.primary,
          opacity: 0.8,
        }}
      />
      <Text
        selectable
        style={{
          ...typography.bodySmall,
          fontWeight: fontWeights.medium,
          color: colors.onSurfaceVariant,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {assignment.label}
      </Text>
      <Text
        selectable
        style={{
          ...typography.bodySmall,
          color: colors.onSurfaceVariant,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatTime(assignment.start_time)} – {formatTime(assignment.end_time)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default TodayCard;
