import React from "react";
import { ScrollView } from "react-native";
import { DisciplineInfractionForm } from "../../src/components/forms";

export default function InfractionsFormSheet() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardDismissMode="on-drag"
    >
      <DisciplineInfractionForm />
    </ScrollView>
  );
}
