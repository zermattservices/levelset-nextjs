import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState, useCallback, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LocationProvider } from "../src/context/LocationContext";
import { EmployeesProvider } from "../src/context/EmployeesContext";
import { FormsProvider } from "../src/context/FormsContext";
import { ThemeProvider, useColors, useTheme } from "../src/context/ThemeContext";
import { View, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsLeader } from "../src/hooks/useIsLeader";
import { ActionButton } from "../src/components/ui/ActionButton";
import { ActionMenu, ActionMenuItem } from "../src/components/ui/ActionMenu";
import { spacing } from "../src/lib/theme";
import "react-native-reanimated";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Start on auth screen — the root layout redirects to (tabs) once authenticated.
  initialRouteName: "(auth)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const colors = useColors();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const { isLeader } = useIsLeader();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  // Sync native root background with theme so transitions/sheets don't flash white
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [isDark, colors.background]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home tab if authenticated and in auth group
      router.replace("/(tabs)/(home)");
    }
  }, [isLoading, isAuthenticated, segments]);

  // Determine which tab is active and whether to show the FAB
  const activeTab = useMemo(() => {
    if (segments[0] === "(tabs)" && segments[1]) {
      // Extract tab name from segment like "(home)", "(levi)", "(schedule)"
      return segments[1] as string;
    }
    return null;
  }, [segments]);

  const isInTabs = segments[0] === "(tabs)";

  // FAB visibility: only on root Home/Schedule screens, only for leaders
  // Hide on detail pages by checking the last segment against known detail screen names
  const lastSegment = segments[segments.length - 1];
  const isOnDetailPage = ['rating-detail', 'infraction-detail', 'review-detail', 'employee-overview', 'todays-setup', 'account', 'edit-profile', 'location-picker', 'day-detail', 'shift-actions'].includes(lastSegment);
  const showFab = isLeader && isInTabs && !isOnDetailPage && (activeTab === "(home)" || activeTab === "(schedule)");

  // Context-aware menu items based on active tab
  const menuItems: ActionMenuItem[] = useMemo(() => {
    if (activeTab === "(home)") {
      return [
        {
          icon: "star.fill",
          label: "Submit Rating",
          onPress: () => router.push("/forms/ratings"),
        },
        {
          icon: "doc.text.fill",
          label: "Record Infraction",
          onPress: () => router.push("/forms/infractions"),
        },
        {
          icon: "checkmark.clipboard.fill",
          label: "Submit Evaluation",
          disabled: true,
          badge: "Coming Soon",
        },
        {
          icon: "square.grid.2x2.fill",
          label: "View all Forms",
          onPress: () => router.push("/forms-hub"),
        },
      ];
    }

    if (activeTab === "(schedule)") {
      return [
        {
          icon: "calendar.badge.plus",
          label: "Create Shift",
          disabled: true,
          badge: "Coming Soon",
        },
      ];
    }

    return [];
  }, [activeTab, router]);

  const handleToggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // Close menu when navigating away
  useEffect(() => {
    setMenuOpen(false);
  }, [segments]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="forms"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="forms-hub"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
      </Stack>

      {/* Floating Action Button + Menu — bottom-right, aligned with search button */}
      {showFab && (
        <>
          {/* Transparent full-screen tap catcher to dismiss menu (no darkening) */}
          {menuOpen && (
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={handleCloseMenu}
            />
          )}

          {/* FAB area — right edge aligned with card margins (spacing[5] = 20pt).
              Menu REPLACES the button: only one is rendered at a time. */}
          <View
            style={{
              position: "absolute",
              bottom: insets.bottom + 62,
              right: spacing[5] + 2,
              alignItems: "flex-end",
            }}
            pointerEvents="box-none"
          >
            {menuOpen ? (
              <ActionMenu
                visible={true}
                onClose={handleCloseMenu}
                items={menuItems}
              />
            ) : (
              <ActionButton onPress={handleToggleMenu} />
            )}
          </View>
        </>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
    "Satoshi-Variable": require("../assets/fonts/Satoshi-Variable.ttf"),
    // Headings use Satoshi-Variable with bold weight (see src/lib/fonts.ts)
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <EmployeesProvider>
                <FormsProvider>
                  <StatusBar style="auto" />
                  <RootLayoutNav />
                </FormsProvider>
              </EmployeesProvider>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
