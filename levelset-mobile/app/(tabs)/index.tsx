/**
 * Home Tab
 * Dashboard with greeting, quick actions that open form sheets
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/context/AuthContext";
import { useForms } from "../../src/context/FormsContext";
import { colors } from "../../src/lib/colors";
import { typography } from "../../src/lib/fonts";
import { borderRadius, haptics } from "../../src/lib/theme";
import { AppIcon } from "../../src/components/ui";
import { GlassCard } from "../../src/components/glass";
import "../../src/lib/i18n";

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { fullName } = useAuth();
  const { lastSubmission, clearLastSubmission } = useForms();

  const firstName = fullName?.split(" ")[0] || "there";
  const greeting = getGreeting(t);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 16 }}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.greetingSection}>
        <Text style={styles.greeting}>
          {greeting}, <Text style={styles.userName}>{firstName}</Text>
        </Text>
      </Animated.View>

      {/* Success banner */}
      {lastSubmission && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Pressable
            onPress={() => {
              haptics.light();
              clearLastSubmission();
            }}
            style={styles.successBanner}
          >
            <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.success} />
            <View style={styles.successInfo}>
              <Text selectable style={styles.successTitle}>
                {t("home.submittedSuccess")}
              </Text>
              <Text selectable style={styles.successDetails}>
                {lastSubmission.employeeName} •{" "}
                {lastSubmission.formType === "ratings"
                  ? t("forms.positionalRatings")
                  : t("forms.disciplineInfraction")}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* Quick Actions */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.actionsSection}>
        {/* Submit a Rating */}
        <GlassCard
          style={styles.actionCard}
          onPress={() => {
            haptics.light();
            router.push("/forms/ratings");
          }}
        >
          <View style={styles.actionContent}>
            <View style={[styles.iconBadge, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
              <AppIcon name="star.fill" size={22} tintColor="#F59E0B" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>{t("home.submitRating")}</Text>
              <Text style={styles.actionDescription}>
                {t("home.submitRatingDesc")}
              </Text>
            </View>
            <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>

        {/* Submit an Infraction */}
        <GlassCard
          style={styles.actionCard}
          onPress={() => {
            haptics.light();
            router.push("/forms/infractions");
          }}
        >
          <View style={styles.actionContent}>
            <View style={[styles.iconBadge, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <AppIcon name="exclamationmark.triangle" size={22} tintColor="#EF4444" />
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>{t("home.submitInfraction")}</Text>
              <Text style={styles.actionDescription}>
                {t("home.submitInfractionDesc")}
              </Text>
            </View>
            <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
          </View>
        </GlassCard>

        {/* Manage Team */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.actionCard}>
            <View style={styles.actionContent}>
              <View style={[styles.iconBadge, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
                <AppIcon name="person.2" size={22} tintColor="#3B82F6" />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>{t("home.manageTeam")}</Text>
                <Text style={styles.actionDescription}>
                  {t("common.comingSoon")}
                </Text>
              </View>
              <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.goodMorning");
  if (hour < 17) return t("home.goodAfternoon");
  return t("home.goodEvening");
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  greetingSection: {
    marginBottom: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
    letterSpacing: -0.3,
  },
  userName: {
    fontWeight: "700",
    color: colors.onBackground,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successContainer,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
    gap: 12,
  },
  successInfo: {
    flex: 1,
  },
  successTitle: {
    ...typography.labelMedium,
    color: colors.success,
  },
  successDetails: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  actionsSection: {
    gap: 10,
  },
  actionCard: {
    marginBottom: 0,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    ...typography.bodyMedium,
    fontWeight: "600",
    color: colors.onSurface,
    marginBottom: 2,
  },
  actionDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
});
