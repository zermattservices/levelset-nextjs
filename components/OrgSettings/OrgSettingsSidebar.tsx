import * as React from 'react';
import sty from './OrgSettingsSidebar.module.css';

export interface MenuItemData {
  id: string;
  label: string;
  status: 'active' | 'placeholder' | 'coming-soon';
}

export interface MenuItem {
  group: string;
  items: MenuItemData[];
}

interface OrgSettingsSidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export function OrgSettingsSidebar({ menuItems, activeSection, onSectionChange }: OrgSettingsSidebarProps) {
  return (
    <nav className={sty.sidebar}>
      {menuItems.map((group, groupIndex) => (
        <div key={groupIndex} className={sty.menuGroup}>
          <h3 className={sty.groupTitle}>{group.group}</h3>
          <ul className={sty.menuList}>
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  className={`${sty.menuItem} ${activeSection === item.id ? sty.menuItemActive : ''}`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <span className={sty.menuItemLabel}>{item.label}</span>
                  {item.status === 'coming-soon' && (
                    <span className={sty.comingSoonBadge}>Coming Soon</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default OrgSettingsSidebar;
