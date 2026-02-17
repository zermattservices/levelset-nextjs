import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SyncIcon from '@mui/icons-material/Sync';
import StarIcon from '@mui/icons-material/Star';
import SearchIcon from '@mui/icons-material/Search';
import PlaceIcon from '@mui/icons-material/Place';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import sty from './LocationDetails.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

// ── Sync progress indicator with accelerating % ──
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Animated progress that accelerates from 0→~92% over the expected
 * duration, then holds until the real call completes. Uses an
 * ease-out curve so early progress feels fast, then slows down
 * to create the perception of "almost there."
 *
 * expectedMs: estimated total time (e.g. 4000 for place details,
 * reviewCount * 3 for outscraper)
 */
function useSyncProgress(status: SyncStatus, expectedMs: number) {
  const [pct, setPct] = React.useState(0);
  const startRef = React.useRef(0);
  const rafRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (status === 'syncing') {
      startRef.current = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startRef.current;
        const t = Math.min(elapsed / expectedMs, 1);
        // ease-out cubic: fast start, slow finish — caps at 92%
        const eased = 1 - Math.pow(1 - t, 3);
        setPct(Math.round(eased * 100));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    if (status === 'success') { setPct(100); }
    if (status === 'error') { setPct(0); }
    if (status === 'idle') { setPct(0); }
  }, [status, expectedMs]);

  return pct;
}

function SyncStatusRow({
  label,
  status,
  expectedMs,
  idleContent,
}: {
  label: string;
  status: SyncStatus;
  expectedMs: number;
  idleContent?: React.ReactNode;
}) {
  const pct = useSyncProgress(status, expectedMs);

  return (
    <div className={sty.syncStatusRow}>
      <div className={sty.syncStatusLabel}>{label}</div>
      <div className={sty.syncStatusRight}>
        {status === 'syncing' && (
          <>
            <div className={sty.syncProgressBarTrack}>
              <div
                className={sty.syncProgressBarFill}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={sty.syncProgressPct}>{pct}%</span>
          </>
        )}
        {status === 'success' && (
          <CheckCircleIcon sx={{ fontSize: 16, color: 'var(--ls-color-success, #16a34a)' }} />
        )}
        {status === 'error' && (
          <ErrorIcon sx={{ fontSize: 16, color: 'var(--ls-color-destructive, #dc2626)' }} />
        )}
        {status === 'idle' && (
          idleContent || <span className={sty.syncStatusIdle}>—</span>
        )}
      </div>
    </div>
  );
}

const fontFamily = '"Satoshi", sans-serif';

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    borderRadius: 8,
    '&:hover fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
  },
  '& .MuiInputLabel-root': {
    fontFamily,
  },
}));

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
    yelp_biz_id: string | null;
    yelp_business_url: string | null;
    yelp_rating: number | null;
    yelp_review_count: number | null;
    yelp_last_synced_at: string | null;
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
  yelpReviews?: Array<{
    id: string;
    author_name: string;
    rating: number;
    review_text: string;
    publish_time: string;
  }>;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Load Google Maps JS API with Places library
