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
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SymbolView } from "expo-symbols";
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
  const [showPicker, setShowPicker] = useState(false);

  const handlePress = useCallback(() => {
    if (!disabled) {
      setShowPicker(true);
    }
  }, [disabled]);

  const handleChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        setShowPicker(false);
      }
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
      }
    },
    [onChange]
  );

  const handleDone = useCallback(() => {
    setShowPicker(false);
  }, []);

  const formattedDate = format(value, "EEEE, MMMM d, yyyy");

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          error && styles.triggerError,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {Platform.OS === "ios" ? (
          <SymbolView
            name="calendar"
            size={20}
            tintColor={colors.onSurfaceVariant}
            style={styles.icon}
          />
        ) : (
          <Text style={styles.iconText}>📅</Text>
        )}
        <Text style={styles.triggerText}>{formattedDate}</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* iOS Modal Picker */}
      {Platform.OS === "ios" && showPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleDone}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              onPress={handleDone}
              activeOpacity={1}
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.picker}
                textColor={colors.onSurface}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Picker */}
      {Platform.OS === "android" && showPicker && (
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
  iconText: {
    fontSize: 18,
    marginRight: 12,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.onSurface,
  },
  doneButton: {
    ...typography.labelLarge,
    color: colors.primary,
  },
  picker: {
    height: 200,
  },
});

export default DatePickerField;
