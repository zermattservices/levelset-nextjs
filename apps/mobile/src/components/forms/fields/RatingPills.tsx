/**
 * RatingPills — Matches dashboard RatingScaleWidget (PWA) exactly.
 *
 * Layout: Card with title + description, then for each option:
 * colored label text on top, MUI-style radio button below.
 * Radio: outer circle outline + inner filled dot when selected.
 *
 * Reference: apps/dashboard/components/forms/widgets/RatingScaleWidget.tsx
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography } from "../../../lib/fonts";
import { borderRadius, haptics } from "../../../lib/theme";

const RATING_1_3_OPTIONS = [
  { label: "Not Yet", value: 1, color: "#b91c1c" },
  { label: "On the Rise", value: 2, color: "#f59e0b" },
  { label: "Crushing It", value: 3, color: "#31664A" },
];

const RATING_1_5_OPTIONS = [
  { label: "1 - Poor", value: 1, color: "#b91c1c" },
  { label: "2 - Below", value: 2, color: "#E57373" },
  { label: "3 - Meets", value: 3, color: "#f59e0b" },
  { label: "4 - Good", value: 4, color: "#81C784" },
  { label: "5 - Excellent", value: 5, color: "#31664A" },
];

interface RatingPillsProps {
  label: string;
  description?: string;
  value: number | string | undefined;
  onChange: (val: number) => void;
  max?: 3 | 5;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function RatingPills({
  label,
  description,
  value,
  onChange,
  max = 3,
  required,
  error,
  disabled,
}: RatingPillsProps) {
  const colors = useColors();
  const options = max === 3 ? RATING_1_3_OPTIONS : RATING_1_5_OPTIONS;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: error ? colors.error : colors.outline,
        },
        disabled && { opacity: 0.6 },
      ]}
    >
      {/* Title + Description */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          {label}
          {required && <Text style={{ color: "#dc2626" }}> *</Text>}
        </Text>
        {description && (
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            {description}
          </Text>
        )}
      </View>

      {/* Options row — label above radio, evenly distributed */}
      <View style={styles.optionsRow}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={styles.optionColumn}
              onPress={() => {
                if (!disabled) {
                  haptics.selection();
                  onChange(option.value);
                }
              }}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.optionLabel,
                  { color: option.color },
                ]}
              >
                {option.label}
              </Text>
              {/* MUI-style radio: outer ring + inner dot */}
              <View style={[styles.radioOuter, { borderColor: option.color }]}>
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: option.color }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Satoshi-Variable",
  },
  description: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    fontFamily: "Satoshi-Variable",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  optionColumn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    fontFamily: "Satoshi-Variable",
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: 4,
  },
});
