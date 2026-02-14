/**
 * SignatureCanvas Component
 * Canvas-based signature capture using react-native-signature-canvas
 */

import React, { useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import SignatureScreen, {
  SignatureViewRef,
} from "react-native-signature-canvas";
import { AppIcon } from "../ui";
import { colors } from "../../lib/colors";
import { typography } from "../../lib/fonts";
import { borderRadius } from "../../lib/theme";

interface SignatureCanvasProps {
  label: string;
  helperText?: string;
  value?: string;
  onSignatureChange: (dataUrl: string) => void;
  disabled?: boolean;
  required?: boolean;
}

export function SignatureCanvas({
  label,
  helperText,
  value,
  onSignatureChange,
  disabled = false,
  required = false,
}: SignatureCanvasProps) {
  const signatureRef = useRef<SignatureViewRef>(null);

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
    signatureRef.current?.clearSignature();
    onSignatureChange("");
  }, [onSignatureChange]);

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      margin: 0;
      border-radius: ${borderRadius.md}px;
    }
    .m-signature-pad--body {
      border: none;
      border-radius: ${borderRadius.md}px;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body {
      background-color: ${colors.surfaceVariant};
    }
    canvas {
      border-radius: ${borderRadius.md}px;
    }
  `;

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {value && !disabled && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <AppIcon name="arrow.counterclockwise" size={16} tintColor={colors.primary} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {helperText && <Text style={styles.helperText}>{helperText}</Text>}

      <View style={[styles.canvasContainer, disabled && styles.canvasDisabled]}>
        {disabled ? (
          <View style={styles.disabledOverlay}>
            <Text style={styles.disabledText}>Signature disabled</Text>
          </View>
        ) : (
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onEnd={() => {
              // Auto-save on end of stroke
              signatureRef.current?.readSignature();
            }}
            autoClear={false}
            descriptionText=""
            clearText=""
            confirmText=""
            webStyle={webStyle}
            backgroundColor={colors.surfaceVariant}
            penColor={colors.onSurface}
            style={styles.signature}
          />
        )}

        {!value && !disabled && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>Sign here</Text>
          </View>
        )}
      </View>

      {value && (
        <View style={styles.signedIndicator}>
          <AppIcon name="checkmark.circle.fill" size={16} tintColor={colors.success} />
          <Text style={styles.signedText}>Signed</Text>
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
    color: colors.onSurface,
  },
  required: {
    color: colors.error,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    ...typography.labelSmall,
    color: colors.primary,
    marginLeft: 4,
  },
  canvasContainer: {
    height: 150,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
    overflow: "hidden",
    position: "relative",
  },
  canvasDisabled: {
    backgroundColor: colors.surfaceDisabled,
  },
  signature: {
    flex: 1,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceDisabled,
  },
  disabledOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceDisabled,
  },
  signedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  signedText: {
    ...typography.labelSmall,
    color: colors.success,
    marginLeft: 4,
  },
});

export default SignatureCanvas;
