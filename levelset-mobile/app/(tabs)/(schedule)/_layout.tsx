import React from "react";
import { Stack } from "expo-router/stack";
import { SlidingMenuProvider } from "../../../src/context/SlidingMenuContext";
import { ScheduleProvider } from "../../../src/context/ScheduleContext";

export default function ScheduleLayout() {
  return (
    <SlidingMenuProvider>
      <ScheduleProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </ScheduleProvider>
    </SlidingMenuProvider>
  );
}
