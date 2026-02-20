/**
 * DisciplineInfractionForm Component
 * Form for recording employee discipline infractions
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  ActionSheetIOS,
} from "react-native";
import { useRouter } from "expo-router";

// Lazy-load native modules to prevent crashes if native build is stale
const getImagePicker = () => require("expo-image-picker") as typeof import("expo-image-picker");
const getDocumentPicker = () => require("expo-document-picker") as typeof import("expo-document-picker");
import { useTranslation } from "react-i18next";

import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";
import { useForms } from "../../context/FormsContext";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { AppIcon } from "../ui";
import { useTranslatedContent } from "../../hooks/useTranslatedContent";
import {
  fetchInfractionDataAuth,
  submitInfractionAuth,
  uploadInfractionDocumentAuth,
  type Employee,
  type Infraction,
  ApiError,
} from "../../lib/api";
import {
  isDisciplineInfractionFormComplete,
  formatDateForApi,
} from "../../lib/validation";

import { AutocompleteDropdown, type DropdownOption } from "./AutocompleteDropdown";
import { DatePickerField } from "./DatePickerField";
import { SignatureCanvas } from "./SignatureCanvas";

// =============================================================================
// Component
// =============================================================================

export function DisciplineInfractionForm() {
  const colors = useColors();
  const { t } = useTranslation();
  const { translate } = useTranslatedContent();
  const { setDirty, completeSubmission } = useForms();
  const { session } = useAuth();
  const { selectedLocationId } = useLocation();
  const router = useRouter();
  const accessToken = session?.access_token ?? "";
  const locationId = selectedLocationId ?? "";

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form data from API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaders, setLeaders] = useState<Employee[]>([]);
  const [infractions, setInfractions] = useState<Infraction[]>([]);

  // Form state
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedInfractionId, setSelectedInfractionId] = useState<string>("");
  const [infractionDate, setInfractionDate] = useState<Date>(new Date());
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState("");
  const [teamSignature, setTeamSignature] = useState<string>("");
  const [leaderSignature, setLeaderSignature] = useState<string>("");
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ uri: string; name: string; type: string; size?: number }>
  >([]);

  // =============================================================================
  // Data Loading
  // =============================================================================

  const loadData = useCallback(async () => {
    if (!accessToken || !locationId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const data = await fetchInfractionDataAuth(accessToken, locationId);

      setEmployees(data.employees ?? []);
      setLeaders(data.leaders?.length ? data.leaders : data.employees ?? []);
      setInfractions(data.infractions ?? []);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Unable to load form data";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, locationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =============================================================================
  // Computed Values
  // =============================================================================

  const leaderOptions = useMemo((): DropdownOption[] => {
    const source = leaders.length ? leaders : employees;
    return source.map((item) => ({
      value: item.id,
      label: item.name,
      subtitle: item.role ?? undefined,
    }));
  }, [leaders, employees]);

  const employeeOptions = useMemo((): DropdownOption[] => {
    return employees.map((item) => ({
      value: item.id,
      label: item.name,
      subtitle: item.role ?? undefined,
    }));
  }, [employees]);

  const infractionOptions = useMemo((): DropdownOption[] => {
    return infractions.map((item) => ({
      value: item.id,
      label: translate(item, "action", item.action),
      group: formatPointsLabel(item.points),
    }));
  }, [infractions, translate]);

  const selectedInfraction = useMemo(() => {
    return infractions.find((i) => i.id === selectedInfractionId) ?? null;
  }, [infractions, selectedInfractionId]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) ?? null;
  }, [employees, selectedEmployeeId]);

  const requireTmSignature = selectedInfraction?.require_tm_signature ?? false;

  const isComplete = useMemo(() => {
    return isDisciplineInfractionFormComplete({
      leaderId: selectedLeaderId || null,
      employeeId: selectedEmployeeId || null,
      infractionId: selectedInfractionId || null,
      date: infractionDate,
      acknowledged,
      notes,
      teamSignature: teamSignature || null,
      leaderSignature: leaderSignature || null,
      requireTeamSignature: requireTmSignature,
    });
  }, [
    selectedLeaderId,
    selectedEmployeeId,
    selectedInfractionId,
    infractionDate,
    acknowledged,
    notes,
    teamSignature,
    leaderSignature,
    requireTmSignature,
  ]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const markDirty = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  const pickFromGallery = useCallback(async () => {
    const remaining = 5 - attachedFiles.length;
    if (remaining <= 0) return;

    const ImagePicker = getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const newFiles = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      }));
      setAttachedFiles((prev) => [...prev, ...newFiles].slice(0, 5));
      haptics.medium();
      markDirty();
    }
  }, [attachedFiles.length, markDirty]);

  const takePhoto = useCallback(async () => {
    if (attachedFiles.length >= 5) return;

    const ImagePicker = getImagePicker();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        t("forms.infraction.permissionNeeded", "Permission Needed"),
        t(
          "forms.infraction.cameraPermissionMessage",
          "Camera access is required to take photos. Please enable it in your device Settings."
        )
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAttachedFiles((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        },
      ].slice(0, 5));
      haptics.medium();
      markDirty();
    }
  }, [attachedFiles.length, markDirty]);

  const pickDocument = useCallback(async () => {
    if (attachedFiles.length >= 5) return;

    const DocumentPicker = getDocumentPicker();
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAttachedFiles((prev) => [
        ...prev,
        {
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}.pdf`,
          type: asset.mimeType || "application/pdf",
          size: asset.size,
        },
      ].slice(0, 5));
      haptics.medium();
      markDirty();
    }
  }, [attachedFiles.length, markDirty]);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openAttachmentMenu = useCallback(() => {
    if (attachedFiles.length >= 5) return;

    const options = [
      t("forms.infraction.camera", "Camera"),
      t("forms.infraction.gallery", "Photo Library"),
      t("forms.infraction.pdf", "PDF Document"),
      t("common.cancel", "Cancel"),
    ];

    if (process.env.EXPO_OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 3,
          title: t("forms.infraction.attachFile", "Attach Photo or Document"),
        },
        (buttonIndex) => {
          if (buttonIndex === 0) takePhoto();
          else if (buttonIndex === 1) pickFromGallery();
          else if (buttonIndex === 2) pickDocument();
        }
      );
    } else {
      Alert.alert(
        t("forms.infraction.attachFile", "Attach Photo or Document"),
        undefined,
        [
          { text: options[0], onPress: takePhoto },
          { text: options[1], onPress: pickFromGallery },
          { text: options[2], onPress: pickDocument },
          { text: options[3], style: "cancel" },
        ]
      );
    }
  }, [attachedFiles.length, takePhoto, pickFromGallery, pickDocument, t]);

  const handleSubmit = useCallback(async () => {
    if (!isComplete || !selectedLeaderId || !selectedEmployeeId || !selectedInfractionId) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitInfractionAuth(accessToken, locationId, {
        leaderId: selectedLeaderId,
        employeeId: selectedEmployeeId,
        infractionId: selectedInfractionId,
        infractionDate: formatDateForApi(infractionDate),
        acknowledged,
        notes: notes.trim() || null,
        teamMemberSignature: teamSignature || null,
        leaderSignature: leaderSignature,
      });

      // Upload attached files if any
      if (result?.infractionId && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            await uploadInfractionDocumentAuth(accessToken, locationId, result.infractionId, file);
          } catch (err) {
            console.warn("[DisciplineInfractionForm] File upload failed:", err);
            // Don't fail the whole submission
          }
        }
      }

      haptics.success();

      completeSubmission({
        formType: "infractions",
        employeeName: selectedEmployee?.name ?? "Team member",
        submittedAt: new Date(),
        details: {
          infraction: selectedInfraction?.action,
          points: selectedInfraction?.points,
        },
      });

      setDirty(false);
      router.back();
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Failed to submit infraction";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    isComplete,
    selectedLeaderId,
    selectedEmployeeId,
    selectedInfractionId,
    selectedEmployee,
    selectedInfraction,
    infractionDate,
    acknowledged,
    notes,
    teamSignature,
    leaderSignature,
    attachedFiles,
    accessToken,
    locationId,
    completeSubmission,
    setDirty,
    router,
  ]);

  // =============================================================================
  // Render
  // =============================================================================

  if (!accessToken || !locationId) {
    return (
      <View style={styles.errorContainer}>
        <AppIcon name="mappin.slash" size={32} tintColor={colors.onSurfaceVariant} />
        <Text style={[styles.errorTitle, { color: colors.onSurface }]}>No Location Selected</Text>
        <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>
          Please select a location from the home screen to use forms.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>{t("common.error")}</Text>
        <Text style={[styles.errorMessage, { color: colors.onSurfaceVariant }]}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadData}
        >
          <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>{t("common.tryAgain")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <AutocompleteDropdown
        label={t("forms.infraction.leader")}
        placeholder={t("common.select")}
        options={leaderOptions}
        value={selectedLeaderId}
        onChange={(value) => {
          setSelectedLeaderId(value);
          setLeaderSignature("");
          markDirty();
        }}
        required
      />

      <AutocompleteDropdown
        label={t("forms.infraction.employee")}
        placeholder={t("common.select")}
        options={employeeOptions}
        value={selectedEmployeeId}
        onChange={(value) => {
          setSelectedEmployeeId(value);
          markDirty();
        }}
        required
      />

      <DatePickerField
        label={t("forms.infraction.date")}
        value={infractionDate}
        onChange={(date) => {
          setInfractionDate(date);
          markDirty();
        }}
        maximumDate={new Date()}
        required
      />

      <AutocompleteDropdown
        label={t("forms.infraction.infraction")}
        placeholder={t("forms.infraction.selectInfraction")}
        options={infractionOptions}
        value={selectedInfractionId}
        onChange={(value) => {
          setSelectedInfractionId(value);
          haptics.selection();
          markDirty();
        }}
        groupBy
        required
      />

      {selectedInfraction && (
        <View style={[styles.pointsContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
          <Text style={[styles.pointsLabel, { color: colors.onSurface }]}>{t("forms.infraction.points")}</Text>
          <View
            style={[
              styles.pointsBadge,
              selectedInfraction.points > 0
                ? { backgroundColor: colors.errorTransparent }
                : selectedInfraction.points < 0
                  ? { backgroundColor: colors.successTransparent }
                  : { backgroundColor: colors.mutedTransparent },
            ]}
          >
            <Text
              style={[
                styles.pointsValue,
                selectedInfraction.points > 0
                  ? { color: colors.error }
                  : selectedInfraction.points < 0
                    ? { color: colors.success }
                    : { color: colors.onSurfaceVariant },
              ]}
            >
              {selectedInfraction.points > 0
                ? `+${selectedInfraction.points}`
                : selectedInfraction.points}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.toggleContainer, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleLabel, { color: colors.onSurface }]}>{t("forms.infraction.acknowledged")}</Text>
          <Text style={[styles.toggleHelper, { color: colors.onSurfaceVariant }]}>
            {t("forms.infraction.acknowledgedHelper")}
          </Text>
        </View>
        <Switch
          value={acknowledged}
          onValueChange={(value) => {
            setAcknowledged(value);
            markDirty();
          }}
          trackColor={{ false: colors.outline, true: colors.primaryTransparent }}
          thumbColor={acknowledged ? colors.primary : colors.surface}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>{t("forms.infraction.notes")}</Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.outline, color: colors.onSurface }]}
          value={notes}
          onChangeText={(text) => {
            setNotes(text);
            markDirty();
          }}
          placeholder={t("forms.infraction.notesPlaceholder")}
          placeholderTextColor={colors.onSurfaceDisabled}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <Text style={[styles.fieldHelper, { color: colors.onSurfaceVariant }]}>{t("forms.infraction.notesHelper")}</Text>
      </View>

      {/* File Attachments */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.onSurface }]}>
          {t("forms.infraction.attachments", "Attachments")} ({attachedFiles.length}/5)
        </Text>

        {/* Thumbnail Strip */}
        {attachedFiles.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailStrip}
            contentContainerStyle={styles.thumbnailStripContent}
          >
            {attachedFiles.map((file, idx) => (
              <View key={`file-${idx}`} style={[styles.thumbnail, { borderColor: colors.outline, backgroundColor: colors.surface }]}>
                {file.type.startsWith("image/") ? (
                  <Image
                    source={{ uri: file.uri }}
                    style={styles.thumbnailImage}
                  />
                ) : (
                  <View style={styles.thumbnailPdf}>
                    <Text style={[styles.thumbnailPdfLabel, { color: colors.error }]}>PDF</Text>
                    <Text style={[styles.thumbnailPdfName, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.thumbnailRemove, { backgroundColor: colors.overlay }]}
                  onPress={() => removeFile(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.thumbnailRemoveText, { color: colors.onPrimary }]}>&#x2715;</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Attach Button */}
        {attachedFiles.length < 5 && (
          <TouchableOpacity
            style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.primary }]}
            onPress={openAttachmentMenu}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerButtonIcon}>{"\uD83D\uDCCE"}</Text>
            <Text style={[styles.pickerButtonText, { color: colors.primary }]}>
              {t("forms.infraction.attachFile", "Attach Photo or Document")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <SignatureCanvas
        label={
          requireTmSignature || acknowledged
            ? `${t("forms.infraction.teamSignature")} *`
            : t("forms.infraction.teamSignature")
        }
        value={teamSignature || undefined}
        onSignatureChange={(signature) => {
          setTeamSignature(signature);
          markDirty();
        }}
        helperText={
          requireTmSignature
            ? t("forms.infraction.teamSignatureRequired")
            : acknowledged
              ? t("forms.infraction.teamSignatureHelperPresent")
              : t("forms.infraction.teamSignatureHelperAbsent")
        }
      />

      <SignatureCanvas
        label={`${t("forms.infraction.leaderSignature")} *`}
        value={leaderSignature || undefined}
        onSignatureChange={(signature) => {
          setLeaderSignature(signature);
          markDirty();
        }}
        helperText={t("forms.infraction.leaderSignatureHelper")}
      />

      {submitError && (
        <View style={[styles.submitErrorContainer, { backgroundColor: colors.errorTransparent, borderColor: colors.error }]}>
          <Text style={[styles.submitErrorText, { color: colors.error }]}>{submitError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          { backgroundColor: colors.primary },
          (!isComplete || submitting) && { backgroundColor: colors.primaryTransparent, opacity: 0.6 },
        ]}
        onPress={handleSubmit}
        disabled={!isComplete || submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <>
            <AppIcon
              name="checkmark.circle.fill"
              size={20}
              tintColor={colors.onPrimary}
              style={styles.submitIcon}
            />
            <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>{t("common.submit")}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatPointsLabel(points: number): string {
  const suffix = Math.abs(points) === 1 ? "Point" : "Points";
  if (points > 0) return `+${points} ${suffix}`;
  return `${points} ${suffix}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    ...typography.bodyMedium,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    ...typography.h4,
    marginBottom: 8,
  },
  errorMessage: {
    ...typography.bodyMedium,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous',
  },
  retryButtonText: {
    ...typography.labelLarge,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  fieldLabel: {
    ...typography.labelLarge,
    marginBottom: 6,
  },
  fieldHelper: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pointsLabel: {
    ...typography.labelLarge,
  },
  pointsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
  },
  pointsValue: {
    ...typography.labelLarge,
    fontWeight: "700",
  },
  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    ...typography.labelLarge,
    marginBottom: 2,
  },
  toggleHelper: {
    ...typography.bodySmall,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.bodyMedium,
    minHeight: 100,
  },
  submitErrorContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: 12,
  },
  submitErrorText: {
    ...typography.bodyMedium,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.full,
    borderCurve: 'continuous',
    paddingVertical: 16,
    marginTop: 8,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    ...typography.labelLarge,
    fontWeight: "600",
  },
  thumbnailStrip: {
    marginBottom: 8,
  },
  thumbnailStripContent: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailPdf: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumbnailPdfLabel: {
    ...typography.labelLarge,
    fontWeight: "700",
    fontSize: 14,
  },
  thumbnailPdfName: {
    ...typography.bodySmall,
    fontSize: 8,
    textAlign: "center",
  },
  thumbnailRemove: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailRemoveText: {
    fontSize: 10,
    fontWeight: "700",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  pickerButtonIcon: {
    fontSize: 16,
  },
  pickerButtonText: {
    ...typography.labelLarge,
    fontSize: 12,
  },
});

export default DisciplineInfractionForm;
