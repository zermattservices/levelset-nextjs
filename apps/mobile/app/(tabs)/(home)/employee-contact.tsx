/**
 * Employee Profile Modal
 * Read-only formSheet matching the edit-profile pattern.
 * Shows Personal Info and Employment sections with copyable phone/email.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import { GlassCard } from "../../../src/components/glass";

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

function formatRole(role: string | null | undefined): string {
  if (!role) return "-";
  return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
}

export default function EmployeeProfileModal() {
  const router = useRouter();
  const colors = useColors();

  const {
    fullName,
    role,
    phone,
    email,
    profileImage,
    title,
    hireDate,
  } = useLocalSearchParams<{
    fullName: string;
    role: string;
    phone: string;
    email: string;
    profileImage: string;
    title: string;
    hireDate: string;
  }>();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    haptics.success();
    Alert.alert("Copied", `${label} copied to clipboard`);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing[5], gap: spacing[5] }}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
          Profile
        </Text>
        <Pressable
          onPress={() => {
            haptics.light();
            router.dismiss();
          }}
          style={styles.headerButton}
        >
          <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
        </Pressable>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatarImage} />
        ) : (
          <View
            style={[styles.avatarFallback, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.avatarText, { color: colors.onPrimary }]}>
              {getInitials(fullName)}
            </Text>
          </View>
        )}
        <Text style={[styles.displayName, { color: colors.onSurface }]}>
          {fullName || "Unknown"}
        </Text>
      </View>

      {/* Personal Info section */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}
        >
          Personal Info
        </Text>
        <GlassCard>
          <FieldRow
            icon="person"
            label="Name"
            value={fullName || "-"}
            colors={colors}
          />
          <View
            style={[styles.fieldDivider, { backgroundColor: colors.outline }]}
          />
          <Pressable
            onPress={() => {
              if (email) {
                haptics.light();
                Linking.openURL(`mailto:${email}`);
              }
            }}
            onLongPress={() => {
              if (email) handleCopy(email, "Email address");
            }}
          >
            <FieldRow
              icon="envelope"
              label="Email"
              value={email || "-"}
              colors={colors}
              actionIcon={email ? "doc.on.doc" : undefined}
              onActionPress={
                email ? () => handleCopy(email, "Email address") : undefined
              }
            />
          </Pressable>
          <View
            style={[styles.fieldDivider, { backgroundColor: colors.outline }]}
          />
          <Pressable
            onPress={() => {
              if (phone) {
                haptics.light();
                Linking.openURL(`tel:${phone}`);
              }
            }}
            onLongPress={() => {
              if (phone) handleCopy(phone, "Phone number");
            }}
          >
            <FieldRow
              icon="phone"
              label="Phone"
              value={phone || "-"}
              colors={colors}
              actionIcon={phone ? "doc.on.doc" : undefined}
              onActionPress={
                phone ? () => handleCopy(phone, "Phone number") : undefined
              }
            />
          </Pressable>
        </GlassCard>
      </View>

      {/* Employment section */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}
        >
          Employment
        </Text>
        <GlassCard>
          <FieldRow
            icon="text.badge.star"
            label="Job Title"
            value={title || "-"}
            colors={colors}
          />
          <View
            style={[styles.fieldDivider, { backgroundColor: colors.outline }]}
          />
          <FieldRow
            icon="briefcase"
            label="Role"
            value={formatRole(role)}
            colors={colors}
          />
          <View
            style={[styles.fieldDivider, { backgroundColor: colors.outline }]}
          />
          <FieldRow
            icon="calendar"
            label="Start Date"
            value={formatDate(hireDate)}
            colors={colors}
          />
        </GlassCard>
      </View>
    </ScrollView>
  );
}

/** Read-only field row with icon, matching edit-profile FieldRow */
function FieldRow({
  icon,
  label,
  value,
  colors,
  actionIcon,
  onActionPress,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  actionIcon?: string;
  onActionPress?: () => void;
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
      {actionIcon && onActionPress && (
        <Pressable onPress={onActionPress} style={{ paddingLeft: spacing[2] }}>
          <AppIcon
            name={actionIcon}
            size={16}
            tintColor={colors.onSurfaceDisabled}
          />
        </Pressable>
      )}
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
  doneText: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
    textAlign: "right",
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
});
