/**
 * GlassModal Component
 * A modal with Liquid Glass effect on iOS, fallback on other platforms
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { colors } from "../../lib/colors";
import { borderRadius, spacing } from "../../lib/theme";
import { typography } from "../../lib/fonts";

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
  animationDuration?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function GlassModal({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = true,
  fullScreen = false,
  style,
  animationDuration = 250,
}: GlassModalProps) {
  const { GlassView } = useGlass();
  const useGlassEffect = isGlassAvailable();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: animationDuration,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: animationDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, animationDuration]);

  const modalContent = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {scrollable ? (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}

      {/* Footer */}
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom || 16 }]}>
          {footer}
        </View>
      )}
    </>
  );

  const containerStyle = fullScreen
    ? [styles.fullScreenContainer, { paddingTop: insets.top }]
    : [styles.modalContainer, style];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.animatedContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {useGlassEffect && GlassView ? (
            <GlassView
              style={containerStyle}
              glassEffectStyle="regular"
              tintColor={colors.glassTintLight}
            >
              {modalContent}
            </GlassView>
          ) : (
            <View style={[styles.fallbackContainer, containerStyle]}>
              {modalContent}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  animatedContainer: {
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalContainer: {
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: "hidden",
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  fullScreenContainer: {
    flex: 1,
  },
  fallbackContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    ...typography.h4,
    color: colors.onSurface,
    flex: 1,
  },
  closeButton: {
    padding: spacing[2],
  },
  closeText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: spacing[4],
  },
  content: {
    padding: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
});

export default GlassModal;
