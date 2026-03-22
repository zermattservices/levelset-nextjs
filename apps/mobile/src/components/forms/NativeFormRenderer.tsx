/**
 * NativeFormRenderer — Mobile equivalent of the dashboard's FormRenderer.
 *
 * Parses JSON Schema + UI Schema from a form template and renders
 * native React Native components for each field type.
 *
 * Mirrors: apps/dashboard/components/forms/FormRenderer.tsx
 * Field type inference: apps/dashboard/lib/forms/schema-builder.ts
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  LayoutChangeEvent,
} from "react-native";
import { useColors } from "../../context/ThemeContext";
import { useForms } from "../../context/FormsContext";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "../../context/LocationContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { fetchWidgetDataAuth } from "../../lib/api";

// Existing reusable components
import { AutocompleteDropdown } from "./AutocompleteDropdown";
import { DatePickerField } from "./DatePickerField";
import { RadioButtonGroup, type RadioOption } from "./RadioButtonGroup";
import { SignatureCanvas } from "./SignatureCanvas";

// New field components
import {
  SectionHeader,
  TextBlockDisplay,
  TextField,
  YesNoSwitch,
  NumericScoreField,
  CheckboxGroup,
  FilePickerField,
  RatingPills,
} from "./fields";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NativeFormRendererProps {
  template: {
    schema: Record<string, any>;
    ui_schema: Record<string, any>;
    org_id: string;
    form_type?: string;
  };
  initialData?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
  submitting?: boolean;
  submitLabel?: string;
  readOnly?: boolean;
  /** Pass parent ScrollView ref for scroll-to-error */
  scrollRef?: React.RefObject<ScrollView | null>;
  /** Callback when scroll should be disabled/enabled (e.g., during signature) */
  onScrollEnabledChange?: (enabled: boolean) => void;
  /** Called when any field value changes. Allows parent to react (e.g., fetch position labels). */
  onFieldChange?: (fieldId: string, value: any, formData: Record<string, any>) => void;
  /** Runtime overrides for schema.properties — merged before parsing fields. Used for dynamic labels. */
  schemaOverrides?: Record<string, any>;
  /** Set of field IDs to hide from rendering (but still tracked for hooks stability). */
  hiddenFields?: Set<string>;
}

interface ParsedField {
  id: string;
  fieldType: string;
  title: string;
  titleEs: string;
  description?: string;
  descriptionEs?: string;
  required: boolean;
  meta: Record<string, any>;
  schemaProps: Record<string, any>;
  children?: string[];
}

// ---------------------------------------------------------------------------
// Field type inference (mirrors dashboard schema-builder.ts:inferFieldType)
// ---------------------------------------------------------------------------

function inferFieldType(
  propSchema: Record<string, any>,
  fieldUiSchema: Record<string, any>
): string {
  const widget = fieldUiSchema?.["ui:widget"];
  const field = fieldUiSchema?.["ui:field"];

  if (field === "section") return "section";
  if (field === "textBlock") return "text_block";
  if (widget === "signature") return "signature";
  if (widget === "file") return "file_upload";
  if (widget === "data_select") return "select";
  if (widget === "textarea") return "textarea";
  if (widget === "numeric_score") return "numeric_score";
  if (widget === "yesNoSwitch") return "true_false";
  if (widget === "ratingScale") {
    return propSchema.maximum === 3 ? "rating_1_3" : "rating_1_5";
  }

  if (propSchema.type === "boolean") return "true_false";
  if (propSchema.type === "integer" && propSchema.enum) {
    if (propSchema.maximum === 3) return "rating_1_3";
    if (propSchema.maximum === 5) return "rating_1_5";
  }
  if (propSchema.type === "number") {
    if (propSchema.minimum === 0 && propSchema.maximum === 100) return "numeric_score";
    return "number";
  }
  if (propSchema.type === "string") {
    if (propSchema.format === "date") return "date";
    if (propSchema.enum) return widget === "radio" ? "radio" : "select";
    return "text";
  }
  if (propSchema.type === "array") return "checkbox";
  return "text";
}

// ---------------------------------------------------------------------------
// Schema parsing
// ---------------------------------------------------------------------------

