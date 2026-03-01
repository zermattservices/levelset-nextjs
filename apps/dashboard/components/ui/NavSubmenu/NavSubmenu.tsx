import * as React from 'react';
import Link from 'next/link';
import sty from './NavSubmenu.module.css';
import { usePermissions, P, type PermissionKey } from '@/lib/providers/PermissionsProvider';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useOrgFeatures, F, type FeatureKey } from '@/lib/providers/OrgFeaturesProvider';

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
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';

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
  levelsetAdminOnly?: boolean;
  /** Feature flag key — when set, item is enabled only if org has this feature */
  requiredFeature?: FeatureKey;
}

export type MenuType = 'operations' | 'analytics' | 'hr' | 'scheduling';

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
      href: '/form-management',
      icon: <DescriptionOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.FORM_MANAGEMENT,
    },
  ],
  analytics: [
    {
      label: 'Operational Excellence',
      description: 'Track key performance metrics',
      href: '/operational-excellence',
      icon: <StarOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.OPERATIONAL_EXCELLENCE,
    },
    {
      label: 'Retention',
      description: 'Analyze team member turnover',
      icon: <TrendingUpOutlinedIcon sx={{ fontSize: 22 }} />,
      disabled: true,
    },
  ],
  scheduling: [
    {
      label: 'Schedule',
      description: 'View and manage shifts',
      href: '/schedule',
      icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.SCHEDULING,
    },
    {
      label: 'Setup',
      description: 'Position templates and settings',
      href: '/schedule?mode=setup',
      icon: <TuneOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.SCHEDULING,
    },
    {
      label: 'Approvals',
      description: 'Shift trades, time off, availability',
      href: '/approvals',
      icon: <TaskAltOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.SCHEDULING,
      requiredPermission: P.SCHED_MANAGE_APPROVALS,
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
      label: 'Documents',
      description: 'Organization document hub',
      href: '/documents',
      icon: <FolderOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.DOCUMENTS,
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
      href: '/org-chart',
      icon: <AccountTreeOutlinedIcon sx={{ fontSize: 22 }} />,
      requiredFeature: F.ORG_CHART,
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
  const auth = useAuth();
  const { hasFeature } = useOrgFeatures();
  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  const allItems = menuItems[menuType];
  // Filter items based on required permissions
  const items = allItems.filter(item => {
    if (!item.requiredPermission) return true;
    return has(item.requiredPermission);
  });
  const isTwoColumn = menuType === 'operations' || menuType === 'hr';
  // scheduling uses single column (3 items)
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
          const featureEnabled = item.requiredFeature ? hasFeature(item.requiredFeature) : true;
          const effectivelyDisabled = item.disabled || (item.levelsetAdminOnly && !isLevelsetAdmin) || (item.requiredFeature && !featureEnabled);
          if (effectivelyDisabled) {
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
