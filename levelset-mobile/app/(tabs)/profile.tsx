/**
 * Profile Tab
 * Shows user info, settings, and logout functionality
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Pressable,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/context/AuthContext";
import { useForms } from "../../src/context/FormsContext";
import { colors } from "../../src/lib/colors";
import { typography } from "../../src/lib/fonts";
import { borderRadius, haptics } from "../../src/lib/theme";
import { GlassCard, GlassButton } from "../../src/components/glass";

// Import i18n to ensure it's initialized
import "../../src/lib/i18n";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { fullName, email, profileImage, role, signOut, user } = useAuth();
  const { language, setLanguage } = useForms();

  const handleLogout = useCallback(() => {
    haptics.warning();
    Alert.alert(
      t("profile.signOut"),
      t("profile.signOutConfirm"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("profile.signOut"),
          style: "destructive",
          onPress: () => signOut(),
        },
      ]
    );
  }, [signOut, t]);

  // Get initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return email?.charAt(0)?.toUpperCase() || "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format role for display
  const formatRole = (userRole: string | null | undefined) => {
    if (!userRole) return null;
    return userRole.charAt(0).toUpperCase() + userRole.slice(1).replace(/_/g, " ");
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 16 }}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("profile.title")}
        </Text>
      </View>

      {/* User Info Card */}
      <Animated.View entering={FadeIn}>
        <GlassCard style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {fullName || email || t("profile.notLoggedIn")}
          </Text>
          {email && fullName && (
            <Text style={styles.userEmail}>{email}</Text>
          )}
          {role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{formatRole(role)}</Text>
            </View>
          )}
        </GlassCard>
      </Animated.View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("profile.settings")}
        </Text>

        {/* Language Toggle */}
        <GlassCard style={styles.settingCard}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>{t("profile.language")}</Text>
            <Text style={styles.settingDescription}>
              {t("profile.languageDescription")}
            </Text>
          </View>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[
                styles.segmentOption,
                language === "en" && styles.segmentOptionSelected,
              ]}
              onPress={() => {
                haptics.selection();
                setLanguage("en");
              }}
            >
              <Text
                style={[
                  styles.segmentText,
                  language === "en" && styles.segmentTextSelected,
                ]}
              >
                English
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentOption,
                language === "es" && styles.segmentOptionSelected,
              ]}
              onPress={() => {
                haptics.selection();
                setLanguage("es");
              }}
            >
              <Text
                style={[
                  styles.segmentText,
                  language === "es" && styles.segmentTextSelected,
                ]}
              >
                Espanol
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Version Info */}
        <GlassCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("profile.version")}</Text>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </GlassCard>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <GlassButton
          label={t("profile.signOut")}
          variant="outline"
          onPress={handleLogout}
          fullWidth
        />
      </View>

      {/* User ID (for debugging/support) */}
      {user?.id && (
        <View style={styles.debugSection}>
          <Text style={styles.debugText}>
            User ID: {user.id.slice(0, 8)}...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingBottom: 8,
  },
  title: {
    ...typography.h2,
    color: colors.onBackground,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    borderCurve: "continuous",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderCurve: "continuous",
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderCurve: "continuous",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  userName: {
    ...typography.h3,
    color: colors.onSurface,
    marginBottom: 4,
    textAlign: "center",
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: colors.primaryTransparent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderCurve: "continuous",
    marginTop: 4,
  },
  roleText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  settingCard: {
    borderCurve: "continuous",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    marginBottom: 12,
  },
  settingLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  settingDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  settingValue: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    padding: 2,
    marginTop: 4,
  },
  segmentOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: borderRadius.sm - 2,
    borderCurve: "continuous",
  },
  segmentOptionSelected: {
    backgroundColor: colors.surface,
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
  },
  segmentText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  segmentTextSelected: {
    color: colors.onSurface,
    fontWeight: "600",
  },
  logoutSection: {
    marginTop: 8,
  },
  debugSection: {
    marginTop: 8,
    alignItems: "center",
  },
  debugText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
  },
});
