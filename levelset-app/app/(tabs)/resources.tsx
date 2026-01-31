/**
 * Resources Tab
 * Quick access to web resources and documentation
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useForms } from "../../src/context/FormsContext";
import { colors } from "../../src/lib/colors";
import { typography } from "../../src/lib/fonts";
import { GlassCard } from "../../src/components/glass";

// Import i18n to ensure it's initialized
import "../../src/lib/i18n";

interface ResourceItem {
  id: string;
  title: string;
  title_es?: string;
  description: string;
  description_es?: string;
  url: string;
  icon: string;
}

const RESOURCES: ResourceItem[] = [
  {
    id: "1",
    title: "Levelset Dashboard",
    title_es: "Panel de Levelset",
    description: "Access the full Levelset web application",
    description_es: "Accede a la aplicación web completa de Levelset",
    url: "https://levelset.vercel.app",
    icon: "🖥️",
  },
  {
    id: "2",
    title: "Training Materials",
    title_es: "Materiales de Capacitación",
    description: "View training guides and documentation",
    description_es: "Ver guías de capacitación y documentación",
    url: "https://levelset.vercel.app/training",
    icon: "📚",
  },
  {
    id: "3",
    title: "Team Reports",
    title_es: "Informes del Equipo",
    description: "View team performance and metrics",
    description_es: "Ver rendimiento y métricas del equipo",
    url: "https://levelset.vercel.app/reports",
    icon: "📊",
  },
  {
    id: "4",
    title: "Help & Support",
    title_es: "Ayuda y Soporte",
    description: "Get help with Levelset features",
    description_es: "Obtén ayuda con las funciones de Levelset",
    url: "https://levelset.vercel.app/help",
    icon: "❓",
  },
];

export default function ResourcesScreen() {
  const insets = useSafeAreaInsets();
  const { language } = useForms();

  const handleOpenResource = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          language === "en" ? "Error" : "Error",
          language === "en"
            ? "Unable to open this link"
            : "No se puede abrir este enlace"
        );
      }
    } catch (error) {
      console.error("Error opening URL:", error);
      Alert.alert(
        language === "en" ? "Error" : "Error",
        language === "en"
          ? "Something went wrong. Please try again."
          : "Algo salió mal. Por favor intente de nuevo."
      );
    }
  };

  const getTitle = (resource: ResourceItem) =>
    language === "es" && resource.title_es ? resource.title_es : resource.title;

  const getDescription = (resource: ResourceItem) =>
    language === "es" && resource.description_es
      ? resource.description_es
      : resource.description;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === "en" ? "Resources" : "Recursos"}
        </Text>
        <Text style={styles.subtitle}>
          {language === "en"
            ? "Quick access to web resources and documentation"
            : "Acceso rápido a recursos web y documentación"}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {RESOURCES.map((resource) => (
          <GlassCard
            key={resource.id}
            onPress={() => handleOpenResource(resource.url)}
            style={styles.resourceCard}
          >
            <View style={styles.resourceContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>{resource.icon}</Text>
              </View>
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceTitle}>{getTitle(resource)}</Text>
                <Text style={styles.resourceDescription}>
                  {getDescription(resource)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </GlassCard>
        ))}

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {language === "en"
              ? "Links will open in your default browser"
              : "Los enlaces se abrirán en su navegador predeterminado"}
          </Text>
        </View>
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
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  resourceCard: {
    marginBottom: 0,
  },
  resourceContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    ...typography.h4,
    color: colors.onSurface,
    marginBottom: 2,
  },
  resourceDescription: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  chevron: {
    fontSize: 24,
    color: colors.onSurfaceVariant,
    marginLeft: 8,
  },
  infoSection: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
    textAlign: "center",
  },
});
