import * as React from 'react';
import Link from 'next/link';
import sty from './NavSubmenu.module.css';
import { usePermissions, P, type PermissionKey } from '@/lib/providers/PermissionsProvider';

// MUI Icons
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AllInclusiveOutlinedIcon from '@mui/icons-material/AllInclusiveOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

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

const APP_BASE_URL = 'https://app.levelset.io';

export interface NavMenuItem {
  label: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  requiredPermission?: PermissionKey;
}

export type MenuType = 'operations' | 'analytics' | 'hr';

// Menu definitions
export const menuItems: Record<MenuType, NavMenuItem[]> = {
  operations: [
    {
      label: 'Positional Excellence',
      description: 'View position ratings',
      href: '/positional-excellence',
      icon: <RocketLaunchOutlinedIcon sx={{ fontSize: 22 }} />,
    },
    {
      label: 'Discipline',
      description: 'Manage accountability points',
      href: '/discipline',
      icon: <GavelOutlinedIcon sx={{ fontSize: 22 }} />,
    },
    {
      label: 'Pathway',
      description: 'Career development tracking',
      icon: <SchoolOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
    {
      label: 'Evaluations',
      description: 'Schedule performance reviews',
      icon: <EventNoteOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
    {
      label: 'Form Management',
      description: 'Create and manage forms',
      icon: <DescriptionOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
  ],
  analytics: [
    {
      label: 'Operational Excellence',
      description: 'Track key performance metrics',
      icon: <StarOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
    {
      label: 'Retention',
      description: 'Analyze team member turnover',
      icon: <TrendingUpOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
  ],
  hr: [
    {
      label: 'Roster',
      description: 'View and manage team members',
      href: '/roster',
      icon: <GroupOutlinedIcon sx={{ fontSize: 22 }} />,
    },
    {
      label: 'Reporting',
      description: 'HR reports and analytics',
      href: '/reporting',
      icon: <AssessmentOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredPermission: P.HR_VIEW_REPORTING,
    },
    {
      label: '360 Overview',
      description: 'Complete employee profiles',
      icon: <AllInclusiveOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
    {
      label: 'Org Chart',
      description: 'Visualize team structure',
      icon: <AccountTreeOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
  ],
};

export interface NavSubmenuProps {
  menuType: MenuType;
  isClosing?: boolean;
  className?: string;
}

export function NavSubmenu({ menuType, isClosing, className }: NavSubmenuProps) {
  const { has } = usePermissions();
  const allItems = menuItems[menuType];
  // Filter items based on required permissions
  const items = allItems.filter(item => {
    if (!item.requiredPermission) return true;
    return has(item.requiredPermission);
  });
  const isTwoColumn = menuType === 'operations';
  const isRoadmapSubdomain = useIsRoadmapSubdomain();

  // Helper to get the correct link URL
  const getAppLink = (path: string) => {
    if (isRoadmapSubdomain) {
      return `${APP_BASE_URL}${path}`;
    }
    return path;
  };

  return (
    <div
      className={classNames(
        sty.root,
        isClosing && sty.closing,
        isTwoColumn && sty.twoColumn,
        className
      )}
    >
      <div className={classNames(sty.itemsGrid, isTwoColumn && sty.twoColumnGrid)}>
        {items.map((item) => {
          if (item.disabled) {
            return (
              <div key={item.label} className={classNames(sty.menuCard, sty.menuCardDisabled)}>
                <div className={sty.iconContainer}>
                  {item.icon}
                </div>
                <div className={sty.textContainer}>
                  <span className={sty.itemLabel}>{item.label}</span>
                  <span className={sty.itemDescription}>{item.description}</span>
                </div>
                <span className={sty.comingSoonText}>Coming soon!</span>
              </div>
            );
          }

          // Use <a> tag with absolute URL when on roadmap subdomain
          if (isRoadmapSubdomain) {
            return (
              <a key={item.label} href={getAppLink(item.href!)} className={sty.menuCard}>
                <div className={sty.iconContainer}>
                  {item.icon}
                </div>
                <div className={sty.textContainer}>
                  <span className={sty.itemLabel}>{item.label}</span>
                  <span className={sty.itemDescription}>{item.description}</span>
                </div>
              </a>
            );
          }

          return (
            <Link key={item.label} href={item.href!} className={sty.menuCard}>
              <div className={sty.iconContainer}>
                {item.icon}
              </div>
              <div className={sty.textContainer}>
                <span className={sty.itemLabel}>{item.label}</span>
                <span className={sty.itemDescription}>{item.description}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default NavSubmenu;
