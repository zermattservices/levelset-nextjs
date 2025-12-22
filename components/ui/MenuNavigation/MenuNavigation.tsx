import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import sty from './MenuNavigation.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { LevelsetButton } from '../LevelsetButton/LevelsetButton';
import { LogoutButton } from '../LogoutButton/LogoutButton';
import { DashboardSubmenu } from '../DashboardSubmenu/DashboardSubmenu';
import { LocationSelectDropdown } from '@/components/CodeComponents/LocationSelectDropdown';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

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
  const { userHierarchyLevel } = useLocationContext();
  const [dashboardOpen, setDashboardOpen] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);

  const displayFirstName = firstName || auth.first_name || '';
  const displayRole = userRole || auth.role || '';

  const isAdmin = displayRole === 'Levelset Admin' || displayRole === 'Operator' || displayRole === 'Owner/Operator';
  const isLevelsetAdmin = displayRole === 'Levelset Admin';
  
  // All authenticated users can access org settings (read-only for level 2+)
  const canAccessOrgSettings = userHierarchyLevel !== null;

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
            <LevelsetButton
              color="clear"
              size="compact"
              onClick={() => setDashboardOpen(!dashboardOpen)}
            >
              <span className={sty.navButtonText}>Dashboards</span>
            </LevelsetButton>

            {isAdmin && (
              <LevelsetButton
                color="clear"
                size="compact"
                link="/roster"
              >
                <span className={sty.navButtonText}>Roster</span>
              </LevelsetButton>
            )}
          </div>

          {/* Right side - Admin Mode, Location selector, user info, logout, profile icon */}
          <div className={sty.rightSection}>
            {/* Admin Mode - only for Levelset Admin */}
            {isLevelsetAdmin && (
              <LevelsetButton
                color="softGreen"
                size="compact"
                link="/admin/locations"
              >
                <span className={sty.adminModeButton}>Admin Mode</span>
              </LevelsetButton>
            )}

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

      {/* Dashboard submenu - shown when dashboardOpen is true */}
      {dashboardOpen && (
        <div className={sty.submenuContainer}>
          <DashboardSubmenu className={sty.dashboardSubmenu} />
        </div>
      )}
    </div>
  );
}

export default MenuNavigation;
