/**
 * ThemeContext
 * Provides OS-aware light/dark color palette to the entire app.
 * Components call useColors() to get the active palette.
 */

import React, { createContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, type ColorPalette } from "../lib/colors";

interface ThemeContextType {
  colors: ColorPalette;
  isDark: boolean;
  colorScheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  colorScheme: "light",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const value = useMemo<ThemeContextType>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      isDark,
      colorScheme: isDark ? "dark" : "light",
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Returns the active color palette (light or dark based on OS preference) */
export function useColors(): ColorPalette {
  return React.use(ThemeContext).colors;
}

/** Returns full theme context: colors, isDark, colorScheme */
export function useTheme(): ThemeContextType {
  return React.use(ThemeContext);
}
