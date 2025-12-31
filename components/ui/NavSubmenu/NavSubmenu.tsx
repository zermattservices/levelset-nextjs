import * as React from 'react';
import Link from 'next/link';
import Tooltip from '@mui/material/Tooltip';
import sty from './NavSubmenu.module.css';

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

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface NavMenuItem {
  label: string;
  description: string;
  href?: string;
  icon: React.ReactNode;
  disabled?: boolean;
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
  const items = menuItems[menuType];
  const isTwoColumn = menuType === 'operations';

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
          const cardContent = (
            <>
              <div className={sty.iconContainer}>
                {item.icon}
              </div>
              <div className={sty.textContainer}>
                <span className={sty.itemLabel}>{item.label}</span>
                <span className={sty.itemDescription}>{item.description}</span>
              </div>
            </>
          );

          if (item.disabled) {
            return (
              <Tooltip 
                key={item.label} 
                title="Coming Soon" 
                placement="top"
                arrow
                slotProps={{
                  tooltip: {
                    sx: {
                      fontFamily: '"Satoshi", sans-serif',
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: '#1f2937',
                      '& .MuiTooltip-arrow': {
                        color: '#1f2937',
                      },
                    },
                  },
                }}
              >
                <div className={classNames(sty.menuCard, sty.menuCardDisabled)}>
                  {cardContent}
                </div>
              </Tooltip>
            );
          }

          return (
            <Link key={item.label} href={item.href!} className={sty.menuCard}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default NavSubmenu;
