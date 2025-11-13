import * as React from 'react';

export interface MobilePortalContextValue {
  locationId: string;
  locationName: string | null;
  locationNumber: string | null;
  token: string;
}

const MobilePortalContext = React.createContext<MobilePortalContextValue | null>(null);

export function MobilePortalProvider({
  value,
  children,
}: {
  value: MobilePortalContextValue;
  children: React.ReactNode;
}) {
  return <MobilePortalContext.Provider value={value}>{children}</MobilePortalContext.Provider>;
}

export function useMobilePortal() {
  const context = React.useContext(MobilePortalContext);
  if (!context) {
    throw new Error('useMobilePortal must be used within a MobilePortalProvider');
  }
  return context;
}

