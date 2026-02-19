/**
 * TypingIndicator Component
 * Shows a "thinking" text with a pulsing skeleton animation
 * while waiting for the assistant's first response.
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { spacing } from "../../lib/theme";
import { AppIcon } from "../../components/ui";
import { typography, fontWeights } from "../../lib/fonts";

export function TypingIndicator() {
  const colors = useColors();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      <View style={styles.avatarLine}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: colors.primaryTransparent },
          ]}
        >
          <AppIcon name="cpu" size={14} tintColor={colors.primary} />
        </View>
        <Text style={[styles.name, { color: colors.onSurfaceVariant }]}>
          Levi
        </Text>
      </View>
      <Animated.Text
        style={[styles.thinkingText, { color: colors.onSurfaceVariant }, pulseStyle]}
      >
        Thinking...
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    gap: spacing[1],
  },
  avatarLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    ...typography.labelSmall,
    fontWeight: fontWeights.medium,
  },
  thinkingText: {
    ...typography.bodySmall,
    fontStyle: "italic",
    paddingLeft: spacing[1],
  },
});

export default TypingIndicator;
