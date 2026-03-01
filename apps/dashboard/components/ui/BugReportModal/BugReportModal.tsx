import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '@/lib/providers/AuthProvider';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './BugReportModal.module.css';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const FEATURE_AREAS = [
  'Positional Excellence',
  'Discipline',
  'Schedule',
  'Roster',
  'Reporting',
  'Documents',
  'Org Chart',
  'Levi',
  'General',
  'Other',
];

const PAGE_FEATURE_MAP: Record<string, string> = {
  '/positional-excellence': 'Positional Excellence',
  '/discipline': 'Discipline',
  '/schedule': 'Schedule',
  '/roster': 'Roster',
  '/reporting': 'Reporting',
  '/documents': 'Documents',
  '/org-chart': 'Org Chart',
  '/levi': 'Levi',
};

function getFeatureFromPath(pathname: string): string {
  for (const [prefix, feature] of Object.entries(PAGE_FEATURE_MAP)) {
    if (pathname.startsWith(prefix)) return feature;
  }
  return 'General';
}

export interface BugReportModalProps {
  open: boolean;
  onClose: () => void;
  currentPage: string;
}

export function BugReportModal({ open, onClose, currentPage }: BugReportModalProps) {
  const auth = useAuth();
  const supabase = React.useMemo(() => createSupabaseClient(), []);

  const [featureArea, setFeatureArea] = React.useState('General');
  const [description, setDescription] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Pre-fill feature area when modal opens based on current page
  React.useEffect(() => {
    if (open) {
      setFeatureArea(getFeatureFromPath(currentPage));
      setDescription('');
      setError(null);
      setSuccess(false);
    }
  }, [open, currentPage]);

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      setError('Please provide a description of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/bugs/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ featureArea, description: description.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit bug report');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: 480,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--ls-color-muted-border)',
          backgroundColor: 'var(--ls-color-neutral-foreground)',
        }}
      >
        <Typography sx={{ fontFamily, fontSize: 18, fontWeight: 600, color: 'var(--ls-color-neutral-soft-foreground)' }}>
          Submit a Bug
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--ls-color-muted)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <div className={styles.formContainer}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ borderRadius: '8px' }}>
            Bug report submitted! Thank you for the feedback.
          </Alert>
        )}

        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontFamily }}>Feature Area</InputLabel>
          <Select
            value={featureArea}
            label="Feature Area"
            onChange={(e) => setFeatureArea(e.target.value)}
            disabled={submitting || success}
            sx={{ fontFamily }}
          >
            {FEATURE_AREAS.map((area) => (
              <MenuItem key={area} value={area} sx={{ fontFamily }}>
                {area}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Describe the bug"
          placeholder="What happened? What did you expect to happen?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={4}
          maxRows={8}
          fullWidth
          disabled={submitting || success}
          sx={{
            '& .MuiOutlinedInput-root': { fontFamily },
            '& .MuiInputLabel-root': { fontFamily },
          }}
        />

        <div className={styles.actions}>
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={submitting}
            sx={{
              fontFamily,
              textTransform: 'none',
              borderColor: 'var(--ls-color-muted-border)',
              color: 'var(--ls-color-muted)',
              '&:hover': {
                borderColor: 'var(--ls-color-border)',
                backgroundColor: 'var(--ls-color-neutral-foreground)',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || success || description.trim().length < 10}
            sx={{
              fontFamily,
              textTransform: 'none',
              backgroundColor: 'var(--ls-color-brand)',
              '&:hover': {
                backgroundColor: '#285540',
              },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Submit Bug'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default BugReportModal;
