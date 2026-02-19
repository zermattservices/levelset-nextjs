/**
 * SlidingMenuContext
 * Manages the sliding drawer menu state for the Schedule tab
 */

import React, { createContext, useContext, useState, useCallback } from "react";

// Menu tabs available in the Schedule section
// Note: "timesheets" removed from scope
export type MenuTab =
  | "my-schedule"
  | "staff"
  | "scheduling"
  | "time-off"
  | "settings";

export interface MenuTabConfig {
  id: MenuTab;
  label: string;
  icon: string;
}

export const MENU_TABS: MenuTabConfig[] = [
  { id: "my-schedule", label: "My Schedule", icon: "calendar" },
  { id: "staff", label: "Staff", icon: "person.2" },
  { id: "scheduling", label: "Scheduling", icon: "calendar.badge.clock" },
  { id: "time-off", label: "Time Off", icon: "airplane" },
  { id: "settings", label: "Settings", icon: "gear" },
];

interface SlidingMenuContextType {
  isMenuOpen: boolean;
  activeTab: MenuTab;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setActiveTab: (tab: MenuTab) => void;
  menuTabs: MenuTabConfig[];
}

const SlidingMenuContext = createContext<SlidingMenuContextType | undefined>(
  undefined
);

interface SlidingMenuProviderProps {
  children: React.ReactNode;
}

export function SlidingMenuProvider({ children }: SlidingMenuProviderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<MenuTab>("my-schedule");

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const setActiveTab = useCallback((tab: MenuTab) => {
    setActiveTabState(tab);
    setIsMenuOpen(false); // Close menu when selecting a tab
  }, []);

  return (
    <SlidingMenuContext.Provider
      value={{
        isMenuOpen,
        activeTab,
        openMenu,
        closeMenu,
        toggleMenu,
        setActiveTab,
        menuTabs: MENU_TABS,
      }}
    >
      {children}
    </SlidingMenuContext.Provider>
  );
}

export function useSlidingMenu() {
  const context = useContext(SlidingMenuContext);
  if (context === undefined) {
    throw new Error(
      "useSlidingMenu must be used within a SlidingMenuProvider"
    );
  }
  return context;
}

export default SlidingMenuContext;
