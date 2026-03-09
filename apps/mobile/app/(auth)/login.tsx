/**
 * Login Screen
 * Email/password and Google OAuth sign-in
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../src/context/AuthContext";
import { useColors } from "../../src/context/ThemeContext";
import { useTheme } from "../../src/context/ThemeContext";
import { typography } from "../../src/lib/fonts";
import { borderRadius, haptics } from "../../src/lib/theme";
import { GlassCard } from "../../src/components/glass";

const logoLight = require("../../assets/images/logo-light.png");
const logoDark = require("../../assets/images/logo-dark.png");

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, marginRight: 12 }}>
      <Svg viewBox="0 0 48 48" width={size} height={size}>
        <Path
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          fill="#FFC107"
        />
        <Path
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          fill="#FF3D00"
        />
        <Path
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          fill="#4CAF50"
        />
        <Path
          d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          fill="#1976D2"
        />
      </Svg>
    </View>
  );
}

export default function LoginScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const { signInWithEmail, signInWithGoogle, isLoading, error, clearError } =
    useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;

    haptics.medium();
    await signInWithEmail(email, password);
    // Navigation is handled by root layout when isAuthenticated changes
  }, [email, password, signInWithEmail]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Navigation is handled by root layout when isAuthenticated changes
    } finally {
      setIsGoogleLoading(false);
    }
  }, [signInWithGoogle]);

  const handleInputChange = useCallback(
    (setter: (value: string) => void) => (text: string) => {
      setter(text);
      if (error) clearError();
    },
    [error, clearError]
  );

  const isEmailValid = email.includes("@") && email.includes(".");
  const canSubmit = isEmailValid && password.length >= 6 && !isLoading;

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.logoContainer}>
            <Image
              source={isDark ? logoDark : logoLight}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {/* Login Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.card}>
            <Text style={[styles.title, { color: colors.onSurface }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
              Sign in to access your team dashboard
            </Text>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={[styles.googleButton, { backgroundColor: colors.surface, borderColor: colors.outline }]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.onSurface} size="small" />
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={[styles.googleButtonText, { color: colors.onSurface }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.outline }]} />
              <Text style={[styles.dividerText, { color: colors.onSurfaceVariant }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.outline }]} />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.outline, color: colors.onSurface }]}
                value={email}
                onChangeText={handleInputChange(setEmail)}
                placeholder="you@example.com"
                placeholderTextColor={colors.onSurfaceDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.outline, color: colors.onSurface }]}
                value={password}
                onChangeText={handleInputChange(setPassword)}
                placeholder="Enter your password"
                placeholderTextColor={colors.onSurfaceDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                secureTextEntry
                textContentType="password"
                editable={!isLoading}
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.errorContainer }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                { backgroundColor: colors.primary },
                !canSubmit && styles.signInButtonDisabled,
              ]}
              onPress={handleEmailSignIn}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {isLoading && !isGoogleLoading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.signInButtonText, { color: colors.onPrimary }]}>Sign In</Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={[styles.helpText, { color: colors.onSurfaceDisabled }]}>
            Need an account? Contact your organization administrator to get
            started.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoImage: {
    width: 200,
    height: 60,
  },
  card: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderCurve: "continuous",
  },
  title: {
    ...typography.h3,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMedium,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  googleButtonText: {
    ...typography.labelLarge,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.bodySmall,
    marginHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    ...typography.labelLarge,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.bodyMedium,
  },
  errorContainer: {
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    ...typography.bodySmall,
    textAlign: "center",
  },
  signInButton: {
    borderRadius: borderRadius.full,
    borderCurve: "continuous",
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonDisabled: {
    opacity: 0.5,
  },
  signInButtonText: {
    ...typography.labelLarge,
  },
  helpContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  helpText: {
    ...typography.bodySmall,
    textAlign: "center",
    lineHeight: 20,
  },
});
