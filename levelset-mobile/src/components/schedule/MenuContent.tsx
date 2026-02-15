/**
 * MenuContent Component
 * Routes between different schedule menu screens based on active tab
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSlidingMenu } from "../../context/SlidingMenuContext";
import { AppIcon } from "../../components/ui";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";
import { haptics } from "../../lib/theme";

// Import menu screens
import MyScheduleScreen from "../../screens/menu/MyScheduleScreen";
import StaffScreen from "../../screens/menu/StaffScreen";
import SchedulingScreen from "../../screens/menu/SchedulingScreen";
import TimeOffScreen from "../../screens/menu/TimeOffScreen";
import SettingsScreen from "../../screens/menu/SettingsScreen";

interface MenuContentProps {
  children?: React.ReactNode;
}

export function MenuContent({ children }: MenuContentProps) {
  const insets = useSafeAreaInsets();
  const { activeTab, openMenu, menuTabs } = useSlidingMenu();

  // Get current tab config
  const currentTab = menuTabs.find((tab) => tab.id === activeTab);

  // Render the appropriate screen based on active tab
  const renderScreen = () => {
    switch (activeTab) {
      case "my-schedule":
        return <MyScheduleScreen />;
      case "staff":
        return <StaffScreen />;
      case "scheduling":
        return <SchedulingScreen />;
      case "time-off":
        return <TimeOffScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <MyScheduleScreen />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            haptics.light();
            openMenu();
          }}
          activeOpacity={0.7}
        >
          <AppIcon
            name="line.3.horizontal"
            size={24}
            tintColor={colors.onSurface}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentTab?.label || "Schedule"}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Screen content */}
      <View style={styles.content}>{renderScreen()}</View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderCurve: "continuous",
    backgroundColor: colors.surfaceVariant,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.onSurface,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
});

export default MenuContent;
