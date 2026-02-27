/**
 * useGlass Hook
 * Provides Liquid Glass effect availability detection and components.
 * Falls back gracefully on non-iOS or older iOS versions.
 *
 * ## IMPORTANT: opacity breaks glass on iOS 26
 *
 * Never animate opacity on a parent view of GlassView (or GlassView
 * itself). On iOS 26, UIGlassEffect permanently stops rendering when
 * any ancestor has opacity < 1 — it does NOT recover after the
 * animation completes. Only a view-controller visibility change
 * (e.g. tab switch) forces UIKit to re-evaluate the backdrop.
 *
 * Avoid: FadeIn, FadeInDown, or any Reanimated entering animation
 * that touches opacity on a view wrapping GlassView.
 *
 * Safe alternatives: SlideInDown, translateY-only custom animations,
 * or apply fade animations to GlassView's *children* instead.
 *
 * References:
 * - expo/expo#41024 (animated parent opacity breaks glass)
 * - Apple WWDC25 session 284 (UIGlassEffect + opacity guidance)
 */

import { Platform } from "react-native";

// Module-level references loaded once at import time
let GlassViewComponent: any = null;
let _isLiquidGlassAvailable: () => boolean = () => false;

if (Platform.OS === "ios") {
  try {
    const glassEffect = require("expo-glass-effect");
    GlassViewComponent = glassEffect.GlassView;
    _isLiquidGlassAvailable =
      glassEffect.isLiquidGlassAvailable || (() => false);
  } catch (e) {
    console.log("[useGlass] expo-glass-effect not available, using fallbacks", e);
  }
}

const _hasGlassComponent = Platform.OS === "ios" && GlassViewComponent !== null;

/**
 * Hook to access glass effect components and availability.
 *
 * Returns the native `GlassView` component on iOS whenever the
 * package loaded successfully, `null` otherwise.
 */
export function useGlass() {
  return {
    /** The GlassView component — `null` when not on iOS or package failed to load. */
    GlassView: _hasGlassComponent ? GlassViewComponent : null,
    /** Whether we have a working GlassView component. */
    isGlassAvailable: _hasGlassComponent,
    isIOS: Platform.OS === "ios",
  };
}

/** Synchronous check — uses the package's cached availability flag. */
export const isGlassAvailable = () => _hasGlassComponent;
export const GlassView = GlassViewComponent;
export default useGlass;
