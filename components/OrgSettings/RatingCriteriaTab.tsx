import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './RatingCriteriaTab.module.css';
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

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  borderRadius: 12,
  height: 40,
  '& .MuiSelect-select': {
    padding: '8px 14px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e0e0e0',
    borderRadius: 12,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
}));

interface Position {
  id: string;
  name: string;
  zone: 'FOH' | 'BOH';
}

interface Criteria {
  id: string;
  position_id: string;
  criteria_order: number;
  name: string;
  description: string;
  isNew?: boolean;
}

interface RatingCriteriaTabProps {
  orgId: string | null;
  onComplete: (complete: boolean) => void;
  onNext: () => void;
}

export function RatingCriteriaTab({ orgId, onComplete, onNext }: RatingCriteriaTabProps) {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = React.useState<string>('');
  const [criteria, setCriteria] = React.useState<Criteria[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch positions
  React.useEffect(() => {
    async function fetchPositions() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('org_positions')
          .select('id, name, zone')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        setPositions(data || []);
        
        // Auto-select first position if available
        if (data && data.length > 0 && !selectedPositionId) {
          setSelectedPositionId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to load positions');
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [orgId, supabase]);

  // Fetch criteria for selected position
  React.useEffect(() => {
    async function fetchCriteria() {
      if (!selectedPositionId) {
        setCriteria([]);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('position_criteria')
          .select('*')
          .eq('position_id', selectedPositionId)
          .order('criteria_order', { ascending: true });

        if (fetchError) throw fetchError;

        // Ensure we always have 5 criteria slots
        const existingCriteria = data || [];
        const fullCriteria: Criteria[] = [];
        
        for (let i = 1; i <= 5; i++) {
          const existing = existingCriteria.find(c => c.criteria_order === i);
          if (existing) {
            fullCriteria.push(existing);
          } else {
            fullCriteria.push({
              id: `new-${selectedPositionId}-${i}`,
              position_id: selectedPositionId,
              criteria_order: i,
              name: '',
              description: '',
              isNew: true,
            });
          }
        }

        setCriteria(fullCriteria);
      } catch (err) {
        console.error('Error fetching criteria:', err);
        setError('Failed to load criteria');
      }
    }

    fetchCriteria();
  }, [selectedPositionId, supabase]);

  // Check completion status
  React.useEffect(() => {
    async function checkCompletion() {
      if (!orgId || positions.length === 0) {
        onComplete(false);
        return;
      }

      try {
        // Check if all positions have at least one criteria
        const { data, error: fetchError } = await supabase
          .from('position_criteria')
          .select('position_id')
          .in('position_id', positions.map(p => p.id));

        if (fetchError) throw fetchError;

        const positionsWithCriteria = new Set((data || []).map(c => c.position_id));
        const allComplete = positions.every(p => positionsWithCriteria.has(p.id));
        onComplete(allComplete);
      } catch (err) {
        console.error('Error checking completion:', err);
        onComplete(false);
      }
    }

    checkCompletion();
  }, [orgId, positions, supabase, onComplete]);

  const handlePositionChange = async (newPositionId: string) => {
    // Auto-save current criteria before switching
    if (hasChanges) {
      await handleSave();
    }
    setSelectedPositionId(newPositionId);
    setHasChanges(false);
  };

  const handleCriteriaChange = (criteriaOrder: number, field: 'name' | 'description', value: string) => {
    setCriteria(criteria.map(c =>
      c.criteria_order === criteriaOrder ? { ...c, [field]: value } : c
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedPositionId) return;

    setSaving(true);
    setError(null);

    try {
      // Delete existing criteria for this position
      const { error: deleteError } = await supabase
        .from('position_criteria')
        .delete()
        .eq('position_id', selectedPositionId);

      if (deleteError) throw deleteError;

      // Insert new criteria (only non-empty ones)
      const criteriaToInsert = criteria
        .filter(c => c.name.trim() !== '')
        .map(c => ({
          position_id: selectedPositionId,
          criteria_order: c.criteria_order,
          name: c.name,
          description: c.description,
        }));

      if (criteriaToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('position_criteria')
          .insert(criteriaToInsert);

        if (insertError) throw insertError;
      }

      setHasChanges(false);
    } catch (err) {
      console.error('Error saving criteria:', err);
      setError('Failed to save criteria');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (hasChanges) {
      await handleSave();
    }
    onNext();
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  const fohPositions = positions.filter(p => p.zone === 'FOH');
  const bohPositions = positions.filter(p => p.zone === 'BOH');
  const hasAnyCriteria = criteria.some(c => c.name.trim() !== '');

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Rating Criteria</h3>
        <p className={sty.introDescription}>
          Define the 5 rating criteria for each position. These criteria will be used when 
          submitting positional ratings.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <FormControl sx={{ width: 280 }}>
        <StyledSelect
          value={selectedPositionId}
          onChange={(e) => handlePositionChange(e.target.value as string)}
          displayEmpty
          renderValue={(value) => {
            if (!value) return <span className={sty.placeholder}>Select a position</span>;
            const pos = positions.find(p => p.id === value);
            return pos ? `${pos.name} (${pos.zone})` : '';
          }}
        >
          {fohPositions.length > 0 && (
            <ListSubheader sx={{ fontFamily, fontWeight: 600, color: '#31664a' }}>
              FOH Positions
            </ListSubheader>
          )}
          {fohPositions.map(pos => (
            <MenuItem key={pos.id} value={pos.id} sx={{ fontFamily }}>
              {pos.name}
            </MenuItem>
          ))}
          {bohPositions.length > 0 && (
            <ListSubheader sx={{ fontFamily, fontWeight: 600, color: '#31664a' }}>
              BOH Positions
            </ListSubheader>
          )}
          {bohPositions.map(pos => (
            <MenuItem key={pos.id} value={pos.id} sx={{ fontFamily }}>
              {pos.name}
            </MenuItem>
          ))}
        </StyledSelect>
      </FormControl>

      {selectedPositionId && (
        <div className={sty.scrollContainer}>
          <div className={sty.criteriaHeader}>
            <span className={sty.headerNumber}>#</span>
            <span className={sty.headerCriteriaName}>Criteria Name</span>
            <span className={sty.headerDescription}>Description</span>
          </div>

          <div className={sty.criteriaList}>
            {criteria.map((c, index) => (
              <div key={c.criteria_order} className={sty.criteriaRow}>
                <span className={sty.criteriaNumber}>{index + 1}</span>
                <StyledTextField
                  value={c.name}
                  onChange={(e) => handleCriteriaChange(c.criteria_order, 'name', e.target.value)}
                  placeholder="Criteria name"
                  size="small"
                  className={sty.criteriaNameField}
                />
                <StyledTextField
                  value={c.description}
                  onChange={(e) => handleCriteriaChange(c.criteria_order, 'description', e.target.value)}
                  placeholder="Description (optional)"
                  size="small"
                  className={sty.criteriaDescriptionField}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={sty.actions}>
        <div></div>
        <div className={sty.rightActions}>
          {hasChanges && (
            <Button
              variant="outlined"
              onClick={handleSave}
              disabled={saving}
              sx={{
                fontFamily,
                textTransform: 'none',
                borderColor: '#31664a',
                color: '#31664a',
                '&:hover': {
                  borderColor: '#31664a',
                  backgroundColor: 'rgba(49, 102, 74, 0.08)',
                },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!hasAnyCriteria || saving}
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
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RatingCriteriaTab;
