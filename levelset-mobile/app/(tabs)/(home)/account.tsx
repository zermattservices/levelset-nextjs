/**
 * Account Modal
 * Glass formSheet with profile access, settings, and sign out
 * Opened from the avatar bubble on the home screen
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../src/context/AuthContext";
import { useForms } from "../../../src/context/FormsContext";
import { useColors } from "../../../src/context/ThemeContext";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, borderRadius, haptics } from "../../../src/lib/theme";
import { AppIcon } from "../../../src/components/ui";
import { GlassCard } from "../../../src/components/glass";
import "../../../src/lib/i18n";

export default function AccountModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useColors();
  const { fullName, email, profileImage, role, signOut } = useAuth();
  const { language, setLanguage } = useForms();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return email?.charAt(0)?.toUpperCase() || "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (userRole: string | null | undefined) => {
    if (!userRole) return null;
    return userRole.charAt(0).toUpperCase() + userRole.slice(1).replace(/_/g, " ");
  };

  const handleLogout = useCallback(() => {
    haptics.warning();
    Alert.alert(
      t("profile.signOut"),
      t("profile.signOutConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("profile.signOut"),
          style: "destructive",
          onPress: () => {
            signOut();
            router.dismiss();
          },
        },
      ]
    );
  }, [signOut, t, router]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing[5], gap: spacing[4] }}
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{t("profile.account")}</Text>
        <Pressable
          onPress={() => {
            haptics.light();
            router.dismiss();
          }}
          style={styles.closeButton}
        >
          <AppIcon name="xmark.circle.fill" size={28} tintColor={colors.onSurfaceDisabled} />
        </Pressable>
      </View>

      {/* Profile row */}
      <GlassCard
        onPress={() => {
          haptics.light();
          router.push("/(tabs)/(home)/edit-profile");
        }}
      >
        <View style={styles.profileRow}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.onPrimary }]}>{getInitials(fullName)}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.onSurface }]}>
              {fullName || email || t("profile.notLoggedIn")}
            </Text>
            {role && (
              <Text style={[styles.profileRole, { color: colors.onSurfaceVariant }]}>{formatRole(role)}</Text>
            )}
          </View>
          <AppIcon name="chevron.right" size={16} tintColor={colors.onSurfaceDisabled} />
        </View>
      </GlassCard>

      {/* Settings section */}
      <GlassCard>
        {/* Language */}
        <Pressable
          onPress={() => {
            haptics.selection();
            setLanguage(language === "en" ? "es" : "en");
          }}
          style={styles.menuRow}
        >
          <AppIcon name="globe" size={20} tintColor={colors.onSurfaceVariant} />
          <Text style={[styles.menuLabel, { color: colors.onSurface }]}>{t("profile.language")}</Text>
          <Text style={[styles.menuValue, { color: colors.onSurfaceVariant }]}>{language === "en" ? "English" : "Espanol"}</Text>
          <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceDisabled} />
        </Pressable>

        <View style={[styles.divider, { backgroundColor: colors.outline }]} />

        {/* Version */}
        <View style={styles.menuRow}>
          <AppIcon name="info.circle" size={20} tintColor={colors.onSurfaceVariant} />
          <Text style={[styles.menuLabel, { color: colors.onSurface }]}>{t("profile.version")}</Text>
          <Text style={[styles.menuValue, { color: colors.onSurfaceVariant }]}>1.0.0</Text>
        </View>
      </GlassCard>

      {/* Log out */}
      <GlassCard onPress={handleLogout}>
        <View style={styles.logoutRow}>
          <AppIcon name="arrow.right" size={20} tintColor={colors.error} />
          <Text style={[styles.logoutLabel, { color: colors.error }]}>{t("profile.signOut")}</Text>
        </View>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    padding: spacing[1],
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: fontWeights.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
  },
  profileRole: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  menuLabel: {
    ...typography.bodyMedium,
    flex: 1,
  },
  menuValue: {
    ...typography.bodySmall,
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  logoutLabel: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.semibold,
  },
});
