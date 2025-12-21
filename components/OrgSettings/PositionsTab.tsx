import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './PositionsTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const BrandCheckbox = styled(Checkbox)(() => ({
  color: "#9ca3af",
  padding: 4,
  "&.Mui-checked": {
    color: "#31664a",
  },
  "&:hover": {
    backgroundColor: "rgba(49, 102, 74, 0.08)",
  },
}));

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

interface Position {
  id: string;
  name: string;
  zone: 'FOH' | 'BOH';
  description: string;
  display_order: number;
  is_active: boolean;
  isNew?: boolean;
}

interface PositionsTabProps {
  orgId: string | null;
  onComplete: (complete: boolean) => void;
  onNext: () => void;
}

export function PositionsTab({ orgId, onComplete, onNext }: PositionsTabProps) {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const textareaRefs = React.useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Auto-resize all textareas on initial load
  React.useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [positions]);

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
          .select('*')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        setPositions(data || []);
        onComplete((data || []).length > 0);
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to load positions');
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [orgId, supabase, onComplete]);

  const handleAddPosition = (zone: 'FOH' | 'BOH') => {
    const newPosition: Position = {
      id: `new-${Date.now()}`,
      name: '',
      zone,
      description: '',
      display_order: positions.length,
      is_active: true,
      isNew: true,
    };
    setPositions([...positions, newPosition]);
    setHasChanges(true);
  };

  const handlePositionChange = (id: string, field: keyof Position, value: any) => {
    setPositions(positions.map(pos => 
      pos.id === id ? { ...pos, [field]: value } : pos
    ));
    setHasChanges(true);
  };

  const handleZoneChange = (id: string, zone: 'FOH' | 'BOH', checked: boolean) => {
    if (checked) {
      handlePositionChange(id, 'zone', zone);
    }
  };

  const handleDeletePosition = (id: string) => {
    setPositions(positions.filter(pos => pos.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Separate new positions from existing ones
      const newPositions = positions.filter(p => p.isNew);
      const existingPositions = positions.filter(p => !p.isNew);

      // Update existing positions
      for (const pos of existingPositions) {
        const { error: updateError } = await supabase
          .from('org_positions')
          .update({
            name: pos.name,
            zone: pos.zone,
            description: pos.description,
            display_order: pos.display_order,
          })
          .eq('id', pos.id);

        if (updateError) throw updateError;
      }

      // Insert new positions
      if (newPositions.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('org_positions')
          .insert(newPositions.map(pos => ({
            org_id: orgId,
            name: pos.name,
            zone: pos.zone,
            description: pos.description,
            display_order: pos.display_order,
            is_active: true,
          })))
          .select();

        if (insertError) throw insertError;

        // Update local state with real IDs
        if (insertedData) {
          setPositions(prev => {
            const existingIds = new Set(existingPositions.map(p => p.id));
            const filteredPrev = prev.filter(p => existingIds.has(p.id));
            return [...filteredPrev, ...insertedData.map(p => ({ ...p, isNew: false }))];
          });
        }
      }

      setHasChanges(false);
      onComplete(positions.length > 0);
    } catch (err) {
      console.error('Error saving positions:', err);
      setError('Failed to save positions');
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

  const handleTextareaChange = (id: string, value: string, textarea: HTMLTextAreaElement) => {
    handlePositionChange(id, 'description', value);
    // Auto-grow
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
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
  const canProceed = positions.length > 0 && positions.every(p => p.name.trim() !== '');

  const renderPositionSection = (sectionPositions: Position[], zone: 'FOH' | 'BOH', title: string) => (
    <div className={sty.section}>
      <div className={sty.sectionHeader}>
        <h4 className={sty.sectionTitle}>{title}</h4>
        <Button
          variant="text"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleAddPosition(zone)}
          sx={{
            fontFamily,
            fontSize: 12,
            textTransform: 'none',
            color: '#31664a',
            '&:hover': {
              backgroundColor: 'rgba(49, 102, 74, 0.08)',
            },
          }}
        >
          Add {zone} Position
        </Button>
      </div>

      <div className={sty.positionsHeader}>
        <span className={sty.headerName}>Position Name</span>
        <span className={sty.headerDescription}>Description</span>
        <span className={sty.headerActions}></span>
      </div>

      {sectionPositions.length === 0 ? (
        <div className={sty.emptySection}>No {zone} positions yet</div>
      ) : (
        sectionPositions.map((position) => (
          <div key={position.id} className={sty.positionRow}>
            <StyledTextField
              value={position.name}
              onChange={(e) => handlePositionChange(position.id, 'name', e.target.value)}
              placeholder="Position name"
              size="small"
              className={sty.nameField}
            />
            <textarea
              ref={(el) => {
                if (el) textareaRefs.current.set(position.id, el);
              }}
              value={position.description}
              onChange={(e) => handleTextareaChange(position.id, e.target.value, e.target)}
              placeholder="Position description..."
              className={sty.descriptionField}
              rows={1}
            />
            <IconButton
              size="small"
              onClick={() => handleDeletePosition(position.id)}
              className={sty.deleteButton}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Manage Positions</h3>
        <p className={sty.introDescription}>
          Define the positions available for positional ratings in your organization. 
          Each position needs a name and an optional description.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        {renderPositionSection(fohPositions, 'FOH', 'FOH Positions')}
        {renderPositionSection(bohPositions, 'BOH', 'BOH Positions')}
      </div>

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
            disabled={!canProceed || saving}
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

export default PositionsTab;
