import { createSupabaseClient } from "@/util/supabase/component";
import React from "react";

export function SupabaseUserLogOut({
  className,
  children,
  onSuccess,
}: {
  className?: string;
  children?: React.ReactElement;
  onSuccess: () => void;
}) {
  const supabase = createSupabaseClient();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still call onSuccess to redirect even if there's an error
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <div 
      className={className}
      onClick={handleLogout}
      style={{ cursor: 'pointer', display: 'contents' }}
    >
      {children}
    </div>
  );
}
