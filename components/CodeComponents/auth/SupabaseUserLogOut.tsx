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

  // Clone children and add onClick handler to any clickable elements
  const childrenWithLogout = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // If it's a button or has onClick, add our logout handler
      if (child.type === 'button' || child.props.onClick) {
        return React.cloneElement(child, {
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
            // Call original onClick if it exists
            if (child.props.onClick) {
              child.props.onClick(e);
            }
          }
        });
      }
      
      // For other elements, wrap them in a clickable div
      return (
        <div 
          onClick={handleLogout}
          style={{ cursor: 'pointer', display: 'contents' }}
        >
          {child}
        </div>
      );
    }
    return child;
  });

  return (
    <div className={className}>
      {childrenWithLogout}
    </div>
  );
}
