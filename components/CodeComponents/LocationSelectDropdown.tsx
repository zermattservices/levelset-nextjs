import React from 'react';
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLocationContext } from './LocationContext';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export interface LocationSelectDropdownProps {
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationSelectDropdown({
  placeholder = 'Select a location',
  className,
  disabled = false,
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
      disabled={disabled || loading || locations.length === 0}
      variant="outlined"
      size="small"
      sx={{
        width: 120,
        minWidth: 120,
        cursor: 'pointer',
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          fontFamily,
          fontSize: 14,
          fontWeight: 500,
          color: '#111827',
          paddingRight: '38px !important',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          cursor: 'pointer',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#e5e7eb',
          borderWidth: '1px',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: '#31664a',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#31664a',
          borderWidth: 2,
        },
        '& .MuiSelect-icon': {
          color: '#31664a',
          marginRight: 0,
          right: 12,
          pointerEvents: 'none',
        },
        '& .MuiSelect-select': {
          display: 'flex',
          alignItems: 'center',
          padding: '11px 12px !important',
          fontFamily,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer !important',
        },
        '& .MuiSelect-select.Mui-disabled': {
          color: '#9ca3af',
        },
      }}
    >
      <Select
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
          height: 'auto',
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: '12px',
              boxShadow: '0px 20px 40px rgba(15, 23, 42, 0.12)',
              overflow: 'hidden',
              minWidth: 160,
              '& .MuiMenuItem-root': {
                fontFamily,
                fontSize: 14,
                fontWeight: 500,
                color: '#111827',
                paddingY: 1,
                paddingX: 2,
                '&.Mui-selected': {
                  backgroundColor: '#eef5f0',
                  color: '#31664a',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: '#e3efe6',
                },
              },
            },
          },
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


