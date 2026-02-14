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
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AppIcon } from "../ui";
import { format } from "date-fns";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";
import { borderRadius } from "../../lib/theme";

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
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
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
      setShowAndroidPicker(true);
    }
  }, [disabled]);

  const formattedDate = format(value, "EEEE, MMMM d, yyyy");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <View
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          error && styles.triggerError,
        ]}
      >
        <AppIcon name="calendar" size={20} tintColor={colors.onSurfaceVariant} style={styles.icon} />
        {Platform.OS === "ios" ? (
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
            <Text style={styles.triggerText}>{formattedDate}</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Android Picker */}
      {Platform.OS === "android" && showAndroidPicker && (
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
    color: colors.onSurface,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    opacity: 0.6,
  },
  triggerError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: 12,
  },
  compactPicker: {
    flex: 1,
  },
  androidTrigger: {
    flex: 1,
  },
  triggerText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: 4,
  },
});

export default DatePickerField;
