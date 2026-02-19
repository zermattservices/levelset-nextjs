/**
 * ChatBubble Component
 * Claude-style message rendering with full markdown support:
 *   User → right-aligned, colored bubble, plain text
 *   Assistant → left-aligned, avatar + markdown rendered content + copy button
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeIn } from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import { useColors } from "../../context/ThemeContext";
import { AppIcon } from "../../components/ui";
import { typography, fontWeights, fontFamilies, fontSizes } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import type { ChatMessage } from "../../context/LeviChatContext";
import type { ColorPalette } from "../../lib/colors";
import { ToolCallCard } from "./ToolCallCard";

interface ChatBubbleProps {
  message: ChatMessage;
  isLast?: boolean;
}

/** Build markdown styles that respond to the current color palette */
function buildMarkdownStyles(colors: ColorPalette) {
  return StyleSheet.create({
    body: {
      fontFamily: fontFamilies.body,
      fontSize: fontSizes.base,
      fontWeight: fontWeights.regular as any,
      lineHeight: 26,
      color: colors.onSurface,
    },
    text: {
      fontWeight: fontWeights.regular as any,
    },
    heading1: {
      fontFamily: fontFamilies.heading,
      fontSize: fontSizes["2xl"],
      fontWeight: fontWeights.bold as any,
      lineHeight: 32,
      color: colors.onSurface,
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      fontFamily: fontFamilies.heading,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold as any,
      lineHeight: 28,
      color: colors.onSurface,
      marginTop: 14,
      marginBottom: 6,
    },
    heading3: {
      fontFamily: fontFamilies.heading,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.semibold as any,
      lineHeight: 26,
      color: colors.onSurface,
      marginTop: 12,
      marginBottom: 4,
    },
    strong: {
      fontWeight: fontWeights.bold as any,
    },
    em: {
      fontStyle: "italic" as const,
    },
    // Inline code
    code_inline: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.regular as any,
      color: colors.onSurface,
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    // Fenced code blocks
    fence: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.regular as any,
      lineHeight: 22,
      color: colors.onSurface,
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.outline,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
    },
    code_block: {
      fontFamily: fontFamilies.mono,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.regular as any,
      lineHeight: 22,
      color: colors.onSurface,
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.outline,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
    },
    // Block quotes
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 12,
      marginVertical: 8,
      opacity: 0.9,
    },
    // Lists
    bullet_list: {
      marginVertical: 4,
    },
    ordered_list: {
      marginVertical: 4,
    },
    list_item: {
      flexDirection: "row" as const,
      marginVertical: 3,
    },
    bullet_list_icon: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.regular as any,
      lineHeight: 26,
      marginRight: 8,
      color: colors.onSurfaceVariant,
    },
    ordered_list_icon: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.regular as any,
      lineHeight: 26,
      marginRight: 8,
      color: colors.onSurfaceVariant,
    },
    bullet_list_content: {
      flex: 1,
    },
    ordered_list_content: {
      flex: 1,
    },
    // Links
    link: {
      color: colors.primary,
      textDecorationLine: "underline" as const,
    },
    // Horizontal rule
    hr: {
      backgroundColor: colors.outline,
      height: 1,
      marginVertical: 12,
    },
    // Tables
    table: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 8,
      marginVertical: 8,
      overflow: "hidden" as const,
    },
    thead: {
      backgroundColor: colors.surfaceVariant,
    },
    th: {
      fontWeight: fontWeights.semibold as any,
      padding: 10,
      borderBottomWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.outline,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: colors.outline,
    },
    td: {
      padding: 10,
      borderRightWidth: 1,
      borderColor: colors.outline,
      fontWeight: fontWeights.regular as any,
    },
    // Paragraph spacing
    paragraph: {
      marginVertical: 4,
      fontWeight: fontWeights.regular as any,
    },
  });
}

export function ChatBubble({ message, isLast }: ChatBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  const handleCopy = useCallback(() => {
    haptics.light();
    Clipboard.setStringAsync(message.content);
  }, [message.content]);

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

  const mdStyles = buildMarkdownStyles(colors);
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasContent = message.content.length > 0;
  const showCopy = hasContent && !message.isStreaming;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={styles.assistantRow}
    >
      {/* Avatar + name */}
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

      {/* Tool call cards */}
      {hasToolCalls && (
        <View style={styles.toolCallList}>
          {message.toolCalls!.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}
        </View>
      )}

      {/* Markdown content — only render when we have text */}
      {hasContent && (
        <View style={styles.markdownWrap}>
          <Markdown style={mdStyles}>
            {message.content}
          </Markdown>
        </View>
      )}

      {/* Copy button — hidden while streaming */}
      {showCopy && (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleCopy}
            hitSlop={8}
            style={styles.actionButton}
          >
            <AppIcon
              name="doc.on.doc"
              size={16}
              tintColor={colors.onSurfaceDisabled}
            />
          </Pressable>
        </View>
      )}
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

  // Assistant: left-aligned, full-width markdown
  assistantRow: {
    alignSelf: "flex-start",
    width: "100%",
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
  assistantName: {
    ...typography.labelSmall,
    fontWeight: fontWeights.medium,
  },
  toolCallList: {
    gap: spacing[1],
    paddingLeft: spacing[1],
  },
  markdownWrap: {
    paddingLeft: spacing[1],
  },

  // Actions row (copy)
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing[1],
    paddingTop: spacing[1],
    gap: spacing[3],
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ChatBubble;
