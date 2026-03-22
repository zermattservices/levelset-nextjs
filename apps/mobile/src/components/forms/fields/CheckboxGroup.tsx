import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography } from "../../../lib/fonts";
import { spacing, haptics } from "../../../lib/theme";
import { AppIcon } from "../../ui/AppIcon";

interface CheckboxGroupProps {
  label: string;
  options: { value: string; label: string }[];
  value: string[] | undefined;
  onChange: (val: string[]) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function CheckboxGroup({
  label,
  options,
  value = [],
  onChange,
  required,
  error,
  disabled,
}: CheckboxGroupProps) {
  const colors = useColors();
  const selected = new Set(value);

  const toggle = (optValue: string) => {
    if (disabled) return;
    haptics.selection();
    const next = new Set(selected);
    if (next.has(optValue)) next.delete(optValue);
    else next.add(optValue);
    onChange(Array.from(next));
  };

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
      {options.map((opt) => {
        const isChecked = selected.has(opt.value);
        return (
          <Pressable
            key={opt.value}
            onPress={() => toggle(opt.value)}
            style={styles.row}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isChecked ? colors.primary : "transparent",
                  borderColor: isChecked ? colors.primary : colors.outline,
                },
              ]}
            >
              {isChecked && (
                <AppIcon name="checkmark" size={14} tintColor="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.optionLabel, { color: colors.onSurface }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing[2] },
  label: { ...typography.labelLarge, marginBottom: spacing[2] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { ...typography.bodyMedium, flex: 1 },
  error: { ...typography.bodySmall, marginTop: spacing[1] },
});
