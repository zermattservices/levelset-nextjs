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
import { colors } from "../../../src/lib/colors";
import { typography } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { GlassCard } from "../../../src/components/glass";
import { AppIcon } from "../../../src/components/ui";

import "../../../src/lib/i18n";

export default function FormsTab() {
  const router = useRouter();
  const { t } = useTranslation();
  const { lastSubmission, clearLastSubmission } = useForms();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Submit team evaluations and documentation
      </Text>

      {/* Success Message */}
      {lastSubmission && (
        <GlassCard
          style={styles.successCard}
          onPress={clearLastSubmission}
        >
          <View style={styles.successContent}>
            <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.success} />
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
              <Text style={styles.formTitle}>{t("forms.positionalRatings")}</Text>
              <Text style={styles.formDescription}>
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
              <Text style={styles.formTitle}>
                {t("forms.disciplineInfraction")}
              </Text>
              <Text style={styles.formDescription}>
                Log infractions and capture acknowledgements
              </Text>
            </View>
            <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Info */}
      <Text style={styles.infoText}>
        Forms will be submitted to the Levelset system. Make sure you have
        an internet connection before submitting.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[3],
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  successCard: {
    backgroundColor: colors.successContainer,
    borderColor: colors.success,
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
    color: colors.success,
    marginBottom: 2,
  },
  successDetails: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
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
    color: colors.onSurface,
    marginBottom: spacing[1],
  },
  formDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
    textAlign: "center",
    paddingHorizontal: spacing[2],
    marginTop: spacing[2],
  },
});
