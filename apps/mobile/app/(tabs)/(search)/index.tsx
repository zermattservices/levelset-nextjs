/**
 * Search Tab (Placeholder)
 * Coming Soon screen for the search feature.
 */

import React from "react";
import { View } from "react-native";
import { useColors } from "../../../src/context/ThemeContext";
import { ComingSoonScreen } from "../../../src/components/screens/ComingSoonScreen";

export default function SearchScreen() {
  const colors = useColors();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ComingSoonScreen
        title="Search"
        subtitle="Search across your team, forms, and more"
      />
    </View>
  );
}
