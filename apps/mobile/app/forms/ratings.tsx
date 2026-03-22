import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../src/context/ThemeContext";
import { useGlass, isGlassAvailable } from "../../src/hooks/useGlass";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { RatingsFormScreen } from "../../src/components/forms/RatingsFormScreen";
import { typography, fontWeights } from "../../src/lib/fonts";
import { spacing, haptics } from "../../src/lib/theme";

export default function RatingsFormSheet() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { GlassView } = useGlass();
  const glassAvail = isGlassAvailable();

  const backButton = (
    <Pressable
      onPress={() => {
        haptics.light();
        router.back();
      }}
      hitSlop={12}
      style={styles.pressable}
    >
      <AppIcon name="chevron.left" size={18} tintColor={colors.onSurfaceVariant} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing[1] }]}>
        {glassAvail && GlassView ? (
          <GlassView isInteractive style={styles.button}>
            {backButton}
          </GlassView>
        ) : (
          <View style={[styles.button, { backgroundColor: colors.surfaceVariant }]}>
            {backButton}
          </View>
        )}
        <Text style={[styles.title, { color: colors.onSurface }]}>Positional Ratings</Text>
        <View style={styles.spacer} />
      </View>
      <RatingsFormScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pressable: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
