/**
 * RatingsFormScreen — Positional ratings form powered by NativeFormRenderer.
 * Replaces PositionalRatingsForm.
 *
 * Position selection is handled OUTSIDE the renderer (hardcoded dropdown).
 * Once a position is selected, labels are fetched and the renderer shows
 * the rating criteria + notes fields with dynamic labels.
 *
 * Leader and Employee dropdowns ARE rendered by the NativeFormRenderer
 * since they use the standard data_select pattern.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { useForms } from "../../context/FormsContext";
import { useColors } from "../../context/ThemeContext";
import { useTranslatedContent } from "../../hooks/useTranslatedContent";
import {
  fetchSystemTemplate,
  fetchPositionalDataAuth,
  fetchPositionLabelsAuth,
  submitFormAuth,
} from "../../lib/api";
import { NativeFormRenderer } from "./NativeFormRenderer";
import { typography } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";

export function RatingsFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const { language } = useTranslatedContent();
  const { session, employeeId: authEmployeeId } = useAuth();
  const { selectedLocation } = useLocation();
  const { completeSubmission } = useForms();
  const scrollRef = useRef<ScrollView>(null);

  const orgId = selectedLocation?.org_id;
  const locationId = selectedLocation?.id;
  const accessToken = session?.access_token ?? "";

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Position state for label fetching
  const [positions, setPositions] = useState<any[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);

  // Dynamic state
  const [initialData, setInitialData] = useState<Record<string, any>>({});
  const [schemaOverrides, setSchemaOverrides] = useState<Record<string, any>>({});
  const [labelsReady, setLabelsReady] = useState(false);

  // Field ID references
  const [fieldMappings, setFieldMappings] = useState<any>(null);

  // Load system template + positional data
  useEffect(() => {
    if (!accessToken || !locationId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [tmpl, posData] = await Promise.all([
          fetchSystemTemplate(accessToken, "positional-excellence-rating"),
          fetchPositionalDataAuth(accessToken, locationId!),
        ]);
        if (cancelled) return;

        setTemplate(tmpl);
        setPositions(posData.positions || []);

        const mappings = tmpl.settings?.field_mappings;
        setFieldMappings(mappings);

        // Auto-fill leader
        if (mappings?.leader_id && authEmployeeId) {
          setInitialData({ [mappings.leader_id]: authEmployeeId });
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accessToken, locationId, authEmployeeId]);


  // Handle field changes — watch for position field to fetch labels
  const handleFieldChange = useCallback(
    async (fieldId: string, value: any, _formData: Record<string, any>) => {
      if (!fieldMappings || fieldId !== fieldMappings.position || !value || !accessToken || !locationId) return;

      setLabelsLoading(true);
      setLabelsReady(false);

      try {
        // Look up zone from positions data
        const pos = positions.find((p: any) => p.name === value);
        const zone = pos?.zone;

        const data = await fetchPositionLabelsAuth(accessToken, locationId, value, zone);
        if (!data || !template) return;

        const labels = language === "es" ? (data.labels_es || data.labels) : data.labels;
        const descriptions = language === "es" ? (data.descriptions_es || data.descriptions) : data.descriptions;
        const ratingIds = fieldMappings.ratings || [];

        const overrides: Record<string, any> = {};
        ratingIds.forEach((fid: string, i: number) => {
          if (labels?.[i]) {
            overrides[fid] = {
              ...(template.schema.properties[fid] || {}),
              title: labels[i],
              description: descriptions?.[i] || "",
            };
          }
        });
        setSchemaOverrides(overrides);
        setLabelsReady(true);
      } catch (err) {
        console.warn("[RatingsFormScreen] Failed to fetch labels:", err);
        setLabelsReady(true);
      } finally {
        setLabelsLoading(false);
      }
    },
    [accessToken, locationId, fieldMappings, template, language, positions]
  );

  // Handle submit
  const handleSubmit = useCallback(
    async (formData: Record<string, any>) => {
      if (!template || !orgId || !accessToken) return;
      setSubmitting(true);
      try {
        const empId = fieldMappings?.employee_id ? formData[fieldMappings.employee_id] : undefined;

        await submitFormAuth(accessToken, orgId, {
          template_id: template.id,
          location_id: locationId,
          employee_id: empId,
          response_data: formData,
        });

        haptics.success();
        completeSubmission({
          formType: "ratings",
          employeeName: "",
          submittedAt: new Date(),
          details: {},
        });
        router.back();
      } catch (err: any) {
        Alert.alert("Submission Failed", err.message || "Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [template, orgId, accessToken, locationId, fieldMappings, completeSubmission, router]
  );

  // Template is passed directly — position is rendered by the renderer via data_select.
  // MUST be called on every render (hooks rule) even if template is null.
  const modifiedTemplate = useMemo(() => {
    if (!template) return null;
    return template;
  }, [template]);

  // Fields to hide until labels are ready (rating criteria)
  const hiddenFields = useMemo(() => {
    if (labelsReady || !fieldMappings) return undefined;
    return new Set<string>(fieldMappings.ratings || []);
  }, [labelsReady, fieldMappings]);

  // Early returns AFTER all hooks
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !modifiedTemplate) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[4] }}>
        <Text style={[typography.bodyMedium, { color: colors.error, textAlign: "center" }]}>
          {error || "Failed to load ratings form"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardDismissMode="on-drag"
      scrollEnabled={scrollEnabled}
      style={{ flex: 1 }}
    >
      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[8], gap: 16 }}>
        {/* Labels loading indicator */}
        {labelsLoading && (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[2] }} />
        )}

        {/* Form renderer — leader, employee, position (via data_select), ratings (hidden until labels ready), notes */}
        <NativeFormRenderer
          template={modifiedTemplate}
          initialData={initialData}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Submit Rating"
          scrollRef={scrollRef}
          onScrollEnabledChange={setScrollEnabled}
          onFieldChange={handleFieldChange}
          schemaOverrides={schemaOverrides}
          hiddenFields={hiddenFields}
        />
      </View>
    </ScrollView>
  );
}
