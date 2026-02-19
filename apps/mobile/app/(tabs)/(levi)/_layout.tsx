import React from "react";
import { Stack } from "expo-router/stack";
import { LeviMenuProvider } from "../../../src/context/LeviMenuContext";
import { LeviChatProvider } from "../../../src/context/LeviChatContext";

export default function LeviLayout() {
  return (
    <LeviMenuProvider>
      <LeviChatProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
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
      </LeviChatProvider>
    </LeviMenuProvider>
  );
}
