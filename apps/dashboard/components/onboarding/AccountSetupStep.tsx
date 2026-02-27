import * as React from 'react';
import { TextField, Switch, CircularProgress } from '@mui/material';
import styles from './AccountSetupStep.module.css';

interface GooglePlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  hoursDisplay: string[] | null;
  rating: number | null;
  userRatingCount: number | null;
}

interface LocationForm {
  storeNumber: string;
  locationName: string;
  cfaMatch: { location_name: string; operator_name: string; location_type: string; state: string } | null;
  googlePlaceId: string | null;
  googleData: {
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
  } | null;
  googleHoursDisplay: string[] | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleConfirmed: boolean;
  googleSearchOverride: boolean;
  googleSearchQuery: string;
  googleResults: GooglePlaceResult[];
  searchingCfa: boolean;
  searchingGoogle: boolean;
}

interface AccountSetupStepProps {
  accessToken: string;
  onComplete: () => void;
}

const MUI_INPUT_SX = {
  '& .MuiOutlinedInput-root': {
    fontFamily: '"Satoshi", system-ui, sans-serif',
    fontSize: '14px',
    borderRadius: '8px',
  },
  '& .MuiInputLabel-root': {
    fontFamily: '"Satoshi", system-ui, sans-serif',
    fontSize: '14px',
  },
};

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

