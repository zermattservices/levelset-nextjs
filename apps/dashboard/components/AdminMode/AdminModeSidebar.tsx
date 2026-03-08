/**
 * AdminModeSidebar
 * Sidebar navigation for Admin Mode pages with grouped menu structure
 */

import * as React from 'react';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import styles from './AdminModeSidebar.module.css';

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'active' | 'coming-soon';
}

export interface MenuGroup {
  title: string;
  items: AdminMenuItem[];
}

interface AdminModeSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

const menuGroups: MenuGroup[] = [
  {
    title: 'Admin Tools',
    items: [
      {
        id: 'user-testing',
        label: 'User Testing',
        icon: <PersonSearchIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
      {
        id: 'feature-requests',
        label: 'Feature Requests',
        icon: <LightbulbOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
      {
        id: 'task-board',
        label: 'Task Board',
        icon: <ViewKanbanOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
    ],
  },
  {
    title: 'Marketing',
    items: [
      {
        id: 'leads',
        label: 'Leads',
        icon: <PeopleOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
      {
        id: 'pipeline',
        label: 'Pipeline',
        icon: <TimelineOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
      {
        id: 'email-templates',
        label: 'Email Templates',
        icon: <EmailOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
      {
        id: 'email-sequences',
        label: 'Email Sequences',
        icon: <AutoFixHighOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
      {
        id: 'visitor-analytics',
        label: 'Visitor Analytics',
        icon: <BarChartOutlinedIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
    ],
  },
  {
    title: 'Client Management',
    items: [
      {
        id: 'organizations',
        label: 'Organizations',
        icon: <BusinessIcon sx={{ fontSize: 18 }} />,
        status: 'active',
      },
    ],
  },
];

export function AdminModeSidebar({ activeSection, onSectionChange }: AdminModeSidebarProps) {
  return (
    <nav className={styles.sidebar}>
      {menuGroups.map((group, groupIndex) => (
        <div key={group.title} className={styles.menuGroup}>
          <h3 className={styles.sectionTitle}>{group.title}</h3>
          <ul className={styles.menuList}>
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  className={`${styles.menuItem} ${activeSection === item.id ? styles.menuItemActive : ''}`}
                  onClick={() => item.status === 'active' && onSectionChange(item.id)}
                  disabled={item.status === 'coming-soon'}
                  style={item.status === 'coming-soon' ? { cursor: 'not-allowed', opacity: 0.7 } : undefined}
                >
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.menuItemLabel}>{item.label}</span>
                  {item.status === 'coming-soon' && (
                    <span className={styles.comingSoonBadge}>Soon</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {groupIndex < menuGroups.length - 1 && <div className={styles.groupDivider} />}
        </div>
      ))}
    </nav>
  );
}

export default AdminModeSidebar;
