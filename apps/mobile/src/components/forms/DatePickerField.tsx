/**
 * DatePickerField Component
 * A date picker field using native date picker on iOS/Android
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AppIcon } from "../ui";
import { format } from "date-fns";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";

interface DatePickerFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  required = false,
  error,
}: DatePickerFieldProps) {
  const colors = useColors();
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (process.env.EXPO_OS === "android") {
        setShowAndroidPicker(false);
      }
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
      }
    },
    [onChange]
  );

  const handleAndroidPress = useCallback(() => {
    if (!disabled) {
      haptics.light();
      setShowAndroidPicker(true);
    }
  }, [disabled]);

  const formattedDate = format(value, "EEEE, MMMM d, yyyy");

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onSurface }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <View
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.outline },
          disabled && { backgroundColor: colors.surfaceDisabled, opacity: 0.6 },
          error && { borderColor: colors.error },
        ]}
      >
        <AppIcon name="calendar" size={20} tintColor={colors.onSurfaceVariant} style={styles.icon} />
        {process.env.EXPO_OS === "ios" ? (
          <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            disabled={disabled}
            style={styles.compactPicker}
          />
        ) : (
          <TouchableOpacity
            onPress={handleAndroidPress}
            disabled={disabled}
            activeOpacity={0.7}
            style={styles.androidTrigger}
          >
            <Text style={[styles.triggerText, { color: colors.onSurface }]}>{formattedDate}</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

      {/* Android Picker */}
      {process.env.EXPO_OS === "android" && showAndroidPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.labelLarge,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  icon: {},
  compactPicker: {
    flex: 1,
  },
  androidTrigger: {
    flex: 1,
  },
  triggerText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: 4,
  },
});

export default DatePickerField;
