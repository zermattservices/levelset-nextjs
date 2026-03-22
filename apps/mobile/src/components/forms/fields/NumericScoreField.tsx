import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography, fontWeights } from "../../../lib/fonts";
import { spacing, borderRadius } from "../../../lib/theme";

interface NumericScoreFieldProps {
  label: string;
  value: number | undefined;
  onChange: (val: number | undefined) => void;
  maxValue: number;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function NumericScoreField({
  label,
  value,
  onChange,
  maxValue,
  required,
  error,
  disabled,
}: NumericScoreFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.label,
          { color: error ? colors.error : colors.onSurface },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              backgroundColor: colors.surfaceVariant,
              borderColor: error ? colors.error : colors.outline,
            },
          ]}
          value={value !== undefined ? String(value) : ""}
          onChangeText={(t) => {
            const num = parseFloat(t);
            onChange(isNaN(num) ? undefined : num);
          }}
          keyboardType="decimal-pad"
          editable={!disabled}
          placeholder="0"
          placeholderTextColor={colors.onSurfaceDisabled}
        />
        <Text style={[styles.maxLabel, { color: colors.onSurfaceVariant }]}>
          / {maxValue}
        </Text>
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing[2] },
  label: { ...typography.labelLarge, marginBottom: spacing[1] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  input: {
    ...typography.bodyLarge,
    fontWeight: fontWeights.semibold,
    width: 80,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    textAlign: "center",
  },
  maxLabel: { ...typography.bodyLarge },
  error: { ...typography.bodySmall, marginTop: spacing[1] },
});
