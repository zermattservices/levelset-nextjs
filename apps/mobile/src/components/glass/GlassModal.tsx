/**
 * GlassModal Component
 * A true centered modal with Liquid Glass effect on iOS, fallback on other platforms.
 * Animates with scale + fade for a natural dropdown-to-modal transition.
 */

import React, { useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ViewStyle,
  StyleProp,
} from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlass, isGlassAvailable } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
import { borderRadius, spacing, haptics } from "../../lib/theme";
import { typography } from "../../lib/fonts";

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassModal({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = true,
  style,
}: GlassModalProps) {
  const colors = useColors();
  const { GlassView } = useGlass();
  const useGlassEffect = isGlassAvailable();
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = useWindowDimensions();

  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 200 });
      scaleAnim.value = withSpring(1, { damping: 28, stiffness: 300, mass: 0.8 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 150 });
      scaleAnim.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible]);

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }],
  }));

  const modalContent = (
    <>
      {/* Header */}
      {title && (
        <View style={[styles.header, { borderBottomColor: colors.outline }]}>
          <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
          <TouchableOpacity onPress={() => { haptics.light(); onClose(); }} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

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
        <View style={[styles.footer, { borderTopColor: colors.outline }]}>
          {footer}
        </View>
      )}
    </>
  );

  const modalWidth = Math.min(SCREEN_WIDTH - spacing[8], 380);
  const containerStyle = [
    styles.modalContainer,
    { maxHeight: SCREEN_HEIGHT * 0.7, width: modalWidth },
    style,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.centeredWrapper}>
        {/* Backdrop */}
        <ReAnimated.View style={[styles.backdrop, { backgroundColor: colors.scrim }, backdropAnimStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </ReAnimated.View>

        {/* Modal Content */}
        <ReAnimated.View style={[styles.animatedContainer, contentAnimStyle]}>
          {useGlassEffect && GlassView ? (
            <GlassView
              style={containerStyle}
              glassEffectStyle="regular"
              tintColor={colors.glassTintLight}
            >
              {modalContent}
            </GlassView>
          ) : (
            <View style={[styles.fallbackContainer, { backgroundColor: colors.surface }, containerStyle]}>
              {modalContent}
            </View>
          )}
        </ReAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  animatedContainer: {},
  modalContainer: {
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  fallbackContainer: {
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h4,
    flex: 1,
  },
  closeButton: {
    padding: spacing[2],
  },
  closeText: {
    ...typography.labelMedium,
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
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
});

export default GlassModal;
