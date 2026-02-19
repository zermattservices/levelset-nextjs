/**
 * TypingIndicator Component
 * Claude-style — avatar row + animated dots, no card wrapper
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
} from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { spacing } from "../../lib/theme";
import { AppIcon } from "../../components/ui";
import { typography, fontWeights } from "../../lib/fonts";

function Dot({ delay }: { delay: number }) {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: colors.onSurfaceVariant },
        animStyle,
      ]}
    />
  );
}

export function TypingIndicator() {
  const colors = useColors();

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
        <Text
          style={[styles.name, { color: colors.onSurfaceVariant }]}
        >
          Levi
        </Text>
      </View>
      <View style={styles.dotsRow}>
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    gap: spacing[2],
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
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingLeft: spacing[1],
    paddingVertical: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default TypingIndicator;
