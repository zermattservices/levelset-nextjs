/**
 * FormsList
 * List of available form types in the forms hub.
 * Each card opens the corresponding form sheet.
 */

import React from "react";
import { View, Text, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useColors } from "../../context/ThemeContext";
import { useForms } from "../../context/FormsContext";
import { typography } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { GlassCard } from "../glass/GlassCard";
import { AppIcon } from "../ui/AppIcon";

export function FormsList() {
  const router = useRouter();
  const colors = useColors();
  const { lastSubmission, clearLastSubmission } = useForms();

  const forms = [
    {
      key: "ratings",
      title: "Positional Ratings",
      description: "Record Big 5 competency scores for team members",
      icon: "star.fill",
      iconColor: colors.warning,
      iconBg: colors.warningTransparent,
      onPress: () => router.push("/forms/ratings"),
    },
    {
      key: "infractions",
      title: "Discipline Infractions",
      description: "Log infractions and capture acknowledgements",
      icon: "doc.text.fill",
      iconColor: colors.primary,
      iconBg: colors.primaryTransparent,
      onPress: () => router.push("/forms/infractions"),
    },
    {
      key: "evaluations",
      title: "Evaluations",
      description: "Submit employee performance evaluations",
      icon: "checkmark.clipboard.fill",
      iconColor: colors.info,
      iconBg: colors.infoTransparent,
      disabled: true,
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing[4],
        gap: spacing[3],
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Success banner */}
      {lastSubmission && (
        <GlassCard
          style={{ borderWidth: 1, backgroundColor: colors.successContainer, borderColor: colors.success }}
          onPress={clearLastSubmission}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <AppIcon name="checkmark.circle.fill" size={20} tintColor={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.labelLarge, { color: colors.success, marginBottom: 2 }]}>
                Submitted successfully
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                {lastSubmission.employeeName} •{" "}
                {lastSubmission.formType === "ratings" ? "Positional Ratings" : "Discipline Infraction"}
              </Text>
            </View>
          </View>
        </GlassCard>
      )}

      {/* Form cards */}
      {forms.map((form, index) => (
        <Animated.View key={form.key} entering={FadeIn.delay(index * 80)}>
          <GlassCard
            onPress={form.disabled ? undefined : () => {
              haptics.light();
              form.onPress?.();
            }}
            disabled={form.disabled}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[4],
                opacity: form.disabled ? 0.5 : 1,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: borderRadius.md,
                  borderCurve: "continuous",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: form.iconBg,
                }}
              >
                <AppIcon name={form.icon} size={24} tintColor={form.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.h4, { color: colors.onSurface, marginBottom: spacing[1] }]}>
                  {form.title}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {form.disabled ? "Coming Soon" : form.description}
                </Text>
              </View>
              {!form.disabled && (
                <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
              )}
            </View>
          </GlassCard>
        </Animated.View>
      ))}

      {/* Info text */}
      <Text
        style={[
          typography.bodySmall,
          {
            color: colors.onSurfaceDisabled,
            textAlign: "center",
            paddingHorizontal: spacing[2],
            marginTop: spacing[2],
          },
        ]}
      >
        Forms will be submitted to the Levelset system. Make sure you have an internet connection before submitting.
      </Text>
    </ScrollView>
  );
}

export default FormsList;
