/**
 * SignatureCanvas Component
 * Native SVG-based signature capture using react-native-gesture-handler + react-native-svg.
 * No WebView — eliminates ScrollView touch conflicts entirely.
 *
 * Matches dashboard SignatureWidget behavior:
 * - Draw with finger/stylus
 * - Multi-stroke support
 * - Clear button
 * - Stores as SVG data URI string
 */

import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";

interface SignatureCanvasProps {
  label: string;
  helperText?: string;
  value?: string;
  onSignatureChange: (dataUrl: string) => void;
  disabled?: boolean;
  required?: boolean;
  onSigningStart?: () => void;
  onSigningEnd?: () => void;
}

export function SignatureCanvas({
  label,
  helperText,
  value,
  onSignatureChange,
  disabled = false,
  required = false,
  onSigningStart,
  onSigningEnd,
}: SignatureCanvasProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const canvasBg = isDark ? "#21262d" : "#F9FAFB";
  const penColor = isDark ? "#FFFFFF" : "#000000";

  // Store all completed paths and the current in-progress path
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const hasSignature = paths.length > 0 || currentPath.length > 0 || !!value;

  const handleClear = useCallback(() => {
    haptics.light();
    setPaths([]);
    setCurrentPath("");
    onSignatureChange("");
  }, [onSignatureChange]);

  // Build SVG data URI from paths for storage
  const buildSvgDataUri = useCallback((allPaths: string[]) => {
    if (allPaths.length === 0) {
      onSignatureChange("");
      return;
    }
    const pathsStr = allPaths
      .map((d) => `<path d="${d}" stroke="${penColor}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160" viewBox="0 0 500 160">${pathsStr}</svg>`;
    const encoded = `data:image/svg+xml;base64,${btoa(svg)}`;
    onSignatureChange(encoded);
  }, [penColor, onSignatureChange]);

  // JS-thread callbacks for gesture handler (must use runOnJS from worklet)
  const onGestureBegin = useCallback((x: number, y: number) => {
    onSigningStart?.();
    setCurrentPath(`M${x.toFixed(1)},${y.toFixed(1)}`);
  }, [onSigningStart]);

  const onGestureUpdate = useCallback((x: number, y: number) => {
    setCurrentPath((prev) => `${prev} L${x.toFixed(1)},${y.toFixed(1)}`);
  }, []);

  const onGestureEnd = useCallback(() => {
    setCurrentPath((prev) => {
      if (prev) {
        setPaths((existing) => {
          const updated = [...existing, prev];
          setTimeout(() => buildSvgDataUri(updated), 0);
          return updated;
        });
      }
      return "";
    });
    onSigningEnd?.();
  }, [onSigningEnd, buildSvgDataUri]);

  // Gesture handler for drawing — uses runOnJS for all JS-thread calls
  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .shouldCancelWhenOutside(false)
    .minDistance(0)
    .activeOffsetX([-0, 0])
    .activeOffsetY([-0, 0])
    .onBegin((e) => {
      "worklet";
      runOnJS(onGestureBegin)(e.x, e.y);
    })
    .onUpdate((e) => {
      "worklet";
      runOnJS(onGestureUpdate)(e.x, e.y);
    })
    .onEnd(() => {
      "worklet";
      runOnJS(onGestureEnd)();
    })
    .onFinalize(() => {
      "worklet";
      runOnJS(onGestureEnd)();
    });

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.onSurface }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
        {hasSignature && !disabled && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <AppIcon name="arrow.counterclockwise" size={16} tintColor={colors.primary} />
            <Text style={[styles.clearButtonText, { color: colors.primary }]}>{t("common.clear")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {helperText && <Text style={[styles.helperText, { color: colors.onSurfaceVariant }]}>{helperText}</Text>}

      <GestureHandlerRootView style={{ overflow: "hidden", borderRadius: borderRadius.md }}>
        <GestureDetector gesture={panGesture}>
          <View
            style={[
              styles.canvasContainer,
              { backgroundColor: canvasBg, borderColor: colors.outline },
              disabled && { backgroundColor: colors.surfaceDisabled },
            ]}
          >
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              {/* Completed strokes */}
              {paths.map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  stroke={penColor}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {/* Current in-progress stroke */}
              {currentPath ? (
                <Path
                  d={currentPath}
                  stroke={penColor}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>

            {/* Placeholder */}
            {!hasSignature && !disabled && (
              <View style={styles.placeholder} pointerEvents="none">
                <Text style={[styles.placeholderText, { color: colors.onSurfaceDisabled }]}>{t("common.signHere")}</Text>
              </View>
            )}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>

      {hasSignature && !disabled && (
        <View style={styles.signedIndicator}>
          <AppIcon name="checkmark.circle.fill" size={16} tintColor={colors.success} />
          <Text style={[styles.signedText, { color: colors.success }]}>{t("common.signed")}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    ...typography.labelLarge,
  },
  helperText: {
    ...typography.bodySmall,
    marginBottom: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    ...typography.labelSmall,
  },
  canvasContainer: {
    height: 160,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    ...typography.bodyMedium,
  },
  signedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  signedText: {
    ...typography.labelSmall,
  },
});

export default SignatureCanvas;
