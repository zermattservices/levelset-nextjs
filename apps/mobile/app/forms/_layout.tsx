import { Stack } from "expo-router/stack";

export default function FormsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "formSheet",
        sheetGrabberVisible: true,
        sheetAllowedDetents: [0.95],
        contentStyle: { backgroundColor: "transparent" },
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ratings"
        options={{ title: "Positional Ratings" }}
      />
      <Stack.Screen
        name="infractions"
        options={{ title: "Discipline Infraction" }}
      />
    </Stack>
  );
}
