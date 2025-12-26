/**
 * AdminModeSidebar
 * Sidebar navigation for Admin Mode pages
 */

import * as React from 'react';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import styles from './AdminModeSidebar.module.css';

export interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'active' | 'coming-soon';
}

interface AdminModeSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

const menuItems: AdminMenuItem[] = [
  {
    id: 'user-testing',
    label: 'User Testing',
    icon: <PersonSearchIcon sx={{ fontSize: 18 }} />,
    status: 'active',
  },
  {
    id: 'locations',
    label: 'Locations',
    icon: <LocationOnIcon sx={{ fontSize: 18 }} />,
    status: 'coming-soon',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: <BusinessIcon sx={{ fontSize: 18 }} />,
    status: 'coming-soon',
  },
];

export function AdminModeSidebar({ activeSection, onSectionChange }: AdminModeSidebarProps) {
  return (
    <nav className={styles.sidebar}>
      <h3 className={styles.sectionTitle}>Admin Tools</h3>
      <ul className={styles.menuList}>
        {menuItems.map((item) => (
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
    </nav>
  );
}

export default AdminModeSidebar;
