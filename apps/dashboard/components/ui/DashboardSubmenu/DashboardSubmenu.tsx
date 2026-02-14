import * as React from 'react';
import Link from 'next/link';
import sty from './DashboardSubmenu.module.css';
import projectcss from '@/styles/base.module.css';
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

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  disabled?: boolean;
  requiredPermission?: PermissionKey;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: 'Operations',
    items: [
      {
        label: 'Positional Excellence',
        href: '/positional-excellence',
        icon: <RocketLaunchOutlinedIcon sx={{ fontSize: 18 }} />,
      },
      {
        label: 'Discipline',
        href: '/discipline',
        icon: <GavelOutlinedIcon sx={{ fontSize: 18 }} />,
      },
      {
        label: 'Pathway',
        icon: <SchoolOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
      {
        label: 'Evaluations',
        icon: <EventNoteOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
      {
        label: 'Form Management',
        icon: <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'WHED',
        icon: <StarOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
      {
        label: 'Retention',
        icon: <TrendingUpOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
    ],
  },
  {
    title: 'HR',
    items: [
      {
        label: 'Roster',
        href: '/roster',
        icon: <GroupOutlinedIcon sx={{ fontSize: 18 }} />,
      },
      {
        label: 'Reporting',
        href: '/reporting',
        icon: <AssessmentOutlinedIcon sx={{ fontSize: 18 }} />,
        requiredPermission: P.HR_VIEW_REPORTING,
      },
      {
        label: '360 Overview',
        icon: <AllInclusiveOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
      {
        label: 'Org Chart',
        icon: <AccountTreeOutlinedIcon sx={{ fontSize: 18 }} />,
        disabled: true,
      },
    ],
  },
];

export interface DashboardSubmenuProps {
  className?: string;
}

export function DashboardSubmenu({ className }: DashboardSubmenuProps) {
  const { has } = usePermissions();
  
  // Filter items based on required permissions
  const filteredMenuGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (!item.requiredPermission) return true;
      return has(item.requiredPermission);
    }),
  })).filter(group => group.items.length > 0); // Remove empty groups
  
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
      <div className={sty.submenuContent}>
        {filteredMenuGroups.map((group) => (
          <div key={group.title} className={sty.menuGroup}>
            <div className={sty.groupTitle}>{group.title}</div>
            <div className={sty.groupItems}>
              {group.items.map((item) => (
                item.disabled ? (
                  <div key={item.label} className={classNames(sty.menuItem, sty.menuItemDisabled)}>
                    <span className={sty.menuItemIcon}>{item.icon}</span>
                    <span className={sty.menuItemLabel}>{item.label}</span>
                  </div>
                ) : (
                  <Link key={item.label} href={item.href!} className={sty.menuItem}>
                    <span className={sty.menuItemIcon}>{item.icon}</span>
                    <span className={sty.menuItemLabel}>{item.label}</span>
                  </Link>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardSubmenu;
