import * as React from 'react';
import Link from 'next/link';
import sty from './DashboardSubmenu.module.css';
import projectcss from '@/styles/base.module.css';
import { usePermissions, P, type PermissionKey } from '@/lib/providers/PermissionsProvider';

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
} from 'lucide-react';

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
        icon: <Rocket size={18} strokeWidth={1.5} />,
      },
      {
        label: 'Discipline',
        href: '/discipline',
        icon: <Gavel size={18} strokeWidth={1.5} />,
      },
      {
        label: 'Pathway',
        icon: <GraduationCap size={18} strokeWidth={1.5} />,
        disabled: true,
      },
      {
        label: 'Evaluations',
        icon: <CalendarCheck size={18} strokeWidth={1.5} />,
        disabled: true,
      },
      {
        label: 'Form Management',
        icon: <FileText size={18} strokeWidth={1.5} />,
        disabled: true,
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        label: 'WHED',
        icon: <Star size={18} strokeWidth={1.5} />,
        disabled: true,
      },
      {
        label: 'Retention',
        icon: <TrendingUp size={18} strokeWidth={1.5} />,
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
        icon: <Users size={18} strokeWidth={1.5} />,
      },
      {
        label: 'Reporting',
        href: '/reporting',
        icon: <BarChart3 size={18} strokeWidth={1.5} />,
        requiredPermission: P.HR_VIEW_REPORTING,
      },
      {
        label: '360 Overview',
        icon: <Infinity size={18} strokeWidth={1.5} />,
        disabled: true,
      },
      {
        label: 'Org Chart',
        icon: <Network size={18} strokeWidth={1.5} />,
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
