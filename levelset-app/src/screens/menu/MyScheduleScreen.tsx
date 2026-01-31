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
import { ShiftCard } from "../../components/schedule";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";

export default function MyScheduleScreen() {
  const { shifts, isLoading, error, refreshSchedule } = useSchedule();

  const onRefresh = useCallback(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
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
            <Text style={styles.emptyTitle}>No Upcoming Shifts</Text>
            <Text style={styles.emptyDescription}>
              Your schedule will appear here once it's available.
            </Text>
            <Text style={styles.emptyNote}>
              Pull down to refresh
            </Text>
          </View>
        </GlassCard>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Upcoming Shifts</Text>
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  emptyCard: {
    marginTop: 24,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.onSurface,
    marginBottom: 8,
  },
  emptyDescription: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyNote: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
    textAlign: "center",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    ...typography.h4,
    color: colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});
