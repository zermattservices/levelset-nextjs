import React from 'react';
import { createSupabaseClient } from '@/util/supabase/component';

interface LocationRecord {
  id: string;
  location_number: string | null;
  name?: string | null;
  org_id?: string | null;
  location_mobile_token?: string | null;
}

interface LocationContextValue {
  locations: LocationRecord[];
  selectedLocationId: string | null;
  selectedLocationNumber: string | null;
  selectedLocationOrgId: string | null;
  selectedLocationMobileToken: string | null;
  userHierarchyLevel: number | null;
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
    return { userId: null, userRole: null, locations: [] as LocationRecord[] };
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
      .select('id, location_number, name, org_id, location_mobile_token')
      .eq('id', appUser.location_id)
      .maybeSingle();

    if (locationError) {
      throw locationError;
    }

    return {
      userId: user.id,
      userRole: appUser?.role ?? null,
      locations: location ? [location] : [],
    };
  }

  const query = supabase
    .from('locations')
    .select('id, location_number, name, org_id, location_mobile_token')
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
    userRole: appUser?.role ?? null,
    locations: locations ?? [],
  };
}

export function LocationProvider({ children }: { children?: React.ReactNode }) {
  const [locations, setLocations] = React.useState<LocationRecord[]>([]);
  const [selectedLocationId, setSelectedLocationId] = React.useState<string | null>(null);
  const [selectedLocationNumber, setSelectedLocationNumber] = React.useState<string | null>(null);
  const [selectedLocationOrgId, setSelectedLocationOrgId] = React.useState<string | null>(null);
  const [selectedLocationMobileToken, setSelectedLocationMobileToken] = React.useState<string | null>(null);
  const [userHierarchyLevel, setUserHierarchyLevel] = React.useState<number | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const userIdRef = React.useRef<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
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
        setSelectedLocationOrgId(null);
        setSelectedLocationMobileToken(null);
        return;
      }

      if (storedId) {
        const match = available.find((loc) => loc.id === storedId);
        if (match) {
          setSelectedLocationId(match.id);
          setSelectedLocationNumber(match.location_number ?? null);
          setSelectedLocationOrgId(match.org_id ?? null);
          setSelectedLocationMobileToken(match.location_mobile_token ?? null);
          return;
        }
      }

      // If no stored selection or stored selection is invalid, leave null so modal can prompt
      setSelectedLocationId(null);
      setSelectedLocationNumber(null);
      setSelectedLocationOrgId(null);
      setSelectedLocationMobileToken(null);
    },
    []
  );

  const loadLocations = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { userId: fetchedUserId, userRole: fetchedUserRole, locations: fetchedLocations } = await fetchAccessibleLocations(supabase);

      if (!isMountedRef.current) {
        return;
      }

      setUserId(fetchedUserId);
      setUserRole(fetchedUserRole);
      userIdRef.current = fetchedUserId;
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
  }, [ensureSelectionConsistent, supabase]);

  // Fetch user hierarchy level when location or role changes
  React.useEffect(() => {
    async function fetchHierarchyLevel() {
      // Levelset Admin and Owner/Operator always have access (level 0)
      if (userRole === 'Levelset Admin' || userRole === 'Owner/Operator') {
        setUserHierarchyLevel(0);
        return;
      }

      if (!selectedLocationId || !userRole) {
        setUserHierarchyLevel(null);
        return;
      }

      try {
        const { data: hierarchyData, error: hierarchyError } = await supabase
          .from('location_role_hierarchy')
          .select('hierarchy_level')
          .eq('location_id', selectedLocationId)
          .eq('role_name', userRole)
          .maybeSingle();

        if (hierarchyError) {
          console.error('[LocationProvider] Failed to fetch hierarchy level', hierarchyError);
          setUserHierarchyLevel(null);
          return;
        }

        setUserHierarchyLevel(hierarchyData?.hierarchy_level ?? null);
      } catch (err) {
        console.error('[LocationProvider] Error fetching hierarchy level', err);
        setUserHierarchyLevel(null);
      }
    }

    fetchHierarchyLevel();
  }, [selectedLocationId, userRole, supabase]);

  React.useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        const key = buildStorageKey(userIdRef.current);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(key);
        }
        setSelectedLocationId(null);
        setSelectedLocationNumber(null);
        setSelectedLocationMobileToken(null);
      }
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
      setSelectedLocationOrgId(match.org_id ?? null);
      setSelectedLocationMobileToken(match.location_mobile_token ?? null);

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
    setSelectedLocationOrgId(null);
    setSelectedLocationMobileToken(null);
    setUserHierarchyLevel(null);

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
      selectedLocationOrgId,
      selectedLocationMobileToken,
      userHierarchyLevel,
      loading,
      error,
      selectLocation,
      clearSelection,
    }),
    [clearSelection, error, loading, locations, selectLocation, selectedLocationId, selectedLocationNumber, selectedLocationOrgId, selectedLocationMobileToken, userHierarchyLevel]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
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


