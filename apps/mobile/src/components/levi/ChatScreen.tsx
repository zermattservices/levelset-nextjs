/**
 * ChatScreen Component
 *
 * UX pattern:
 *   - On first open: empty state with "How can I help you today?" prompt
 *   - Old messages from previous sessions are hidden above the viewport
 *   - User can scroll up to reveal history (loads pages dynamically)
 *   - Once the user sends a message, the empty state disappears and the
 *     FlatList auto-scrolls to the bottom
 *   - Input sits above the tab bar, keyboard handling included
 */

import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLeviChat, type ChatMessage } from "../../context/LeviChatContext";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";

function EmptyState() {
  const colors = useColors();

  return (
    <View style={styles.emptyCenter}>
      <AppIcon name="cpu" size={36} tintColor={colors.primary} />
      <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
        How can I help you{"\n"}today?
      </Text>
    </View>
  );
}

export function ChatScreen() {
  const colors = useColors();
  const {
    messages,
    hasNewMessages,
    historyLoaded,
    isLoadingMore,
    hasMoreHistory,
    isSending,
    sendMessage,
    loadMoreHistory,
  } = useLeviChat();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const hasScrolledToEndRef = useRef(false);

  // Show the FlatList once there are messages (history or session)
  const hasMessages = messages.length > 0;
  // Show the empty state overlay when no new session messages have been sent
  const showEmptyOverlay = !hasNewMessages && !userScrolled;

  const scrollToEnd = useCallback(() => {
    if (!hasNewMessages) return; // Don't auto-scroll for history-only
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, [hasNewMessages]);

  const handleContentSizeChange = useCallback(() => {
    if (!hasNewMessages) return;
    // Only auto-scroll when new messages come in
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, [hasNewMessages]);

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <ChatBubble message={item} isLast={index === messages.length - 1} />
    ),
    [messages.length]
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  const ListFooter = useCallback(() => {
    if (!isSending) return null;
    return <TypingIndicator />;
  }, [isSending]);

  const ListHeader = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, colors.primary]);

  // Detect scroll position for two purposes:
  // 1. Dismiss empty overlay when user scrolls (means they're browsing history)
  // 2. Load more history when near the top
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;

      // Dismiss empty overlay if user scrolls up into history
      if (y > 10 && !userScrolled && hasMessages) {
        setUserScrolled(true);
      }

      // Load more when near the top (within 200px)
      if (y < 200 && hasMoreHistory && !isLoadingMore) {
        loadMoreHistory();
      }
    },
    [userScrolled, hasMessages, hasMoreHistory, isLoadingMore, loadMoreHistory]
  );

  // When user sends first message, clear overlay and scroll to bottom
  const handleSend = useCallback(
    async (content: string) => {
      setUserScrolled(false); // Reset so auto-scroll works
      hasScrolledToEndRef.current = false;
      await sendMessage(content);
    },
    [sendMessage]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.chatArea}>
        {hasMessages ? (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={ListFooter}
            maintainVisibleContentPosition={
              isLoadingMore ? { minIndexForVisible: 0 } : undefined
            }
          />
        ) : null}

        {/* Empty state overlay — shown until user sends a message or scrolls */}
        {showEmptyOverlay && (
          <Pressable
            style={[
              styles.emptyOverlay,
              // If history is behind, position absolutely over the list
              hasMessages && styles.emptyOverlayAbsolute,
            ]}
            onPress={() => Keyboard.dismiss()}
          >
            <EmptyState />
          </Pressable>
        )}
      </View>

      <ChatInput onSend={handleSend} disabled={isSending} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  emptyOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    flex: undefined,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCenter: {
    alignItems: "center",
    gap: spacing[4],
    paddingBottom: spacing[16],
  },
  emptyText: {
    ...typography.h2,
    fontWeight: fontWeights.medium,
    textAlign: "center",
    lineHeight: 34,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    gap: spacing[5],
    flexGrow: 1,
  },
  loadingMore: {
    paddingVertical: spacing[4],
    alignItems: "center",
  },
});

export default ChatScreen;
