import * as React from 'react';
import { useRouter } from 'next/router';
import sty from './ManillaTabs.module.css';

// MUI Icons
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TableChartIcon from '@mui/icons-material/TableChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export type TabId = 'smartview' | 'classic' | 'leaderboard';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  href: string;
}

const tabs: Tab[] = [
  {
    id: 'smartview',
    label: 'SmartView',
    icon: <AutoAwesomeIcon sx={{ fontSize: 20 }} />,
    href: '/positional-excellence/smartview',
  },
  {
    id: 'classic',
    label: 'Classic View',
    icon: <TableChartIcon sx={{ fontSize: 20 }} />,
    href: '/positional-excellence/classic',
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    icon: <EmojiEventsIcon sx={{ fontSize: 20 }} />,
    href: '/positional-excellence/leaderboard',
  },
];

export interface ManillaTabsProps {
  activeTab: TabId;
  className?: string;
}

export function ManillaTabs({ activeTab, className }: ManillaTabsProps) {
  const router = useRouter();

  const handleTabClick = (tab: Tab) => {
    if (tab.id !== activeTab) {
      router.push(tab.href);
    }
  };

  return (
    <div className={`${sty.tabsContainer} ${className || ''}`}>
      <div className={sty.tabsRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              className={`${sty.tab} ${isActive ? sty.tabActive : sty.tabInactive}`}
              onClick={() => handleTabClick(tab)}
              type="button"
            >
              <span className={sty.tabIcon}>{tab.icon}</span>
              <span className={sty.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className={sty.tabsConnector} />
    </div>
  );
}

export default ManillaTabs;
