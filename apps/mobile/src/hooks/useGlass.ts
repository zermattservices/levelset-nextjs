/**
 * useGlass Hook
 * Provides Liquid Glass effect availability detection and components
 * Falls back gracefully on non-iOS or older iOS versions
 */

import { useState, useEffect } from "react";
import { Platform } from "react-native";

// Dynamic imports for glass effect
let GlassView: any = null;
let isGlassEffectAPIAvailable: () => boolean = () => false;
let isLiquidGlassAvailable: () => boolean = () => false;

// Only attempt to load glass effect on iOS
if (Platform.OS === "ios") {
  try {
    const glassEffect = require("expo-glass-effect");
    GlassView = glassEffect.GlassView;
    isGlassEffectAPIAvailable =
      glassEffect.isGlassEffectAPIAvailable || (() => false);
    isLiquidGlassAvailable =
      glassEffect.isLiquidGlassAvailable || (() => false);
  } catch (e) {
    // Glass effect not available, will use fallbacks
    console.log("expo-glass-effect not available, using fallbacks");
  }
}

/**
 * Check if glass effects are available on current device
 */
export function isGlassAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  if (!GlassView) return false;

  try {
    return isGlassEffectAPIAvailable() || isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

/**
 * Hook to access glass effect components and availability
 * Re-checks availability after mount to handle late native bridge initialization
 */
export function useGlass() {
  const [available, setAvailable] = useState(() => isGlassAvailable());

  useEffect(() => {
    // Re-check availability after mount — the native bridge may not
    // have been ready during the initial synchronous render pass
    const checked = isGlassAvailable();
    if (checked !== available) {
      setAvailable(checked);
    }
  }, []);

  return {
    GlassView,
    isGlassAvailable: available,
    isIOS: Platform.OS === "ios",
  };
}

export { GlassView };
export default useGlass;
