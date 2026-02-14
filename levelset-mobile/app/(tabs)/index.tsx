import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors } from "../../src/lib/colors";
import { typography } from "../../src/lib/fonts";

export default function HomeScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1 }}
      style={styles.container}
    >
      <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
        <Text style={styles.title}>Welcome to Levelset</Text>
        <Text style={styles.subtitle}>
          Your workforce management companion
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    ...typography.h2,
    color: colors.onBackground,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});
