import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './DisciplineActionsTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: '#31664a' /* TODO: Use design token */,
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a' /* TODO: Use design token */,
    },
  },
}));

interface DisciplineAction {
  id: string;
  action: string;
  points_threshold: number | null;
  isNew?: boolean;
}

interface DisciplineActionsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function DisciplineActionsTab({ orgId, disabled = false }: DisciplineActionsTabProps) {
  const [actions, setActions] = React.useState<DisciplineAction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  // Refs for autosave on unmount
  const actionsRef = React.useRef<DisciplineAction[]>([]);
  const hasChangesRef = React.useRef(false);
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Keep refs in sync
  React.useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);
  
  React.useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);
  
  React.useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  // Fetch actions - first try org-level, then fallback to location-level
  React.useEffect(() => {
    async function fetchActions() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        // First try to get org-level actions (location_id IS NULL)
        let { data, error: fetchError } = await supabase
          .from('disc_actions_rubric')
          .select('id, action, points_threshold')
          .eq('org_id', orgId)
          .is('location_id', null)
          .order('points_threshold', { ascending: true });

        if (fetchError) throw fetchError;

        // If no org-level entries, fallback to any location-level entries for this org
        if (!data || data.length === 0) {
          const { data: locationData, error: locationError } = await supabase
            .from('disc_actions_rubric')
            .select('id, action, points_threshold')
            .eq('org_id', orgId)
            .not('location_id', 'is', null)
            .order('points_threshold', { ascending: true });

          if (locationError) throw locationError;
          data = locationData;
        }

        setActions(data || []);
      } catch (err) {
        console.error('Error fetching actions:', err);
        setError('Failed to load actions');
      } finally {
        setLoading(false);
      }
    }

    fetchActions();
  }, [orgId, supabase]);

  // Sort actions by points_threshold when blur occurs
  const sortActions = () => {
    setActions(prev => [...prev].sort((a, b) => {
      const aPoints = a.points_threshold ?? Infinity;
      const bPoints = b.points_threshold ?? Infinity;
      return aPoints - bPoints;
    }));
  };

  const handleAddAction = () => {
    const newAction: DisciplineAction = {
      id: `new-${Date.now()}`,
      action: '',
      points_threshold: null,
      isNew: true,
    };
    setActions([...actions, newAction]);
    setHasChanges(true);
  };

  const handleActionChange = (id: string, field: keyof DisciplineAction, value: any) => {
    setActions(actions.map(act => 
      act.id === id ? { ...act, [field]: value } : act
    ));
    setHasChanges(true);
  };

  const handleThresholdBlur = () => {
    sortActions();
  };

  const handleDeleteAction = async (id: string) => {
    const action = actions.find(a => a.id === id);
    
    // If it's not a new item, delete from database
    if (action && !action.isNew) {
      try {
        const { error: deleteError } = await supabase
          .from('disc_actions_rubric')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;
      } catch (err) {
        console.error('Error deleting action:', err);
        setError('Failed to delete action');
        return;
      }
    }

    setActions(actions.filter(act => act.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Separate new actions from existing ones
      const newActions = actions.filter(a => a.isNew && a.action.trim() !== '');
      const existingActions = actions.filter(a => !a.isNew);

      // Update existing actions
      for (const act of existingActions) {
        const { error: updateError } = await supabase
          .from('disc_actions_rubric')
          .update({
            action: act.action,
            points_threshold: act.points_threshold,
          })
          .eq('id', act.id);

        if (updateError) throw updateError;
      }

      // Insert new actions
      if (newActions.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('disc_actions_rubric')
          .insert(newActions.map(act => ({
            org_id: orgId,
            action: act.action,
            points_threshold: act.points_threshold,
          })))
          .select();

        if (insertError) throw insertError;

        // Update local state with real IDs
        if (insertedData) {
          setActions(prev => {
            const existingIds = new Set(existingActions.map(a => a.id));
            const filteredPrev = prev.filter(a => existingIds.has(a.id));
            const combined = [...filteredPrev, ...insertedData.map(a => ({ ...a, isNew: false }))];
            // Sort by points_threshold
            return combined.sort((a, b) => {
              const aPoints = a.points_threshold ?? Infinity;
              const bPoints = b.points_threshold ?? Infinity;
              return aPoints - bPoints;
            });
          });
        }
      }

      setHasChanges(false);
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving actions:', err);
      setError('Failed to save actions');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      if (hasChangesRef.current && orgIdRef.current && !disabled) {
        const actionsToSave = actionsRef.current;
        const currentOrgId = orgIdRef.current;
        
        // Fire and forget save
        (async () => {
          try {
            const newActions = actionsToSave.filter(a => a.isNew && a.action.trim() !== '');
            const existingActions = actionsToSave.filter(a => !a.isNew);

            // Update existing
            for (const act of existingActions) {
              await supabase
                .from('disc_actions_rubric')
                .update({
                  action: act.action,
                  points_threshold: act.points_threshold,
                })
                .eq('id', act.id);
            }

            // Insert new
            if (newActions.length > 0) {
              await supabase
                .from('disc_actions_rubric')
                .insert(newActions.map(act => ({
                  org_id: currentOrgId,
                  action: act.action,
                  points_threshold: act.points_threshold,
                })));
            }
          } catch (err) {
            console.error('Error autosaving actions:', err);
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
        <h3 className={sty.introTitle}>Disciplinary Actions</h3>
        <p className={sty.introDescription}>
          Define the disciplinary actions and their point thresholds. Actions are automatically 
          ordered from lowest to highest threshold.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        <div className={sty.header}>
          <span className={sty.headerName}>Action Name</span>
          <span className={sty.headerPoints}>Point Threshold</span>
          <span className={sty.headerActions}></span>
        </div>

        {actions.length === 0 ? (
          <div className={sty.emptyState}>
            No actions configured yet. Click "Add Action" to get started.
          </div>
        ) : (
          actions.map((action) => (
            <div key={action.id} className={sty.row}>
              <StyledTextField
                value={action.action}
                onChange={(e) => handleActionChange(action.id, 'action', e.target.value)}
                placeholder="Action name"
                size="small"
                className={sty.nameField}
                disabled={disabled}
              />
              <StyledTextField
                value={action.points_threshold ?? ''}
                onChange={(e) => handleActionChange(action.id, 'points_threshold', e.target.value ? parseFloat(e.target.value) : null)}
                onBlur={handleThresholdBlur}
                placeholder="Threshold"
                size="small"
                type="number"
                className={sty.pointsField}
                inputProps={{ step: 0.5 }}
                disabled={disabled}
              />
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleDeleteAction(action.id)}
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
            onClick={handleAddAction}
            sx={{
              fontFamily,
              fontSize: 12,
              textTransform: 'none',
              color: '#31664a' /* TODO: Use design token */,
              alignSelf: 'flex-start',
              marginTop: 2,
              '&:hover': {
                backgroundColor: 'rgba(49, 102, 74, 0.08)',
              },
            }}
          >
            Add Action
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DisciplineActionsTab;
