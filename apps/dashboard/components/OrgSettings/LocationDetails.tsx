import * as React from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import sty from './LocationDetails.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

interface LocationDetailsProps {
  locationId: string | null;
  disabled?: boolean;
}

export function LocationDetails({ locationId, disabled = false }: LocationDetailsProps) {
  const { has } = usePermissions();
  
  // Permission check
  const canManageLocation = has(P.ORG_MANAGE_LOCATION) && !disabled;
  const isDisabled = disabled || !canManageLocation;
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch current location logo
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
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

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

      <div className={sty.section}>
        <label className={sty.fieldLabel}>Location Logo</label>
        <p className={sty.fieldDescription}>
          This image will be displayed in the dashboard and other areas of the app.
          Recommended size: 600 × 400 pixels.
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
                      borderColor: '#31664a',
                      color: '#31664a',
                      '&:hover': {
                        borderColor: '#31664a',
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
              <CloudUploadIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
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
              <CircularProgress size={24} sx={{ color: '#31664a' }} />
              <span>Uploading...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LocationDetails;
