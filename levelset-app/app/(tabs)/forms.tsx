/**
 * Forms Tab
 * Main forms screen with form selection cards and form drawers
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useForms } from "../../src/context/FormsContext";
import { colors } from "../../src/lib/colors";
import { typography } from "../../src/lib/fonts";
import { GlassCard } from "../../src/components/glass";
import {
  FormDrawer,
  DisciplineInfractionForm,
  PositionalRatingsForm,
} from "../../src/components/forms";

// Import i18n to ensure it's initialized
import "../../src/lib/i18n";

function FormsScreenContent() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { openForm, lastSubmission, clearLastSubmission } = useForms();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Forms</Text>
        <Text style={styles.subtitle}>
          Submit team evaluations and documentation
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Message */}
        {lastSubmission && (
          <GlassCard
            style={styles.successCard}
            onPress={clearLastSubmission}
          >
            <View style={styles.successContent}>
              <Text style={styles.successIcon}>✓</Text>
              <View style={styles.successInfo}>
                <Text style={styles.successTitle}>
                  {t("forms.submitSuccess")}
                </Text>
                <Text style={styles.successDetails}>
                  {lastSubmission.employeeName} •{" "}
                  {lastSubmission.formType === "ratings"
                    ? t("forms.positionalRatings")
                    : t("forms.disciplineInfraction")}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Positional Ratings Card */}
        <GlassCard onPress={() => openForm("ratings")} style={styles.formCard}>
          <View style={styles.formCardContent}>
            <View style={[styles.iconContainer, styles.ratingsIcon]}>
              <Text style={styles.iconText}>⭐</Text>
            </View>
            <View style={styles.formInfo}>
              <Text style={styles.formTitle}>{t("forms.positionalRatings")}</Text>
              <Text style={styles.formDescription}>
                Record Big 5 competency scores for team members
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Discipline Infractions Card */}
        <GlassCard
          onPress={() => openForm("infractions")}
          style={styles.formCard}
        >
          <View style={styles.formCardContent}>
            <View style={[styles.iconContainer, styles.infractionsIcon]}>
              <Text style={styles.iconText}>📋</Text>
            </View>
            <View style={styles.formInfo}>
              <Text style={styles.formTitle}>
                {t("forms.disciplineInfraction")}
              </Text>
              <Text style={styles.formDescription}>
                Log infractions and capture acknowledgements
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Info Card */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Forms will be submitted to the Levelset system. Make sure you have
            an internet connection before submitting.
          </Text>
        </View>
      </ScrollView>

      {/* Positional Ratings Form Drawer */}
      <FormDrawer
        title={t("forms.positionalRatings")}
        formType="ratings"
      >
        <PositionalRatingsForm />
      </FormDrawer>

      {/* Discipline Infraction Form Drawer */}
      <FormDrawer
        title={t("forms.disciplineInfraction")}
        formType="infractions"
      >
        <DisciplineInfractionForm />
      </FormDrawer>
    </View>
  );
}

export default function FormsTab() {
  return <FormsScreenContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    ...typography.h2,
    color: colors.onBackground,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  successCard: {
    backgroundColor: colors.successContainer,
    borderColor: colors.success,
  },
  successContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  successIcon: {
    fontSize: 24,
    color: colors.success,
    marginRight: 12,
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    ...typography.labelLarge,
    color: colors.success,
    marginBottom: 2,
  },
  successDetails: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  formCard: {
    marginBottom: 0,
  },
  formCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  ratingsIcon: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  infractionsIcon: {
    backgroundColor: colors.primaryTransparent,
  },
  iconText: {
    fontSize: 24,
  },
  formInfo: {
    flex: 1,
  },
  formTitle: {
    ...typography.h4,
    color: colors.onSurface,
    marginBottom: 4,
  },
  formDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  infoSection: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
    textAlign: "center",
  },
});
