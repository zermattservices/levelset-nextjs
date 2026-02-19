/**
 * MyScheduleScreen
 * Displays the user's upcoming shifts
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSchedule } from "../../context/ScheduleContext";
import { ShiftCard } from "../../components/schedule/ShiftCard";
import { GlassCard } from "../../components/glass";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { spacing } from "../../lib/theme";

export default function MyScheduleScreen() {
  const colors = useColors();
  const { shifts, isLoading, error, refreshSchedule } = useSchedule();

  const onRefresh = useCallback(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.error }]}>Something went wrong</Text>
          <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {shifts.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No Upcoming Shifts</Text>
            <Text style={[styles.emptyDescription, { color: colors.onSurfaceVariant }]}>
              Your schedule will appear here once it's available.
            </Text>
            <Text style={[styles.emptyNote, { color: colors.onSurfaceDisabled }]}>
              Pull down to refresh
            </Text>
          </View>
        </GlassCard>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Upcoming Shifts</Text>
          {shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  sectionTitle: {
    ...typography.labelLarge,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[1],
  },
  emptyCard: {
    marginTop: spacing[6],
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing[4],
  },
  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing[2],
  },
  emptyDescription: {
    ...typography.bodyMedium,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  emptyNote: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  errorTitle: {
    ...typography.h4,
    marginBottom: spacing[2],
  },
  errorMessage: {
    ...typography.bodyMedium,
    textAlign: "center",
  },
});
