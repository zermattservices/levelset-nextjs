import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './OrganizationDetails.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

const fontFamily = '"Satoshi", sans-serif';

const OrgLevelTag = styled(Chip)(() => ({
  fontFamily,
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  '& .MuiChip-icon': {
    fontSize: 14,
    color: '#166534',
  },
}));

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    borderRadius: 8,
    '&:hover fieldset': {
      borderColor: '#31664a' /* TODO: Use design token */,
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a' /* TODO: Use design token */,
    },
  },
  '& .MuiInputLabel-root': {
    fontFamily,
  },
}));

interface OrganizationDetailsProps {
  orgId: string | null;
  disabled?: boolean;
}

export function OrganizationDetails({ orgId, disabled = false }: OrganizationDetailsProps) {
  const [teamMemberWebsite, setTeamMemberWebsite] = React.useState<string>('');
  const [originalValue, setOriginalValue] = React.useState<string>('');
  const [orgName, setOrgName] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [locationCount, setLocationCount] = React.useState<number>(0);
  
  // Refs for autosave on unmount
  const teamMemberWebsiteRef = React.useRef<string>('');
  const originalValueRef = React.useRef<string>('');
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();
  
  // Permission check
  const canManageOrg = has(P.ORG_MANAGE_ORG) && !disabled;
  const isDisabled = disabled || !canManageOrg;

  // Fetch location count for the organization
  React.useEffect(() => {
    async function fetchLocationCount() {
      if (!orgId) return;
      
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);
      
      setLocationCount(count || 0);
    }
    
    fetchLocationCount();
  }, [orgId, supabase]);

  const hasChanges = teamMemberWebsite !== originalValue;
  
  // Keep refs in sync
  React.useEffect(() => {
    teamMemberWebsiteRef.current = teamMemberWebsite;
  }, [teamMemberWebsite]);
  
  React.useEffect(() => {
    originalValueRef.current = originalValue;
  }, [originalValue]);
  
  React.useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  // Fetch organization details
  React.useEffect(() => {
    async function fetchOrg() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('orgs')
          .select('name, team_member_website')
          .eq('id', orgId)
          .single();

        if (fetchError) throw fetchError;

        setOrgName(data?.name || 'Unknown Organization');
        setTeamMemberWebsite(data?.team_member_website || '');
        setOriginalValue(data?.team_member_website || '');
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization details');
      } finally {
        setLoading(false);
      }
    }

    fetchOrg();
  }, [orgId, supabase]);

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('orgs')
        .update({ team_member_website: teamMemberWebsite || null })
        .eq('id', orgId);

      if (updateError) throw updateError;

      setOriginalValue(teamMemberWebsite);
      originalValueRef.current = teamMemberWebsite;
      setSuccess('Settings saved successfully');
    } catch (err) {
      console.error('Error saving organization:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      const hasUnsavedChanges = teamMemberWebsiteRef.current !== originalValueRef.current;
      if (hasUnsavedChanges && orgIdRef.current && !disabled) {
        const websiteValue = teamMemberWebsiteRef.current;
        const currentOrgId = orgIdRef.current;
        
        // Fire and forget save
        (async () => {
          try {
            await supabase
              .from('orgs')
              .update({ team_member_website: websiteValue || null })
              .eq('id', currentOrgId);
          } catch (err) {
            console.error('Error autosaving organization details:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' /* TODO: Use design token */ }} />
      </div>
    );
  }

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className={sty.introTitle}>Organization Details</h3>
          {locationCount > 1 && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.introDescription}>
          Configure organization-wide settings that apply to all locations in {orgName}.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}
      {success && <div className={sty.successMessage}>{success}</div>}

      <div className={sty.section}>
        <label className={sty.fieldLabel}>Team Member Website</label>
        <p className={sty.fieldDescription}>
          The website URL where team members can access resources or other organization-specific information.
        </p>

        <StyledTextField
          value={teamMemberWebsite}
          onChange={(e) => {
            setTeamMemberWebsite(e.target.value);
            setSuccess(null);
          }}
          placeholder="https://example.com/team"
          fullWidth
          size="small"
          sx={{ maxWidth: 480 }}
          disabled={disabled}
        />
      </div>

      {!disabled && (
        <div className={sty.actions}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            sx={{
              fontFamily,
              textTransform: 'none',
              backgroundColor: '#31664a' /* TODO: Use design token */,
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
        </div>
      )}
    </div>
  );
}

export default OrganizationDetails;
