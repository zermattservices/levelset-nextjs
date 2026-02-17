import React from "react";
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColors } from "../../src/context/ThemeContext";

export const unstable_settings = {
  initialRouteName: "(home)",
};

export default function TabLayout() {
  const colors = useColors();

  return (
    <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(home)">
        <Label>Home</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="home" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(levi)">
        <Label>Levi</Label>
        <Icon
          sf={{ default: "cpu", selected: "cpu.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="hardware-chip" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(forms)">
        <Label>Forms</Label>
        <Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          androidSrc={
            <VectorIcon family={Ionicons} name="document-text" />
          }
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(schedule)">
        <Label>Schedule</Label>
        <Icon
          sf={{ default: "calendar", selected: "calendar.circle.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="calendar" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
