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
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useColors } from "../../src/context/ThemeContext";
import { typography } from "../../src/lib/fonts";
import { borderRadius, haptics } from "../../src/lib/theme";
import { GlassCard } from "../../src/components/glass";

const GOOGLE_COLORS = {
  blue: "#4285F4",
  green: "#34A853",
  yellow: "#FBBC05",
  red: "#EA4335",
};

// Google Logo SVG as a simple component
function GoogleLogo() {
  return (
    <View style={styles.googleLogoContainer}>
      <View
        style={[styles.googleLogoPart, { backgroundColor: GOOGLE_COLORS.blue }]}
      />
      <View
        style={[
          styles.googleLogoPart,
          { backgroundColor: GOOGLE_COLORS.green },
        ]}
      />
      <View
        style={[
          styles.googleLogoPart,
          { backgroundColor: GOOGLE_COLORS.yellow },
        ]}
      />
      <View
        style={[styles.googleLogoPart, { backgroundColor: GOOGLE_COLORS.red }]}
      />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signInWithEmail, signInWithGoogle, isLoading, error, clearError } =
    useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleEmailSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;

    haptics.medium();
    const result = await signInWithEmail(email, password);
    if (result.success) {
      router.replace("/(tabs)");
    }
  }, [email, password, signInWithEmail, router]);

  const handleGoogleSignIn = useCallback(async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        router.replace("/(tabs)");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }, [signInWithGoogle, router]);

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
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={[styles.logoText, { color: colors.onPrimary }]}>L</Text>
            </View>
            <Text style={[styles.appName, { color: colors.onBackground }]}>Levelset</Text>
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
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "700",
  },
  appName: {
    ...typography.h2,
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
  googleLogoContainer: {
    width: 20,
    height: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    marginRight: 12,
  },
  googleLogoPart: {
    width: 10,
    height: 10,
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
