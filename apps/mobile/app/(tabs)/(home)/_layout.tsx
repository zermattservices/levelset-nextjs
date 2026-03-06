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
          presentation: "transparentModal",
          animation: "fade",
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
      <Stack.Screen
        name="todays-setup"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="rating-detail"
        options={{
          headerShown: true,
          title: "Positional Excellence Rating",
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#ffffff",
        }}
      />
      <Stack.Screen
        name="infraction-detail"
        options={{
          headerShown: true,
          title: "Infraction Details",
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#ffffff",
        }}
      />
      <Stack.Screen
        name="review-detail"
        options={{
          headerShown: true,
          title: "",
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#ffffff",
        }}
      />
      <Stack.Screen
        name="employee-overview"
        options={{
          headerShown: true,
          title: "",
          headerTransparent: true,
          headerBackButtonDisplayMode: "minimal",
          headerTintColor: "#ffffff",
        }}
      />
      <Stack.Screen
        name="employee-contact"
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
