/**
 * SettingsScreen
 * Schedule-related settings (placeholder)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { GlassCard } from "../../components/glass";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";

export default function SettingsScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Notifications</Text>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Shift Reminders</Text>
            <Text style={styles.settingDescription}>
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
            <Text style={styles.settingLabel}>Schedule Updates</Text>
            <Text style={styles.settingDescription}>
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

      <Text style={styles.sectionTitle}>Display</Text>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Week Starts On</Text>
            <Text style={styles.settingDescription}>
              Choose when your week begins
            </Text>
          </View>
          <Text style={styles.settingValue}>Sunday</Text>
        </View>
      </GlassCard>

      <GlassCard style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Time Format</Text>
            <Text style={styles.settingDescription}>
              12-hour or 24-hour clock
            </Text>
          </View>
          <Text style={styles.settingValue}>12-hour</Text>
        </View>
      </GlassCard>

      <View style={styles.disabledNote}>
        <Text style={styles.disabledNoteText}>
          Settings will be available once connected to the scheduling system.
        </Text>
      </View>
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
    marginTop: 8,
    paddingHorizontal: 4,
  },
  settingCard: {
    marginBottom: 8,
    opacity: 0.6,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  settingValue: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  disabledNote: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  disabledNoteText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
    textAlign: "center",
  },
});
