import React from "react";
import { PlatformColor } from "react-native";
import { Stack } from "expo-router/stack";
import { SlidingMenuProvider } from "../../../src/context/SlidingMenuContext";
import { ScheduleProvider } from "../../../src/context/ScheduleContext";

export default function ScheduleLayout() {
  return (
    <SlidingMenuProvider>
      <ScheduleProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="day-detail"
            options={{
              headerShown: true,
              headerBackButtonDisplayMode: "minimal",
              headerLargeTitle: false,
              headerTransparent: true,
              headerBlurEffect: "systemMaterial",
              headerTitleStyle: { color: PlatformColor("label") },
            }}
          />
          <Stack.Screen
            name="location-picker"
            options={{
              presentation: "transparentModal",
              animation: "fade",
              contentStyle: { backgroundColor: "transparent" },
              headerShown: false,
            }}
          />
        </Stack>
      </ScheduleProvider>
    </SlidingMenuProvider>
  );
}
