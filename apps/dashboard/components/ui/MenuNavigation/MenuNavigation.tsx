import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import sty from './MenuNavigation.module.css';
import projectcss from '@/styles/base.module.css';
import { LevelsetButton } from '../LevelsetButton/LevelsetButton';
import { LogoutButton } from '../LogoutButton/LogoutButton';
import { NavSubmenu, type MenuType } from '../NavSubmenu/NavSubmenu';
import { LocationSelectDropdown } from '@/components/CodeComponents/LocationSelectDropdown';
import { ProfileModal } from '../ProfileModal/ProfileModal';
import { BugReportModal } from '../BugReportModal/BugReportModal';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';
import { createSupabaseClient } from '@/util/supabase/component';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

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
  fullWidth?: boolean;
}

export function MenuNavigation({ className, firstName, userRole, fullWidth }: MenuNavigationProps) {
  const auth = useAuth();
  const { isImpersonating, impersonatedUser } = useImpersonation();
  const { userHierarchyLevel, selectedLocationId } = useLocationContext();
  const { has } = usePermissions();
  const { hasFeature } = useOrgFeatures();
  const isRoadmapSubdomain = useIsRoadmapSubdomain();
  const { mode, setMode, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeMenu, setActiveMenu] = React.useState<MenuType | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const [helpDropdownOpen, setHelpDropdownOpen] = React.useState(false);
  const [profileModalOpen, setProfileModalOpen] = React.useState(false);
  const [bugModalOpen, setBugModalOpen] = React.useState(false);
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

  // Pending approval count for badge
  const [pendingCount, setPendingCount] = React.useState(0);

  React.useEffect(() => {
    if (!hasFeature(F.SCHEDULING) || !auth.org_id) return;
    const fetchPendingCount = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const params = new URLSearchParams({ org_id: auth.org_id! });
        if (selectedLocationId) params.set('location_id', selectedLocationId);
        const resp = await fetch(`/api/scheduling/pending-count?${params}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPendingCount(data.total || 0);
        }
      } catch {
        // Silently fail — badge is non-critical
      }
    };
    fetchPendingCount();
  }, [hasFeature, auth.org_id, selectedLocationId]);

  const menuButtons: { type: MenuType; label: string; featureFlag?: any }[] = [
    { type: 'operations', label: 'Operations' },
    { type: 'analytics', label: 'Analytics' },
    { type: 'hr', label: 'HR' },
    { type: 'scheduling', label: 'Scheduling', featureFlag: F.SCHEDULING },
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
        <div className={classNames(sty.navContent, fullWidth && sty.navContentFullWidth)} ref={navContentRef}>
          {/* Logo */}
          {isRoadmapSubdomain ? (
            <a href={getAppLink('/')} className={sty.logoLink}>
              <Image
                className={sty.logo}
                src={resolvedTheme === 'dark' ? '/logos/Levelset White no margin.png' : '/logos/Levelset no margin.png'}
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
                src={resolvedTheme === 'dark' ? '/logos/Levelset White no margin.png' : '/logos/Levelset no margin.png'}
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
            {menuButtons.map(({ type, label, featureFlag }) => {
              // Skip feature-flagged menus if not enabled
              if (featureFlag && !hasFeature(featureFlag)) return null;

              return (
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
                    {type === 'scheduling' && pendingCount > 0 && (
                      <span className={sty.pendingBadge}>{pendingCount}</span>
                    )}
                    <KeyboardArrowDownIcon
                      sx={{
                        fontSize: 18,
                        color: activeMenu === type ? 'var(--ls-color-brand)' : 'var(--ls-color-muted)',
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
              );
            })}

            {/* Levi AI - direct link, feature flag gated */}
            {hasFeature(F.LEVI_AI) && (
              <div className={sty.navButtonContainer}>
                <Link href="/levi" className={classNames(sty.navButton, sty.navButtonDirect)}>
                  <span className={sty.navButtonText}>Levi</span>
                </Link>
              </div>
            )}
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
                <HelpOutlineIcon sx={{ fontSize: 18, color: helpDropdownOpen ? 'var(--ls-color-brand)' : 'var(--ls-color-muted)' }} />
                <span className={sty.navButtonText}>Need Help?</span>
                <KeyboardArrowDownIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: helpDropdownOpen ? 'var(--ls-color-brand)' : 'var(--ls-color-muted)',
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
                    <button
                      className={sty.helpMenuCard}
                      onClick={() => {
                        setHelpDropdownOpen(false);
                        setBugModalOpen(true);
                      }}
                      style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <div className={sty.helpIconContainer}>
                        <BugReportOutlinedIcon sx={{ fontSize: 22 }} />
                      </div>
                      <div className={sty.helpTextContainer}>
                        <span className={sty.helpItemLabel}>Submit a Bug</span>
                        <span className={sty.helpItemDescription}>Report an issue you&apos;ve found</span>
                      </div>
                    </button>
                    <a
                      href={`https://roadmap.levelset.io/features${selectedLocationId ? `?location=${selectedLocationId}` : ''}`}
                      className={sty.helpMenuCard}
                    >
                      <div className={sty.helpIconContainer}>
                        <MapOutlinedIcon sx={{ fontSize: 22 }} />
                      </div>
                      <div className={sty.helpTextContainer}>
                        <span className={sty.helpItemLabel}>Roadmap</span>
                        <span className={sty.helpItemDescription}>Vote on features and request improvements</span>
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
                  sx={{ fontSize: 32, color: 'var(--ls-color-brand)', cursor: 'pointer' }} 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                />
              )}
              {profileDropdownOpen && (
                <div className={sty.profileDropdown}>
                  {/* Profile */}
                  <div 
                    className={sty.profileDropdownItem}
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setProfileModalOpen(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <PersonOutlineIcon sx={{ fontSize: 18, color: 'var(--ls-color-text-tertiary)' }} />
                    <span>Profile</span>
                  </div>

                  {/* Theme Toggle Switch */}
                  <div className={sty.profileDropdownDivider} />
<<<<<<< HEAD
                  <div
                    className={sty.profileDropdownItem}
                    style={{ cursor: 'pointer', justifyContent: 'center', gap: 8, padding: '10px 16px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LightModeOutlinedIcon
                      sx={{
                        fontSize: 18,
                        color: resolvedTheme === 'light' ? 'var(--ls-color-brand)' : 'var(--ls-color-text-tertiary)',
                        transition: 'color 0.2s ease',
                      }}
                    />
                    <div
                      className={`${sty.themeSwitch} ${resolvedTheme === 'dark' ? sty.themeSwitchActive : ''}`}
                      onClick={() => setMode(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      role="switch"
                      aria-checked={resolvedTheme === 'dark'}
                      aria-label="Toggle dark mode"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
                        }
                      }}
                    >
                      <div className={`${sty.themeSwitchThumb} ${resolvedTheme === 'dark' ? sty.themeSwitchThumbDark : ''}`} />
                    </div>
                    <DarkModeOutlinedIcon
                      sx={{
                        fontSize: 18,
                        color: resolvedTheme === 'dark' ? 'var(--ls-color-brand)' : 'var(--ls-color-text-tertiary)',
                        transition: 'color 0.2s ease',
                      }}
                    />
=======
                  <div className={sty.themeToggleRow}>
                    <button
                      className={`${sty.themeToggleBtn} ${resolvedTheme === 'light' ? sty.themeToggleBtnActive : ''}`}
                      onClick={() => setMode('light')}
                      aria-label="Light mode"
                    >
                      <LightModeOutlinedIcon sx={{ fontSize: 16 }} />
                    </button>
                    <button
                      className={`${sty.themeToggleBtn} ${resolvedTheme === 'dark' ? sty.themeToggleBtnActive : ''}`}
                      onClick={() => setMode('dark')}
                      aria-label="Dark mode"
                    >
                      <DarkModeOutlinedIcon sx={{ fontSize: 16 }} />
                    </button>
>>>>>>> f6eb7ed (feat: update OE page, metric cards, leaderboard, nav, and discipline modals)
                  </div>

                  {/* Organization Settings - only show if user has access */}
                  {canAccessOrgSettings && (
                    isRoadmapSubdomain ? (
                      <a href={getAppLink('/org-settings')} className={sty.profileDropdownItem} onClick={() => setProfileDropdownOpen(false)}>
                        <SettingsIcon sx={{ fontSize: 18, color: 'var(--ls-color-text-tertiary)' }} />
                        <span>Organization Settings</span>
                      </a>
                    ) : (
                      <Link href="/org-settings" className={sty.profileDropdownItem} onClick={() => setProfileDropdownOpen(false)}>
                        <SettingsIcon sx={{ fontSize: 18, color: 'var(--ls-color-text-tertiary)' }} />
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

      {/* Profile Modal */}
      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Bug Report Modal */}
      <BugReportModal
        open={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        currentPage={router.pathname}
      />
    </div>
  );
}

export default MenuNavigation;
