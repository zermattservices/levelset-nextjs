import React from "react";
import { ScrollView } from "react-native";
import { useColors } from "../../src/context/ThemeContext";
import { PositionalRatingsForm } from "../../src/components/forms";

export default function RatingsFormSheet() {
  const colors = useColors();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: colors.background }}
    >
      <PositionalRatingsForm />
    </ScrollView>
  );
}
