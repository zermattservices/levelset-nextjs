/**
 * SettingsScreen
 * Schedule-related settings (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { GlassCard } from "../../components/glass";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";

export default function SettingsScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Notifications</Text>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Shift Reminders</Text>
            <Text style={[styles.settingDescription, { color: colors.onSurfaceVariant }]}>
              Get notified before your shifts start
            </Text>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ false: colors.outline, true: colors.primaryTransparent }}
            thumbColor={colors.surface}
          />
        </View>
      </GlassCard>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Schedule Updates</Text>
            <Text style={[styles.settingDescription, { color: colors.onSurfaceVariant }]}>
              Notify when your schedule changes
            </Text>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ false: colors.outline, true: colors.primaryTransparent }}
            thumbColor={colors.surface}
          />
        </View>
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Display</Text>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Week Starts On</Text>
            <Text style={[styles.settingDescription, { color: colors.onSurfaceVariant }]}>
              Choose when your week begins
            </Text>
          </View>
          <Text style={[styles.settingValue, { color: colors.onSurfaceVariant }]}>Sunday</Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Time Format</Text>
            <Text style={[styles.settingDescription, { color: colors.onSurfaceVariant }]}>
              12-hour or 24-hour clock
            </Text>
          </View>
          <Text style={[styles.settingValue, { color: colors.onSurfaceVariant }]}>12-hour</Text>
        </View>
      </GlassCard>

      <View style={styles.disabledNote}>
        <Text style={[styles.disabledNoteText, { color: colors.onSurfaceDisabled }]}>
          Settings will be available once connected to the scheduling system.
        </Text>
      </View>
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
  sectionTitle: {
    ...typography.labelLarge,
    marginBottom: spacing[3],
    marginTop: spacing[2],
    paddingHorizontal: spacing[1],
  },
  settingCard: {
    marginBottom: spacing[2],
    opacity: 0.6,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing[4],
  },
  settingLabel: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  settingDescription: {
    ...typography.bodySmall,
  },
  settingValue: {
    ...typography.bodyMedium,
  },
  disabledNote: {
    marginTop: spacing[6],
    paddingHorizontal: spacing[4],
  },
  disabledNoteText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
});
