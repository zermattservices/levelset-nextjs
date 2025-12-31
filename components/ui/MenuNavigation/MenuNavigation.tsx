import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import sty from './MenuNavigation.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { LevelsetButton } from '../LevelsetButton/LevelsetButton';
import { LogoutButton } from '../LogoutButton/LogoutButton';
import { DashboardSubmenu } from '../DashboardSubmenu/DashboardSubmenu';
import { LocationSelectDropdown } from '@/components/CodeComponents/LocationSelectDropdown';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface MenuNavigationProps {
  className?: string;
  firstName?: string;
  userRole?: string;
}

export function MenuNavigation({ className, firstName, userRole }: MenuNavigationProps) {
  const auth = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const { userHierarchyLevel } = useLocationContext();
  const { has } = usePermissions();
  const [dashboardOpen, setDashboardOpen] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const dashboardHoverRef = React.useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const closeAnimationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // When impersonating, show impersonated user's name; otherwise use props or auth
  const displayFirstName = isImpersonating && impersonatedUser
    ? impersonatedUser.first_name
    : (firstName || auth.first_name || '');
  const displayRole = isImpersonating && impersonatedUser
    ? impersonatedUser.role
    : (userRole || auth.role || '');

  // Check if the ORIGINAL user (not impersonated) is a Levelset Admin for Admin Mode access
  // Admin Mode should only be visible to actual admins, not when impersonating
  const isActualLevelsetAdmin = auth.role === 'Levelset Admin';
  
  // Permission-based navigation access
  const canViewDashboard = has(P.PE_VIEW_DASHBOARD);
  const canViewRoster = has(P.ROSTER_VIEW);
  const canAccessOrgSettings = has(P.ORG_VIEW_SETTINGS) || userHierarchyLevel !== null;

  // Close profile dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (closeAnimationTimeoutRef.current) {
        clearTimeout(closeAnimationTimeoutRef.current);
      }
    };
  }, []);

  const handleDashboardMouseEnter = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (closeAnimationTimeoutRef.current) {
      clearTimeout(closeAnimationTimeoutRef.current);
      closeAnimationTimeoutRef.current = null;
    }
    setIsClosing(false);
    setDashboardOpen(true);
  }, []);

  const handleDashboardMouseLeave = React.useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      // Start closing animation
      setIsClosing(true);
      // After animation completes, actually close
      closeAnimationTimeoutRef.current = setTimeout(() => {
        setDashboardOpen(false);
        setIsClosing(false);
      }, 200); // Match animation duration
    }, 150); // Small delay to allow moving to submenu
  }, []);

  return (
    <div
      className={classNames(
        projectcss.all,
        projectcss.root_reset,
        projectcss.plasmic_default_styles,
        projectcss.plasmic_mixins,
        projectcss.plasmic_tokens,
        sty.root,
        className
      )}
    >
      {/* Main navigation bar */}
      <div className={sty.navBar}>
        <div className={sty.navContent}>
          {/* Logo */}
          <Link href="/" className={sty.logoLink}>
            <Image
              className={sty.logo}
              src="/logos/Levelset no margin.png"
              alt="Levelset"
              width={100}
              height={30}
              style={{ objectFit: 'contain', width: '100px', height: 'auto' }}
              priority
            />
          </Link>

          {/* Navigation buttons */}
          <div className={sty.navButtons}>
            <div
              ref={dashboardHoverRef}
              className={sty.dashboardHoverContainer}
              onMouseEnter={handleDashboardMouseEnter}
              onMouseLeave={handleDashboardMouseLeave}
            >
              <LevelsetButton
                color="clear"
                size="compact"
              >
                <span className={sty.navButtonText}>Dashboards</span>
              </LevelsetButton>
              
              {/* Submenu inside hover container to prevent flashing */}
              {dashboardOpen && (
                <div className={classNames(sty.submenuOverlay, isClosing && sty.submenuClosing)}>
                  <DashboardSubmenu className={sty.dashboardSubmenu} />
                </div>
              )}
            </div>
          </div>

          {/* Right side - Admin Mode, Location selector, user info, logout, profile icon */}
          <div className={sty.rightSection}>
            {/* Admin Mode - only for actual Levelset Admin (not impersonated role) */}
            {isActualLevelsetAdmin && (
              <LevelsetButton
                color="softGreen"
                size="compact"
                link="/admin/organizations"
              >
                <span className={sty.adminModeButton}>Admin Mode</span>
              </LevelsetButton>
            )}

            {/* Help/Documentation link */}
            <a 
              href="https://docs.levelset.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className={sty.helpButton}
            >
              <HelpOutlineIcon sx={{ fontSize: 18 }} />
              <span>Need Help?</span>
            </a>

            {/* Location dropdown */}
            <LocationSelectDropdown className={sty.locationDropdown} />

            {/* User info and logout stacked */}
            <div className={sty.userSection}>
              <span className={sty.helloText}>
                Hello, <span className={sty.userName}>{displayFirstName || 'User'}</span>
              </span>
              <LogoutButton className={sty.logoutButton}>
                Log Out
              </LogoutButton>
            </div>

            {/* Account icon with dropdown */}
            <div className={sty.profileDropdownContainer} ref={profileDropdownRef}>
              <AccountCircleIcon 
                className={sty.accountIcon} 
                sx={{ fontSize: 32, color: '#31664a' }} 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              />
              {profileDropdownOpen && canAccessOrgSettings && (
                <div className={sty.profileDropdown}>
                  <Link href="/org-settings" className={sty.profileDropdownItem} onClick={() => setProfileDropdownOpen(false)}>
                    <SettingsIcon sx={{ fontSize: 18, color: '#666' }} />
                    <span>Organization Settings</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop blur when submenu is open */}
      {dashboardOpen && (
        <div 
          className={classNames(sty.submenuBackdrop, isClosing && sty.submenuBackdropClosing)} 
          onClick={() => {
            setIsClosing(true);
            closeAnimationTimeoutRef.current = setTimeout(() => {
              setDashboardOpen(false);
              setIsClosing(false);
            }, 200);
          }} 
        />
      )}
    </div>
  );
}

export default MenuNavigation;
