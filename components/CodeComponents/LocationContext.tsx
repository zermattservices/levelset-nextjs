import React from 'react';
import { DataProvider } from '@plasmicapp/react-web/lib/host';
import { usePlasmicCanvasContext } from '@plasmicapp/loader-nextjs';
import { createSupabaseClient } from '@/util/supabase/component';

interface LocationRecord {
  id: string;
  location_number: string | null;
  name?: string | null;
  org_id?: string | null;
}

interface LocationContextValue {
  locations: LocationRecord[];
  selectedLocationId: string | null;
  selectedLocationNumber: string | null;
  loading: boolean;
  error: string | null;
  selectLocation: (locationId: string) => void;
  clearSelection: () => void;
}

const LocationContext = React.createContext<LocationContextValue | undefined>(undefined);

const STORAGE_PREFIX = 'levelset.selectedLocation';

function buildStorageKey(userId: string | null | undefined) {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

async function fetchAccessibleLocations(supabase: ReturnType<typeof createSupabaseClient>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    return { userId: null, locations: [] as LocationRecord[] };
  }

  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('id, org_id, location_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (appUserError) {
    throw appUserError;
  }

  // If a specific location is assigned, fetch just that one
  if (appUser?.location_id) {
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, location_number, name, org_id')
      .eq('id', appUser.location_id)
      .maybeSingle();

    if (locationError) {
      throw locationError;
    }

    return {
      userId: user.id,
      locations: location ? [location] : [],
    };
  }

  const query = supabase
    .from('locations')
    .select('id, location_number, name, org_id')
    .order('location_number', { ascending: true });

  if (appUser?.org_id) {
    query.eq('org_id', appUser.org_id);
  }

  const { data: locations, error: locationsError } = await query;

  if (locationsError) {
    throw locationsError;
  }

  return {
    userId: user.id,
    locations: locations ?? [],
  };
}

export function LocationProvider({ children }: { children?: React.ReactNode }) {
  const [locations, setLocations] = React.useState<LocationRecord[]>([]);
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(null);
  const [selectedLocationNumber, setSelectedLocationNumber] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const inEditor = usePlasmicCanvasContext();
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const ensureSelectionConsistent = React.useCallback(
    (available: LocationRecord[], storedId: string | null) => {
      if (!available.length) {
        setSelectedLocationId(null);
        setSelectedLocationNumber(null);
        return;
      }

      if (storedId) {
        const match = available.find((loc) => loc.id === storedId);
        if (match) {
          setSelectedLocationId(match.id);
          setSelectedLocationNumber(match.location_number ?? null);
          return;
        }
      }

      // If no stored selection or stored selection is invalid, leave null so modal can prompt
      setSelectedLocationId(null);
      setSelectedLocationNumber(null);
    },
    []
  );

  const loadLocations = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (inEditor) {
        const sampleLocations: LocationRecord[] = [
          { id: 'sample-1', location_number: '1001', name: 'Sample Location 1' },
          { id: 'sample-2', location_number: '1002', name: 'Sample Location 2' },
        ];
        if (!isMountedRef.current) {
          return;
        }
        setLocations(sampleLocations);
        setUserId('plasmic-editor');
        setSelectedLocationId(sampleLocations[0].id);
        setSelectedLocationNumber(sampleLocations[0].location_number ?? null);
        setLoading(false);
        return;
      }

      const { userId: fetchedUserId, locations: fetchedLocations } = await fetchAccessibleLocations(supabase);

      if (!isMountedRef.current) {
        return;
      }

      setUserId(fetchedUserId);
      setLocations(fetchedLocations);

      const storageKey = buildStorageKey(fetchedUserId);
      const storedId = typeof window !== 'undefined'
        ? sessionStorage.getItem(storageKey)
        : null;

      ensureSelectionConsistent(fetchedLocations, storedId);

      setLoading(false);
    } catch (loadError: any) {
      console.error('[LocationProvider] Failed to load locations', loadError);
      if (!isMountedRef.current) {
        return;
      }
      setError(loadError?.message ?? 'Failed to load locations');
      setLoading(false);
    }
  }, [ensureSelectionConsistent, inEditor, supabase]);

  React.useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      loadLocations();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadLocations, supabase]);

  const selectLocation = React.useCallback(
    (locationId: string) => {
      const match = locations.find((loc) => loc.id === locationId);

      if (!match) {
        console.warn('[LocationProvider] Attempted to select unknown location', locationId);
        return;
      }

      setSelectedLocationId(match.id);
      setSelectedLocationNumber(match.location_number ?? null);

      if (typeof window !== 'undefined') {
        const key = buildStorageKey(userId);
        sessionStorage.setItem(key, match.id);
      }
    },
    [locations, userId]
  );

  const clearSelection = React.useCallback(() => {
    setSelectedLocationId(null);
    setSelectedLocationNumber(null);

    if (typeof window !== 'undefined') {
      const key = buildStorageKey(userId);
      sessionStorage.removeItem(key);
    }
  }, [userId]);

  const value = React.useMemo<LocationContextValue>(
    () => ({
      locations,
      selectedLocationId,
      selectedLocationNumber,
      loading,
      error,
      selectLocation,
      clearSelection,
    }),
    [clearSelection, error, loading, locations, selectLocation, selectedLocationId, selectedLocationNumber]
  );

  const plasmicData = React.useMemo(() => ({
    locations,
    selectedLocationId,
    selectedLocationNumber,
    loading,
    error,
  }), [error, loading, locations, selectedLocationId, selectedLocationNumber]);

  return (
    <LocationContext.Provider value={value}>
      <DataProvider name="locationContext" data={plasmicData}>
        {children}
      </DataProvider>
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = React.useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}


