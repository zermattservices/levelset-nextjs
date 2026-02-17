/**
 * FormDrawer Component (DEPRECATED)
 * Forms now use route-based form sheets via app/forms/ routes.
 * This component is kept for backward compatibility but should not be used.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useForms } from "../../context/FormsContext";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius } from "../../lib/theme";

interface FormDrawerProps {
  title: string;
  formType: "ratings" | "infractions";
  visible?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** @deprecated Use route-based form sheets instead (app/forms/) */
export function FormDrawer({ title, formType, visible = false, children, footer }: FormDrawerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isDirty, language, setLanguage } = useForms();
  const router = useRouter();

  const handleClose = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        language === "en" ? "Discard Changes?" : "¿Descartar cambios?",
        language === "en"
          ? "You have unsaved changes. Are you sure you want to close this form?"
          : "Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar este formulario?",
        [
          {
            text: language === "en" ? "Cancel" : "Cancelar",
            style: "cancel",
          },
          {
            text: language === "en" ? "Discard" : "Descartar",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, router, language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "es" : "en");
  }, [language, setLanguage]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.outline, paddingTop: insets.top + 8 }]}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon
              name="xmark.circle.fill"
              size={28}
              tintColor={colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          {/* Title */}
          <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>

          {/* Language Toggle */}
          <TouchableOpacity
            onPress={toggleLanguage}
            style={[styles.languageButton, { backgroundColor: colors.primaryTransparent }]}
          >
            <Text style={[styles.languageText, { color: colors.primary }]}>
              {language === "en" ? "ES" : "EN"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: footer ? 100 : insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>

        {/* Footer */}
        {footer && (
          <View
            style={[
              styles.footer,
              { backgroundColor: colors.surface, borderTopColor: colors.outline, paddingBottom: insets.bottom > 0 ? insets.bottom : 16 },
            ]}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h4,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  languageText: {
    ...typography.labelMedium,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

export default FormDrawer;
