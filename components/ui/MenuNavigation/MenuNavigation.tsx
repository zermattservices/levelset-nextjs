import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
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
  const router = useRouter();
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
      <div className={classNames(projectcss.all, sty.freeBox__qAtX2)}>
        <div className={classNames(projectcss.all, sty.freeBox__a3UdP)}>
          {/* Logo */}
          <Link href="/">
            <Image
              className={sty.logo}
              src="/levelset.png"
              alt="Levelset"
              width={100}
              height={48}
              priority
            />
          </Link>

          {/* Navigation buttons */}
          <div className={classNames(projectcss.all, sty.freeBox___9Xy55)}>
            {/* Dashboards dropdown trigger */}
            <LevelsetButton
              className={sty.levelsetButton___5Tvwa}
              color="clear"
              size="compact"
              onClick={() => setDashboardOpen(!dashboardOpen)}
            >
              <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__ayRwz)}>
                Dashboards
              </div>
            </LevelsetButton>

            {/* Admin link - only show for admins */}
            {isAdmin && (
              <LevelsetButton
                className={sty.levelsetButton__fBkbv}
                color="clear"
                size="compact"
                link="/admin"
              >
                <div className={classNames(projectcss.all, projectcss.__wab_text, sty.text__mNyQw)}>
                  Admin
                </div>
              </LevelsetButton>
            )}
          </div>

          {/* Right side - Location selector, user info, logout */}
          <div className={classNames(projectcss.all, sty.freeBox__rkbjc)}>
            <div className={classNames(projectcss.all, sty.freeBox___1LyUp)}>
              {/* Location dropdown */}
              <div className={classNames(projectcss.all, sty.freeBox__agUzE)}>
                <LocationSelectDropdown className={sty.locationSelectDropdown} />
              </div>

              {/* User info */}
              <div className={classNames(projectcss.all, sty.freeBox__pKjWu)}>
                <div className={classNames(projectcss.all, sty.freeBox__cVk2)}>
                  <span className={sty.slotTargetChildren3}>
                    <span className={classNames(projectcss.all, projectcss.__wab_text, sty.text__wg9Jo)}>
                      Hello,{' '}
                    </span>
                    <span className={classNames(projectcss.all, projectcss.__wab_text, sty.text__gFy0A)}>
                      {displayFirstName || 'User'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Logout button */}
              <LogoutButton className={sty.logoutButton}>
                Log out
              </LogoutButton>

              {/* Account icon */}
              <div className={classNames(projectcss.all, sty.freeBox__kYv9N)}>
                <div className={classNames(projectcss.all, sty.freeBox__yUskQ)}>
                  <Image
                    className={sty.account}
                    src="/account.svg"
                    alt="Account"
                    width={24}
                    height={24}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard submenu - shown when dashboardOpen is true */}
      {dashboardOpen && (
        <div className={classNames(projectcss.all, sty.freeBox___8OAdU, sty.freeBoxdashboardOpen___8OAdUkDcoZ)}>
          <DashboardSubmenu className={sty.dashboardSubmenu__zwXjo} />
        </div>
      )}
    </div>
  );
}

export default MenuNavigation;
