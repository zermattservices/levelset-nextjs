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
        headerShown: false,
      }}
    >
      <Stack.Screen name="ratings" />
      <Stack.Screen name="infractions" />
      <Stack.Screen name="evaluation-picker" />
      <Stack.Screen name="evaluations/[templateId]" />
    </Stack>
  );
}
