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
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { colors } from "../../src/lib/colors";
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
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
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>L</Text>
            </View>
            <Text style={styles.appName}>Levelset</Text>
          </View>
        </Animated.View>

        {/* Login Card */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <GlassCard style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your team dashboard
            </Text>

            {/* Google Sign In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.onSurface} size="small" />
              ) : (
                <>
                  <GoogleLogo />
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
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
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
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
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                !canSubmit && styles.signInButtonDisabled,
              ]}
              onPress={handleEmailSignIn}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              {isLoading && !isGoogleLoading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </GlassCard>
        </Animated.View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.onPrimary,
  },
  appName: {
    ...typography.h2,
    color: colors.onBackground,
  },
  card: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderCurve: "continuous",
  },
  title: {
    ...typography.h3,
    color: colors.onSurface,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
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
    color: colors.onSurface,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.outline,
  },
  dividerText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    ...typography.labelLarge,
    color: colors.onSurface,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  errorContainer: {
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: "center",
  },
  signInButton: {
    backgroundColor: colors.primary,
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
    color: colors.onPrimary,
  },
  helpContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  helpText: {
    ...typography.bodySmall,
    color: colors.onSurfaceDisabled,
    textAlign: "center",
    lineHeight: 20,
  },
});
