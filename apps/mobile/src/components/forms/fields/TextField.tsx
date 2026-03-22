import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography } from "../../../lib/fonts";
import { spacing, borderRadius } from "../../../lib/theme";

interface TextFieldProps {
  label: string;
  value: string | undefined;
  onChange: (val: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  placeholder?: string;
}

export function TextField({
  label,
  value,
  onChange,
  required,
  error,
  disabled,
  multiline,
  numberOfLines = 3,
  keyboardType = "default",
  placeholder,
}: TextFieldProps) {
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
      <TextInput
        style={[
          styles.input,
          multiline && {
            height: numberOfLines * 24 + spacing[4],
            textAlignVertical: "top",
          },
          {
            color: colors.onSurface,
            backgroundColor: colors.surfaceVariant,
            borderColor: error ? colors.error : colors.outline,
          },
        ]}
        value={value ?? ""}
        onChangeText={onChange}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
        keyboardType={keyboardType}
        placeholder={placeholder || label}
        placeholderTextColor={colors.onSurfaceDisabled}
      />
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing[2] },
  label: { ...typography.labelLarge, marginBottom: spacing[1] },
  input: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  error: { ...typography.bodySmall, marginTop: spacing[1] },
});
