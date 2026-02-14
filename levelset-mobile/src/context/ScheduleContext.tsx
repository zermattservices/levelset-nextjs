/**
 * ScheduleContext
 * Manages schedule/shift data for the Schedule tab
 * Currently using mock data - will be connected to backend in future
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  area?: string;
  role?: string;
  hours: number;
  status?: "scheduled" | "completed" | "cancelled";
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

interface ScheduleContextType {
  shifts: Shift[];
  staff: StaffMember[];
  isLoading: boolean;
  error: string | null;
  refreshSchedule: () => Promise<void>;
  lastUpdated: Date | null;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(
  undefined
);

// Mock data for UI development
// Schedule is not connected to backend yet (no Deputy integration)
const MOCK_SHIFTS: Shift[] = [];

const MOCK_STAFF: StaffMember[] = [];

interface ScheduleProviderProps {
  children: React.ReactNode;
}

export function ScheduleProvider({ children }: ScheduleProviderProps) {
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
  const [staff, setStaff] = useState<StaffMember[]>(MOCK_STAFF);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshSchedule = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Connect to Deputy or other scheduling API
      // For now, just simulate a refresh with mock data
      await new Promise((resolve) => setTimeout(resolve, 500));

      setShifts(MOCK_SHIFTS);
      setStaff(MOCK_STAFF);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load schedule"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshSchedule();
  }, [refreshSchedule]);

  return (
    <ScheduleContext.Provider
      value={{
        shifts,
        staff,
        isLoading,
        error,
        refreshSchedule,
        lastUpdated,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
}

export default ScheduleContext;
