/**
 * AlertsScreen
 * Placeholder screen for Levi Alerts section
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { GlassCard } from "../../components/glass";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";
import { useTranslation } from "react-i18next";

export default function AlertsScreen() {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoContent}>
          <AppIcon
            name="bell"
            size={48}
            tintColor={colors.primary}
            style={styles.infoIcon}
          />
          <Text style={[styles.infoTitle, { color: colors.onSurface }]}>
            {t("levi.alerts")}
          </Text>
          <Text
            style={[styles.infoDescription, { color: colors.onSurfaceVariant }]}
          >
            {t("levi.alertsDesc")}
          </Text>
          <Text
            style={[
              styles.comingSoon,
              {
                color: colors.primary,
                backgroundColor: colors.primaryTransparent,
              },
            ]}
          >
            {t("levi.comingSoon")}
          </Text>
        </View>
      </GlassCard>
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
  infoCard: {
    marginBottom: spacing[6],
  },
  infoContent: {
    alignItems: "center",
    paddingVertical: spacing[6],
  },
  infoIcon: {
    marginBottom: spacing[3],
  },
  infoTitle: {
    ...typography.h3,
    marginBottom: spacing[2],
  },
  infoDescription: {
    ...typography.bodyMedium,
    textAlign: "center",
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
  },
  comingSoon: {
    ...typography.labelMedium,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
});
