/**
 * FileAttachmentStrip — Reusable file attachment UI extracted from DisciplineInfractionForm.
 * Shows horizontal thumbnail strip + "Attach" button with camera/gallery/PDF picker.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActionSheetIOS,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { AppIcon } from "../ui";

// Lazy-load native modules to prevent crashes if not available
let _ImagePicker: any = null;
let _DocumentPicker: any = null;

function getImagePicker() {
  if (!_ImagePicker) _ImagePicker = require("expo-image-picker");
  return _ImagePicker;
}

function getDocumentPicker() {
  if (!_DocumentPicker) _DocumentPicker = require("expo-document-picker");
  return _DocumentPicker;
}

export interface AttachedFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface FileAttachmentStripProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  label?: string;
}

export function FileAttachmentStrip({
  files,
  onFilesChange,
  maxFiles = 5,
  disabled = false,
  label,
}: FileAttachmentStripProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const pickFromGallery = useCallback(async () => {
    const remaining = maxFiles - files.length;
    if (remaining <= 0) return;
    const ImagePicker = getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newFiles = result.assets.map((asset: any) => ({
        uri: asset.uri,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
        size: asset.fileSize,
      }));
      onFilesChange([...files, ...newFiles].slice(0, maxFiles));
      haptics.medium();
    }
  }, [files, maxFiles, onFilesChange]);

  const takePhoto = useCallback(async () => {
    if (files.length >= maxFiles) return;
    const ImagePicker = getImagePicker();
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onFilesChange([
        ...files,
        {
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        },
      ].slice(0, maxFiles));
      haptics.medium();
    }
  }, [files, maxFiles, onFilesChange]);

  const pickDocument = useCallback(async () => {
    if (files.length >= maxFiles) return;
    const DocumentPicker = getDocumentPicker();
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", multiple: false });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      onFilesChange([
        ...files,
        {
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}.pdf`,
          type: asset.mimeType || "application/pdf",
          size: asset.size,
        },
      ].slice(0, maxFiles));
      haptics.medium();
    }
  }, [files, maxFiles, onFilesChange]);

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const openAttachmentMenu = useCallback(() => {
    if (files.length >= maxFiles) return;
    const options = ["Camera", "Photo Library", "PDF Document", "Cancel"];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, title: "Attach Photo or Document" },
        (index) => {
          if (index === 0) takePhoto();
          else if (index === 1) pickFromGallery();
          else if (index === 2) pickDocument();
        }
      );
    } else {
      Alert.alert("Attach Photo or Document", undefined, [
        { text: "Camera", onPress: takePhoto },
        { text: "Photo Library", onPress: pickFromGallery },
        { text: "PDF Document", onPress: pickDocument },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [files.length, maxFiles, takePhoto, pickFromGallery, pickDocument]);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>
      )}

      {/* Thumbnails */}
      {files.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailStrip}
        >
          {files.map((file, index) => (
            <View key={index} style={styles.thumbnailWrapper}>
              {file.type.startsWith("image/") ? (
                <Image source={{ uri: file.uri }} style={[styles.thumbnail, { borderColor: colors.outline }]} />
              ) : (
                <View style={[styles.thumbnail, styles.pdfThumbnail, { borderColor: colors.outline, backgroundColor: colors.surfaceVariant }]}>
                  <AppIcon name="doc.fill" size={24} tintColor={colors.onSurfaceVariant} />
                  <Text style={[styles.pdfLabel, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => removeFile(index)}
                style={[styles.removeButton, { backgroundColor: colors.error }]}
              >
                <AppIcon name="xmark" size={10} tintColor="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add button */}
      {files.length < maxFiles && !disabled && (
        <Pressable
          onPress={() => { haptics.light(); openAttachmentMenu(); }}
          style={[styles.addButton, { borderColor: colors.outline }]}
        >
          <AppIcon name="paperclip" size={16} tintColor={colors.onSurfaceVariant} />
          <Text style={[styles.addButtonText, { color: colors.onSurfaceVariant }]}>
            Attach Photo or Document
          </Text>
        </Pressable>
      )}

      <Text style={[styles.countText, { color: colors.onSurfaceDisabled }]}>
        {files.length} / {maxFiles} files
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  label: {
    ...typography.labelLarge,
  },
  thumbnailStrip: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  thumbnailWrapper: {
    position: "relative",
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  pdfThumbnail: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  pdfLabel: {
    fontSize: 8,
    textAlign: "center",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    ...typography.bodySmall,
    fontWeight: fontWeights.semibold,
  },
  countText: {
    ...typography.bodySmall,
    textAlign: "right",
  },
});
