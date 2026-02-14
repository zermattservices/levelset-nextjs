/**
 * StaffScreen
 * Displays team members and their info (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSchedule } from "../../context/ScheduleContext";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";

export default function StaffScreen() {
  const { staff } = useSchedule();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {staff.length === 0 ? (
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Staff Members</Text>
            <Text style={styles.emptyDescription}>
              Staff information will appear here once the system is connected.
            </Text>
          </View>
        </GlassCard>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Team Members</Text>
          {staff.map((member) => (
            <GlassCard key={member.id} style={styles.staffCard}>
              <View style={styles.staffRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffRole}>{member.role}</Text>
                </View>
              </View>
            </GlassCard>
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
  },
  staffCard: {
    marginBottom: 12,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    ...typography.h4,
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    fontWeight: "600",
  },
  staffRole: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
