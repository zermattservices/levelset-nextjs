/**
 * GlassDrawer Component
 * A bottom drawer with Liquid Glass effect on iOS, fallback on other platforms
 */

import React, { useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
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
import { useGlass } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
import { borderRadius, spacing, haptics } from "../../lib/theme";
import { typography } from "../../lib/fonts";

interface GlassDrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassDrawer({
  visible,
  onClose,
  title,
  children,
  footer,
  scrollable = true,
  fullScreen = false,
  style,
}: GlassDrawerProps) {
  const colors = useColors();
  const { GlassView } = useGlass();
  const insets = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 200 });
      slideAnim.value = withSpring(0, { damping: 28, stiffness: 300, mass: 0.8 });
    } else {
      fadeAnim.value = withTiming(0, { duration: 150 });
      slideAnim.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
    }
  }, [visible]);

  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideAnim.value }],
  }));

  const drawerContent = (
    <>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.outline }]}>
        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        <TouchableOpacity onPress={() => { haptics.light(); onClose(); }} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {scrollable ? (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollContentContainer,
            !footer && { paddingBottom: spacing[4] + (insets.bottom || 16) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[
          styles.content,
          fullScreen && { flex: 1 },
          !footer && { paddingBottom: spacing[4] + (insets.bottom || 16) },
        ]}>
          {children}
        </View>
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
    : [styles.drawerContainer, { maxHeight: SCREEN_HEIGHT * 0.85 }, style];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Backdrop */}
        <ReAnimated.View style={[styles.backdrop, { backgroundColor: colors.scrim }, backdropAnimStyle]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            activeOpacity={1}
          />
        </ReAnimated.View>

        {/* Drawer Content */}
        <ReAnimated.View
          style={[
            styles.animatedContainer,
            fullScreen ? { flex: 1 } : { maxHeight: SCREEN_HEIGHT * 0.9 },
            contentAnimStyle,
          ]}
        >
          {GlassView ? (
            <GlassView
              style={containerStyle}
            >
              {drawerContent}
            </GlassView>
          ) : (
            <View style={[styles.fallbackContainer, { backgroundColor: colors.background }, containerStyle]}>
              {drawerContent}
            </View>
          )}
        </ReAnimated.View>
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
  },
  animatedContainer: {},
  drawerContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  fullScreenContainer: {
    flex: 1,
  },
  fallbackContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  scrollContent: {},
  scrollContentContainer: {
    padding: spacing[4],
  },
  content: {
    padding: spacing[4],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
});

export default GlassDrawer;
