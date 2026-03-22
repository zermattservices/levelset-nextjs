import React from "react";
import { View, Text, Pressable, Image, StyleSheet, Alert } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography } from "../../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../../lib/theme";
import { AppIcon } from "../../ui/AppIcon";

interface FilePickerFieldProps {
  label: string;
  value: string | undefined;
  onChange: (uri: string | undefined) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function FilePickerField({
  label,
  value,
  onChange,
  required,
  error,
  disabled,
}: FilePickerFieldProps) {
  const colors = useColors();

  const pickImage = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        onChange(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Could not pick image");
    }
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
      {value ? (
        <View style={styles.previewRow}>
          <Image source={{ uri: value }} style={styles.preview} />
          <Pressable onPress={() => onChange(undefined)} style={styles.removeBtn}>
            <AppIcon
              name="xmark.circle.fill"
              size={20}
              tintColor={colors.error}
            />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            if (!disabled) {
              haptics.light();
              pickImage();
            }
          }}
          style={[
            styles.pickButton,
            {
              borderColor: colors.outline,
              backgroundColor: colors.surfaceVariant,
            },
          ]}
        >
          <AppIcon name="photo" size={20} tintColor={colors.onSurfaceVariant} />
          <Text
            style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}
          >
            Tap to add file
          </Text>
        </Pressable>
      )}
      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: spacing[2] },
  label: { ...typography.labelLarge, marginBottom: spacing[1] },
  pickButton: {
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  preview: { width: 80, height: 80, borderRadius: borderRadius.md },
  removeBtn: { padding: spacing[1] },
  error: { ...typography.bodySmall, marginTop: spacing[1] },
});