function useGoogleMapsScript() {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    // Already loaded
    if ((window as any).google?.maps?.places?.AutocompleteService) {
      setLoaded(true);
      return;
    }

    // Check if script is already being loaded by another instance
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const checkLoaded = setInterval(() => {
        if ((window as any).google?.maps?.places?.AutocompleteService) {
          setLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Load with libraries=places in the URL
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => {
      const checkReady = setInterval(() => {
        if ((window as any).google?.maps?.places?.AutocompleteService) {
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
  const [selectedPlaceId, setSelectedPlaceId] = React.useState<string | null>(null);
  const [selectedPlaceName, setSelectedPlaceName] = React.useState<string | null>(null);
  const [selectedPlaceAddress, setSelectedPlaceAddress] = React.useState<string | null>(null);

  // Sync status for connect flow
  const [googleSyncStatus, setGoogleSyncStatus] = React.useState<SyncStatus>('idle');
  const [yelpSyncStatus, setYelpSyncStatus] = React.useState<SyncStatus>('idle');
  const [expectedGoogleMs, setExpectedGoogleMs] = React.useState(8000);
  const [expectedYelpMs, setExpectedYelpMs] = React.useState(10000);

  // Custom autocomplete state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [predictions, setPredictions] = React.useState<PlacePrediction[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const autocompleteServiceRef = React.useRef<any>(null);
  const sessionTokenRef = React.useRef<any>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

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

  // Initialize AutocompleteService when maps load
  React.useEffect(() => {
    if (!mapsLoaded) return;
    try {
      autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
      sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
    } catch (err) {
      console.error('Error initializing AutocompleteService:', err);
    }
  }, [mapsLoaded]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions when search query changes
  const fetchPredictions = React.useCallback((query: string) => {
    if (!autocompleteServiceRef.current || query.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        types: ['establishment'],
        sessionToken: sessionTokenRef.current,
      },
      (results: PlacePrediction[] | null, status: string) => {
        if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowDropdown(true);
          setHighlightedIndex(-1);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      }
    );
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    // Clear selection when user types
    if (selectedPlaceId) {
      setSelectedPlaceId(null);
      setSelectedPlaceName(null);
      setSelectedPlaceAddress(null);
    }
    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 250);
  };

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    setSelectedPlaceId(prediction.place_id);
    setSelectedPlaceName(prediction.structured_formatting.main_text);
    setSelectedPlaceAddress(prediction.structured_formatting.secondary_text);
    setSearchQuery(prediction.structured_formatting.main_text);
    setPredictions([]);
    setShowDropdown(false);
    // Create a new session token for future searches
    if ((window as any).google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectPrediction(predictions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleConnect = async () => {
    if (!locationId || !selectedPlaceId) return;
    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      // Phase 1: Connect place details + hours (fast, ~1-2s)
      const resp = await fetch('/api/locations/connect-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, placeId: selectedPlaceId }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to connect');

      // Immediately show the connected card with hours
      const infoResp = await fetch(`/api/locations/google-info?locationId=${locationId}`);
      if (infoResp.ok) setGoogleInfo(await infoResp.json());

      // Clean up search state
      setSearchQuery('');
      setSelectedPlaceId(null);
      setSelectedPlaceName(null);
      setSelectedPlaceAddress(null);
      setConnecting(false);

      // Phase 2: Sync reviews in parallel — each resolves independently
      const googleReviewCount = data.reviewCount || 0;
      const googleEstimatedMs = googleReviewCount * 38;
      setGoogleSyncStatus('syncing');
      setExpectedGoogleMs(googleEstimatedMs);

      // Helper: refresh info + reset statuses after all syncs complete
      let completedSyncs = 0;
      let totalSyncs = 1; // Google always fires
      const onSyncComplete = () => {
        completedSyncs++;
        if (completedSyncs >= totalSyncs) {
          setTimeout(async () => {
            const refreshResp = await fetch(`/api/locations/google-info?locationId=${locationId}`);
            if (refreshResp.ok) setGoogleInfo(await refreshResp.json());
            setGoogleSyncStatus('idle');
            setYelpSyncStatus('idle');
          }, 3000);
        }
      };

      // Google review sync — updates status immediately when done
      fetch('/api/locations/sync-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId }),
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Failed to sync Google reviews');
        setGoogleSyncStatus('success');
      }).catch((err) => {
        console.error('[handleConnect] Google sync error:', err);
        setGoogleSyncStatus('error');
      }).finally(onSyncComplete);

      // Yelp review sync (only if Yelp was found during connect)
      const yelpFound = data.yelp?.found;
      if (yelpFound) {
        totalSyncs++;
        const yelpReviewCount = data.yelp?.reviewCount || 0;
        const yelpEstimatedMs = 15000 + yelpReviewCount * 100;
        setYelpSyncStatus('syncing');
        setExpectedYelpMs(yelpEstimatedMs);

        fetch('/api/locations/sync-yelp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId }),
        }).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Failed to sync Yelp reviews');
          setYelpSyncStatus('success');
        }).catch((err) => {
          console.error('[handleConnect] Yelp sync error:', err);
          setYelpSyncStatus('error');
        }).finally(onSyncComplete);
      }
    } catch (err: any) {
      setGoogleSyncStatus('error');
      setYelpSyncStatus('error');
      setError(err.message || 'Failed to connect to Google Maps');
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
      setGoogleInfo({ connected: false, location: null, businessHours: [], reviews: [], yelpReviews: [] });
      setYelpSyncStatus('idle');
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

    // Track completion so we can refresh data after both finish
    let completedSyncs = 0;
    const totalSyncs = 2; // Google + Yelp always fire
    const onSyncComplete = () => {
      completedSyncs++;
      if (completedSyncs >= totalSyncs) {
        setSyncing(false);
        setTimeout(async () => {
          const infoResp = await fetch(`/api/locations/google-info?locationId=${locationId}`);
          if (infoResp.ok) setGoogleInfo(await infoResp.json());
          setGoogleSyncStatus('idle');
          setYelpSyncStatus('idle');
        }, 3000);
      }
    };

    // Google sync — on resync, credit optimization usually skips Outscraper (~3s).
    // Only use the full reviewCount * 38 estimate on first sync.
    const googleReviewCount = googleInfo?.location?.google_review_count || 0;
    const isGoogleResync = !!googleInfo?.location?.google_last_synced_at;
    const googleEstimatedMs = isGoogleResync ? 5000 : googleReviewCount * 38;
    setGoogleSyncStatus('syncing');
    setExpectedGoogleMs(googleEstimatedMs);

    fetch('/api/locations/sync-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to sync Google reviews');
      setGoogleSyncStatus('success');
    }).catch((err) => {
      console.error('[handleSync] Google sync error:', err);
      setGoogleSyncStatus('error');
    }).finally(onSyncComplete);

    // Yelp sync — resync skips Outscraper (~200ms). First sync has high fixed
    // overhead (~15-20s) from Google search + /yelp-biz + /yelp-reviews.
    const yelpReviewCount = googleInfo?.location?.yelp_review_count || 0;
    const isYelpResync = !!googleInfo?.location?.yelp_last_synced_at;
    const yelpEstimatedMs = isYelpResync ? 2000 : (15000 + yelpReviewCount * 100);
    setYelpSyncStatus('syncing');
    setExpectedYelpMs(yelpEstimatedMs);

    fetch('/api/locations/sync-yelp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId }),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to sync Yelp reviews');
      setYelpSyncStatus('success');
    }).catch((err) => {
      console.error('[handleSync] Yelp sync error:', err);
      setYelpSyncStatus('error');
    }).finally(onSyncComplete);
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
          /* Connected state — compact card */
          <div className={sty.googleConnectedCard}>
            <div className={sty.googleConnectedHeader}>
              <div className={sty.googleConnectedStatus}>
                <span className={sty.googleStatusDot} />
                <span className={sty.googleStatusText}>Connected</span>
              </div>
            </div>

            {/* Body: hours (left) + reviews sync (right) */}
            <div className={sty.googleCardBody}>
              {/* Hours column */}
              {loc.google_hours_display && loc.google_hours_display.length > 0 && (
                <div className={sty.googleHoursCompact}>
                  <div className={sty.googleHoursGrid}>
                    {loc.google_hours_display.map((line, i) => (
                      <div key={i} className={sty.googleHoursRow}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews sync column */}
              <div className={sty.googleReviewsColumn}>
                <span className={sty.googleReviewsHeader}>Reviews</span>
                <SyncStatusRow
                  label="Google"
                  status={googleSyncStatus}
                  expectedMs={expectedGoogleMs}
                  idleContent={
                    loc.google_rating != null ? (
                      <span className={sty.reviewInfoInline}>
                        <StarIcon sx={{ fontSize: 13, color: '#f59e0b' }} />
                        <span className={sty.reviewInfoRating}>{loc.google_rating.toFixed(1)}</span>
                        <span className={sty.reviewInfoCount}>({loc.google_review_count || 0})</span>
                      </span>
                    ) : (
                      <span className={sty.reviewInfoNone}>No reviews</span>
                    )
                  }
                />
                <SyncStatusRow
                  label="Yelp"
                  status={yelpSyncStatus}
                  expectedMs={expectedYelpMs}
                  idleContent={
                    loc.yelp_rating != null ? (
                      <span className={sty.reviewInfoInline}>
                        <StarIcon sx={{ fontSize: 13, color: '#e31837' }} />
                        <span className={sty.reviewInfoRating}>{loc.yelp_rating.toFixed(1)}</span>
                        <span className={sty.reviewInfoCount}>({loc.yelp_review_count || 0})</span>
                      </span>
                    ) : loc.yelp_biz_id ? (
                      <span className={sty.reviewInfoNone}>No reviews</span>
                    ) : (
                      <span className={sty.reviewInfoNone}>Not found</span>
                    )
                  }
                />
                <SyncStatusRow
                  label="Facebook"
                  status={'idle'}
                  expectedMs={10000}
                  idleContent={
                    <span className={sty.reviewInfoNone}>Coming soon</span>
                  }
                />
                <SyncStatusRow
                  label="Apple Maps"
                  status={'idle'}
                  expectedMs={10000}
                  idleContent={
                    <span className={sty.reviewInfoNone}>Coming soon</span>
                  }
                />
              </div>
            </div>

            {/* Footer: sync info + actions */}
            <div className={sty.googleConnectedFooter}>
              <div className={sty.googleFooterLeft}>
                <a
                  href={loc.google_maps_url || `https://www.google.com/maps/place/?q=place_id:${loc.google_place_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={sty.googleMapsLink}
                >
                  View listing
                </a>
                <span className={sty.googleSyncInfo}>
                  Synced {formatLastSynced(loc.google_last_synced_at)}
                </span>
              </div>
              {!isDisabled && (
                <div className={sty.googleActions}>
                  <button
                    className={sty.googleActionBtn}
                    onClick={handleSync}
                    disabled={syncing || connecting}
                  >
                    {syncing ? <CircularProgress size={12} sx={{ color: 'var(--ls-color-brand)' }} /> : <SyncIcon sx={{ fontSize: 14 }} />}
                    Sync
                  </button>
                  <button
                    className={`${sty.googleActionBtn} ${sty.googleActionBtnDanger}`}
                    onClick={handleDisconnect}
                    disabled={syncing || connecting}
                  >
                    <LinkOffIcon sx={{ fontSize: 14 }} />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Not connected state */
          <div className={sty.googleConnectContainer}>
            {!isDisabled && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
              <>
                <div className={sty.googleAutocompleteWrapper}>
                  <StyledTextField
                    inputRef={inputRef}
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
                    placeholder="Search for your restaurant..."
                    size="small"
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted, #9ca3af)' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {showDropdown && predictions.length > 0 && (
                    <div ref={dropdownRef} className={sty.googleDropdown}>
                      {predictions.map((p, i) => (
                        <button
                          key={p.place_id}
                          type="button"
                          className={`${sty.googleDropdownItem} ${i === highlightedIndex ? sty.googleDropdownItemHighlighted : ''}`}
                          onClick={() => handleSelectPrediction(p)}
                          onMouseEnter={() => setHighlightedIndex(i)}
                        >
                          <PlaceIcon sx={{ fontSize: 16, color: '#9ca3af', flexShrink: 0 }} />
                          <div className={sty.googleDropdownItemText}>
                            <span className={sty.googleDropdownMain}>{p.structured_formatting.main_text}</span>
                            <span className={sty.googleDropdownSecondary}>{p.structured_formatting.secondary_text}</span>
                          </div>
                        </button>
                      ))}
                      <div className={sty.googleDropdownFooter}>
                        <img
                          src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                          alt="Powered by Google"
                          className={sty.googleAttributionImg}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {selectedPlaceId && (
                  <div className={sty.googleSelectedPlace}>
                    <LinkIcon sx={{ fontSize: 16, color: 'var(--ls-color-brand)', flexShrink: 0, alignSelf: 'flex-start', marginTop: '2px' }} />
                    <div className={sty.googleSelectedInfo}>
                      <span className={sty.googleSelectedName}>{selectedPlaceName}</span>
                      {selectedPlaceAddress && (
                        <span className={sty.googleSelectedAddress}>{selectedPlaceAddress}</span>
                      )}
                    </div>
                    {!connecting ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleConnect}
                        sx={{
                          fontFamily: '"Satoshi", sans-serif',
                          fontSize: 12,
                          textTransform: 'none',
                          backgroundColor: 'var(--ls-color-brand)',
                          borderRadius: '6px',
                          boxShadow: 'none',
                          '&:hover': { backgroundColor: 'var(--ls-color-brand-hover, #264D38)', boxShadow: 'none' },
                        }}
                      >
                        Connect
                      </Button>
                    ) : (
                      <CircularProgress size={18} sx={{ color: 'var(--ls-color-brand)' }} />
                    )}
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
