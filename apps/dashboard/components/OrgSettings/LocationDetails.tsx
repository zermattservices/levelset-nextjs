import * as React from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SyncIcon from '@mui/icons-material/Sync';
import StarIcon from '@mui/icons-material/Star';
import sty from './LocationDetails.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

interface LocationDetailsProps {
  locationId: string | null;
  disabled?: boolean;
}

interface GoogleInfoData {
  connected: boolean;
  location: {
    google_place_id: string;
    google_maps_url: string | null;
    google_rating: number | null;
    google_review_count: number | null;
    google_hours_display: string[] | null;
    google_last_synced_at: string | null;
  } | null;
  businessHours: Array<{
    day_of_week: number;
    open_hour: number;
    open_minute: number;
    close_hour: number;
    close_minute: number;
    period_index: number;
  }>;
  reviews: Array<{
    id: string;
    author_name: string;
    rating: number;
    review_text: string;
    publish_time: string;
  }>;
}

// Load Google Maps JS API dynamically
function useGoogleMapsScript() {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    // Check if already loaded
    if ((window as any).google?.maps?.places) {
      setLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkLoaded = setInterval(() => {
        if ((window as any).google?.maps?.places) {
          setLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => {
      // Wait for places library to be ready
      const checkReady = setInterval(() => {
        if ((window as any).google?.maps?.places) {
          setLoaded(true);
          clearInterval(checkReady);
        }
      }, 50);
    };
    document.head.appendChild(script);
  }, []);

  return loaded;
}

export function LocationDetails({ locationId, disabled = false }: LocationDetailsProps) {
  const { has } = usePermissions();
  const mapsLoaded = useGoogleMapsScript();

  // Permission check
  const canManageLocation = has(P.ORG_MANAGE_LOCATION) && !disabled;
  const isDisabled = disabled || !canManageLocation;
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Google Maps state
  const [googleInfo, setGoogleInfo] = React.useState<GoogleInfoData | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const autocompleteRef = React.useRef<HTMLDivElement>(null);
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string | null>(null);
  const [selectedPlaceName, setSelectedPlaceName] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch current location data (logo + Google info)
  React.useEffect(() => {
    async function fetchLocation() {
      if (!locationId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('image_url')
          .eq('id', locationId)
          .single();

        if (fetchError) throw fetchError;

        setLogoUrl(data?.image_url || null);
      } catch (err) {
        console.error('Error fetching location:', err);
        setError('Failed to load location details');
      } finally {
        setLoading(false);
      }
    }

    fetchLocation();
  }, [locationId, supabase]);

  // Fetch Google info separately
  React.useEffect(() => {
    async function fetchGoogleInfo() {
      if (!locationId) return;
      setGoogleLoading(true);
      try {
        const resp = await fetch(`/api/locations/google-info?locationId=${locationId}`);
        if (resp.ok) {
          const data = await resp.json();
          setGoogleInfo(data);
        }
      } catch (err) {
        console.error('Error fetching Google info:', err);
      } finally {
        setGoogleLoading(false);
      }
    }

    fetchGoogleInfo();
  }, [locationId]);

  // Initialize Google Places Autocomplete
  React.useEffect(() => {
    if (!mapsLoaded || !autocompleteRef.current || isDisabled || googleInfo?.connected) return;

    const container = autocompleteRef.current;
    // Clear any previous autocomplete
    container.innerHTML = '';

    try {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(
        (() => {
          const input = document.createElement('input');
          input.type = 'text';
          input.placeholder = 'Search for your business on Google Maps...';
          input.className = sty.googleSearchInput;
          container.appendChild(input);
          return input;
        })(),
        {
          types: ['establishment'],
          fields: ['place_id', 'name', 'formatted_address'],
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.place_id) {
          setSelectedPlaceId(place.place_id);
          setSelectedPlaceName(place.name || place.formatted_address || place.place_id);
        }
      });
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
    }
  }, [mapsLoaded, isDisabled, googleInfo?.connected]);

  const handleConnect = async () => {
    if (!locationId || !selectedPlaceId) return;
    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const resp = await fetch('/api/locations/connect-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, placeId: selectedPlaceId }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to connect');

      setSuccess('Connected to Google Maps');
      setSelectedPlaceId(null);
      setSelectedPlaceName(null);

      // Refresh Google info
      const infoResp = await fetch(`/api/locations/google-info?locationId=${locationId}`);
      if (infoResp.ok) setGoogleInfo(await infoResp.json());
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Maps');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!locationId) return;
    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const resp = await fetch('/api/locations/disconnect-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to disconnect');

      setSuccess('Disconnected from Google Maps');
      setGoogleInfo({ connected: false, location: null, businessHours: [], reviews: [] });
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect from Google Maps');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!locationId) return;
    setSyncing(true);
    setError(null);

    try {
      const resp = await fetch('/api/locations/sync-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to sync');

      setSuccess(`Synced: ${data.newReviews} new reviews, ${data.updatedReviews} updated`);

      // Refresh Google info
      const infoResp = await fetch(`/api/locations/google-info?locationId=${locationId}`);
      if (infoResp.ok) setGoogleInfo(await infoResp.json());
    } catch (err: any) {
      setError(err.message || 'Failed to sync Google Maps data');
    } finally {
      setSyncing(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !locationId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate unique filename in logos folder
      const fileExt = file.name.split('.').pop();
      const fileName = `logos/${locationId}/${Date.now()}.${fileExt}`;

      // Delete old image if exists
      if (logoUrl) {
        // Extract the path after the bucket name
        const urlParts = logoUrl.split('/location_assets/');
        if (urlParts[1]) {
          await supabase.storage.from('location_assets').remove([urlParts[1]]);
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('location_assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('location_assets')
        .getPublicUrl(fileName);

      const newUrl = urlData.publicUrl;

      // Update location record
      const { error: updateError } = await supabase
        .from('locations')
        .update({ image_url: newUrl })
        .eq('id', locationId);

      if (updateError) throw updateError;

      setLogoUrl(newUrl);
      setSuccess('Logo uploaded successfully');
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!locationId || !logoUrl) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Delete from storage - extract path after bucket name
      const urlParts = logoUrl.split('/location_assets/');
      if (urlParts[1]) {
        await supabase.storage.from('location_assets').remove([urlParts[1]]);
      }

      // Update location record
      const { error: updateError } = await supabase
        .from('locations')
        .update({ image_url: null })
        .eq('id', locationId);

      if (updateError) throw updateError;

      setLogoUrl(null);
      setSuccess('Logo removed successfully');
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  const loc = googleInfo?.location;
  const formatLastSynced = (ts: string | null | undefined) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Location Details</h3>
        <p className={sty.introDescription}>
          Configure details specific to this location, including the location logo
          that appears throughout the app.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}
      {success && <div className={sty.successMessage}>{success}</div>}

      {/* Location Logo Section */}
      <div className={sty.section}>
        <label className={sty.fieldLabel}>Location Logo</label>
        <p className={sty.fieldDescription}>
          This image will be displayed in the dashboard and other areas of the app.
          Recommended size: 600 x 400 pixels.
        </p>

        <div className={sty.imageUploadArea}>
          {logoUrl ? (
            <div className={sty.imagePreviewContainer}>
              <div className={sty.imagePreview}>
                <img src={logoUrl} alt="Location logo" className={sty.previewImage} />
              </div>
              {!disabled && (
                <div className={sty.imageActions}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    sx={{
                      fontFamily: '"Satoshi", sans-serif',
                      fontSize: 12,
                      textTransform: 'none',
                      borderColor: 'var(--ls-color-brand)',
                      color: 'var(--ls-color-brand)',
                      '&:hover': {
                        borderColor: 'var(--ls-color-brand)',
                        backgroundColor: 'rgba(49, 102, 74, 0.08)',
                      },
                    }}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemove}
                    disabled={uploading}
                    sx={{
                      fontFamily: '"Satoshi", sans-serif',
                      fontSize: 12,
                      textTransform: 'none',
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      '&:hover': {
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.08)',
                      },
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`${sty.uploadPlaceholder} ${disabled ? sty.uploadPlaceholderDisabled : ''}`}
              onClick={() => !disabled && fileInputRef.current?.click()}
              style={{ cursor: disabled ? 'default' : 'pointer' }}
            >
              <CloudUploadIcon sx={{ fontSize: 32, color: 'var(--ls-color-disabled-text)' }} />
              <span className={sty.uploadText}>
                {disabled ? 'No logo uploaded' : 'Click to upload an image'}
              </span>
              {!disabled && <span className={sty.uploadHint}>PNG, JPG up to 5MB</span>}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={sty.hiddenInput}
          />

          {uploading && (
            <div className={sty.uploadingOverlay}>
              <CircularProgress size={24} sx={{ color: 'var(--ls-color-brand)' }} />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Google Maps Section */}
      <div className={sty.section}>
        <label className={sty.fieldLabel}>Google Maps</label>
        <p className={sty.fieldDescription}>
          Connect this location to its Google Maps listing to sync business hours,
          reviews, and location data.
        </p>

        {googleLoading ? (
          <div className={sty.googleLoadingRow}>
            <CircularProgress size={16} sx={{ color: 'var(--ls-color-brand)' }} />
            <span>Loading Google Maps info...</span>
          </div>
        ) : googleInfo?.connected && loc ? (
          /* Connected state */
          <div className={sty.googleConnectedContainer}>
            {/* Rating & link row */}
            <div className={sty.googleSummaryRow}>
              <a
                href={loc.google_maps_url || `https://www.google.com/maps/place/?q=place_id:${loc.google_place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={sty.googleMapsLink}
              >
                View on Google Maps
              </a>
              {loc.google_rating != null && (
                <span className={sty.googleRating}>
                  <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                  {loc.google_rating} ({loc.google_review_count || 0} reviews)
                </span>
              )}
            </div>

            {/* Business hours */}
            {loc.google_hours_display && loc.google_hours_display.length > 0 && (
              <div className={sty.googleHours}>
                <span className={sty.googleHoursTitle}>Business Hours</span>
                <div className={sty.googleHoursGrid}>
                  {loc.google_hours_display.map((line, i) => (
                    <div key={i} className={sty.googleHoursRow}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync info & actions */}
            <div className={sty.googleActionsRow}>
              <span className={sty.googleSyncInfo}>
                Last synced: {formatLastSynced(loc.google_last_synced_at)}
              </span>
              {!isDisabled && (
                <div className={sty.googleActions}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
                    onClick={handleSync}
                    disabled={syncing || connecting}
                    sx={{
                      fontFamily: '"Satoshi", sans-serif',
                      fontSize: 12,
                      textTransform: 'none',
                      borderColor: 'var(--ls-color-brand)',
                      color: 'var(--ls-color-brand)',
                      '&:hover': {
                        borderColor: 'var(--ls-color-brand)',
                        backgroundColor: 'rgba(49, 102, 74, 0.08)',
                      },
                    }}
                  >
                    Sync Now
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<LinkOffIcon />}
                    onClick={handleDisconnect}
                    disabled={syncing || connecting}
                    sx={{
                      fontFamily: '"Satoshi", sans-serif',
                      fontSize: 12,
                      textTransform: 'none',
                      borderColor: '#dc2626',
                      color: '#dc2626',
                      '&:hover': {
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.08)',
                      },
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Not connected state */
          <div className={sty.googleConnectContainer}>
            {!isDisabled && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
              <>
                <div ref={autocompleteRef} className={sty.googleAutocompleteWrapper} />
                {selectedPlaceId && (
                  <div className={sty.googleSelectedPlace}>
                    <span className={sty.googleSelectedName}>{selectedPlaceName}</span>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={connecting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <LinkIcon />}
                      onClick={handleConnect}
                      disabled={connecting}
                      sx={{
                        fontFamily: '"Satoshi", sans-serif',
                        fontSize: 12,
                        textTransform: 'none',
                        backgroundColor: 'var(--ls-color-brand)',
                        '&:hover': { backgroundColor: 'var(--ls-color-brand-dark, #254e39)' },
                      }}
                    >
                      Connect
                    </Button>
                  </div>
                )}
              </>
            ) : !isDisabled ? (
              <span className={sty.googleNotConfigured}>
                Google Maps API key not configured. Contact your administrator.
              </span>
            ) : (
              <span className={sty.googleNotConfigured}>
                No Google Maps connection configured.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LocationDetails;
