/**
 * PositionalRatingsForm Component
 * Form for recording employee positional ratings (Big 5 competencies)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";
import { useForms } from "../../context/FormsContext";
import { useLocation } from "../../context/LocationContext";
import { AppIcon } from "../ui";
import { useTranslatedContent } from "../../hooks/useTranslatedContent";
import {
  fetchPositionalData,
  fetchPositionLabels,
  submitRatings,
  type Employee,
  type Position,
  ApiError,
} from "../../lib/api";
import { isPositionalRatingsFormComplete } from "../../lib/validation";

import { AutocompleteDropdown, type DropdownOption } from "./AutocompleteDropdown";

// =============================================================================
// Types
// =============================================================================

type RatingValue = 1 | 2 | 3;

// =============================================================================
// Component
// =============================================================================

export function PositionalRatingsForm() {
  const colors = useColors();
  const { t } = useTranslation();
  const { translate, language, getRatingLabel, getRatingColor } = useTranslatedContent();
  const { setDirty, completeSubmission } = useForms();
  const { mobileToken } = useLocation();
  const router = useRouter();
  const token = mobileToken ?? "";

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form data from API
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaders, setLeaders] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [requireRatingComments, setRequireRatingComments] = useState(false);

  // Position labels and descriptions
  const [labels, setLabels] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<string[]>([]);

  // Form state
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedPositionKey, setSelectedPositionKey] = useState<string>("");
  const [ratings, setRatings] = useState<(RatingValue | null)[]>([]);
  const [notes, setNotes] = useState("");

  // =============================================================================
  // Data Loading
  // =============================================================================

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await fetchPositionalData(token);

        if (!cancelled) {
          setEmployees(data.employees ?? []);
          setLeaders(data.leaders?.length ? data.leaders : data.employees ?? []);
          setPositions(data.positions ?? []);
          setRolePermissions(data.rolePermissions ?? {});
          setRequireRatingComments(data.requireRatingComments ?? false);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError
            ? err.message
            : "Unable to load form data";
          setLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Parse selected position
  const selectedPosition = useMemo(() => {
    if (!selectedPositionKey) return null;
    const [zone, name] = selectedPositionKey.split("|");
    return positions.find((p) => p.zone === zone && p.name === name) ?? null;
  }, [selectedPositionKey, positions]);

  // Load position labels when position is selected
  useEffect(() => {
    if (!selectedPosition) {
      setLabels([]);
      setDescriptions([]);
      setRatings([]);
      setLabelsError(null);
      return;
    }

    let cancelled = false;

    async function loadLabels() {
      setLabelsLoading(true);
      setLabelsError(null);
      setLabels([]);
      setDescriptions([]);
      setRatings([]);

      try {
        const data = await fetchPositionLabels(
          token,
          selectedPosition!.name,
          selectedPosition!.zone
        );

        if (!cancelled) {
          const fetchedLabels =
            language === "es" && data.labels_es?.length
              ? data.labels_es
              : data.labels ?? [];
          setLabels(fetchedLabels);

          const fetchedDescriptions =
            language === "es" && data.descriptions_es?.length
              ? data.descriptions_es
              : data.descriptions ?? [];
          setDescriptions(fetchedDescriptions);

          setRatings(Array.from({ length: fetchedLabels.length }, () => null));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof ApiError
            ? err.message
            : "Unable to load position details";
          setLabelsError(message);
        }
      } finally {
        if (!cancelled) {
          setLabelsLoading(false);
        }
      }
    }

    loadLabels();

    return () => {
      cancelled = true;
    };
  }, [selectedPosition, token, language]);

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

  // Get selected leader's role for filtering positions
  const selectedLeader = useMemo(() => {
    const source = leaders.length ? leaders : employees;
    return source.find((l) => l.id === selectedLeaderId) ?? null;
  }, [leaders, employees, selectedLeaderId]);

  // Filter positions based on selected leader's role permissions
  const filteredPositions = useMemo(() => {
    const hasPermissions = Object.keys(rolePermissions).length > 0;
    if (!hasPermissions || !selectedLeader?.role) {
      return positions;
    }

    const allowedPositions = rolePermissions[selectedLeader.role];
    if (!allowedPositions || allowedPositions.length === 0) {
      return positions;
    }

    return positions.filter((p) => allowedPositions.includes(p.name));
  }, [positions, rolePermissions, selectedLeader]);

  const positionOptions = useMemo((): DropdownOption[] => {
    return filteredPositions.map((item) => ({
      value: `${item.zone}|${item.name}`,
      label: translate(item, "name", item.name),
      group: item.zone === "FOH" ? "Front of House" : "Back of House",
    }));
  }, [filteredPositions, translate]);

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) ?? null;
  }, [employees, selectedEmployeeId]);

  const isComplete = useMemo(() => {
    return isPositionalRatingsFormComplete({
      leaderId: selectedLeaderId || null,
      employeeId: selectedEmployeeId || null,
      positionKey: selectedPositionKey || null,
      ratings,
      notes,
      requireRatingComments,
      expectedRatingsCount: labels.length,
    });
  }, [
    selectedLeaderId,
    selectedEmployeeId,
    selectedPositionKey,
    ratings,
    notes,
    requireRatingComments,
    labels.length,
  ]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const markDirty = useCallback(() => {
    setDirty(true);
  }, [setDirty]);

  const handleRatingChange = useCallback(
    (index: number, value: RatingValue) => {
      setRatings((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
      haptics.selection();
      markDirty();
    },
    [markDirty]
  );

  const handleSubmit = useCallback(async () => {
    if (!isComplete || !selectedLeaderId || !selectedEmployeeId || !selectedPosition) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitRatings(token, {
        leaderId: selectedLeaderId,
        employeeId: selectedEmployeeId,
        position: selectedPosition.name,
        ratings: ratings.map((r) => r ?? 0),
        notes: notes.trim() || null,
      });

      haptics.success();

      completeSubmission({
        formType: "ratings",
        employeeName: selectedEmployee?.name ?? "Team member",
        submittedAt: new Date(),
        details: {
          position: selectedPosition.name,
          zone: selectedPosition.zone,
        },
      });

      setDirty(false);
      router.back();
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : "Failed to submit ratings";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    isComplete,
    selectedLeaderId,
    selectedEmployeeId,
    selectedPosition,
    selectedEmployee,
    ratings,
    notes,
    token,
    completeSubmission,
    setDirty,
    router,
  ]);

  // =============================================================================
  // Render
  // =============================================================================

  if (!token) {
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
          onPress={() => {
            setLoadError(null);
            setLoading(true);
          }}
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
        label={t("forms.ratings.leader")}
        placeholder={t("common.select")}
        options={leaderOptions}
        value={selectedLeaderId}
        onChange={(value) => {
          setSelectedLeaderId(value);
          // Clear position when leader changes (positions may be filtered)
          setSelectedPositionKey("");
          setLabels([]);
          setRatings([]);
          markDirty();
        }}
        required
      />

      <AutocompleteDropdown
        label={t("forms.ratings.employee")}
        placeholder={t("common.select")}
        options={employeeOptions}
        value={selectedEmployeeId}
        onChange={(value) => {
          setSelectedEmployeeId(value);
          markDirty();
        }}
        required
      />

      <AutocompleteDropdown
        label={t("forms.ratings.position")}
        placeholder={t("forms.ratings.selectPosition")}
        options={positionOptions}
        value={selectedPositionKey}
        onChange={(value) => {
          setSelectedPositionKey(value);
          markDirty();
        }}
        groupBy
        required
      />

      {/* Position Description */}
      {selectedPosition?.description && (
        <View style={[styles.descriptionContainer, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={[styles.descriptionText, { color: colors.onSurfaceVariant }]}>
            {translate(selectedPosition, "description", selectedPosition.description)}
          </Text>
        </View>
      )}

      {/* Labels Error */}
      {labelsError && (
        <View style={[styles.errorBox, { backgroundColor: colors.errorTransparent, borderColor: colors.error }]}>
          <Text style={[styles.errorBoxText, { color: colors.error }]}>{labelsError}</Text>
        </View>
      )}

      {/* Labels Loading */}
      {labelsLoading && (
        <View style={styles.labelsLoadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.labelsLoadingText, { color: colors.onSurfaceVariant }]}>
            {t("forms.ratings.loadingCriteria")}
          </Text>
        </View>
      )}

      {/* Rating Criteria */}
      {labels.length > 0 && (
        <View style={styles.ratingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{t("forms.ratings.ratePerformance")}</Text>

          {labels.map((label, index) => (
            <Animated.View key={index} entering={FadeIn.delay(index * 60)}>
              <View style={[styles.ratingCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
                <View style={styles.ratingHeader}>
                  <Text style={[styles.ratingLabel, { color: colors.onSurface }]}>{label}</Text>
                  {descriptions[index] && (
                    <Text style={[styles.ratingDescription, { color: colors.onSurfaceVariant }]}>{descriptions[index]}</Text>
                  )}
                </View>

                <View style={styles.ratingOptionsContainer}>
                  {([1, 2, 3] as RatingValue[]).map((value) => {
                    const isSelected = ratings[index] === value;
                    const optionColor = getRatingColor(value);
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.ratingOption,
                          { backgroundColor: colors.surface, borderColor: colors.outline },
                          isSelected && { backgroundColor: colors.primaryTransparent, borderColor: optionColor },
                        ]}
                        onPress={() => handleRatingChange(index, value)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.ratingDot,
                            { borderColor: optionColor },
                            isSelected && { backgroundColor: optionColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.ratingOptionLabel,
                            { color: colors.onSurfaceVariant },
                            isSelected && { color: optionColor, fontWeight: "600" },
                          ]}
                        >
                          {getRatingLabel(value)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          ))}

          {/* Additional Details */}
          <View
            style={[
              styles.notesCard,
              { backgroundColor: colors.surface, borderColor: colors.outline },
              requireRatingComments && !notes.trim() && { borderColor: colors.warning },
            ]}
          >
            <View style={styles.notesHeader}>
              <Text style={[styles.notesLabel, { color: colors.onSurface }]}>
                {t("forms.ratings.additionalDetails")}
                {requireRatingComments && (
                  <Text style={{ color: colors.error }}> *</Text>
                )}
              </Text>
              <Text
                style={[
                  styles.notesHelper,
                  { color: colors.onSurfaceVariant },
                  requireRatingComments && { color: colors.warning },
                ]}
              >
                {requireRatingComments
                  ? t("forms.ratings.additionalDetailsRequiredHelper")
                  : t("forms.ratings.additionalDetailsHelper")}
              </Text>
            </View>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surfaceVariant, color: colors.onSurface }]}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                markDirty();
              }}
              placeholder={t("forms.ratings.additionalDetailsPlaceholder")}
              placeholderTextColor={colors.onSurfaceDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Feedback Reminder */}
          {selectedEmployee && (
            <View style={[styles.feedbackCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
              <Text style={[styles.feedbackTitle, { color: colors.onSurface }]}>{t("forms.ratings.feedbackTitle")}</Text>
              <Text style={[styles.feedbackBody, { color: colors.onSurfaceVariant }]}>
                {t("forms.ratings.feedbackBody", {
                  name: selectedEmployee.name.split(" ")[0],
                })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Submit Error */}
      {submitError && (
        <View style={[styles.submitErrorContainer, { backgroundColor: colors.errorTransparent, borderColor: colors.error }]}>
          <Text style={[styles.submitErrorText, { color: colors.error }]}>{submitError}</Text>
        </View>
      )}

      {/* Submit Button */}
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

// =============================================================================
// Styles
// =============================================================================

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
  },
  retryButtonText: {
    ...typography.labelLarge,
  },
  descriptionContainer: {
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: 12,
  },
  descriptionText: {
    ...typography.bodySmall,
    lineHeight: 20,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: 12,
  },
  errorBoxText: {
    ...typography.bodyMedium,
  },
  labelsLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  labelsLoadingText: {
    ...typography.bodyMedium,
  },
  ratingsSection: {
    gap: 16,
  },
  sectionTitle: {
    ...typography.h4,
  },
  ratingCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
  },
  ratingHeader: {
    gap: 4,
  },
  ratingLabel: {
    ...typography.labelLarge,
    fontWeight: "600",
  },
  ratingDescription: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  ratingOptionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  ratingOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  ratingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  ratingOptionLabel: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  notesCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
  },
  notesHeader: {
    gap: 4,
  },
  notesLabel: {
    ...typography.labelLarge,
    fontWeight: "600",
  },
  notesHelper: {
    ...typography.bodySmall,
  },
  notesInput: {
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.bodyMedium,
    minHeight: 100,
  },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    padding: 16,
    gap: 8,
  },
  feedbackTitle: {
    ...typography.labelLarge,
    fontWeight: "600",
  },
  feedbackBody: {
    ...typography.bodyMedium,
    lineHeight: 22,
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
});

export default PositionalRatingsForm;
