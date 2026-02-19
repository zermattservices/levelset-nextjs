import { Stack } from "expo-router/stack";

export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="account"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.65],
          contentStyle: { backgroundColor: "transparent" },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="location-picker"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.55],
          contentStyle: { backgroundColor: "transparent" },
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          presentation: "formSheet",
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.85, 1.0],
          contentStyle: { backgroundColor: "transparent" },
          headerShown: false,
        }}
      />
    </Stack>
  );
}
