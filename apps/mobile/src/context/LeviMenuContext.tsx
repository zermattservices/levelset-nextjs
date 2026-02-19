/**
 * LeviMenuContext
 * Manages the sliding drawer menu state for the Levi tab
 */

import React, { createContext, useContext, useState, useCallback } from "react";

export type LeviMenuTab = "chat" | "tasks" | "meetings" | "alerts";

export interface LeviMenuTabConfig {
  id: LeviMenuTab;
  label: string;
  icon: string;
}

export const LEVI_MENU_TABS: LeviMenuTabConfig[] = [
  { id: "chat", label: "Chat", icon: "bubble.left.and.bubble.right" },
  { id: "tasks", label: "Tasks", icon: "checklist" },
  { id: "meetings", label: "Meetings", icon: "person.2" },
  { id: "alerts", label: "Alerts", icon: "bell" },
];

interface LeviMenuContextType {
  isMenuOpen: boolean;
  activeTab: LeviMenuTab;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  setActiveTab: (tab: LeviMenuTab) => void;
  menuTabs: LeviMenuTabConfig[];
  settingsModalVisible: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const LeviMenuContext = createContext<LeviMenuContextType | undefined>(
  undefined
);

interface LeviMenuProviderProps {
  children: React.ReactNode;
}

export function LeviMenuProvider({ children }: LeviMenuProviderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<LeviMenuTab>("chat");
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const openMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const setActiveTab = useCallback((tab: LeviMenuTab) => {
    setActiveTabState(tab);
    setIsMenuOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsModalVisible(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsModalVisible(false);
  }, []);

  return (
    <LeviMenuContext.Provider
      value={{
        isMenuOpen,
        activeTab,
        openMenu,
        closeMenu,
        toggleMenu,
        setActiveTab,
        menuTabs: LEVI_MENU_TABS,
        settingsModalVisible,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </LeviMenuContext.Provider>
  );
}

export function useLeviMenu() {
  const context = useContext(LeviMenuContext);
  if (context === undefined) {
    throw new Error("useLeviMenu must be used within a LeviMenuProvider");
  }
  return context;
}

export default LeviMenuContext;
