import React, { useEffect, useRef } from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography, fontWeights } from "../../../lib/fonts";
import { spacing } from "../../../lib/theme";

interface YesNoSwitchProps {
  label: string;
  value: boolean | undefined;
  onChange: (val: boolean) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function YesNoSwitch({
  label,
  value,
  onChange,
  required,
  error,
  disabled,
}: YesNoSwitchProps) {
  const colors = useColors();
  const checked = value === true;
  const didInit = useRef(false);

  // Default to false on mount if value is undefined
  useEffect(() => {
    if (!didInit.current && value === undefined) {
      didInit.current = true;
      onChange(false);
    }
  }, [value, onChange]);

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
        <Text
          style={[
            styles.option,
            {
              color: checked ? colors.onSurfaceDisabled : colors.error,
              fontWeight: checked ? fontWeights.regular : fontWeights.semibold,
            },
          ]}
        >
          No
        </Text>
        <Switch
          value={checked}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: colors.error, true: colors.success }}
          thumbColor="#FFFFFF"
        />
        <Text
          style={[
            styles.option,
            {
              color: checked ? colors.success : colors.onSurfaceDisabled,
              fontWeight: checked ? fontWeights.semibold : fontWeights.regular,
            },
          ]}
        >
          Yes
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
  option: { ...typography.bodyMedium, minWidth: 28 },
  error: { ...typography.bodySmall, marginTop: spacing[1] },
});
