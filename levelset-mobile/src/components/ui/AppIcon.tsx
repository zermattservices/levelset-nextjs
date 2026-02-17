import React from "react";
import { View, Text, type ViewStyle } from "react-native";
import { SymbolView, type SFSymbol } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColors } from "../../context/ThemeContext";

const SYMBOL_MAP: Record<string, string> = {
  "house": "home-outline",
  "house.fill": "home",
  "book": "book-outline",
  "book.fill": "book",
  "doc.text": "document-text-outline",
  "doc.text.fill": "document-text",
  "calendar": "calendar-outline",
  "calendar.circle.fill": "calendar",
  "person": "person-outline",
  "person.fill": "person",
  "gear": "settings-outline",
  "gear.fill": "settings",
  "xmark": "close",
  "xmark.circle.fill": "close-circle",
  "checkmark": "checkmark",
  "checkmark.circle.fill": "checkmark-circle",
  "chevron.down": "chevron-down",
  "chevron.right": "chevron-forward",
  "chevron.left": "chevron-back",
  "line.3.horizontal": "menu",
  "star": "star-outline",
  "star.fill": "star",
  "desktopcomputer": "desktop-outline",
  "chart.bar": "bar-chart-outline",
  "questionmark.circle": "help-circle-outline",
  "magnifyingglass": "search",
  "plus": "add",
  "minus": "remove",
  "pencil": "pencil",
  "trash": "trash-outline",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "square.and.arrow.up": "share-outline",
  "exclamationmark.triangle": "warning-outline",
  "info.circle": "information-circle-outline",
  "calendar.badge.clock": "time-outline",
  "person.2": "people-outline",
  "airplane": "airplane-outline",
  "globe": "globe-outline",
  "camera": "camera-outline",
  "photo": "image-outline",
  "doc": "document-outline",
  "paperclip": "attach",
  "arrow.counterclockwise": "refresh",
  "mappin.slash": "location-outline",
  "phone": "call-outline",
  "phone.fill": "call",
  "envelope": "mail-outline",
  "envelope.fill": "mail",
  "building.2": "business-outline",
  "number": "keypad-outline",
  "mappin": "location-outline",
  "mappin.and.ellipse": "location-outline",
  "briefcase": "briefcase-outline",
  "briefcase.fill": "briefcase",
  "cpu": "hardware-chip-outline",
  "cpu.fill": "hardware-chip",
  "bubble.left.and.bubble.right": "chatbubbles-outline",
  "bubble.left.and.bubble.right.fill": "chatbubbles",
  "checklist": "checkbox-outline",
  "bell": "notifications-outline",
  "bell.fill": "notifications",
  "arrow.up": "arrow-up",
  "arrow.up.circle.fill": "arrow-up-circle",
  "paperplane": "send-outline",
  "paperplane.fill": "send",
  "microphone": "mic-outline",
  "microphone.fill": "mic",
};

interface AppIconProps {
  /** SF Symbol name (e.g. "house.fill", "gear") */
  name: string;
  /** Icon size in points. Defaults to 24. */
  size?: number;
  /** Tint / foreground color */
  tintColor?: string;
  /** Additional container style */
  style?: ViewStyle;
}

export function AppIcon({ name, size = 24, tintColor, style }: AppIconProps) {
  const colors = useColors();

  if (process.env.EXPO_OS === "ios") {
    return (
      <SymbolView
        name={name as SFSymbol}
        size={size}
        tintColor={tintColor}
        style={style}
      />
    );
  }

  // Android – map SF Symbol name to Ionicons equivalent
  const ionName = SYMBOL_MAP[name];

  if (ionName) {
    return (
      <Ionicons
        name={ionName as keyof typeof Ionicons.glyphMap}
        size={size}
        color={tintColor}
        style={style as any}
      />
    );
  }

  // Fallback: unknown icon placeholder
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tintColor ?? colors.onSurfaceDisabled,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: size * 0.5,
          fontWeight: "700",
        }}
      >
        ?
      </Text>
    </View>
  );
}
