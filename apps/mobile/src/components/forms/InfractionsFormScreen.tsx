/**
 * InfractionsFormScreen — Discipline infraction form powered by NativeFormRenderer.
 * Replaces DisciplineInfractionForm by reading from the system template.
 *
 * Key behaviors:
 * - Auto-fills leader from authenticated user
 * - File attachments managed outside the renderer (uploaded post-submit)
 * - Conditional team member signature requirement
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { useForms } from "../../context/FormsContext";
import { useColors } from "../../context/ThemeContext";
import {
  fetchSystemTemplate,
  submitFormAuth,
  uploadInfractionDocumentAuth,
} from "../../lib/api";
import { NativeFormRenderer } from "./NativeFormRenderer";
import { FileAttachmentStrip, type AttachedFile } from "./FileAttachmentStrip";
import { typography } from "../../lib/fonts";
import { spacing, haptics } from "../../lib/theme";

export function InfractionsFormScreen() {
  const colors = useColors();
  const router = useRouter();
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

  // File attachments (managed outside the renderer)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Dynamic state
  const [initialData, setInitialData] = useState<Record<string, any>>({});

  // Field ID references
  const [leaderFieldId, setLeaderFieldId] = useState<string | null>(null);
  const [employeeFieldId, setEmployeeFieldId] = useState<string | null>(null);

  // Load system template
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const tmpl = await fetchSystemTemplate(accessToken, "discipline-infraction");
        if (cancelled) return;
        setTemplate(tmpl);

        const mappings = tmpl.settings?.field_mappings;
        if (mappings) {
          setLeaderFieldId(mappings.leader_id ?? null);
          setEmployeeFieldId(mappings.employee_id ?? null);

          // Auto-fill leader
          if (mappings.leader_id && authEmployeeId) {
            setInitialData({ [mappings.leader_id]: authEmployeeId });
          }
        } else {
          // Fallback: identify from ui_schema
          const uiSchema = tmpl.ui_schema || {};
          const order = uiSchema["ui:order"] || Object.keys(tmpl.schema?.properties || {});
          for (const fid of order) {
            const meta = uiSchema[fid]?.["ui:fieldMeta"] || {};
            if (meta.dataSource === "leaders") {
              setLeaderFieldId(fid);
              if (authEmployeeId) setInitialData((prev) => ({ ...prev, [fid]: authEmployeeId }));
            } else if (meta.dataSource === "employees") {
              setEmployeeFieldId(fid);
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Failed to load form");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [accessToken, authEmployeeId]);

  // Handle submit with post-submit file uploads
  const handleSubmit = useCallback(
    async (formData: Record<string, any>) => {
      if (!template || !orgId || !accessToken || !locationId) return;
      setSubmitting(true);
      try {
        // Extract employee_id
        const empId = employeeFieldId ? formData[employeeFieldId] : undefined;

        const result = await submitFormAuth(accessToken, orgId, {
          template_id: template.id,
          location_id: locationId,
          employee_id: empId,
          response_data: formData,
        });

        // Upload files if any (fire-and-forget style — failures don't block)
        if (attachedFiles.length > 0 && result.id) {
          for (const file of attachedFiles) {
            try {
              await uploadInfractionDocumentAuth(
                accessToken,
                locationId,
                result.id,
                file,
                { isSubmissionId: true }
              );
            } catch (err) {
              console.warn("[InfractionsFormScreen] File upload failed:", err);
            }
          }
        }

        haptics.success();
        completeSubmission({
          formType: "infractions",
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
    [template, orgId, accessToken, locationId, employeeFieldId, attachedFiles, completeSubmission, router]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[4] }}>
        <Text style={[typography.bodyMedium, { color: colors.error, textAlign: "center" }]}>
          {error || "Failed to load infractions form"}
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
      <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[8] }}>
        <NativeFormRenderer
          template={template}
          initialData={initialData}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Submit Infraction"
          scrollRef={scrollRef}
          onScrollEnabledChange={setScrollEnabled}
        />

        {/* File attachments — outside the renderer, uploaded post-submit */}
        <View style={{ marginTop: spacing[2] }}>
          <FileAttachmentStrip
            files={attachedFiles}
            onFilesChange={setAttachedFiles}
            maxFiles={5}
            disabled={submitting}
            label="Attachments"
          />
        </View>
      </View>
    </ScrollView>
  );
}
