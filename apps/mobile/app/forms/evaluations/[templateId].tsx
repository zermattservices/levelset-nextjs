/**
 * Evaluation Conduct Screen
 * Loads a form template and renders it via NativeFormRenderer for submission.
 * Presented as a formSheet (same as ratings/infractions).
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../../src/context/ThemeContext";
import { useAuth } from "../../../src/context/AuthContext";
import { useLocation } from "../../../src/context/LocationContext";
import { useForms } from "../../../src/context/FormsContext";
import { useGlass, isGlassAvailable } from "../../../src/hooks/useGlass";
import { AppIcon } from "../../../src/components/ui/AppIcon";
import { NativeFormRenderer } from "../../../src/components/forms";
import {
  fetchFormTemplateAuth,
  submitFormAuth,
} from "../../../src/lib/api";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, haptics } from "../../../src/lib/theme";

export default function EvaluationConductScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const { session } = useAuth();
  const { selectedLocation } = useLocation();
  const { completeSubmission } = useForms();
  const { GlassView } = useGlass();
  const glassAvail = isGlassAvailable();

  const scrollRef = useRef<ScrollView>(null);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const orgId = selectedLocation?.org_id;

  // Fetch template on mount
  useEffect(() => {
    if (!templateId || !orgId || !session?.access_token) return;
    let cancelled = false;
    setLoading(true);

    fetchFormTemplateAuth(session.access_token, templateId, orgId)
      .then((data) => {
        if (!cancelled) setTemplate(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load form");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [templateId, orgId, session?.access_token]);

  // Submit handler
  const handleSubmit = useCallback(
    async (formData: Record<string, any>) => {
      if (!template || !orgId || !session?.access_token) return;
      setSubmitting(true);
      try {
        // Extract employee_id from data_select employee field
        let employeeId: string | undefined;
        const uiSchema = template.ui_schema || {};
        for (const fieldId of Object.keys(uiSchema)) {
          const meta = uiSchema[fieldId]?.["ui:fieldMeta"];
          if (meta?.dataSource === "employees" && formData[fieldId]) {
            employeeId = formData[fieldId];
            break;
          }
        }

        await submitFormAuth(session.access_token, orgId, {
          template_id: template.id,
          location_id: selectedLocation?.id,
          employee_id: employeeId,
          response_data: formData,
        });

        haptics.success();
        completeSubmission({
          formType: "evaluation",
          employeeName: "",
          submittedAt: new Date(),
          details: {},
        });

        // Navigate to the employee's profile page
        if (employeeId && selectedLocation?.id) {
          router.dismiss(); // Close the form sheet
          setTimeout(() => {
            router.push({
              pathname: "/(tabs)/(home)/employee-overview",
              params: { employeeId, locationId: selectedLocation.id },
            });
          }, 300);
        } else {
          router.back();
        }
      } catch (err: any) {
        Alert.alert("Submission Failed", err.message || "Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [template, orgId, session?.access_token, selectedLocation, router, completeSubmission]
  );

  // Glass back button
  const backButton = (
    <Pressable
      onPress={() => {
        haptics.light();
        router.back();
      }}
      hitSlop={12}
      style={styles.pressable}
    >
      <AppIcon
        name="chevron.left"
        size={18}
        tintColor={colors.onSurfaceVariant}
      />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        {glassAvail && GlassView ? (
          <GlassView isInteractive style={styles.button}>
            {backButton}
          </GlassView>
        ) : (
          <View
            style={[
              styles.button,
              { backgroundColor: colors.surfaceVariant },
            ]}
          >
            {backButton}
          </View>
        )}
        <Text
          style={[styles.title, { color: colors.onSurface }]}
          numberOfLines={1}
        >
          {template?.name || "Evaluation"}
        </Text>
        <View style={styles.spacer} />
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        scrollEnabled={scrollEnabled}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: spacing[8] }}
            />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text
                style={[
                  typography.bodyMedium,
                  { color: colors.error, textAlign: "center" },
                ]}
              >
                {error}
              </Text>
              <Pressable onPress={() => router.back()}>
                <Text
                  style={[
                    typography.labelMedium,
                    { color: colors.primary, marginTop: spacing[2] },
                  ]}
                >
                  Go Back
                </Text>
              </Pressable>
            </View>
          ) : template ? (
            <NativeFormRenderer
              template={template}
              onSubmit={handleSubmit}
              submitting={submitting}
              submitLabel="Submit Evaluation"
              scrollRef={scrollRef}
              onScrollEnabledChange={setScrollEnabled}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pressable: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 44,
    height: 44,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  errorContainer: {
    alignItems: "center",
    paddingTop: spacing[8],
  },
});
