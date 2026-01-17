import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import sty from './FormSettingsTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const StyledSwitch = styled(Switch)(() => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#31664a',
    '&:hover': {
      backgroundColor: 'rgba(49, 102, 74, 0.08)',
    },
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#31664a',
  },
}));

interface FormSettingsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function FormSettingsTab({ orgId, disabled = false }: FormSettingsTabProps) {
  const [requireComments, setRequireComments] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch current settings
  React.useEffect(() => {
    async function fetchSettings() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('org_feature_toggles')
          .select('require_rating_comments')
          .eq('org_id', orgId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        setRequireComments(data?.require_rating_comments || false);
      } catch (err) {
        console.error('Error fetching form settings:', err);
        setError('Failed to load form settings');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [orgId, supabase]);

  const handleRequireCommentsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRequireComments(event.target.checked);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Try to update existing record
      const { error: updateError } = await supabase
        .from('org_feature_toggles')
        .update({
          require_rating_comments: requireComments,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId);

      if (updateError) {
        // If update fails, try insert
        const { error: insertError } = await supabase
          .from('org_feature_toggles')
          .insert({
            org_id: orgId,
            require_rating_comments: requireComments,
          });

        if (insertError) throw insertError;
      }

      setHasChanges(false);
    } catch (err) {
      console.error('Error saving form settings:', err);
      setError('Failed to save form settings');
    } finally {
      setSaving(false);
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
        <h3 className={sty.introTitle}>Form Settings</h3>
        <p className={sty.introDescription}>
          Configure form behavior and validation rules for positional excellence ratings.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.settingsContainer}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: 3,
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <Box>
            <FormControlLabel
              control={
                <StyledSwitch
                  checked={requireComments}
                  onChange={handleRequireCommentsChange}
                  disabled={disabled}
                />
              }
              label={
                <Box sx={{ ml: 1 }}>
                  <Box sx={{ fontFamily, fontSize: 14, fontWeight: 600, color: '#111827' }}>
                    Require Additional Comments
                  </Box>
                  <Box sx={{ fontFamily, fontSize: 13, color: '#6b7280', mt: 0.5 }}>
                    When enabled, leaders must add comments when submitting positional ratings in the mobile app.
                  </Box>
                </Box>
              }
              sx={{
                alignItems: 'flex-start',
                margin: 0,
              }}
            />
          </Box>
        </Box>
      </div>

      {!disabled && (
        <div className={sty.actions}>
          <div></div>
          <div className={sty.rightActions}>
            {hasChanges && (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  fontFamily,
                  textTransform: 'none',
                  backgroundColor: '#31664a',
                  '&:hover': {
                    backgroundColor: '#264d38',
                  },
                  '&.Mui-disabled': {
                    backgroundColor: '#e0e0e0',
                  },
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FormSettingsTab;

