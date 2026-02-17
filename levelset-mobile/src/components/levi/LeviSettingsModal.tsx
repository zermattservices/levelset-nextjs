/**
 * LeviSettingsModal Component
 * Centered liquid glass modal for Levi AI configuration.
 * Uses GlassView for the card on iOS 26+, with solid fallback.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Switch,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { AppIcon } from "../ui";
import { useLeviMenu } from "../../context/LeviMenuContext";
import { useLeviChat } from "../../context/LeviChatContext";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";
import { useTranslation } from "react-i18next";

export function LeviSettingsModal() {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const { GlassView } = useGlass();
  const glassAvail = isGlassAvailable();
  const { settingsModalVisible, closeSettings } = useLeviMenu();
  const { clearHistory } = useLeviChat();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const currentLanguage = i18n.language === "es" ? "Español" : "English";

  const handleLanguageToggle = () => {
    const newLang = i18n.language === "en" ? "es" : "en";
    i18n.changeLanguage(newLang);
  };

  const handleClearHistory = () => {
    Alert.alert(
      t("levi.clearHistory"),
      t("levi.clearHistoryConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.clear"),
          style: "destructive",
          onPress: () => {
            clearHistory();
            closeSettings();
          },
        },
      ]
    );
  };

  const modalContent = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.onSurface }]}>
          {t("levi.settings")}
        </Text>
        <TouchableOpacity onPress={closeSettings} hitSlop={12}>
          <AppIcon name="xmark" size={18} tintColor={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View style={[styles.row, { borderBottomColor: colors.outline }]}>
        <View style={styles.rowInfo}>
          <AppIcon name="bell" size={20} tintColor={colors.onSurfaceVariant} />
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.onSurface }]}>
              {t("levi.notifications")}
            </Text>
            <Text style={[styles.rowDescription, { color: colors.onSurfaceVariant }]}>
              {t("levi.notificationsDesc")}
            </Text>
          </View>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{
            false: colors.surfaceDisabled,
            true: colors.primary,
          }}
          thumbColor="#ffffff"
        />
      </View>

      {/* Response Language */}
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.outline }]}
        onPress={handleLanguageToggle}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <AppIcon name="globe" size={20} tintColor={colors.onSurfaceVariant} />
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: colors.onSurface }]}>
              {t("levi.language")}
            </Text>
            <Text style={[styles.rowDescription, { color: colors.onSurfaceVariant }]}>
              {t("levi.languageDesc")}
            </Text>
          </View>
        </View>
        <View style={styles.languageValue}>
          <Text style={[styles.languageText, { color: colors.primary }]}>
            {currentLanguage}
          </Text>
          <AppIcon name="chevron.right" size={14} tintColor={colors.onSurfaceVariant} />
        </View>
      </TouchableOpacity>

      {/* Clear Conversation */}
      <TouchableOpacity
        style={styles.rowLast}
        onPress={handleClearHistory}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <AppIcon name="trash" size={20} tintColor={colors.error} />
          <Text style={[styles.rowLabel, { color: colors.error }]}>
            {t("levi.clearHistory")}
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );

  return (
    <Modal
      visible={settingsModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeSettings}
      statusBarTranslucent
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.scrim }]}
        onPress={closeSettings}
      >
        {/* Card — centered, stop propagation */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          {glassAvail && GlassView ? (
            <GlassView style={styles.card}>
              {modalContent}
            </GlassView>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.outline,
                  borderWidth: 1,
                },
              ]}
            >
              {modalContent}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  card: {
    width: 320,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    ...typography.h4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  rowInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing[3],
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.medium,
  },
  rowDescription: {
    ...typography.labelSmall,
    marginTop: 2,
  },
  languageValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  languageText: {
    ...typography.bodyMedium,
    fontWeight: fontWeights.medium,
  },
});

export default LeviSettingsModal;
