/**
 * Forms Tab
 * Main forms screen with form selection cards and route-based navigation
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, { FadeIn } from "react-native-reanimated";
import { useForms } from "../../../src/context/FormsContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { GlassCard } from "../../../src/components/glass";
import { AppIcon } from "../../../src/components/ui";

import "../../../src/lib/i18n";

export default function FormsTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useColors();
  const { lastSubmission, clearLastSubmission } = useForms();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
        Submit team evaluations and documentation
      </Text>

      {/* Success Message */}
      {lastSubmission && (
        <GlassCard
          style={[styles.successCard, { backgroundColor: colors.successContainer, borderColor: colors.success }]}
          onPress={clearLastSubmission}
        >
          <View style={styles.successContent}>
            <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.success} />
            <View style={styles.successInfo}>
              <Text style={[styles.successTitle, { color: colors.success }]}>
                {t("forms.submitSuccess")}
              </Text>
              <Text style={[styles.successDetails, { color: colors.onSurfaceVariant }]}>
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
      <Animated.View entering={FadeIn.delay(0)}>
        <GlassCard
          onPress={() => {
            haptics.light();
            router.push("/forms/ratings");
          }}
        >
          <View style={styles.formCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.warningTransparent }]}>
              <AppIcon name="star.fill" size={24} tintColor={colors.primary} />
            </View>
            <View style={styles.formInfo}>
              <Text style={[styles.formTitle, { color: colors.onSurface }]}>{t("forms.positionalRatings")}</Text>
              <Text style={[styles.formDescription, { color: colors.onSurfaceVariant }]}>
                Record Big 5 competency scores for team members
              </Text>
            </View>
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Discipline Infractions Card */}
      <Animated.View entering={FadeIn.delay(80)}>
        <GlassCard
          onPress={() => {
            haptics.light();
            router.push("/forms/infractions");
          }}
        >
          <View style={styles.formCardContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryTransparent }]}>
              <AppIcon name="doc.text.fill" size={24} tintColor={colors.primary} />
            </View>
            <View style={styles.formInfo}>
              <Text style={[styles.formTitle, { color: colors.onSurface }]}>
                {t("forms.disciplineInfraction")}
              </Text>
              <Text style={[styles.formDescription, { color: colors.onSurfaceVariant }]}>
                Log infractions and capture acknowledgements
              </Text>
            </View>
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Info */}
      <Text style={[styles.infoText, { color: colors.onSurfaceDisabled }]}>
        Forms will be submitted to the Levelset system. Make sure you have
        an internet connection before submitting.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  subtitle: {
    ...typography.bodyMedium,
  },
  successCard: {
    borderWidth: 1,
  },
  successContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    ...typography.labelLarge,
    marginBottom: 2,
  },
  successDetails: {
    ...typography.bodySmall,
  },
  formCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  formInfo: {
    flex: 1,
  },
  formTitle: {
    ...typography.h4,
    marginBottom: spacing[1],
  },
  formDescription: {
    ...typography.bodySmall,
  },
  infoText: {
    ...typography.bodySmall,
    textAlign: "center",
    paddingHorizontal: spacing[2],
    marginTop: spacing[2],
  },
});
