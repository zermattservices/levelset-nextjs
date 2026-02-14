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
  TouchableOpacity,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/context/AuthContext";
import { useForms } from "../../src/context/FormsContext";
import { colors } from "../../src/lib/colors";
import { typography } from "../../src/lib/fonts";
import { borderRadius } from "../../src/lib/theme";
import { GlassCard, GlassButton } from "../../src/components/glass";

// Import i18n to ensure it's initialized
import "../../src/lib/i18n";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { fullName, email, profileImage, role, signOut, user } = useAuth();
  const { language, setLanguage } = useForms();

  const handleLogout = useCallback(() => {
    Alert.alert(
      t("profile.signOut"),
      language === "en"
        ? "Are you sure you want to sign out?"
        : "¿Estás seguro de que quieres cerrar sesión?",
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
  }, [signOut, t, language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "es" : "en");
  }, [language, setLanguage]);

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === "en" ? "Profile" : "Perfil"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
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

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === "en" ? "Settings" : "Configuración"}
          </Text>

          {/* Language Toggle */}
          <TouchableOpacity onPress={toggleLanguage} activeOpacity={0.7}>
            <GlassCard style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>{t("profile.language")}</Text>
                  <Text style={styles.settingDescription}>
                    {language === "en"
                      ? "App language preference"
                      : "Preferencia de idioma"}
                  </Text>
                </View>
                <View style={styles.languageToggle}>
                  <View
                    style={[
                      styles.languageOption,
                      language === "en" && styles.languageOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        language === "en" && styles.languageOptionTextActive,
                      ]}
                    >
                      EN
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.languageOption,
                      language === "es" && styles.languageOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        language === "es" && styles.languageOptionTextActive,
                      ]}
                    >
                      ES
                    </Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    ...typography.h2,
    color: colors.onBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
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
    marginTop: 4,
  },
  roleText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingCard: {
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flex: 1,
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
  languageToggle: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  languageOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm - 2,
  },
  languageOptionActive: {
    backgroundColor: colors.primary,
  },
  languageOptionText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  languageOptionTextActive: {
    color: "#FFFFFF",
  },
  logoutSection: {
    marginTop: 8,
  },
  debugSection: {
    marginTop: 24,
    alignItems: "center",
  },
  debugText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
  },
});
