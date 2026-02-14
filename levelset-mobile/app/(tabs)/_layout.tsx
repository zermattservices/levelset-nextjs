import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { colors } from "../../src/lib/colors";
import { FormsProvider } from "../../src/context/FormsContext";

// Tab configuration
const TAB_CONFIG = [
  {
    name: "index",
    title: "Home",
    icon: { default: "house", selected: "house.fill" },
  },
  {
    name: "resources",
    title: "Resources",
    icon: { default: "book", selected: "book.fill" },
  },
  {
    name: "forms",
    title: "Forms",
    icon: { default: "doc.text", selected: "doc.text.fill" },
  },
  {
    name: "schedule",
    title: "Schedule",
    icon: { default: "calendar", selected: "calendar.circle.fill" },
  },
  {
    name: "profile",
    title: "Profile",
    icon: { default: "person", selected: "person.fill" },
  },
];

// Check if NativeTabs is available (iOS 18+)
let NativeTabs: any = null;
let NativeTabTrigger: any = null;
let NativeTabSlot: any = null;

try {
  const nativeTabsModule = require("expo-router/ui");
  NativeTabs = nativeTabsModule.NativeTabs;
  NativeTabTrigger = nativeTabsModule.NativeTabTrigger;
  NativeTabSlot = nativeTabsModule.NativeTabSlot;
} catch {
  // NativeTabs not available
}

function TabIcon({
  name,
  color,
  focused,
}: {
  name: string;
  color: string;
  focused: boolean;
}) {
  const config = TAB_CONFIG.find((t) => t.name === name);
  const iconName = focused ? config?.icon.selected : config?.icon.default;

  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={iconName as any}
        size={24}
        tintColor={color}
        style={styles.tabIcon}
      />
    );
  }

  // Android fallback - use basic icons
  return <View style={[styles.tabIcon, { backgroundColor: color }]} />;
}

function TabLayoutContent() {
  const insets = useSafeAreaInsets();

  // Try to use NativeTabs on iOS for liquid glass effect
  if (Platform.OS === "ios" && NativeTabs && NativeTabTrigger && NativeTabSlot) {
    return (
      <NativeTabs
        style={styles.container}
        labelStyle={{
          default: { color: "rgba(0,0,0,0.4)" },
          selected: { color: colors.primary },
        }}
        iconColor={{
          default: "rgba(0,0,0,0.4)",
          selected: colors.primary,
        }}
        tintColor={colors.primary}
        barTintColor={colors.glassTint}
      >
        {TAB_CONFIG.map((tab) => (
          <NativeTabTrigger
            key={tab.name}
            name={tab.name}
            href={`/(tabs)/${tab.name === "index" ? "" : tab.name}`}
            style={styles.tabTrigger}
          >
            <SymbolView
              name={tab.icon.default as any}
              size={24}
              tintColor={colors.primary}
            />
          </NativeTabTrigger>
        ))}
        <NativeTabSlot />
      </NativeTabs>
    );
  }

  // Fallback to standard Tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outline,
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="index" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="resources"
        options={{
          title: "Resources",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="resources" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: "Forms",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="forms" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="schedule" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <FormsProvider>
      <TabLayoutContent />
    </FormsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  tabTrigger: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
