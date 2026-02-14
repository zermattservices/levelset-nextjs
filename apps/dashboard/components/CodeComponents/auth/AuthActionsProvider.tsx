import * as React from "react";
import { useAuthActions } from "./useAuthActions";

interface AuthActionsProviderProps {
  children: React.ReactNode;
}

export function AuthActionsProvider({ children }: AuthActionsProviderProps) {
  const authActions = useAuthActions();

  // Expose auth functions globally for Plasmic
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).authActions = authActions;
      
      return () => {
        // Cleanup on unmount
        delete (window as any).authActions;
      };
    }
  }, [authActions]);

  return <>{children}</>;
}
