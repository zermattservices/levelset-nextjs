/**
 * Schedule Tab
 * Main schedule screen with sliding menu navigation
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { SlidingMenuProvider } from "../../src/context/SlidingMenuContext";
import { ScheduleProvider } from "../../src/context/ScheduleContext";
import { SlidingMenu, MenuContent } from "../../src/components/schedule";
import { colors } from "../../src/lib/colors";

export default function ScheduleTab() {
  return (
    <SlidingMenuProvider>
      <ScheduleProvider>
        <View style={styles.container}>
          <MenuContent />
          <SlidingMenu />
        </View>
      </ScheduleProvider>
    </SlidingMenuProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
