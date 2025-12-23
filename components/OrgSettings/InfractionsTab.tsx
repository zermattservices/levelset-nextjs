import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './InfractionsTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: '#31664a',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a',
    },
  },
}));

interface Infraction {
  id: string;
  action: string;
  points: number | null;
  isNew?: boolean;
}

interface InfractionsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function InfractionsTab({ orgId, disabled = false }: InfractionsTabProps) {
  const [infractions, setInfractions] = React.useState<Infraction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Refs for autosave on unmount
  const infractionsRef = React.useRef<Infraction[]>([]);
  const hasChangesRef = React.useRef(false);
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Keep refs in sync
  React.useEffect(() => {
    infractionsRef.current = infractions;
  }, [infractions]);
  
  React.useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);
  
  React.useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  // Fetch infractions - first try org-level, then fallback to location-level
  React.useEffect(() => {
    async function fetchInfractions() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        // First try to get org-level infractions (location_id IS NULL)
        let { data, error: fetchError } = await supabase
          .from('infractions_rubric')
          .select('id, action, points')
          .eq('org_id', orgId)
          .is('location_id', null)
          .order('points', { ascending: true });

        if (fetchError) throw fetchError;

        // If no org-level entries, fallback to any location-level entries for this org
        if (!data || data.length === 0) {
          const { data: locationData, error: locationError } = await supabase
            .from('infractions_rubric')
            .select('id, action, points')
            .eq('org_id', orgId)
            .not('location_id', 'is', null)
            .order('points', { ascending: true });

          if (locationError) throw locationError;
          data = locationData;
        }

        setInfractions(data || []);
      } catch (err) {
        console.error('Error fetching infractions:', err);
        setError('Failed to load infractions');
      } finally {
        setLoading(false);
      }
    }

    fetchInfractions();
  }, [orgId, supabase]);

  // Sort infractions by points when blur occurs
  const sortInfractions = () => {
    setInfractions(prev => [...prev].sort((a, b) => {
      const aPoints = a.points ?? Infinity;
      const bPoints = b.points ?? Infinity;
      return aPoints - bPoints;
    }));
  };

  const handlePointsBlur = () => {
    sortInfractions();
  };

  const handleAddInfraction = () => {
    const newInfraction: Infraction = {
      id: `new-${Date.now()}`,
      action: '',
      points: null,
      isNew: true,
    };
    setInfractions([...infractions, newInfraction]);
    setHasChanges(true);
  };

  const handleInfractionChange = (id: string, field: keyof Infraction, value: any) => {
    setInfractions(infractions.map(inf => 
      inf.id === id ? { ...inf, [field]: value } : inf
    ));
    setHasChanges(true);
  };

  const handleDeleteInfraction = async (id: string) => {
    const infraction = infractions.find(i => i.id === id);
    
    // If it's not a new item, delete from database
    if (infraction && !infraction.isNew) {
      try {
        const { error: deleteError } = await supabase
          .from('infractions_rubric')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } catch (err) {
        console.error('Error deleting infraction:', err);
        setError('Failed to delete infraction');
        return;
      }
    }

    setInfractions(infractions.filter(inf => inf.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Separate new infractions from existing ones
      const newInfractions = infractions.filter(i => i.isNew && i.action.trim() !== '');
      const existingInfractions = infractions.filter(i => !i.isNew);

      // Update existing infractions
      for (const inf of existingInfractions) {
        const { error: updateError } = await supabase
          .from('infractions_rubric')
          .update({
            action: inf.action,
            points: inf.points,
          })
          .eq('id', inf.id);

        if (updateError) throw updateError;
      }

      // Insert new infractions
      if (newInfractions.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('infractions_rubric')
          .insert(newInfractions.map(inf => ({
            org_id: orgId,
            action: inf.action,
            points: inf.points,
          })))
          .select();

        if (insertError) throw insertError;

        // Update local state with real IDs and sort
        if (insertedData) {
          setInfractions(prev => {
            const existingIds = new Set(existingInfractions.map(i => i.id));
            const filteredPrev = prev.filter(i => existingIds.has(i.id));
            const combined = [...filteredPrev, ...insertedData.map(i => ({ ...i, isNew: false }))];
            // Sort by points
            return combined.sort((a, b) => {
              const aPoints = a.points ?? Infinity;
              const bPoints = b.points ?? Infinity;
              return aPoints - bPoints;
            });
          });
        }
      }

      setHasChanges(false);
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving infractions:', err);
      setError('Failed to save infractions');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      if (hasChangesRef.current && orgIdRef.current && !disabled) {
        const infractionsToSave = infractionsRef.current;
        const currentOrgId = orgIdRef.current;
        
        // Fire and forget save
        (async () => {
          try {
            const newInfractions = infractionsToSave.filter(i => i.isNew && i.action.trim() !== '');
            const existingInfractions = infractionsToSave.filter(i => !i.isNew);

            // Update existing
            for (const inf of existingInfractions) {
              await supabase
                .from('infractions_rubric')
                .update({
                  action: inf.action,
                  points: inf.points,
                })
                .eq('id', inf.id);
            }

            // Insert new
            if (newInfractions.length > 0) {
              await supabase
                .from('infractions_rubric')
                .insert(newInfractions.map(inf => ({
                  org_id: currentOrgId,
                  action: inf.action,
                  points: inf.points,
                })));
            }
          } catch (err) {
            console.error('Error autosaving infractions:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

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
        <h3 className={sty.introTitle}>Infractions</h3>
        <p className={sty.introDescription}>
          Define the infractions and their point values for your organization's discipline system.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        <div className={sty.header}>
          <span className={sty.headerName}>Infraction Name</span>
          <span className={sty.headerPoints}>Point Value</span>
          <span className={sty.headerActions}></span>
        </div>

        {infractions.length === 0 ? (
          <div className={sty.emptyState}>
            No infractions configured yet. Click "Add Infraction" to get started.
          </div>
        ) : (
          infractions.map((infraction) => (
            <div key={infraction.id} className={sty.row}>
              <StyledTextField
                value={infraction.action}
                onChange={(e) => handleInfractionChange(infraction.id, 'action', e.target.value)}
                placeholder="Infraction name"
                size="small"
                className={sty.nameField}
                disabled={disabled}
              />
              <StyledTextField
                value={infraction.points ?? ''}
                onChange={(e) => handleInfractionChange(infraction.id, 'points', e.target.value ? parseFloat(e.target.value) : null)}
                onBlur={handlePointsBlur}
                placeholder="Points"
                size="small"
                type="number"
                className={sty.pointsField}
                inputProps={{ step: 0.5 }}
                disabled={disabled}
              />
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleDeleteInfraction(infraction.id)}
                  className={sty.deleteButton}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </div>
          ))
        )}

        {!disabled && (
          <Button
            variant="text"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddInfraction}
            sx={{
              fontFamily,
              fontSize: 12,
              textTransform: 'none',
              color: '#31664a',
              alignSelf: 'flex-start',
              marginTop: 2,
              '&:hover': {
                backgroundColor: 'rgba(49, 102, 74, 0.08)',
              },
            }}
          >
            Add Infraction
          </Button>
        )}
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

export default InfractionsTab;
