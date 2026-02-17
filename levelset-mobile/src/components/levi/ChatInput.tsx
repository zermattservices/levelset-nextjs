/**
 * ChatInput Component
 * Claude-style bottom input — rounded container with placeholder text,
 * action buttons row (+, send), sits above the native tab bar.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "../../context/ThemeContext";
import { AppIcon } from "../../components/ui";
import { typography } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { useTranslation } from "react-i18next";

// Native tab bar height on iOS (standard UITabBar)
const TAB_BAR_HEIGHT = 49;

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    haptics.medium();
    onSend(text.trim());
    setText("");
  };

  // When keyboard is closed: pad for tab bar + safe area
  // When keyboard is open: tab bar is hidden, just need small padding
  // When keyboard is closed: pad for safe area + tab bar + visual gap
  // The gap between input and tab bar should visually match the tab bar's
  // distance from the screen bottom (~half insets.bottom)
  const bottomPadding = keyboardVisible
    ? spacing[2]
    : insets.bottom + TAB_BAR_HEIGHT + Math.round(insets.bottom / 2);

  return (
    <View
      style={[
        styles.outerContainer,
        { paddingBottom: bottomPadding },
      ]}
    >
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surfaceVariant,
            borderColor: colors.outline,
          },
        ]}
      >
        {/* Text area */}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={t("levi.inputPlaceholder")}
          placeholderTextColor={colors.onSurfaceDisabled}
          style={[styles.textInput, { color: colors.onSurface }]}
          multiline
          maxLength={2000}
          returnKeyType="default"
          editable={!disabled}
        />

        {/* Action buttons row — Claude style: + on left, send on right */}
        <View style={styles.actionsRow}>
          <View style={styles.leftActions}>
            <Pressable
              style={styles.actionButton}
              hitSlop={8}
              onPress={() => haptics.light()}
            >
              <AppIcon
                name="plus"
                size={20}
                tintColor={colors.onSurfaceVariant}
              />
            </Pressable>
          </View>

          {canSend ? (
            <Pressable
              onPress={handleSend}
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <AppIcon
                name="arrow.up"
                size={16}
                tintColor={colors.onPrimary}
              />
            </Pressable>
          ) : (
            <View style={styles.rightActions}>
              <Pressable
                style={styles.actionButton}
                hitSlop={8}
                onPress={() => haptics.light()}
              >
                <AppIcon
                  name="microphone"
                  size={20}
                  tintColor={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  textInput: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: typography.bodyMedium.fontWeight,
    maxHeight: 120,
    minHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: spacing[1],
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[2],
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ChatInput;
