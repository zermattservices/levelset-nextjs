import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "../../../context/ThemeContext";
import { typography, fontWeights } from "../../../lib/fonts";
import { spacing } from "../../../lib/theme";

interface SectionHeaderProps {
  name: string;
  nameEs?: string;
  language?: string;
}

export function SectionHeader({ name, nameEs, language }: SectionHeaderProps) {
  const colors = useColors();
  const displayName = language === "es" && nameEs ? nameEs : name;

  return (
    <View style={[styles.container, { borderBottomColor: colors.primary }]}>
      <Text style={[styles.text, { color: colors.onSurface }]}>
        {displayName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing[2],
    marginBottom: spacing[3],
    marginTop: spacing[4],
    borderBottomWidth: 3,
  },
  text: {
    ...typography.h4,
    fontWeight: fontWeights.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
