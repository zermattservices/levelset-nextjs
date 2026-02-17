/**
 * Schedule Tab
 * Main schedule screen with sliding menu navigation
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { SlidingMenu } from "../../../src/components/schedule/SlidingMenu";
import { useSlidingMenu } from "../../../src/context/SlidingMenuContext";
import { colors } from "../../../src/lib/colors";

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

export default function ScheduleTab() {
  return (
    <View style={styles.container}>
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
});
