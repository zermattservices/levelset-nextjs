/**
 * Today's Setup — full daily setup view for the location.
 * Drag-and-drop employees into position slots within time blocks.
 */

import React from "react";
import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";
import { SetupBoard } from "../../../src/components/setup/SetupBoard";

export default function TodaysSetupScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t("setup.title"), headerShown: true }} />
      <SetupBoard />
    </>
  );
}
