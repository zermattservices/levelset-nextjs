/**
 * Schedule Tab
 * Main schedule screen with sliding menu navigation
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SlidingMenu } from "../../../src/components/schedule/SlidingMenu";
import { useSlidingMenu } from "../../../src/context/SlidingMenuContext";
import { AppIcon } from "../../../src/components/ui";
import { colors } from "../../../src/lib/colors";
import { typography, fontWeights } from "../../../src/lib/fonts";
import { spacing, haptics } from "../../../src/lib/theme";

// Import menu screens directly
import MyScheduleScreen from "../../../src/screens/menu/MyScheduleScreen";
import StaffScreen from "../../../src/screens/menu/StaffScreen";
import SchedulingScreen from "../../../src/screens/menu/SchedulingScreen";
import TimeOffScreen from "../../../src/screens/menu/TimeOffScreen";
import SettingsScreen from "../../../src/screens/menu/SettingsScreen";

function ScheduleContent() {
  const { activeTab } = useSlidingMenu();

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
}

function ScheduleHeader() {
  const insets = useSafeAreaInsets();
  const { openMenu, activeTab, menuTabs } = useSlidingMenu();
  const currentTab = menuTabs.find((tab) => tab.id === activeTab);

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
      <Pressable
        onPress={() => {
          haptics.light();
          openMenu();
        }}
        hitSlop={12}
        style={styles.menuButton}
      >
        <AppIcon
          name="line.3.horizontal"
          size={22}
          tintColor={colors.onSurface}
        />
      </Pressable>
      <Text style={styles.headerTitle}>
        {currentTab?.label || "Schedule"}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

export default function ScheduleTab() {
  return (
    <View style={styles.container}>
      <ScheduleHeader />
      <ScheduleContent />
      <SlidingMenu />
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
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    color: colors.onSurface,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
});
