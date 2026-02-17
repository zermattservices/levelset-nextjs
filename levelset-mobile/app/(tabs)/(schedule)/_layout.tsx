import React from "react";
import { Stack } from "expo-router/stack";
import { Pressable } from "react-native";
import { SlidingMenuProvider, useSlidingMenu } from "../../../src/context/SlidingMenuContext";
import { ScheduleProvider } from "../../../src/context/ScheduleContext";
import { AppIcon } from "../../../src/components/ui";
import { colors } from "../../../src/lib/colors";
import { haptics } from "../../../src/lib/theme";

function ScheduleStack() {
  const { openMenu, activeTab, menuTabs } = useSlidingMenu();
  const currentTab = menuTabs.find((tab) => tab.id === activeTab);

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerLargeTitle: true,
        headerBlurEffect: "none",
        headerTintColor: colors.primary,
        headerLeft: () => (
          <Pressable
            onPress={() => {
              haptics.light();
              openMenu();
            }}
            hitSlop={8}
          >
            <AppIcon
              name="line.3.horizontal"
              size={22}
              tintColor={colors.onSurface}
            />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: currentTab?.label || "Schedule" }}
      />
    </Stack>
  );
}

export default function ScheduleLayout() {
  return (
    <SlidingMenuProvider>
      <ScheduleProvider>
        <ScheduleStack />
      </ScheduleProvider>
    </SlidingMenuProvider>
  );
}