function getStaticMapUrl(lat: number, lng: number, width = 600, height = 200): string {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=${width}x${height}&scale=2&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_KEY}`;
}

function createEmptyLocation(): LocationForm {
  return {
    storeNumber: '',
    locationName: '',
    cfaMatch: null,
    googlePlaceId: null,
    googleData: null,
    googleHoursDisplay: null,
    googleRating: null,
    googleReviewCount: null,
    googleConfirmed: false,
    googleSearchOverride: false,
    googleSearchQuery: '',
    googleResults: [],
    searchingCfa: false,
    searchingGoogle: false,
  };
}

export function AccountSetupStep({ accessToken, onComplete }: AccountSetupStepProps) {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [isOperator, setIsOperator] = React.useState(true);
  const [operatorName, setOperatorName] = React.useState('');
  const [isMultiUnit, setIsMultiUnit] = React.useState(false);
  const [locations, setLocations] = React.useState<LocationForm[]>([createEmptyLocation()]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce refs for CFA lookup
  const cfaTimers = React.useRef<Record<number, NodeJS.Timeout>>({});
  // Debounce refs for manual Google search
  const googleTimers = React.useRef<Record<number, NodeJS.Timeout>>({});

  const updateLocation = (index: number, updates: Partial<LocationForm>) => {
    setLocations(prev => prev.map((loc, i) => i === index ? { ...loc, ...updates } : loc));
  };

  const handleStoreNumberChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    updateLocation(index, {
      storeNumber: cleaned,
      cfaMatch: null,
      googlePlaceId: null,
      googleData: null,
      googleHoursDisplay: null,
      googleRating: null,
      googleReviewCount: null,
      googleConfirmed: false,
      googleSearchOverride: false,
      googleResults: [],
    });

    if (cfaTimers.current[index]) clearTimeout(cfaTimers.current[index]);

    if (cleaned.length === 5) {
      cfaTimers.current[index] = setTimeout(() => lookupCfaLocation(index, cleaned), 300);
    }
  };

  const lookupCfaLocation = async (index: number, storeNumber: string) => {
    updateLocation(index, { searchingCfa: true });

    try {
      const res = await fetch(`/api/onboarding/cfa-locations?q=${storeNumber}`);
      const data = await res.json();

      if (data.locations && data.locations.length > 0) {
        const match = data.locations[0];
        updateLocation(index, {
          cfaMatch: match,
          locationName: match.location_name || '',
          searchingCfa: false,
        });

        const googleQuery = `Chick-fil-A ${match.location_name} ${match.state || ''}`.trim();
        updateLocation(index, { googleSearchQuery: googleQuery });
        searchGooglePlaces(index, googleQuery);
      } else {
        updateLocation(index, { cfaMatch: null, searchingCfa: false });
      }
    } catch {
      updateLocation(index, { searchingCfa: false });
    }
  };

  const searchGooglePlaces = async (index: number, query: string) => {
    if (!query || query.length < 3) return;

    updateLocation(index, { searchingGoogle: true });

    try {
      const res = await fetch('/api/onboarding/google-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      const places: GooglePlaceResult[] = data.places || [];

      // Auto-select the top result for the preview
      if (places.length > 0 && !locations[index]?.googleSearchOverride) {
        const top = places[0];
        updateLocation(index, {
          googleResults: places,
          googlePlaceId: top.placeId,
          googleData: {
            address: top.address,
            latitude: top.latitude || undefined,
            longitude: top.longitude || undefined,
            googleMapsUrl: top.googleMapsUrl || undefined,
          },
          googleHoursDisplay: top.hoursDisplay,
          googleRating: top.rating,
          googleReviewCount: top.userRatingCount,
          searchingGoogle: false,
        });
      } else {
        updateLocation(index, {
          googleResults: places,
          searchingGoogle: false,
        });
      }
    } catch {
      updateLocation(index, { searchingGoogle: false });
    }
  };

  const selectGooglePlace = (index: number, place: GooglePlaceResult) => {
    updateLocation(index, {
      googlePlaceId: place.placeId,
      googleData: {
        address: place.address,
        latitude: place.latitude || undefined,
        longitude: place.longitude || undefined,
        googleMapsUrl: place.googleMapsUrl || undefined,
      },
      googleHoursDisplay: place.hoursDisplay,
      googleRating: place.rating,
      googleReviewCount: place.userRatingCount,
      googleSearchOverride: false,
      googleResults: [],
    });
  };

  const confirmGooglePlace = (index: number) => {
    updateLocation(index, { googleConfirmed: true, googleSearchOverride: false });
  };

  const resetGooglePlace = (index: number) => {
    updateLocation(index, {
      googleConfirmed: false,
      googlePlaceId: null,
      googleData: null,
      googleHoursDisplay: null,
      googleRating: null,
      googleReviewCount: null,
      googleSearchOverride: true,
      googleSearchQuery: '',
      googleResults: [],
    });
  };

  const handleOverrideSearch = (index: number, query: string) => {
    updateLocation(index, { googleSearchQuery: query });

    if (googleTimers.current[index]) clearTimeout(googleTimers.current[index]);
    if (query.length >= 3) {
      googleTimers.current[index] = setTimeout(() => {
        searchGooglePlaces(index, query);
      }, 400);
    }
  };

  const addLocation = () => {
    if (locations.length < 3) {
      setLocations(prev => [...prev, createEmptyLocation()]);
    }
  };

  const removeLocation = (index: number) => {
    if (locations.length > 1) {
      setLocations(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name');
      return;
    }

    if (!isOperator && !operatorName.trim()) {
      setError('Please enter the operator\'s name');
      return;
    }

    for (const loc of locations) {
      if (!loc.storeNumber || loc.storeNumber.length !== 5) {
        setError('Each location needs a valid 5-digit store number');
        return;
      }
      if (!loc.locationName.trim()) {
        setError('Each location needs a name');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/onboarding/create-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          isOperator,
          operatorName: isOperator ? undefined : operatorName.trim(),
          isMultiUnit,
          locations: locations.map(loc => ({
            storeNumber: loc.storeNumber,
            locationName: loc.locationName.trim(),
            googlePlaceId: loc.googlePlaceId || undefined,
            googleData: loc.googleData || undefined,
            googleHoursDisplay: loc.googleHoursDisplay || undefined,
            googleRating: loc.googleRating ?? undefined,
            googleReviewCount: loc.googleReviewCount ?? undefined,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create organization');
      }

      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderLocationCard = (loc: LocationForm, index: number) => {
    const hasCoords = loc.googleData?.latitude && loc.googleData?.longitude;

    return (
      <div key={index} className={styles.locationCard}>
        <div className={styles.locationHeader}>
          <span className={styles.locationLabel}>
            {isMultiUnit ? `Location ${index + 1}` : 'Store Details'}
          </span>
          {isMultiUnit && locations.length > 1 && (
            <button
              type="button"
              className={styles.removeLocationBtn}
              onClick={() => removeLocation(index)}
            >
              Remove
            </button>
          )}
        </div>

        {/* Store Number */}
        <div className={styles.fieldGroup}>
          <TextField
            label="Store Number"
            value={loc.storeNumber}
            onChange={e => handleStoreNumberChange(index, e.target.value)}
            size="small"
            fullWidth
            placeholder="e.g. 05294"
            inputProps={{ maxLength: 5, inputMode: 'numeric' }}
            InputProps={{
              endAdornment: loc.searchingCfa ? (
                <CircularProgress size={16} sx={{ color: 'var(--ls-color-muted)' }} />
              ) : null,
            }}
            sx={MUI_INPUT_SX}
          />
        </div>

        {/* Location Name */}
        <div className={styles.fieldGroup}>
          <TextField
            label="Location Name"
            value={loc.locationName}
            onChange={e => updateLocation(index, { locationName: e.target.value })}
            size="small"
            fullWidth
            required
            sx={MUI_INPUT_SX}
          />
        </div>

        {/* Google Maps Section — 3 states */}
        {loc.searchingGoogle && (
          <div className={styles.searchingRow}>
            <CircularProgress size={14} sx={{ color: 'var(--ls-color-muted)' }} />
            <span>Finding on Google Maps...</span>
          </div>
        )}

        {/* State B: Preview — place found but not yet confirmed */}
        {loc.googlePlaceId && loc.googleData && !loc.googleConfirmed && !loc.searchingGoogle && (
          <div className={styles.mapPreviewCard}>
            {hasCoords && (
              <img
                src={getStaticMapUrl(loc.googleData.latitude!, loc.googleData.longitude!)}
                alt="Map preview"
                className={styles.mapImage}
              />
            )}
            <div className={styles.placeInfoSection}>
              <div className={styles.placeName}>
                {loc.googleResults.find(r => r.placeId === loc.googlePlaceId)?.name || 'Chick-fil-A'}
              </div>
              <div className={styles.placeAddress}>{loc.googleData.address}</div>
            </div>

            <div className={styles.previewActions}>
              <button
                type="button"
                className={styles.searchOverrideLink}
                onClick={() => updateLocation(index, { googleSearchOverride: true, googleResults: [] })}
              >
                Search for a different location
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => confirmGooglePlace(index)}
              >
                Confirm Location
              </button>
            </div>
          </div>
        )}

        {/* Search override input */}
        {loc.googleSearchOverride && !loc.googleConfirmed && (
          <div className={styles.searchOverrideSection}>
            <TextField
              placeholder="Search Google Maps..."
              value={loc.googleSearchQuery}
              onChange={e => handleOverrideSearch(index, e.target.value)}
              size="small"
              fullWidth
              autoFocus
              sx={MUI_INPUT_SX}
            />
            {loc.searchingGoogle && (
              <div className={styles.searchingRow} style={{ marginTop: 8 }}>
                <CircularProgress size={14} sx={{ color: 'var(--ls-color-muted)' }} />
                <span>Searching...</span>
              </div>
            )}
            {loc.googleResults.length > 0 && (
              <div className={styles.googleResults}>
                {loc.googleResults.map(place => (
                  <div
                    key={place.placeId}
                    className={styles.googleResult}
                    onClick={() => selectGooglePlace(index, place)}
                  >
                    <div className={styles.googleResultName}>{place.name}</div>
                    <div className={styles.googleResultAddress}>{place.address}</div>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className={styles.cancelOverrideLink}
              onClick={() => {
                // Restore the previous auto-selected result if we had one
                const cfaQuery = loc.cfaMatch
                  ? `Chick-fil-A ${loc.cfaMatch.location_name} ${loc.cfaMatch.state || ''}`.trim()
                  : '';
                updateLocation(index, {
                  googleSearchOverride: false,
                  googleSearchQuery: cfaQuery,
                });
                if (cfaQuery && !loc.googlePlaceId) {
                  searchGooglePlaces(index, cfaQuery);
                }
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* State C: Confirmed — two-column card with map + details */}
        {loc.googleConfirmed && loc.googleData && (
          <div className={styles.confirmedCard}>
            <div className={styles.confirmedBody}>
              {hasCoords && (
                <img
                  src={getStaticMapUrl(loc.googleData.latitude!, loc.googleData.longitude!, 400, 400)}
                  alt="Map"
                  className={styles.confirmedMapImage}
                />
              )}
              <div className={styles.confirmedContent}>
                <div className={styles.confirmedInfo}>
                  <div className={styles.confirmedPlaceName}>
                    {loc.googleResults.find(r => r.placeId === loc.googlePlaceId)?.name || 'Chick-fil-A'}
                  </div>
                  <div className={styles.confirmedPlaceAddress}>{loc.googleData.address}</div>
                </div>

                {loc.googleHoursDisplay && loc.googleHoursDisplay.length > 0 && (
                  <div className={styles.hoursSection}>
                    <div className={styles.hoursSectionTitle}>Operating Hours</div>
                    <div className={styles.hoursGrid}>
                      {loc.googleHoursDisplay.map((line, i) => {
                        const parts = line.split(': ');
                        const day = parts[0] || '';
                        const hours = parts.slice(1).join(': ') || '';
                        return (
                          <div key={i} className={styles.hoursRow}>
                            <span className={styles.hoursDay}>{day}</span>
                            <span className={styles.hoursTime}>{hours}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className={styles.changeLocationLink}
                  onClick={() => resetGooglePlace(index)}
                >
                  Change location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Google results found state */}
        {!loc.searchingGoogle && !loc.googlePlaceId && !loc.googleSearchOverride && loc.cfaMatch && loc.googleResults.length === 0 && loc.storeNumber.length === 5 && (
          <div className={styles.noResultsSection}>
            <div className={styles.noResultsText}>No Google Maps listing found</div>
            <button
              type="button"
              className={styles.searchOverrideLink}
              onClick={() => updateLocation(index, { googleSearchOverride: true })}
            >
              Search manually
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Personal Information */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Your Information</h3>

        <div className={styles.fieldRow}>
          <TextField
            label="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            size="small"
            fullWidth
            required
            sx={MUI_INPUT_SX}
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            size="small"
            fullWidth
            required
            sx={MUI_INPUT_SX}
          />
        </div>

        <div className={styles.fieldGroup}>
          <TextField
            label="Phone Number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            size="small"
            fullWidth
            sx={MUI_INPUT_SX}
          />
        </div>

        <div className={styles.divider} />

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>Are you the Operator?</div>
          </div>
          <Switch
            checked={isOperator}
            onChange={(_, checked) => setIsOperator(checked)}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--ls-color-brand)' },
            }}
          />
        </div>

        {!isOperator && (
          <div className={styles.fieldGroup} style={{ marginTop: 8 }}>
            <TextField
              label="Operator's Full Name"
              value={operatorName}
              onChange={e => setOperatorName(e.target.value)}
              size="small"
              fullWidth
              required
              sx={MUI_INPUT_SX}
            />
          </div>
        )}

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>Multi-unit?</div>
          </div>
          <Switch
            checked={isMultiUnit}
            onChange={(_, checked) => {
              setIsMultiUnit(checked);
              if (!checked && locations.length > 1) {
                setLocations([locations[0]]);
              }
            }}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--ls-color-brand)' },
            }}
          />
        </div>
      </div>

      {/* Locations */}
      <div className={styles.card} style={{ marginTop: 20 }}>
        <h3 className={styles.sectionTitle}>
          {isMultiUnit ? 'Your Locations' : 'Your Location'}
        </h3>

        {locations.map((loc, index) => renderLocationCard(loc, index))}

        {isMultiUnit && locations.length < 3 && (
          <button type="button" className={styles.addLocationBtn} onClick={addLocation}>
            + Add another location
          </button>
        )}
      </div>

      {/* Submit */}
      <button
        type="button"
        className={styles.submitBtn}
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <CircularProgress size={18} sx={{ color: '#fff', mr: 1 }} />
            Creating your organization...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );
}
