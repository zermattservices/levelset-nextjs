import * as React from "react";
import { useAuth } from "./AuthProvider";

export interface UserProfileProps {
  className?: string;
  showSignOut?: boolean;
}

export function UserProfile({ className = "", showSignOut = true }: UserProfileProps) {
  const { user, signOut, loading } = useAuth();
  const [showDropdown, setShowDropdown] = React.useState(false);

  if (loading) {
    return (
      <div className={`user-profile ${className}`} data-plasmic-name="user-profile">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
  };

  const userInitials = user.user_metadata?.full_name 
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className={`user-profile ${className}`} data-plasmic-name="user-profile">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          data-plasmic-name="profile-button"
        >
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Profile" 
                className="h-8 w-8 rounded-full"
              />
            ) : (
              userInitials
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              {user.user_metadata?.full_name || user.email}
            </p>
            <p className="text-xs text-gray-500">
              {user.email}
            </p>
          </div>
          <svg 
            className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div 
            className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
            data-plasmic-name="profile-dropdown"
          >
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            
            {showSignOut && (
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                data-plasmic-name="signout-button"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

