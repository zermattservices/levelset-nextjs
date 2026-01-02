import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import sty from './MenuNavigation.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { LevelsetButton } from '../LevelsetButton/LevelsetButton';
import { LogoutButton } from '../LogoutButton/LogoutButton';
import { NavSubmenu, type MenuType } from '../NavSubmenu/NavSubmenu';
import { LocationSelectDropdown } from '@/components/CodeComponents/LocationSelectDropdown';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';

// Check if we're on the roadmap subdomain
function useIsRoadmapSubdomain(): boolean {
  const [isRoadmap, setIsRoadmap] = React.useState(false);
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsRoadmap(window.location.hostname === 'roadmap.levelset.io');
    }
  }, []);
  
  return isRoadmap;
}

// Get the app base URL (for links when on roadmap subdomain)
const APP_BASE_URL = 'https://app.levelset.io';

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
  const { userHierarchyLevel, selectedLocationId } = useLocationContext();
  const { has } = usePermissions();
  const isRoadmapSubdomain = useIsRoadmapSubdomain();
  const [activeMenu, setActiveMenu] = React.useState<MenuType | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const [helpDropdownOpen, setHelpDropdownOpen] = React.useState(false);
  const [submenuOffset, setSubmenuOffset] = React.useState<number>(0);
  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const helpDropdownRef = React.useRef<HTMLDivElement>(null);
  const navButtonsRef = React.useRef<HTMLDivElement>(null);
  const navContentRef = React.useRef<HTMLDivElement>(null);
  const activeButtonRef = React.useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const closeAnimationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper to get the correct link URL (absolute when on roadmap subdomain)
  const getAppLink = React.useCallback((path: string) => {
    if (isRoadmapSubdomain) {
      return `${APP_BASE_URL}${path}`;
    }
    return path;
  }, [isRoadmapSubdomain]);

  // When impersonating, show impersonated user's name; otherwise use props or auth
  const displayFirstName = isImpersonating && impersonatedUser
    ? impersonatedUser.first_name
    : (firstName || auth.first_name || '');
  const displayRole = isImpersonating && impersonatedUser
    ? impersonatedUser.role
    : (userRole || auth.role || '');

  // Check if the ORIGINAL user (not impersonated) is a Levelset Admin for Admin Mode access
  const isActualLevelsetAdmin = auth.role === 'Levelset Admin';
  
  // Permission-based navigation access
  const canViewDashboard = has(P.PE_VIEW_DASHBOARD);
  const canViewRoster = has(P.ROSTER_VIEW);
  const canAccessOrgSettings = has(P.ORG_VIEW_SETTINGS) || userHierarchyLevel !== null;

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setHelpDropdownOpen(false);
      }
    }
    
    if (profileDropdownOpen || helpDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen, helpDropdownOpen]);

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

  // Calculate submenu offset to keep it within bounds
  const submenuRef = React.useRef<HTMLDivElement | null>(null);
  
  React.useEffect(() => {
    if (!activeMenu || !activeButtonRef.current || !navContentRef.current) {
      setSubmenuOffset(0);
      return;
    }

    // Use multiple frames to ensure submenu is rendered
    const timer = setTimeout(() => {
      const buttonRect = activeButtonRef.current?.getBoundingClientRect();
      const contentRect = navContentRef.current?.getBoundingClientRect();
      const submenuElement = submenuRef.current;
      
      if (!buttonRect || !contentRect) {
        setSubmenuOffset(0);
        return;
      }

      // Get actual submenu width if available, otherwise estimate
      const submenuWidth = submenuElement 
        ? submenuElement.offsetWidth 
        : (activeMenu === 'operations' ? 520 : 300);
      
      // Calculate where the centered submenu would be positioned
      const buttonCenter = buttonRect.left + buttonRect.width / 2;
      const submenuLeft = buttonCenter - submenuWidth / 2;
      
      // Check if it overflows past the left edge of navContent
      const overflow = contentRect.left - submenuLeft;
      
      if (overflow > 0) {
        // Need to shift right by the overflow amount
        setSubmenuOffset(overflow);
      } else {
        setSubmenuOffset(0);
      }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [activeMenu]);

  const handleMenuEnter = React.useCallback((menuType: MenuType, buttonElement: HTMLDivElement | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (closeAnimationTimeoutRef.current) {
      clearTimeout(closeAnimationTimeoutRef.current);
      closeAnimationTimeoutRef.current = null;
    }
    setIsClosing(false);
    activeButtonRef.current = buttonElement;
    setActiveMenu(menuType);
  }, []);

  const handleMenuLeave = React.useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsClosing(true);
      closeAnimationTimeoutRef.current = setTimeout(() => {
        setActiveMenu(null);
        setIsClosing(false);
      }, 200);
    }, 150);
  }, []);

  const closeMenuImmediately = React.useCallback(() => {
    setIsClosing(true);
    closeAnimationTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
      setIsClosing(false);
    }, 200);
  }, []);

  const menuButtons: { type: MenuType; label: string }[] = [
    { type: 'operations', label: 'Operations' },
    { type: 'analytics', label: 'Analytics' },
    { type: 'hr', label: 'HR' },
  ];

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
        <div className={sty.navContent} ref={navContentRef}>
          {/* Logo */}
          {isRoadmapSubdomain ? (
            <a href={getAppLink('/')} className={sty.logoLink}>
              <Image
                className={sty.logo}
                src="/logos/Levelset no margin.png"
                alt="Levelset"
                width={100}
                height={30}
                style={{ objectFit: 'contain', width: '100px', height: 'auto' }}
                priority
              />
            </a>
          ) : (
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
          )}

          {/* Navigation buttons */}
          <div className={sty.navButtons} ref={navButtonsRef}>
            {menuButtons.map(({ type, label }) => (
              <div
                key={type}
                className={sty.navButtonContainer}
                onMouseEnter={(e) => handleMenuEnter(type, e.currentTarget)}
                onMouseLeave={handleMenuLeave}
              >
                <button 
                  className={classNames(sty.navButton, activeMenu === type && sty.navButtonActive)}
                >
                  <span className={sty.navButtonText}>{label}</span>
                  <KeyboardArrowDownIcon 
                    sx={{ 
                      fontSize: 18, 
                      color: activeMenu === type ? '#31664a' : '#6b7280',
                      transition: 'transform 0.2s ease, color 0.15s ease',
                      transform: activeMenu === type ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} 
                  />
                </button>
                
                {/* Submenu positioned under this button */}
                {activeMenu === type && (
                  <div 
                    ref={submenuRef}
                    className={sty.submenuContainer}
                    style={{ transform: `translateX(calc(-50% + ${submenuOffset}px))` }}
                  >
                    <NavSubmenu 
                      menuType={type} 
                      isClosing={isClosing}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right side - Admin Mode, Location selector, user info, logout, profile icon */}
          <div className={sty.rightSection}>
            {/* Admin Mode - only for actual Levelset Admin (not impersonated role) */}
            {isActualLevelsetAdmin && (
              <LevelsetButton
                color="softGreen"
                size="compact"
                link={getAppLink('/admin/organizations')}
              >
                <span className={sty.adminModeButton}>Admin Mode</span>
              </LevelsetButton>
            )}

            {/* Help dropdown - same styling as nav menu buttons */}
            <div 
              className={sty.navButtonContainer}
              ref={helpDropdownRef}
              onMouseEnter={() => setHelpDropdownOpen(true)}
              onMouseLeave={() => setHelpDropdownOpen(false)}
            >
              <button 
                className={classNames(sty.navButton, helpDropdownOpen && sty.navButtonActive)}
              >
                <HelpOutlineIcon sx={{ fontSize: 18, color: helpDropdownOpen ? '#31664a' : '#6b7280' }} />
                <span className={sty.navButtonText}>Need Help?</span>
                <KeyboardArrowDownIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: helpDropdownOpen ? '#31664a' : '#6b7280',
                    transition: 'transform 0.2s ease, color 0.15s ease',
                    transform: helpDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }} 
                />
              </button>
              
              {/* Help submenu - same structure as NavSubmenu */}
              {helpDropdownOpen && (
                <div className={sty.submenuContainer} style={{ transform: 'translateX(-50%)' }}>
                  <div className={sty.helpSubmenu}>
                    <a 
                      href="https://docs.levelset.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={sty.helpMenuCard}
                    >
                      <div className={sty.helpIconContainer}>
                        <MenuBookOutlinedIcon sx={{ fontSize: 22 }} />
                      </div>
                      <div className={sty.helpTextContainer}>
                        <span className={sty.helpItemLabel}>Help Center</span>
                        <span className={sty.helpItemDescription}>Browse documentation and guides</span>
                      </div>
                    </a>
                    <a 
                      href={`https://roadmap.levelset.io${selectedLocationId ? `?location=${selectedLocationId}` : ''}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={sty.helpMenuCard}
                    >
                      <div className={sty.helpIconContainer}>
                        <MapOutlinedIcon sx={{ fontSize: 22 }} />
                      </div>
                      <div className={sty.helpTextContainer}>
                        <span className={sty.helpItemLabel}>Roadmap</span>
                        <span className={sty.helpItemDescription}>Vote on features and report bugs</span>
                      </div>
                    </a>
                  </div>
                </div>
              )}
            </div>

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
              {auth.profile_image ? (
                <img
                  src={auth.profile_image}
                  alt={displayFirstName || 'Profile'}
                  className={sty.profileImage}
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <AccountCircleIcon 
                  className={sty.accountIcon} 
                  sx={{ fontSize: 32, color: '#31664a', cursor: 'pointer' }} 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                />
              )}
              {profileDropdownOpen && (
                <div className={sty.profileDropdown}>
                  {/* Profile - disabled for now */}
                  <div className={classNames(sty.profileDropdownItem, sty.profileDropdownItemDisabled)}>
                    <PersonOutlineIcon sx={{ fontSize: 18, color: '#999' }} />
                    <span>Profile</span>
                  </div>
                  
                  {/* Organization Settings - only show if user has access */}
                  {canAccessOrgSettings && (
                    isRoadmapSubdomain ? (
                      <a href={getAppLink('/org-settings')} className={sty.profileDropdownItem} onClick={() => setProfileDropdownOpen(false)}>
                        <SettingsIcon sx={{ fontSize: 18, color: '#666' }} />
                        <span>Organization Settings</span>
                      </a>
                    ) : (
                      <Link href="/org-settings" className={sty.profileDropdownItem} onClick={() => setProfileDropdownOpen(false)}>
                        <SettingsIcon sx={{ fontSize: 18, color: '#666' }} />
                        <span>Organization Settings</span>
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop blur when submenu is open */}
      {activeMenu && (
        <div 
          className={classNames(sty.submenuBackdrop, isClosing && sty.submenuBackdropClosing)} 
          onClick={closeMenuImmediately} 
        />
      )}
    </div>
  );
}

export default MenuNavigation;
