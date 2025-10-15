import React from 'react';
import { createSupabaseClient } from '@/util/supabase/component';

export interface SimpleLogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
  style?: React.CSSProperties;
}

export function SimpleLogoutButton({ 
  className, 
  children, 
  onSuccess,
  style 
}: SimpleLogoutButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const supabase = createSupabaseClient();

  const handleLogout = async () => {
    if (loading) return; // Prevent multiple clicks
    
    setLoading(true);
    try {
      await supabase.auth.signOut();
      console.log('User signed out successfully');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Default behavior: redirect to login page
        window.location.href = '/auth/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if there's an error
      window.location.href = '/auth/login';
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
      style={{
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        ...style
      }}
    >
      {loading ? 'Signing out...' : children || 'Logout'}
    </button>
  );
}
