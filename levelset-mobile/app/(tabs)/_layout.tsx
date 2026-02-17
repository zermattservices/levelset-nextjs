import React from "react";
import {
  NativeTabs,
  Icon,
  Label,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../../src/lib/colors";

export default function TabLayout() {
  return (
    <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(home)">
        <Label>Home</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="home" />}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(resources)">
        <Label>Resources</Label>
        <Icon
          sf={{ default: "book", selected: "book.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="book" />}
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

      <NativeTabs.Trigger name="(profile)">
        <Label>Profile</Label>
        <Icon
          sf={{ default: "person", selected: "person.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="person" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
