import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import sty from './MenuNavigation.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { LevelsetButton } from '../LevelsetButton/LevelsetButton';
import { LogoutButton } from '../LogoutButton/LogoutButton';
import { DashboardSubmenu } from '../DashboardSubmenu/DashboardSubmenu';
import { LocationSelectDropdown } from '@/components/CodeComponents/LocationSelectDropdown';
import { useAuth } from '@/lib/providers/AuthProvider';

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
  const [dashboardOpen, setDashboardOpen] = React.useState(false);

  const displayFirstName = firstName || auth.first_name || '';
  const displayRole = userRole || auth.role || '';

  const isAdmin = displayRole === 'Levelset Admin' || displayRole === 'Operator';

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
              Dashboards
            </LevelsetButton>

            {isAdmin && (
              <LevelsetButton
                color="clear"
                size="compact"
                link="/admin"
              >
                Admin
              </LevelsetButton>
            )}
          </div>

          {/* Right side - Location selector, user info, logout, profile icon */}
          <div className={sty.rightSection}>
            {/* Location dropdown */}
            <LocationSelectDropdown className={sty.locationDropdown} />

            {/* User info and logout stacked */}
            <div className={sty.userSection}>
              <span className={sty.helloText}>
                Hello, <span className={sty.userName}>{displayFirstName || 'User'}</span>
              </span>
              <LogoutButton className={sty.logoutButton}>
                Log out
              </LogoutButton>
            </div>

            {/* Account icon */}
            <AccountCircleIcon className={sty.accountIcon} sx={{ fontSize: 32, color: '#31664a' }} />
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
