/**
 * Evaluation Picker Screen
 * Presented as a formSheet modal. Shows evaluation template cards for selection.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import { useLocation } from "../../src/context/LocationContext";
import { useGlass, isGlassAvailable } from "../../src/hooks/useGlass";
import { GlassCard } from "../../src/components/glass";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { CalendarCheck } from "lucide-react-native";
import { fetchEvaluationTemplatesAuth } from "../../src/lib/api";
import { typography, fontWeights } from "../../src/lib/fonts";
import { spacing, haptics } from "../../src/lib/theme";

export default function EvaluationPickerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { selectedLocation } = useLocation();
  const { GlassView } = useGlass();
  const glassAvail = isGlassAvailable();

  const orgId = selectedLocation?.org_id;

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !session?.access_token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEvaluationTemplatesAuth(session.access_token, orgId)
      .then((data) => {
        if (!cancelled) setTemplates(data.filter((t: any) => t.is_active));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [orgId, session?.access_token]);

  const handleSelect = (template: any) => {
    haptics.medium();
    router.replace(`/forms/evaluations/${template.id}`);
  };

  const backButton = (
    <Pressable
      onPress={() => { haptics.light(); router.back(); }}
      hitSlop={12}
      style={styles.pressable}
    >
      <AppIcon name="chevron.left" size={18} tintColor={colors.onSurfaceVariant} />
    </Pressable>
  );

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        {glassAvail && GlassView ? (
          <GlassView isInteractive style={styles.button}>{backButton}</GlassView>
        ) : (
          <View style={[styles.button, { backgroundColor: colors.surfaceVariant }]}>{backButton}</View>
        )}
        <Text style={[styles.title, { color: colors.onSurface }]}>Select Evaluation</Text>
        <View style={styles.spacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[8] }} />
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={[typography.bodyMedium, { color: colors.error, textAlign: "center" }]}>{error}</Text>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.centerState}>
            <CalendarCheck size={40} color={colors.onSurfaceDisabled} strokeWidth={1} />
            <Text style={[typography.h4, { color: colors.onSurface, marginTop: spacing[3] }]}>
              No evaluation forms
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, textAlign: "center" }]}>
              Your organization hasn't created any evaluation forms yet.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {templates.map((tmpl) => (
              <GlassCard key={tmpl.id} onPress={() => handleSelect(tmpl)}>
                <View style={styles.cardContent}>
                  <View style={[styles.iconBox, { backgroundColor: colors.successTransparent }]}>
                    <CalendarCheck size={22} color={colors.success} strokeWidth={1.5} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[typography.labelLarge, { color: colors.onSurface }]}>
                      {tmpl.name}
                    </Text>
                    {tmpl.description && (
                      <Text
                        style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}
                        numberOfLines={2}
                      >
                        {tmpl.description}
                      </Text>
                    )}
                  </View>
                  <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  button: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  pressable: {
    width: 44, height: 44, alignItems: "center", justifyContent: "center",
  },
  title: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    flex: 1,
    textAlign: "center",
  },
  spacer: { width: 44, height: 44 },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  list: {
    gap: spacing[3],
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing[8],
    gap: spacing[2],
  },
});
