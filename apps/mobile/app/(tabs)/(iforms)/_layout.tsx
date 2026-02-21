import { Stack } from "expo-router/stack";

export default function FormsTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="location-picker"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
          headerShown: false,
        }}
      />
    </Stack>
  );
}
