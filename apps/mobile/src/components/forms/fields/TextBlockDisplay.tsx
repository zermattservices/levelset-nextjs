import React from "react";
import { Text, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography } from "../../../lib/fonts";
import { spacing } from "../../../lib/theme";

interface TextBlockDisplayProps {
  content: string;
  contentEs?: string;
  language?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function TextBlockDisplay({
  content,
  contentEs,
  language,
}: TextBlockDisplayProps) {
  const colors = useColors();
  const raw = language === "es" && contentEs ? contentEs : content;
  const text = stripHtml(raw);

  if (!text) return null;

  return (
    <Text style={[styles.text, { color: colors.onSurfaceVariant }]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.bodyMedium,
    fontStyle: "italic",
    marginVertical: spacing[2],
    lineHeight: 22,
  },
});
