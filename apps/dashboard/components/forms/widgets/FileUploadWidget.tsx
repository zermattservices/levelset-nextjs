import * as React from 'react';
import { Button, FormControl, FormHelperText, Typography, Box, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", sans-serif';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * File upload widget for RJSF forms.
 * Converts file to base64 data URL and stores as the field value.
 * Supports images, PDFs, and common document types up to 10MB.
 */
export function FileUploadWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const isDisabled = disabled || readonly;

  // Extract filename from existing value if present
  React.useEffect(() => {
    if (value && typeof value === 'string' && value.startsWith('data:')) {
      // Try to extract name from data URL or show generic
      setFileName(fileName || 'Uploaded file');
    }
  }, [value, fileName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be under 10MB');
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Accepted: images, PDF, text, CSV, Word documents');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      onChange(reader.result as string);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setFileName(null);
    setError(null);
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const hasError = (rawErrors && rawErrors.length > 0) || !!error;

  return (
    <FormControl
      required={required}
      error={hasError}
      sx={{ width: '100%' }}
    >
      <Typography
        variant="body2"
        sx={{ fontFamily, fontSize: 14, mb: 1, color: 'text.secondary' }}
      >
        {label || 'File Upload'}
        {required && ' *'}
      </Typography>

      {value && fileName ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 1.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'action.hover',
          }}
        >
          <InsertDriveFileIcon sx={{ color: 'var(--ls-color-brand-base)', fontSize: 20 }} />
          <Typography
            sx={{ fontFamily, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {fileName}
          </Typography>
          {!isDisabled && (
            <IconButton size="small" onClick={handleRemove} aria-label="Remove file">
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ) : (
        <Button
          variant="outlined"
          component="label"
          disabled={isDisabled}
          startIcon={<CloudUploadIcon />}
          sx={{
            fontFamily,
            fontSize: 13,
            textTransform: 'none',
            borderColor: hasError ? 'error.main' : 'divider',
            color: hasError ? 'error.main' : 'text.secondary',
          }}
        >
          Choose file
          <input
            ref={inputRef}
            type="file"
            hidden
            id={id}
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileChange}
            disabled={isDisabled}
          />
        </Button>
      )}

      {(error || (rawErrors && rawErrors.length > 0)) && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {error || rawErrors?.[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
