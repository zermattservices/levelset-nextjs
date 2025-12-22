import { createServerSupabaseClient } from './supabase-server';

export interface RatingThresholds {
  yellow_threshold: number;
  green_threshold: number;
}

// Cache for thresholds to avoid repeated database calls
const thresholdsCache = new Map<string, { thresholds: RatingThresholds; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const DEFAULT_THRESHOLDS: RatingThresholds = {
  yellow_threshold: 1.75,
  green_threshold: 2.75,
};

/**
 * Get rating thresholds for a location
 * Checks in order: location-specific -> org-level -> defaults
 * Uses caching to avoid repeated database calls
 */
export async function getRatingThresholds(
  locationId: string
): Promise<RatingThresholds> {
  if (!locationId) {
    return DEFAULT_THRESHOLDS;
  }

  // Check cache first
  const cached = thresholdsCache.get(locationId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.thresholds;
  }

  try {
    const supabase = createServerSupabaseClient();
    
    // First, try to get location-specific thresholds
    const { data: locationData, error: locationError } = await supabase
      .from('rating_thresholds')
      .select('yellow_threshold, green_threshold')
      .eq('location_id', locationId)
      .maybeSingle();

    if (!locationError && locationData) {
      const thresholds: RatingThresholds = {
        yellow_threshold: Number(locationData.yellow_threshold) || DEFAULT_THRESHOLDS.yellow_threshold,
        green_threshold: Number(locationData.green_threshold) || DEFAULT_THRESHOLDS.green_threshold,
      };

      // Update cache
      thresholdsCache.set(locationId, {
        thresholds,
        timestamp: Date.now(),
      });

      return thresholds;
    }

    // If no location-specific thresholds, get the org_id for this location
    const { data: locationInfo, error: locationInfoError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', locationId)
      .single();

    if (locationInfoError || !locationInfo?.org_id) {
      return DEFAULT_THRESHOLDS;
    }

    // Try to get org-level thresholds (where location_id IS NULL)
    const { data: orgData, error: orgError } = await supabase
      .from('rating_thresholds')
      .select('yellow_threshold, green_threshold')
      .eq('org_id', locationInfo.org_id)
      .is('location_id', null)
      .maybeSingle();

    if (!orgError && orgData) {
      const thresholds: RatingThresholds = {
        yellow_threshold: Number(orgData.yellow_threshold) || DEFAULT_THRESHOLDS.yellow_threshold,
        green_threshold: Number(orgData.green_threshold) || DEFAULT_THRESHOLDS.green_threshold,
      };

      // Update cache
      thresholdsCache.set(locationId, {
        thresholds,
        timestamp: Date.now(),
      });

      return thresholds;
    }

    // If neither found, return defaults
    return DEFAULT_THRESHOLDS;
  } catch (err) {
    console.error('[rating-thresholds] Error fetching thresholds:', err);
    return DEFAULT_THRESHOLDS;
  }
}

/**
 * Determine rating color based on thresholds
 * Returns 'green', 'yellow', 'red', or 'none'
 */
export function getRatingColor(
  rating: number | null | undefined,
  thresholds: RatingThresholds
): 'green' | 'yellow' | 'red' | 'none' {
  if (rating === null || rating === undefined) {
    return 'none';
  }

  if (rating >= thresholds.green_threshold) {
    return 'green';
  }
  if (rating >= thresholds.yellow_threshold) {
    return 'yellow';
  }
  if (rating >= 1.0) {
    return 'red';
  }
  return 'none';
}

/**
 * Clear the thresholds cache (useful for testing or after updates)
 */
export function clearThresholdsCache(locationId?: string): void {
  if (locationId) {
    thresholdsCache.delete(locationId);
  } else {
    thresholdsCache.clear();
  }
}

