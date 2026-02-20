/**
 * ScheduleContext
 * Manages schedule/shift data for the Schedule tab.
 * Fetches the authenticated user's assigned shifts from the backend.
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useLocation } from "./LocationContext";
import {
  fetchMyScheduleAuth,
  ApiError,
  type ScheduleShift,
  type WeekSchedule,
} from "../lib/api";

// Re-export for consumers
export type { ScheduleShift, WeekSchedule };

interface ScheduleContextType {
  thisWeek: WeekSchedule | null;
  nextWeek: WeekSchedule | null;
  isLoading: boolean;
  error: string | null;
  refreshSchedule: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(
  undefined
);

interface ScheduleProviderProps {
  children: React.ReactNode;
}

export function ScheduleProvider({ children }: ScheduleProviderProps) {
  const { session, appUser, getAppUserForOrg } = useAuth();
  const { selectedLocationId, selectedLocation } = useLocation();

  const [thisWeek, setThisWeek] = useState<WeekSchedule | null>(null);
  const [nextWeek, setNextWeek] = useState<WeekSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the correct employee_id for the selected location's org.
  // Multi-org users may have different app_user records (and employee_ids)
  // per org. The primary appUser from AuthContext may not match the
  // currently selected location's org.
  const [resolvedEmployeeId, setResolvedEmployeeId] = useState<string>("");

  useEffect(() => {
    const orgId = selectedLocation?.org_id;
    if (!orgId || !session) {
      setResolvedEmployeeId("");
      return;
    }

    // If primary appUser matches this org, use it directly
    if (appUser?.org_id === orgId) {
      setResolvedEmployeeId(appUser.employee_id || "");
      return;
    }

    // Otherwise, look up the app_user for this org
    getAppUserForOrg(orgId).then((orgAppUser) => {
      setResolvedEmployeeId(orgAppUser?.employee_id || "");
    });
  }, [selectedLocation?.org_id, appUser, session, getAppUserForOrg]);

  const accessToken = session?.access_token ?? "";
  const locationId = selectedLocationId ?? "";

  const refreshSchedule = useCallback(async () => {
    if (!accessToken || !locationId || !resolvedEmployeeId) {
      setThisWeek(null);
      setNextWeek(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMyScheduleAuth(accessToken, locationId, resolvedEmployeeId);
      setThisWeek(data.thisWeek);
      setNextWeek(data.nextWeek);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load schedule";
      setError(message);
      setThisWeek(null);
      setNextWeek(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, locationId, resolvedEmployeeId]);

  // Fetch on mount and when location/auth changes
  useEffect(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  return (
    <ScheduleContext.Provider
      value={{
        thisWeek,
        nextWeek,
        isLoading,
        error,
        refreshSchedule,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = React.useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
}

export default ScheduleContext;
