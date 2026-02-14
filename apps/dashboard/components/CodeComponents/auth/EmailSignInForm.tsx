import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";

export interface EmailSignInFormProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  mode?: "signin" | "signup";
  showSignUp?: boolean;
  showForgotPassword?: boolean;
}

export function EmailSignInForm({ 
  className = "", 
  onSuccess,
  onError,
  mode = "signin",
  showSignUp = true,
  showForgotPassword = true
}: EmailSignInFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentMode, setCurrentMode] = React.useState(mode);

  const supabase = createSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      onError?.("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (currentMode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        result = { success: !error, error: error?.message };
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        result = { success: !error, error: error?.message };
      }

      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || "Authentication failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      onError?.("Please enter your email address first");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        onError?.(error.message);
      } else {
        onError?.("Password reset email sent! Check your inbox.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reset email";
      onError?.(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`email-signin-form ${className}`} data-plasmic-name="email-signin-form">
      <div className="form-group">
        <label htmlFor="email" className="form-label">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-input"
          placeholder="Enter your email"
          required
          data-plasmic-name="email-input"
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          placeholder="Enter your password"
          required
          data-plasmic-name="password-input"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="form-button"
        data-plasmic-name="submit-button"
      >
        {isLoading ? "Signing in..." : currentMode === "signin" ? "Sign In" : "Sign Up"}
      </button>

      {showSignUp && (
        <button
          type="button"
          onClick={() => setCurrentMode(currentMode === "signin" ? "signup" : "signin")}
          className="form-link"
          data-plasmic-name="toggle-mode-button"
        >
          {currentMode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      )}

      {showForgotPassword && currentMode === "signin" && (
        <button
          type="button"
          onClick={handleForgotPassword}
          className="form-link"
          data-plasmic-name="forgot-password-button"
        >
          Forgot your password?
        </button>
      )}
    </form>
  );
}
