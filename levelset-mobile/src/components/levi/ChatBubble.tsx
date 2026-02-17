/**
 * ChatBubble Component
 * Claude-style message rendering:
 *   User → right-aligned, colored bubble
 *   Assistant → left-aligned, avatar + plain text (no card border)
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useColors } from "../../context/ThemeContext";
import { AppIcon } from "../../components/ui";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing, borderRadius } from "../../lib/theme";
import type { ChatMessage } from "../../context/LeviChatContext";

interface ChatBubbleProps {
  message: ChatMessage;
  isLast?: boolean;
}

export function ChatBubble({ message, isLast }: ChatBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={styles.userRow}
      >
        <View
          style={[
            styles.userBubble,
            { backgroundColor: colors.primary },
          ]}
        >
          <Text
            selectable
            style={[styles.userText, { color: colors.onPrimary }]}
          >
            {message.content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Claude-style assistant: small avatar circle + name, then plain text below
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={styles.assistantRow}
    >
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
          style={[styles.assistantName, { color: colors.onSurfaceVariant }]}
        >
          Levi
        </Text>
      </View>
      <Text
        selectable
        style={[styles.assistantText, { color: colors.onSurface }]}
      >
        {message.content}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // User: right-aligned bubble
  userRow: {
    alignSelf: "flex-end",
    maxWidth: "80%",
  },
  userBubble: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.sm,
    borderCurve: "continuous",
  },
  userText: {
    ...typography.bodyMedium,
    lineHeight: 22,
  },
  // Assistant: left-aligned, plain text (Claude-style)
  assistantRow: {
    alignSelf: "flex-start",
    maxWidth: "90%",
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
  assistantName: {
    ...typography.labelSmall,
    fontWeight: fontWeights.medium,
  },
  assistantText: {
    ...typography.bodyMedium,
    lineHeight: 24,
    paddingLeft: spacing[1],
  },
});

export default ChatBubble;