function parseFields(schema: any, uiSchema: any): ParsedField[] {
  if (!schema?.properties) return [];

  const properties = schema.properties;
  const requiredSet = new Set<string>(schema.required || []);
  const fieldOrder: string[] = uiSchema?.["ui:order"] || Object.keys(properties);
  const fields: ParsedField[] = [];

  // Track section children so we skip them at the top level
  const sectionChildIds = new Set<string>();
  for (const fid of fieldOrder) {
    const meta = uiSchema?.[fid]?.["ui:fieldMeta"] || {};
    if (meta.children) {
      for (const childId of meta.children) sectionChildIds.add(childId);
    }
  }

  for (const fieldId of fieldOrder) {
    if (sectionChildIds.has(fieldId)) continue;
    const prop = properties[fieldId];
    if (!prop) continue;

    const fieldUiSchema = uiSchema?.[fieldId] || {};
    const meta = fieldUiSchema["ui:fieldMeta"] || {};
    const fieldType = meta.fieldType || inferFieldType(prop, fieldUiSchema);

    const parsed: ParsedField = {
      id: fieldId,
      fieldType,
      title: prop.title || fieldId,
      titleEs: meta.labelEs || "",
      description: prop.description,
      descriptionEs: meta.descriptionEs,
      required: requiredSet.has(fieldId),
      meta,
      schemaProps: prop,
      children: meta.children,
    };

    fields.push(parsed);

    // If it's a section, also parse its children inline
    if (fieldType === "section" && meta.children) {
      for (const childId of meta.children) {
        const childProp = properties[childId];
        if (!childProp) continue;
        const childUi = uiSchema?.[childId] || {};
        const childMeta = childUi["ui:fieldMeta"] || {};
        const childType = childMeta.fieldType || inferFieldType(childProp, childUi);

        fields.push({
          id: childId,
          fieldType: childType,
          title: childProp.title || childId,
          titleEs: childMeta.labelEs || "",
          description: childProp.description,
          descriptionEs: childMeta.descriptionEs,
          required: requiredSet.has(childId),
          meta: childMeta,
          schemaProps: childProp,
        });
      }
    }
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(
  formData: Record<string, any>,
  fields: ParsedField[]
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (!field.required) continue;
    if (field.fieldType === "section" || field.fieldType === "text_block") continue;

    const val = formData[field.id];

    // Boolean: false is a valid value
    if (field.fieldType === "true_false") {
      if (val === undefined || val === null) {
        errors[field.id] = "This field is required";
      }
      continue;
    }

    if (val === undefined || val === null || val === "") {
      errors[field.id] = "This field is required";
    } else if (Array.isArray(val) && val.length === 0) {
      errors[field.id] = "This field is required";
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NativeFormRenderer({
  template,
  initialData,
  onSubmit,
  submitting = false,
  submitLabel = "Submit",
  readOnly = false,
  scrollRef: externalScrollRef,
  onScrollEnabledChange,
  onFieldChange,
  schemaOverrides,
  hiddenFields,
}: NativeFormRendererProps) {
  const colors = useColors();
  const { language } = useForms();
  const { session } = useAuth();
  const { selectedLocation } = useLocation();
  const internalScrollRef = useRef<ScrollView>(null);
  const scrollRef = externalScrollRef || internalScrollRef;

  // Parse fields from schema (with optional runtime overrides for dynamic labels)
  const fields = useMemo(() => {
    let schema = template.schema;
    if (schemaOverrides && Object.keys(schemaOverrides).length > 0) {
      schema = { ...schema, properties: { ...schema.properties, ...schemaOverrides } };
    }
    return parseFields(schema, template.ui_schema);
  }, [template.schema, template.ui_schema, schemaOverrides]);

  // Form state — initialize with initialData + boolean defaults + date defaults
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});

  // Apply defaults for boolean and date fields whenever fields change
  useEffect(() => {
    if (fields.length === 0) return;
    setFormData((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const f of fields) {
        if (f.fieldType === "true_false" && updated[f.id] === undefined) {
          const def = f.schemaProps.default;
          updated[f.id] = def !== undefined ? def : false;
          changed = true;
        }
        if (
          f.fieldType === "date" &&
          f.meta.defaultToCurrentDate &&
          !updated[f.id]
        ) {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, "0");
          const d = String(now.getDate()).padStart(2, "0");
          updated[f.id] = `${y}-${m}-${d}`;
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [fields]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [fieldPositions, setFieldPositions] = useState<Record<string, number>>({});

  // Data source options for data_select fields
  const [dataSourceOptions, setDataSourceOptions] = useState<
    Record<string, { value: string; label: string; subtitle?: string; group?: string }[]>
  >({});
  const [loadingDataSources, setLoadingDataSources] = useState(true);

  // Fetch data source options on mount
  useEffect(() => {
    const dsFields = fields.filter(
      (f) =>
        f.fieldType === "select" &&
        f.meta.dataSource &&
        f.meta.dataSource !== "custom"
    );

    if (dsFields.length === 0) {
      setLoadingDataSources(false);
      return;
    }

    let cancelled = false;
    const token = session?.access_token;
    const orgId = template.org_id || selectedLocation?.org_id;
    const locationId = selectedLocation?.id;

    if (!token || !orgId || !locationId) {
      setLoadingDataSources(false);
      return;
    }

    Promise.all(
      dsFields.map(async (f) => {
        try {
          const opts = await fetchWidgetDataAuth(
            token,
            orgId,
            locationId,
            f.meta.dataSource,
            f.meta.roleFilter
          );
          return { fieldId: f.id, options: opts };
        } catch {
          return { fieldId: f.id, options: [] };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const optMap: typeof dataSourceOptions = {};
      for (const r of results) optMap[r.fieldId] = r.options;
      setDataSourceOptions(optMap);
      setLoadingDataSources(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fields, session?.access_token, template.org_id, selectedLocation]);

  // Field value setter
  const setFieldValue = useCallback((fieldId: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldId]: value };
      // Notify parent of field change
      onFieldChange?.(fieldId, value, next);
      return next;
    });
    // Clear error when user starts typing
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, [onFieldChange]);

  // Track field y positions for scroll-to-error
  const handleFieldLayout = useCallback(
    (fieldId: string, e: LayoutChangeEvent) => {
      const y = e.nativeEvent.layout.y;
      setFieldPositions((prev) => ({ ...prev, [fieldId]: y }));
    },
    []
  );

  // Submit handler
  const handleSubmit = useCallback(() => {
    const validationErrors = validate(formData, fields);
    if (validationErrors) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstErrorId = fields.find((f) => validationErrors[f.id])?.id;
      if (firstErrorId && fieldPositions[firstErrorId] !== undefined) {
        scrollRef.current?.scrollTo({
          y: Math.max(0, fieldPositions[firstErrorId] - 80),
          animated: true,
        });
      }
      haptics.warning();
      return;
    }
    setErrors({});
    onSubmit(formData);
  }, [formData, fields, fieldPositions, onSubmit]);

  // Get display label
  const getLabel = (f: ParsedField) =>
    language === "es" && f.titleEs ? f.titleEs : f.title;

  // Render a single field
  const renderField = (field: ParsedField) => {
    const label = getLabel(field);
    const value = formData[field.id];
    const error = errors[field.id];
    const disabled = readOnly || submitting;

    switch (field.fieldType) {
      case "section": {
        const sName = field.meta.sectionName || field.title;
        const sNameEs = field.meta.sectionNameEs || field.titleEs;
        const uiOpts = template.ui_schema?.[field.id]?.["ui:options"] || {};
        return (
          <SectionHeader
            key={field.id}
            name={uiOpts.sectionName || sName}
            nameEs={uiOpts.sectionNameEs || sNameEs}
            language={language}
          />
        );
      }

      case "text_block": {
        const uiOpts = template.ui_schema?.[field.id]?.["ui:options"] || {};
        return (
          <TextBlockDisplay
            key={field.id}
            content={uiOpts.content || ""}
            contentEs={uiOpts.contentEs}
            language={language}
          />
        );
      }

      case "text":
        return (
          <TextField
            key={field.id}
            label={label}
            value={value}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );

      case "textarea":
        return (
          <TextField
            key={field.id}
            label={label}
            value={value}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
            multiline
            numberOfLines={field.meta.rows || 3}
          />
        );

      case "number":
        return (
          <TextField
            key={field.id}
            label={label}
            value={value !== undefined ? String(value) : undefined}
            onChange={(v) => {
              const num = parseFloat(v);
              setFieldValue(field.id, isNaN(num) ? v : num);
            }}
            required={field.required}
            error={error}
            disabled={disabled}
            keyboardType="numeric"
          />
        );

      case "date": {
        // DatePickerField expects Date objects; formData stores YYYY-MM-DD strings
        let dateValue: Date = new Date();
        if (value && typeof value === "string") {
          const [yr, mo, dy] = value.split("-").map(Number);
          dateValue = new Date(yr, mo - 1, dy);
        }
        return (
          <DatePickerField
            key={field.id}
            label={label}
            value={dateValue}
            onChange={(date: Date) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              setFieldValue(field.id, `${y}-${m}-${d}`);
            }}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );
      }

      case "select": {
        const isDataSource =
          field.meta.dataSource && field.meta.dataSource !== "custom";

        let options: { value: string; label: string; subtitle?: string; group?: string }[];
        if (isDataSource) {
          options = dataSourceOptions[field.id] || [];
        } else {
          const enumVals = field.schemaProps.enum || [];
          const enumNames = field.schemaProps.enumNames || enumVals;
          options = enumVals.map((v: string, i: number) => ({
            value: v,
            label: enumNames[i] || v,
          }));
        }

        return (
          <AutocompleteDropdown
            key={field.id}
            label={label}
            options={options}
            value={value || ""}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );
      }

      case "radio": {
        const enumVals = field.schemaProps.enum || [];
        const enumNames = field.schemaProps.enumNames || enumVals;
        const radioOpts: RadioOption[] = enumVals.map(
          (v: string, i: number) => ({
            value: v,
            label: enumNames[i] || v,
          })
        );
        return (
          <RadioButtonGroup
            key={field.id}
            label={label}
            options={radioOpts}
            value={value ?? null}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );
      }

      case "checkbox": {
        const itemEnum = field.schemaProps.items?.enum || [];
        const itemNames = field.schemaProps.items?.enumNames || itemEnum;
        const checkOpts = itemEnum.map((v: string, i: number) => ({
          value: v,
          label: itemNames[i] || v,
        }));
        return (
          <CheckboxGroup
            key={field.id}
            label={label}
            options={checkOpts}
            value={value || []}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );
      }

      case "true_false":
        return (
          <YesNoSwitch
            key={field.id}
            label={label}
            value={value}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );

      case "rating_1_3":
        return (
          <RatingPills
            key={field.id}
            label={label}
            description={
              language === "es" && field.descriptionEs
                ? field.descriptionEs
                : field.description
            }
            max={3}
            value={value ?? undefined}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );

      case "rating_1_5":
        return (
          <RatingPills
            key={field.id}
            label={label}
            description={
              language === "es" && field.descriptionEs
                ? field.descriptionEs
                : field.description
            }
            max={5}
            value={value ?? undefined}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );

      case "numeric_score":
        return (
          <NumericScoreField
            key={field.id}
            label={label}
            value={value}
            onChange={(v) => setFieldValue(field.id, v)}
            maxValue={field.meta.maxValue || field.schemaProps.maximum || 10}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );

      case "signature":
        return (
          <View key={field.id} style={styles.signatureContainer}>
            <SignatureCanvas
              label={label}
              value={value}
              onSignatureChange={(uri) => setFieldValue(field.id, uri)}
              disabled={disabled}
              required={field.required}
              onSigningStart={() => {
                setScrollEnabled(false);
                onScrollEnabledChange?.(false);
              }}
              onSigningEnd={() => {
                setScrollEnabled(true);
                onScrollEnabledChange?.(true);
              }}
            />
            {error && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            )}
          </View>
        );

      case "file_upload":
        return (
          <FilePickerField
            key={field.id}
            label={label}
            value={value}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );

      default:
        return (
          <TextField
            key={field.id}
            label={label}
            value={value}
            onChange={(v) => setFieldValue(field.id, v)}
            required={field.required}
            error={error}
            disabled={disabled}
          />
        );
    }
  };

  // Empty state
  const hasFields =
    fields.filter((f) => f.fieldType !== "section" && f.fieldType !== "text_block")
      .length > 0;

  if (!hasFields && !loadingDataSources) {
    return (
      <View style={[styles.emptyState, { borderColor: colors.outline }]}>
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
          No Fields
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
          This form has no fields yet.
        </Text>
      </View>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <View style={styles.root}>
      {/* Error banner */}
      {errorCount > 0 && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: colors.errorContainer || "rgba(220,38,38,0.08)",
              borderColor: colors.error,
            },
          ]}
        >
          <Text style={[styles.errorBannerText, { color: colors.error }]}>
            {errorCount === 1
              ? "Please complete 1 required field before submitting."
              : `Please complete ${errorCount} required fields before submitting.`}
          </Text>
        </View>
      )}

      {/* Loading indicator for data sources */}
      {loadingDataSources && (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginVertical: spacing[4] }}
        />
      )}

      {/* Fields */}
      {!loadingDataSources &&
        fields.map((field) => {
          // Hidden fields are not rendered but remain in the array for hook stability
          if (hiddenFields?.has(field.id)) return null;
          return (
          <View
            key={field.id}
            onLayout={(e) => handleFieldLayout(field.id, e)}
          >
            {renderField(field)}
          </View>
          );
        })}

      {/* Submit button */}
      {!readOnly && !loadingDataSources && (
        <Pressable
          onPress={() => {
            if (!submitting) {
              haptics.medium();
              handleSubmit();
            }
          }}
          disabled={submitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: submitting
                ? colors.onSurfaceDisabled
                : colors.primary,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitText}>{submitLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingBottom: spacing[4],
    gap: 16,
  },
  errorBanner: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  errorBannerText: {
    ...typography.labelMedium,
    fontWeight: fontWeights.semibold,
  },
  fieldLabel: {
    ...typography.labelLarge,
    marginBottom: spacing[1],
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: spacing[1],
  },
  signatureContainer: {
    marginVertical: spacing[2],
  },
  submitButton: {
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing[4],
  },
  submitText: {
    ...typography.labelLarge,
    fontWeight: fontWeights.semibold,
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[8],
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  emptyTitle: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
  },
});
