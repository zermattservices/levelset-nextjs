import React from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLocationContext } from './LocationContext';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export interface LocationSelectDropdownProps {
  label?: string;
  placeholder?: string;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
}

export function LocationSelectDropdown({
  label = 'Location',
  placeholder = 'Select a location',
  fullWidth = false,
  className,
  disabled = false,
  showLabel = true,
}: LocationSelectDropdownProps) {
  const { locations, selectedLocationId, loading, selectLocation } = useLocationContext();

  const handleChange = React.useCallback(
    (event: SelectChangeEvent<string>) => {
      const value = event.target.value;
      if (value) {
        selectLocation(value);
      }
    },
    [selectLocation]
  );

  return (
    <FormControl
      className={className}
      fullWidth={fullWidth}
      disabled={disabled || loading || locations.length === 0}
      variant="outlined"
      size="small"
      sx={{
        minWidth: fullWidth ? undefined : 180,
        '& .MuiInputBase-root': {
          borderRadius: 12,
          backgroundColor: '#ffffff',
          fontFamily,
          fontSize: 14,
          fontWeight: 500,
          color: '#111827',
          paddingRight: '32px !important',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#e5e7eb',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#cbd5f5',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#31664a',
          borderWidth: 2,
        },
        '& .MuiSelect-icon': {
          color: '#31664a',
          marginRight: 4,
        },
        '& .MuiInputBase-input': {
          padding: '10px 14px',
        },
        '& .Mui-disabled .MuiOutlinedInput-notchedOutline': {
          borderColor: '#e5e7eb',
        },
      }}
    >
      {showLabel && (
        <InputLabel
          sx={{
            fontFamily,
            fontSize: 12,
            color: '#6b7280',
          }}
        >
          {label}
        </InputLabel>
      )}

      <Select
        label={showLabel ? label : undefined}
        value={selectedLocationId ?? ''}
        displayEmpty
        IconComponent={ExpandMoreIcon}
        renderValue={(value) => {
          if (!value) {
            return <span style={{ color: '#9ca3af' }}>{placeholder}</span>;
          }

          const match = locations.find((loc) => loc.id === value);
          if (!match) {
            return <span>{placeholder}</span>;
          }

          return match.location_number ?? match.name ?? placeholder;
        }}
        onChange={handleChange}
        sx={{
          fontFamily,
        }}
      >
        {loading && (
          <MenuItem disabled value="loading" sx={{ fontFamily }}>
            <CircularProgress size={18} sx={{ marginRight: 1 }} /> Loading locations...
          </MenuItem>
        )}
        {!loading && locations.map((location) => (
          <MenuItem
            key={location.id}
            value={location.id}
            sx={{
              fontFamily,
              fontSize: 14,
              paddingY: 1,
            }}
          >
            {location.location_number ?? location.name ?? 'Unknown Location'}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default LocationSelectDropdown;


