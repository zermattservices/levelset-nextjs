import React from 'react';
import { useRouter } from 'next/router';
import {
  Dialog,
  DialogContent,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useLocationContext } from './LocationContext';
import { LocationSelectDropdown } from './LocationSelectDropdown';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export interface LocationSelectModalProps {
  className?: string;
}

export function LocationSelectModal({ className }: LocationSelectModalProps) {
  const router = useRouter();
  const { locations, selectedLocationId, loading, error, selectLocation } = useLocationContext();

  // Never show on auth/login pages
  const isAuthPage = router.pathname?.startsWith('/auth') || router.pathname?.startsWith('/login');

  const shouldUseDropdown = locations.length > 2;
  const shouldShowButtons = !shouldUseDropdown && locations.length > 0;
  const open = Boolean(!isAuthPage && !loading && !selectedLocationId && locations.length > 0);

  const handleClose = (_event: object, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      // Prevent closing without selection
      return;
    }
  };

  return (
    <Dialog
      className={className}
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          paddingX: 4,
          paddingY: 5,
          textAlign: 'center',
          fontFamily,
        },
      }}
    >
      <DialogContent sx={{ padding: 0 }}>
        <Stack spacing={3} alignItems="center" sx={{ width: "100%", maxWidth: 320, marginX: "auto" }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily,
              fontSize: 24,
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Select a Location
          </Typography>

          {loading && (
            <CircularProgress size={32} sx={{ color: '#31664a' }} />
          )}

          {!loading && error && (
            <Alert severity="error" sx={{ fontFamily }}>
              {error}
            </Alert>
          )}

          {!loading && !error && shouldUseDropdown && (
            <LocationSelectDropdown className="location-select-modal-dropdown" placeholder="Choose a location" />
          )}

          {!loading && !error && shouldShowButtons && (
            <Stack spacing={2} alignItems="center" sx={{ width: "100%", maxWidth: 320 }}>
              {locations.map((location) => (
                <Button
                  key={location.id}
                  onClick={() => selectLocation(location.id)}
                  sx={{
                    fontFamily,
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: 999,
                    textTransform: 'none',
                    paddingY: 1.5,
                    paddingX: 6,
                    width: "auto",
                    minWidth: 0,
                    backgroundColor: '#31664a',
                    whiteSpace: 'nowrap',
                    color: '#ffffff',
                    boxShadow: '0px 6px 16px rgba(49, 102, 74, 0.12)',
                    '&:hover': {
                      backgroundColor: '#28523a',
                    },
                  }}
                >
                  {location.location_number ?? location.name ?? 'Select'}
                </Button>
              ))}
            </Stack>
          )}

          {!loading && !error && locations.length === 0 && (
            <Typography
              sx={{
                fontFamily,
                fontSize: 14,
                color: '#6b7280',
              }}
            >
              No locations available. Please contact an administrator.
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export default LocationSelectModal;


