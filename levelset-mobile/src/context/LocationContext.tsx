/**
 * LocationContext
 * Manages location selection for the mobile app.
 * Fetches accessible locations based on user permissions (mirrors web dashboard logic).
 * Provides the selected location's mobile token for API calls.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// =============================================================================
// Types
// =============================================================================

export interface LocationRecord {
  id: string;
  name: string;
  location_number: string;
  org_id: string;
  location_mobile_token?: string | null;
  image_url?: string | null;
}

interface LocationContextType {
  // State
  locations: LocationRecord[];
  selectedLocation: LocationRecord | null;
  isLoading: boolean;
  error: string | null;
  needsLocationSelection: boolean;

  // Derived
  mobileToken: string | null;
  selectedLocationId: string | null;
  selectedLocationName: string | null;
  hasMultipleLocations: boolean;

  // Actions
  selectLocation: (locationId: string) => void;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const SELECTED_LOCATION_KEY = "levelset_selected_location";

// =============================================================================
// Provider
// =============================================================================

interface LocationProviderProps {
  children: React.ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { isAuthenticated, appUser } = useAuth();

  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch accessible locations (mirrors web dashboard LocationContext logic)
  const fetchLocations = useCallback(async () => {
    if (!isAuthenticated || !appUser) {
      setLocations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let fetchedLocations: LocationRecord[] = [];

      // If user has a specific location_id assigned, fetch just that one
      if (appUser.location_id) {
        const { data, error: locError } = await supabase
          .from("locations")
          .select("id, name, location_number, org_id, location_mobile_token, image_url")
          .eq("id", appUser.location_id)
          .maybeSingle();

        if (locError) throw locError;
        if (data) fetchedLocations = [data];
      } else if (appUser.id) {
        // Check user_location_access for multi-location users
        const { data: accessRecords, error: accessError } = await supabase
          .from("user_location_access")
          .select("location_id")
          .eq("user_id", appUser.id);

        if (!accessError && accessRecords && accessRecords.length > 0) {
          const accessibleIds = accessRecords.map((r) => r.location_id);
          const { data, error: locError } = await supabase
            .from("locations")
            .select("id, name, location_number, org_id, location_mobile_token, image_url")
            .in("id", accessibleIds)
            .order("location_number", { ascending: true });

          if (locError) throw locError;
          fetchedLocations = data ?? [];
        }
      }

      // Fallback: if no locations found yet, fetch all accessible locations.
      // For users with org_id, scoped to their org. For admins (no org_id), all locations.
      // Mirrors dashboard LocationContext behavior.
      if (fetchedLocations.length === 0) {
        const fallbackQuery = supabase
          .from("locations")
          .select("id, name, location_number, org_id, location_mobile_token, image_url")
          .order("location_number", { ascending: true });

        if (appUser.org_id) {
          fallbackQuery.eq("org_id", appUser.org_id);
        }

        const { data, error: locError } = await fallbackQuery;
        if (locError) throw locError;
        fetchedLocations = data ?? [];
      }

      setLocations(fetchedLocations);

      // Restore persisted selection
      const storedId = await AsyncStorage.getItem(SELECTED_LOCATION_KEY);
      if (storedId && fetchedLocations.some((l) => l.id === storedId)) {
        setSelectedLocationId(storedId);
      } else if (fetchedLocations.length === 1) {
        // Auto-select if only one location
        setSelectedLocationId(fetchedLocations[0].id);
        await AsyncStorage.setItem(SELECTED_LOCATION_KEY, fetchedLocations[0].id);
      } else {
        setSelectedLocationId(null);
      }
    } catch (err) {
      console.error("[Location] Error fetching locations:", err);
      setError(err instanceof Error ? err.message : "Failed to load locations");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, appUser]);

  // Load locations when auth state changes
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Clear on sign out
  useEffect(() => {
    if (!isAuthenticated) {
      setLocations([]);
      setSelectedLocationId(null);
      AsyncStorage.removeItem(SELECTED_LOCATION_KEY);
    }
  }, [isAuthenticated]);

  // Select a location
  const selectLocation = useCallback(
    (locationId: string) => {
      const match = locations.find((l) => l.id === locationId);
      if (!match) {
        console.warn("[Location] Attempted to select unknown location:", locationId);
        return;
      }
      setSelectedLocationId(match.id);
      AsyncStorage.setItem(SELECTED_LOCATION_KEY, match.id);
    },
    [locations]
  );

  // Derived values
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === selectedLocationId) ?? null,
    [locations, selectedLocationId]
  );

  const value = useMemo<LocationContextType>(
    () => ({
      locations,
      selectedLocation,
      isLoading,
      error,
      needsLocationSelection: !isLoading && locations.length > 1 && !selectedLocationId,
      mobileToken: selectedLocation?.location_mobile_token ?? null,
      selectedLocationId,
      selectedLocationName: selectedLocation?.name ?? null,
      hasMultipleLocations: locations.length > 1,
      selectLocation,
      refreshLocations: fetchLocations,
    }),
    [
      locations,
      selectedLocation,
      isLoading,
      error,
      selectedLocationId,
      selectLocation,
      fetchLocations,
    ]
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

export default LocationContext;
