import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";

export interface LogoutButtonProps {
  children?: React.ReactNode;
  className?: string;
  onLogout?: () => void;
}

export function LogoutButton({
  children,
  className = "",
  onLogout,
}: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        alert('Error signing out. Please try again.');
        return;
      }
      
      // Call custom logout handler if provided
      onLogout?.();
      
      // Redirect to login page
      window.location.href = "/auth/login";
      
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error signing out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`logout-button ${className}`}
      type="button"
    >
      {isLoggingOut ? "Signing out..." : children || "Logout"}
    </button>
  );
}
