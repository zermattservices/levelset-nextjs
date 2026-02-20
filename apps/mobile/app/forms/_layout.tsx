import { Stack } from "expo-router/stack";
import { useColors } from "../../src/context/ThemeContext";

export default function FormsLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        presentation: "formSheet",
        sheetGrabberVisible: true,
        sheetAllowedDetents: [0.95],
        contentStyle: { backgroundColor: colors.background },
        headerShown: true,
        headerTransparent: true,
        headerShadowVisible: false,
        headerTintColor: colors.onSurface,
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
