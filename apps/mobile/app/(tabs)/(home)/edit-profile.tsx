/**
 * Edit Profile Screen
 * Glass formSheet for viewing profile details and editing nickname
 * Shows Personal Info, Employment, and editable Nickname sections
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../src/context/AuthContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import { GlassCard } from "../../../src/components/glass";
import "../../../src/lib/i18n";

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatPosition(pos: string | null | undefined): string {
  if (!pos) return "-";
  return pos.charAt(0).toUpperCase() + pos.slice(1).replace(/_/g, " ");
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const {
    fullName,
    email,
    profileImage,
    nickname,
    position,
    birthDate,
    startDate,
    employeePhone,
    updateNickname,
  } = useAuth();

  const [editedNickname, setEditedNickname] = useState(nickname || "");
  const [saving, setSaving] = useState(false);

  const hasChanges = editedNickname !== (nickname || "");

  const getInitials = (name: string | null | undefined) => {
    if (!name) return email?.charAt(0)?.toUpperCase() || "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaving(true);
    haptics.medium();

    const result = await updateNickname(editedNickname.trim());

    setSaving(false);
    if (result.success) {
      haptics.success();
      router.dismiss();
    } else {
      Alert.alert("Error", result.error || "Failed to save nickname");
    }
  }, [editedNickname, hasChanges, updateNickname, router]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing[5], gap: spacing[5] }}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptics.light();
            router.dismiss();
          }}
          style={styles.headerButton}
        >
          <Text style={[styles.cancelText, { color: colors.primary }]}>
            {t("common.cancel")}
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          {t("profile.editProfile")}
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={styles.headerButton}
        >
          <Text
            style={[
              styles.saveText,
              { color: colors.primary },
              (!hasChanges || saving) && styles.saveTextDisabled,
            ]}
          >
            {saving ? t("common.saving") : t("common.save")}
          </Text>
        </Pressable>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
              {getInitials(fullName)}
            </Text>
          </View>
        )}
        <Text style={[styles.displayName, { color: colors.onSurface }]}>
          {fullName || email || t("profile.notLoggedIn")}
        </Text>
      </View>

      {/* Personal Info section - read only */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
          {t("profile.personalInfo")}
        </Text>
        <GlassCard>
          <FieldRow
            icon="person"
            label={t("profile.name")}
            value={fullName || "-"}
            colors={colors}
          />
          <View style={[styles.fieldDivider, { backgroundColor: colors.outline }]} />
          <FieldRow
            icon="envelope"
            label={t("profile.email")}
            value={email || "-"}
            colors={colors}
          />
          <View style={[styles.fieldDivider, { backgroundColor: colors.outline }]} />
          <FieldRow
            icon="phone"
            label={t("profile.phone")}
            value={employeePhone || "-"}
            colors={colors}
          />
          <View style={[styles.fieldDivider, { backgroundColor: colors.outline }]} />
          <FieldRow
            icon="gift"
            label={t("profile.birthDate")}
            value={formatDate(birthDate)}
            colors={colors}
          />
        </GlassCard>
      </View>

      {/* Employment section - read only */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
          {t("profile.employment")}
        </Text>
        <GlassCard>
          <FieldRow
            icon="briefcase"
            label={t("profile.position")}
            value={formatPosition(position)}
            colors={colors}
          />
          <View style={[styles.fieldDivider, { backgroundColor: colors.outline }]} />
          <FieldRow
            icon="calendar"
            label={t("profile.startDate")}
            value={formatDate(startDate)}
            colors={colors}
          />
        </GlassCard>
      </View>

      {/* Nickname section - editable */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>
          {t("profile.nickname")}
        </Text>
        <GlassCard>
          <TextInput
            value={editedNickname}
            onChangeText={setEditedNickname}
            placeholder={t("profile.nicknamePlaceholder")}
            placeholderTextColor={colors.onSurfaceDisabled}
            style={[styles.nicknameInput, { color: colors.onSurface }]}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={30}
            onSubmitEditing={handleSave}
          />
        </GlassCard>
        <Text style={[styles.nicknameHint, { color: colors.onSurfaceDisabled }]}>
          {t("profile.nicknameHint")}
        </Text>
      </View>
    </ScrollView>
  );
}

/** Read-only field row with icon */
function FieldRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.fieldRow}>
      <AppIcon name={icon} size={18} tintColor={colors.onSurfaceVariant} />
      <Text style={[styles.fieldLabel, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <Text selectable style={[styles.fieldValue, { color: colors.onSurface }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerButton: {
    padding: spacing[1],
    minWidth: 60,
  },
  headerTitle: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  cancelText: {
    ...typography.bodyMedium,
  },
  saveText: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
    textAlign: "right",
  },
  saveTextDisabled: {
    opacity: 0.4,
  },
  avatarSection: {
    alignItems: "center",
    gap: spacing[3],
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: fontWeights.bold,
  },
  displayName: {
    ...typography.h3,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
  },
  section: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...typography.labelLarge,
    paddingHorizontal: spacing[1],
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  fieldLabel: {
    ...typography.bodyMedium,
  },
  fieldValue: {
    ...typography.bodyMedium,
    textAlign: "right",
    flex: 1,
  },
  fieldDivider: {
    height: 1,
    marginVertical: spacing[2],
  },
  nicknameInput: {
    ...typography.bodyMedium,
    padding: 0,
    minHeight: 24,
  },
  nicknameHint: {
    ...typography.bodySmall,
    paddingHorizontal: spacing[1],
  },
});
