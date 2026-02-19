import React from "react";
import { ScrollView } from "react-native";
import { PositionalRatingsForm } from "../../src/components/forms";

export default function RatingsFormSheet() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardDismissMode="on-drag"
    >
      <PositionalRatingsForm />
    </ScrollView>
  );
}
