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
  const { session, appUser } = useAuth();
  const { selectedLocationId } = useLocation();

  const [thisWeek, setThisWeek] = useState<WeekSchedule | null>(null);
  const [nextWeek, setNextWeek] = useState<WeekSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = session?.access_token ?? "";
  const locationId = selectedLocationId ?? "";
  const employeeId = appUser?.employee_id ?? "";

  const refreshSchedule = useCallback(async () => {
    if (!accessToken || !locationId || !employeeId) {
      setThisWeek(null);
      setNextWeek(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMyScheduleAuth(accessToken, locationId, employeeId);
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
  }, [accessToken, locationId, employeeId]);

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
