/**
 * RadioButtonGroup Component
 * A group of radio buttons for single selection
 * Used for positional ratings (Not Yet / On the Rise / Crushing It)
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppIcon } from "../ui";
import { colors } from "../../lib/colors";
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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {description && <Text style={styles.description}>{description}</Text>}

      <View style={[styles.optionsContainer, horizontal && styles.optionsHorizontal]}>
        {options.map((option) => {
          const isSelected = value === option.value;
          const optionColor = option.color || colors.primary;

          return (
            <TouchableOpacity
              key={String(option.value)}
              style={[
                styles.option,
                horizontal && styles.optionHorizontal,
                isSelected && styles.optionSelected,
                isSelected && { borderColor: optionColor },
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
                      isSelected && { color: optionColor },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={styles.optionDescription}>
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

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// Preset options for positional ratings
export const RATING_OPTIONS: RadioOption[] = [
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    ...typography.labelLarge,
    color: colors.onSurface,
    marginBottom: 4,
  },
  required: {
    color: colors.error,
  },
  description: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionHorizontal: {
    flex: 1,
    minWidth: 100,
  },
  optionSelected: {
    backgroundColor: colors.primaryTransparent,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.outline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    color: colors.onSurface,
    fontWeight: "500",
  },
  optionDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  checkmark: {
    marginLeft: 8,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: 8,
  },
});

export default RadioButtonGroup;
