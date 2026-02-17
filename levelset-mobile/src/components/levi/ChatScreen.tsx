/**
 * ChatScreen Component
 * Claude-style chat — centered greeting when empty, message list when active.
 * Input sits above the tab bar, keyboard handling included.
 */

import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from "react-native";
import { useLeviChat, type ChatMessage } from "../../context/LeviChatContext";
import { ChatBubble } from "./ChatBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { AppIcon } from "../../components/ui";
import { useColors } from "../../context/ThemeContext";
import { typography, fontWeights } from "../../lib/fonts";
import { spacing } from "../../lib/theme";

function EmptyGreeting() {
  const colors = useColors();

  return (
    <View style={styles.greetingCenter}>
      <AppIcon name="cpu" size={36} tintColor={colors.primary} />
      <Text style={[styles.greetingText, { color: colors.onSurfaceVariant }]}>
        How can I help you{"\n"}today?
      </Text>
    </View>
  );
}

export function ChatScreen() {
  const colors = useColors();
  const { messages, isSending, sendMessage } = useLeviChat();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Show centered greeting when only the initial greeting message exists
  const hasConversation = messages.length > 1;

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {!hasConversation ? (
        <Pressable
          style={styles.emptyFlex}
          onPress={() => Keyboard.dismiss()}
        >
          <EmptyGreeting />
        </Pressable>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          ListFooterComponent={ListFooter}
        />
      )}
      <ChatInput onSend={sendMessage} disabled={isSending} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyFlex: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  greetingCenter: {
    alignItems: "center",
    gap: spacing[4],
    paddingBottom: spacing[16],
  },
  greetingText: {
    ...typography.h2,
    fontWeight: fontWeights.medium,
    textAlign: "center",
    lineHeight: 34,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    gap: spacing[4],
  },
});

export default ChatScreen;
