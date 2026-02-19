/**
 * ChatScreen Component
 *
 * UX pattern:
 *   - On first open: empty state with "How can I help you today?" prompt
 *   - History is not rendered behind the empty state — it stays hidden
 *   - "View conversation history" link appears if there is history
 *   - Once the user sends a message, the empty state disappears and the
 *     FlatList renders with auto-scroll to the bottom
 *   - State resets when the user switches locations
 *   - Input sits above the tab bar, keyboard handling included
 */

import React, { useRef, useCallback, useState, useEffect } from "react";
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
import { useLocation } from "../../context/LocationContext";
import { useLeviChat, type ChatMessage } from "../../context/LeviChatContext";
import { useLocationWarning } from "../../../app/(tabs)/(levi)/index";
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
  const { selectedLocation } = useLocation();
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
  const { flashLocationWarning } = useLocationWarning();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [showingHistory, setShowingHistory] = useState(false);

  // Reset to empty state when location changes
  useEffect(() => {
    setShowingHistory(false);
  }, [selectedLocation?.id]);

  // Show the empty overlay when the user hasn't sent a message this session
  // and hasn't explicitly asked to see history
  const showEmptyOverlay = !hasNewMessages && !showingHistory;

  // The FlatList only renders when the overlay is dismissed
  const showList = !showEmptyOverlay && messages.length > 0;

  const handleContentSizeChange = useCallback(() => {
    if (!hasNewMessages) return;
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
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.isStreaming || (lastMsg?.toolCalls && lastMsg.toolCalls.length > 0)) {
      return null;
    }
    return <TypingIndicator />;
  }, [isSending, messages]);

  const ListHeader = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoadingMore, colors.primary]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y;
      if (y < 200 && hasMoreHistory && !isLoadingMore) {
        loadMoreHistory();
      }
    },
    [hasMoreHistory, isLoadingMore, loadMoreHistory]
  );

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedLocation) {
        flashLocationWarning();
        return;
      }
      await sendMessage(content);
    },
    [sendMessage, selectedLocation, flashLocationWarning]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.chatArea}>
        {showList && (
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
        )}

        {/* Empty state — shown until user sends a message */}
        {showEmptyOverlay && (
          <Pressable
            style={styles.emptyOverlay}
            onPress={() => Keyboard.dismiss()}
          >
            <EmptyState />
            {/* Show history link once we know there are old messages */}
            {historyLoaded && messages.length > 0 && (
              <Pressable
                onPress={() => setShowingHistory(true)}
                style={styles.historyLink}
              >
                <AppIcon name="clock.arrow.circlepath" size={16} tintColor={colors.primary} />
                <Text style={[styles.historyLinkText, { color: colors.primary }]}>
                  View conversation history
                </Text>
              </Pressable>
            )}
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
  emptyCenter: {
    alignItems: "center",
    gap: spacing[4],
  },
  emptyText: {
    ...typography.h2,
    fontWeight: fontWeights.medium,
    textAlign: "center",
    lineHeight: 34,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[8],
  },
  historyLinkText: {
    fontSize: 14,
    fontWeight: fontWeights.medium,
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
