/**
 * EmployeesContext — preloads and caches the team roster for the selected location.
 *
 * Loads employees when locationId changes, persists to AsyncStorage for instant
 * startup, and auto-refreshes every 5 minutes while the app is foregrounded.
 *
 * Usage:
 *   const { employees, loading, refreshEmployees, getEmployee } = useEmployees();
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { useLocation } from "./LocationContext";
import { fetchEmployeesAuth, type EmployeeListItem } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployeesContextValue {
  /** All active employees for the current location */
  employees: EmployeeListItem[];
  /** True during the initial load (not on background refreshes) */
  loading: boolean;
  /** Force a fresh fetch from the API */
  refreshEmployees: () => Promise<void>;
  /** Look up a single employee by ID (O(1) via Map) */
  getEmployee: (id: string) => EmployeeListItem | undefined;
}

const EmployeesContext = createContext<EmployeesContextValue>({
  employees: [],
  loading: false,
  refreshEmployees: async () => {},
  getEmployee: () => undefined,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "employees_cache_";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { selectedLocationId } = useLocation();

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Derive storage key from location
  const storageKey = selectedLocationId
    ? `${STORAGE_KEY_PREFIX}${selectedLocationId}`
    : null;

  // ── Load from AsyncStorage on mount / location change ──
  useEffect(() => {
    if (!storageKey) return;

    AsyncStorage.getItem(storageKey).then((cached) => {
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as EmployeeListItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEmployees(parsed);
          }
        } catch {
          // Ignore parse errors — we'll fetch fresh
        }
      }
    });
  }, [storageKey]);

  // ── Fetch from API ──
  const fetchEmployees = useCallback(
    async (showLoading = false) => {
      if (!session?.access_token || !selectedLocationId) return;
      if (showLoading) setLoading(true);

      try {
        const res = await fetchEmployeesAuth(session.access_token, selectedLocationId);
        setEmployees(res.employees);

        // Persist to AsyncStorage
        if (storageKey) {
          AsyncStorage.setItem(storageKey, JSON.stringify(res.employees)).catch(() => {});
        }
      } catch (err) {
        // On error during background refresh, keep stale data
        if (showLoading) {
          console.warn("[EmployeesContext] Failed to load employees:", err);
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [session?.access_token, selectedLocationId, storageKey]
  );

  // ── Initial fetch when location changes ──
  useEffect(() => {
    fetchEmployees(true);
  }, [fetchEmployees]);

  // ── Auto-refresh timer ──
  useEffect(() => {
    // Clear previous timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!session?.access_token || !selectedLocationId) return;

    refreshTimerRef.current = setInterval(() => {
      // Only refresh if app is in foreground
      if (appStateRef.current === "active") {
        fetchEmployees(false);
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [session?.access_token, selectedLocationId, fetchEmployees]);

  // ── Refresh on app foregrounding ──
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current !== "active" && nextState === "active") {
        // App came to foreground — do a silent refresh
        fetchEmployees(false);
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [fetchEmployees]);

  // ── Lookup map ──
  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeListItem>();
    for (const emp of employees) {
      map.set(emp.id, emp);
    }
    return map;
  }, [employees]);

  const getEmployee = useCallback(
    (id: string) => employeeMap.get(id),
    [employeeMap]
  );

  const refreshEmployees = useCallback(() => fetchEmployees(true), [fetchEmployees]);

  const value = useMemo<EmployeesContextValue>(
    () => ({ employees, loading, refreshEmployees, getEmployee }),
    [employees, loading, refreshEmployees, getEmployee]
  );

  return (
    <EmployeesContext.Provider value={value}>
      {children}
    </EmployeesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEmployees() {
  return useContext(EmployeesContext);
}
