/**
 * EvaluationPickerModal — GlassModal showing evaluation template cards.
 * User selects which evaluation form to fill out, then navigates to the conduct screen.
 */

import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { GlassModal } from "../glass/GlassModal";
import { GlassCard } from "../glass/GlassCard";
import { useAuth } from "../../context/AuthContext";
import { useColors } from "../../context/ThemeContext";
import { fetchEvaluationTemplatesAuth } from "../../lib/api";
import { typography } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";
import { AppIcon } from "../ui/AppIcon";

interface EvaluationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  orgId: string;
}

export function EvaluationPickerModal({
  visible,
  onClose,
  orgId,
}: EvaluationPickerModalProps) {
  const colors = useColors();
  const router = useRouter();
  const { session } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !session?.access_token) return;
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

    return () => {
      cancelled = true;
    };
  }, [visible, orgId, session?.access_token]);

  const handleSelect = (template: any) => {
    haptics.medium();
    onClose();
    router.push(`/forms/evaluations/${template.id}`);
  };

  return (
    <GlassModal visible={visible} onClose={onClose} title="Select Evaluation">
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.error, textAlign: "center" },
          ]}
        >
          {error}
        </Text>
      ) : templates.length === 0 ? (
        <Text
          style={[
            typography.bodyMedium,
            { color: colors.onSurfaceDisabled, textAlign: "center" },
          ]}
        >
          No evaluation forms available
        </Text>
      ) : (
        <View style={styles.list}>
          {templates.map((tmpl) => (
            <GlassCard key={tmpl.id} onPress={() => handleSelect(tmpl)}>
              <View style={styles.cardContent}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: colors.successTransparent },
                  ]}
                >
                  <AppIcon
                    name="doc.text"
                    size={20}
                    tintColor={colors.success}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text
                    style={[typography.labelLarge, { color: colors.onSurface }]}
                  >
                    {tmpl.name}
                  </Text>
                  {tmpl.description && (
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.onSurfaceVariant },
                      ]}
                      numberOfLines={2}
                    >
                      {tmpl.description}
                    </Text>
                  )}
                </View>
                <AppIcon
                  name="chevron.right"
                  size={14}
                  tintColor={colors.onSurfaceDisabled}
                />
              </View>
            </GlassCard>
          ))}
        </View>
      )}
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[3] },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
});
