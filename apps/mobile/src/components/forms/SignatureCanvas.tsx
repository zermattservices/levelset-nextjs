/**
 * SignatureCanvas Component
 * Canvas-based signature capture using react-native-signature-canvas.
 *
 * Handles touch conflicts with parent ScrollView by temporarily disabling
 * scroll when the user is actively signing.
 */

import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";
import SignatureScreen, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";

interface SignatureCanvasProps {
  label: string;
  helperText?: string;
  value?: string;
  onSignatureChange: (dataUrl: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Callback to disable parent ScrollView while signing */
  onSigningStart?: () => void;
  /** Callback to re-enable parent ScrollView after signing */
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
  const signatureRef = useRef<SignatureViewRef>(null);
  const { t } = useTranslation();
  const [isSigning, setIsSigning] = useState(false);

  const handleSignature = useCallback(
    (signature: string) => {
      onSignatureChange(signature);
    },
    [onSignatureChange]
  );

  const handleEmpty = useCallback(() => {
    onSignatureChange("");
  }, [onSignatureChange]);

  const handleClear = useCallback(() => {
    haptics.light();
    signatureRef.current?.clearSignature();
    onSignatureChange("");
  }, [onSignatureChange]);

  const handleBegin = useCallback(() => {
    setIsSigning(true);
    onSigningStart?.();
  }, [onSigningStart]);

  const handleEnd = useCallback(() => {
    setIsSigning(false);
    onSigningEnd?.();
    // Auto-save on end of stroke
    signatureRef.current?.readSignature();
  }, [onSigningEnd]);

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--body {
      border: none;
      width: 100%;
      height: 100%;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: ${colors.surfaceVariant};
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
  `;

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.onSurface }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
        {value && !disabled && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <AppIcon name="arrow.counterclockwise" size={16} tintColor={colors.primary} />
            <Text style={[styles.clearButtonText, { color: colors.primary }]}>{t("common.clear")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {helperText && <Text style={[styles.helperText, { color: colors.onSurfaceVariant }]}>{helperText}</Text>}

      <View
        style={[
          styles.canvasContainer,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
          disabled && { backgroundColor: colors.surfaceDisabled },
          isSigning && { borderColor: colors.primary, borderWidth: 2 },
        ]}
      >
        {disabled ? (
          <View style={styles.disabledOverlay}>
            <Text style={[styles.disabledText, { color: colors.onSurfaceDisabled }]}>{t("common.signHere")}</Text>
          </View>
        ) : (
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onBegin={handleBegin}
            onEnd={handleEnd}
            autoClear={false}
            descriptionText=""
            clearText=""
            confirmText=""
            webStyle={webStyle}
            backgroundColor={colors.surfaceVariant}
            penColor={colors.onSurface}
            minWidth={1.5}
            maxWidth={3}
            style={styles.signature}
            androidLayerType="software"
            scrollable={false}
          />
        )}

        {!value && !disabled && !isSigning && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={[styles.placeholderText, { color: colors.onSurfaceDisabled }]}>{t("common.signHere")}</Text>
          </View>
        )}
      </View>

      {value && (
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
  signature: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    ...typography.bodyMedium,
  },
  disabledOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledText: {
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
