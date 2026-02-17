/**
 * RadioButtonGroup Component
 * A group of radio buttons for single selection
 * Used for positional ratings (Not Yet / On the Rise / Crushing It)
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";

export interface RadioOption {
  value: number | string;
  label: string;
  description?: string;
  color?: string;
}

interface RadioButtonGroupProps {
  label: string;
  description?: string;
  options: RadioOption[];
  value: number | string | null;
  onChange: (value: number | string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  horizontal?: boolean;
}

export function RadioButtonGroup({
  label,
  description,
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  horizontal = false,
}: RadioButtonGroupProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onSurface }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      {description && (
        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          {description}
        </Text>
      )}

      <View style={[styles.optionsContainer, horizontal && styles.optionsHorizontal]}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const optionColor = option.color || colors.primary;

          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[
                styles.option,
                { backgroundColor: colors.surface, borderColor: colors.outline },
                horizontal && styles.optionHorizontal,
                isSelected && { backgroundColor: colors.primaryTransparent, borderColor: optionColor },
                disabled && styles.optionDisabled,
              ]}
              onPress={() => {
                if (!disabled) {
                  haptics.selection();
                  onChange(option.value);
                }
              }}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <View style={styles.radioContainer}>
                <View
                  style={[
                    styles.radioOuter,
                    { borderColor: colors.outline },
                    isSelected && { borderColor: optionColor },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[styles.radioInner, { backgroundColor: optionColor }]}
                    />
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: colors.onSurface },
                      isSelected && { color: optionColor },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={[styles.optionDescription, { color: colors.onSurfaceVariant }]}>
                      {option.description}
                    </Text>
                  )}
                </View>
              </View>
              {isSelected && (
                <AppIcon
                  name="checkmark"
                  size={16}
                  tintColor={optionColor}
                  style={styles.checkmark}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

// Preset options for positional ratings
// Pass colors from useColors() to get theme-aware rating options
export function getRatingOptions(colors: ReturnType<typeof useColors>): RadioOption[] {
  return [
    {
      value: 1,
      label: "Not Yet",
      description: "Needs improvement",
      color: colors.error,
    },
    {
      value: 2,
      label: "On the Rise",
      description: "Making progress",
      color: colors.warning,
    },
    {
      value: 3,
      label: "Crushing It",
      description: "Exceeds expectations",
      color: colors.success,
    },
  ];
}

/** @deprecated Use getRatingOptions(colors) instead for dark mode support */
export const RATING_OPTIONS: RadioOption[] = [
  {
    value: 1,
    label: "Not Yet",
    description: "Needs improvement",
    color: "#EF4444",
  },
  {
    value: 2,
    label: "On the Rise",
    description: "Making progress",
    color: "#F59E0B",
  },
  {
    value: 3,
    label: "Crushing It",
    description: "Exceeds expectations",
    color: "#22C55E",
  },
];

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    ...typography.labelLarge,
    marginBottom: 4,
  },
  description: {
    ...typography.bodySmall,
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionsHorizontal: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionHorizontal: {
    flex: 1,
    minWidth: 100,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    ...typography.bodyMedium,
    fontWeight: "500",
  },
  optionDescription: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  checkmark: {},
  errorText: {
    ...typography.bodySmall,
    marginTop: 8,
  },
});

export default RadioButtonGroup;
