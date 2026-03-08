import * as React from 'react';
import Link from 'next/link';
import sty from './NavSubmenu.module.css';
import { usePermissions, P, type PermissionKey } from '@/lib/providers/PermissionsProvider';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useOrgFeatures, F, type FeatureKey } from '@/lib/providers/OrgFeaturesProvider';

// Lucide Icons (shared with marketing app)
import {
  Rocket,
  Gavel,
  GraduationCap,
  CalendarCheck,
  FileText,
  Star,
  TrendingUp,
  Users,
  Infinity,
  Network,
  BarChart3,
  Folder,
  CalendarDays,
  Captions,
  CircleCheckBig,
} from 'lucide-react';

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
      icon: <Rocket size={22} strokeWidth={1.5} />,
    },
    {
      label: 'Discipline',
      description: 'Manage accountability points',
      href: '/discipline',
      icon: <Gavel size={22} strokeWidth={1.5} />,
    },
    {
      label: 'Pathway',
      description: 'Career development tracking',
      icon: <GraduationCap size={22} strokeWidth={1.5} />,
      disabled: true,
    },
    {
      label: 'Evaluations',
      description: 'Schedule performance reviews',
      icon: <CalendarCheck size={22} strokeWidth={1.5} />,
      disabled: true,
    },
    {
      label: 'Form Management',
      description: 'Create and manage forms',
      href: '/form-management',
      icon: <FileText size={22} strokeWidth={1.5} />,
      requiredFeature: F.FORM_MANAGEMENT,
    },
  ],
  analytics: [
    {
      label: 'Operational Excellence',
      description: 'Track key performance metrics',
      href: '/operational-excellence',
      icon: <Star size={22} strokeWidth={1.5} />,
      requiredFeature: F.OPERATIONAL_EXCELLENCE,
    },
    {
      label: 'Retention',
      description: 'Analyze team member turnover',
      icon: <TrendingUp size={22} strokeWidth={1.5} />,
      disabled: true,
    },
  ],
  scheduling: [
    {
      label: 'Schedule',
      description: 'View and manage shifts',
      href: '/schedule',
      icon: <CalendarDays size={22} strokeWidth={1.5} />,
      requiredFeature: F.SCHEDULING,
    },
    {
      label: 'Setup',
      description: 'Position templates and settings',
      href: '/schedule?mode=setup',
      icon: <Captions size={22} strokeWidth={1.5} />,
      requiredFeature: F.SETUPS,
    },
    {
      label: 'Approvals',
      description: 'Shift trades, time off, availability',
      href: '/approvals',
      icon: <CircleCheckBig size={22} strokeWidth={1.5} />,
      requiredFeature: F.SCHEDULING,
      requiredPermission: P.SCHED_MANAGE_APPROVALS,
    },
  ],
  hr: [
    {
      label: 'Roster',
      description: 'View and manage team members',
      href: '/roster',
      icon: <Users size={22} strokeWidth={1.5} />,
    },
    {
      label: 'Reporting',
      description: 'HR reports and analytics',
      href: '/reporting',
      icon: <BarChart3 size={22} strokeWidth={1.5} />,
      requiredPermission: P.HR_VIEW_REPORTING,
    },
    {
      label: 'Documents',
      description: 'Organization document hub',
      href: '/documents',
      icon: <Folder size={22} strokeWidth={1.5} />,
      requiredFeature: F.DOCUMENTS,
    },
    {
      label: '360 Overview',
      description: 'Complete employee profiles',
      icon: <Infinity size={22} strokeWidth={1.5} />,
      disabled: true,
    },
    {
      label: 'Org Chart',
      description: 'Visualize team structure',
      href: '/org-chart',
      icon: <Network size={22} strokeWidth={1.5} />,
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
