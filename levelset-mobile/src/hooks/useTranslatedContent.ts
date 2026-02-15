/**
 * useTranslatedContent Hook
 * Provides translation helpers for database content with English/Spanish fields
 */

import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForms } from "../context/FormsContext";

interface TranslatableItem {
  [key: string]: any;
}

/**
 * Hook for translating dynamic database content
 * Uses the language from FormsContext and falls back to English if Spanish not available
 */
export function useTranslatedContent() {
  const { i18n, t } = useTranslation();
  const { language } = useForms();

  // Sync i18n language with FormsContext — use useEffect, not useMemo
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  /**
   * Translate a field from an item that has both English and Spanish versions
   * Example: translate(item, 'name') will look for 'name' and 'name_es'
   */
  const translate = useCallback(
    <T extends TranslatableItem>(
      item: T,
      field: string,
      fallback?: string
    ): string => {
      if (!item) return fallback || "";

      if (language === "es") {
        const spanishField = `${field}_es`;
        if (item[spanishField]) {
          return item[spanishField];
        }
      }

      return item[field] || fallback || "";
    },
    [language]
  );

  /**
   * Get a translated label for rating values
   */
  const getRatingLabel = useCallback(
    (value: number): string => {
      switch (value) {
        case 1:
          return t("forms.notYet");
        case 2:
          return t("forms.onTheRise");
        case 3:
          return t("forms.crushingIt");
        default:
          return "";
      }
    },
    [t]
  );

  /**
   * Get the color for a rating value
   */
  const getRatingColor = useCallback((value: number): string => {
    switch (value) {
      case 1:
        return "#EF4444"; // error/red
      case 2:
        return "#F59E0B"; // warning/yellow
      case 3:
        return "#10B981"; // success/green
      default:
        return "#6B7280"; // gray
    }
  }, []);

  /**
   * Format points display with sign
   */
  const formatPoints = useCallback((points: number): string => {
    if (points > 0) return `+${points}`;
    if (points < 0) return `${points}`;
    return "0";
  }, []);

  /**
   * Get the category label for points
   */
  const getPointsCategory = useCallback(
    (points: number): string => {
      if (points < 0) return t("forms.negativePoints");
      if (points > 0) return t("forms.positivePoints");
      return t("forms.zeroPoints");
    },
    [t]
  );

  return {
    language,
    t,
    translate,
    getRatingLabel,
    getRatingColor,
    formatPoints,
    getPointsCategory,
  };
}

export default useTranslatedContent;
