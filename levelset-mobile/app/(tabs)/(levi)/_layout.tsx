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
        </Stack>
      </LeviChatProvider>
    </LeviMenuProvider>
  );
}
