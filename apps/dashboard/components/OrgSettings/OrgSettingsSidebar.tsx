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

export interface StandaloneItem {
  id: string;
  label: string;
  status: 'active' | 'placeholder' | 'coming-soon';
}

interface OrgSettingsSidebarProps {
  menuItems: MenuItem[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  standaloneItems?: StandaloneItem[];
}

// Chevron SVG component
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg 
      className={`${sty.chevron} ${expanded ? sty.chevronExpanded : ''}`}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

export function OrgSettingsSidebar({ menuItems, activeSection, onSectionChange, standaloneItems = [] }: OrgSettingsSidebarProps) {
  // Track which groups are expanded - first group is expanded by default
  const [expandedGroups, setExpandedGroups] = React.useState<Set<number>>(() => new Set([0]));

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <nav className={sty.sidebar}>
      {menuItems.map((group, groupIndex) => {
        const isExpanded = expandedGroups.has(groupIndex);
        return (
          <div key={groupIndex} className={sty.menuGroup}>
            <div 
              className={sty.groupHeader}
              onClick={() => toggleGroup(groupIndex)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleGroup(groupIndex);
                }
              }}
            >
              <h3 className={sty.groupTitle}>{group.group}</h3>
              <ChevronIcon expanded={isExpanded} />
            </div>
            <div className={`${sty.menuListWrapper} ${isExpanded ? sty.menuListExpanded : sty.menuListCollapsed}`}>
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
          </div>
        );
      })}
      
      {/* Standalone items with divider */}
      {standaloneItems.length > 0 && (
        <>
          <div className={sty.divider} />
          <div className={sty.standaloneSection}>
            <ul className={sty.menuList}>
              {standaloneItems.map((item) => (
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
        </>
      )}
    </nav>
  );
}

export default OrgSettingsSidebar;
