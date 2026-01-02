import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import sty from './OEPillarMappingTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  borderRadius: 12,
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

interface Pillar {
  id: string;
  name: string;
  display_order: number;
  weight: number;
  description: string;
}

interface PillarMapping {
  position_id: string;
  pillar_1_id: string | null;
  pillar_2_id: string | null;
}

interface OEPillarMappingTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function OEPillarMappingTab({ orgId, disabled = false }: OEPillarMappingTabProps) {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [pillars, setPillars] = React.useState<Pillar[]>([]);
  const [mappings, setMappings] = React.useState<Map<string, PillarMapping>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [descriptionsModalOpen, setDescriptionsModalOpen] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch data
  React.useEffect(() => {
    async function fetchData() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch positions
        const { data: positionsData, error: positionsError } = await supabase
          .from('org_positions')
          .select('id, name, zone')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (positionsError) throw positionsError;
        setPositions(positionsData || []);

        // Fetch pillars
        const { data: pillarsData, error: pillarsError } = await supabase
          .from('oe_pillars')
          .select('id, name, display_order, weight, description')
          .order('display_order', { ascending: true });

        if (pillarsError) throw pillarsError;
        setPillars(pillarsData || []);

        // Fetch existing mappings
        if (positionsData && positionsData.length > 0) {
          const { data: mappingsData, error: mappingsError } = await supabase
            .from('position_pillar_mappings')
            .select('position_id, pillar_1_id, pillar_2_id')
            .in('position_id', positionsData.map(p => p.id));

          if (mappingsError) throw mappingsError;

          // Build mappings map
          const newMappings = new Map<string, PillarMapping>();
          (mappingsData || []).forEach(m => {
            newMappings.set(m.position_id, {
              position_id: m.position_id,
              pillar_1_id: m.pillar_1_id,
              pillar_2_id: m.pillar_2_id,
            });
          });
          setMappings(newMappings);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId, supabase]);

  const savePillarMapping = async (positionId: string, pillar1Id: string | null, pillar2Id: string | null) => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Upsert the mapping
      const { error: upsertError } = await supabase
        .from('position_pillar_mappings')
        .upsert({
          position_id: positionId,
          pillar_1_id: pillar1Id || null,
          pillar_2_id: pillar2Id || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'position_id',
        });

      if (upsertError) throw upsertError;
    } catch (err) {
      console.error('Error saving mapping:', err);
      setError('Failed to save pillar mapping');
    } finally {
      setSaving(false);
    }
  };

  const handlePillarChange = async (positionId: string, pillarNumber: 1 | 2, pillarId: string | null) => {
    const currentMapping = mappings.get(positionId) || {
      position_id: positionId,
      pillar_1_id: null,
      pillar_2_id: null,
    };

    const newMapping = { ...currentMapping };
    if (pillarNumber === 1) {
      newMapping.pillar_1_id = pillarId;
    } else {
      newMapping.pillar_2_id = pillarId;
    }

    // Update local state
    const newMappings = new Map(mappings);
    newMappings.set(positionId, newMapping);
    setMappings(newMappings);

    // Auto-save
    await savePillarMapping(positionId, newMapping.pillar_1_id, newMapping.pillar_2_id);
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

  const renderPositionSection = (sectionPositions: Position[], title: string) => {
    if (sectionPositions.length === 0) return null;

    return (
      <div className={sty.section}>
        <h4 className={sty.sectionTitle}>{title}</h4>
        <div className={sty.positionsList}>
          {sectionPositions.map(pos => {
            const mapping = mappings.get(pos.id);
            const pillar1Id = mapping?.pillar_1_id || '';
            const pillar2Id = mapping?.pillar_2_id || '';

            return (
              <div key={pos.id} className={sty.positionRow}>
                <span className={sty.positionName}>{pos.name}</span>
                <div className={sty.pillarDropdowns}>
                  <div className={sty.pillarDropdownGroup}>
                    <label className={sty.pillarLabel}>Pillar 1</label>
                    <FormControl size="small" sx={{ width: 200 }}>
                      <StyledSelect
                        value={pillar1Id}
                        onChange={(e) => handlePillarChange(pos.id, 1, e.target.value as string || null)}
                        input={<OutlinedInput />}
                        displayEmpty
                        disabled={saving || disabled}
                        MenuProps={{
                          PaperProps: {
                            sx: { maxHeight: 300 }
                          }
                        }}
                      >
                        <MenuItem value="" sx={{ fontFamily, fontSize: 14, color: '#9ca3af' }}>
                          None
                        </MenuItem>
                        {pillars.map((pillar) => (
                          <MenuItem
                            key={pillar.id}
                            value={pillar.id}
                            disabled={pillar.id === pillar2Id}
                            sx={{ fontFamily, fontSize: 14 }}
                          >
                            {pillar.name}
                          </MenuItem>
                        ))}
                      </StyledSelect>
                    </FormControl>
                  </div>
                  <div className={sty.pillarDropdownGroup}>
                    <label className={sty.pillarLabel}>Pillar 2</label>
                    <FormControl size="small" sx={{ width: 200 }}>
                      <StyledSelect
                        value={pillar2Id}
                        onChange={(e) => handlePillarChange(pos.id, 2, e.target.value as string || null)}
                        input={<OutlinedInput />}
                        displayEmpty
                        disabled={saving || disabled}
                        MenuProps={{
                          PaperProps: {
                            sx: { maxHeight: 300 }
                          }
                        }}
                      >
                        <MenuItem value="" sx={{ fontFamily, fontSize: 14, color: '#9ca3af' }}>
                          None
                        </MenuItem>
                        {pillars.map((pillar) => (
                          <MenuItem
                            key={pillar.id}
                            value={pillar.id}
                            disabled={pillar.id === pillar1Id}
                            sx={{ fontFamily, fontSize: 14 }}
                          >
                            {pillar.name}
                          </MenuItem>
                        ))}
                      </StyledSelect>
                    </FormControl>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <h3 className={sty.introTitle} style={{ margin: 0 }}>OE Pillar Mapping</h3>
          <Button
            variant="outlined"
            size="small"
            disableRipple
            startIcon={<InfoOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => setDescriptionsModalOpen(true)}
            sx={{
              fontFamily,
              fontSize: 13,
              textTransform: 'none',
              height: 36,
              minWidth: 150,
              borderRadius: '8px',
              borderColor: '#e5e7eb',
              color: '#4b5563',
              backgroundColor: '#ffffff',
              padding: '8px 12px',
              '&:hover': {
                borderColor: '#31664a',
                backgroundColor: '#ffffff',
              },
              '&:active': {
                backgroundColor: '#ffffff',
              },
            }}
          >
            Pillar Descriptions
          </Button>
        </Box>
        <p className={sty.introDescription}>
          Assign up to two Operation Excellence pillars to each position. These pillars help categorize 
          positions by their primary areas of focus.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        {renderPositionSection(fohPositions, 'FOH Positions')}
        {renderPositionSection(bohPositions, 'BOH Positions')}
      </div>

      {saving && (
        <div className={sty.savingIndicator}>
          <CircularProgress size={16} sx={{ color: '#31664a' }} />
          <span>Saving...</span>
        </div>
      )}

      {/* Pillar Descriptions Modal */}
      <Dialog 
        open={descriptionsModalOpen} 
        onClose={() => setDescriptionsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            maxHeight: '80vh',
          }
        }}
      >
        <DialogTitle sx={{ 
          fontFamily, 
          fontSize: 18, 
          fontWeight: 600, 
          color: '#0d1b14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: 2,
        }}>
          OE Pillar Descriptions
          <IconButton
            onClick={() => setDescriptionsModalOpen(false)}
            size="small"
            sx={{ color: '#6b7280' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ paddingTop: '8px !important' }}>
          <p className={sty.modalSubtitle}>
            These pillars are used to calculate overall operational excellence scores. Each pillar has a weight that determines its contribution to the total score.
          </p>
          <div className={sty.pillarDescriptionsList}>
            {pillars.map((pillar) => (
              <div key={pillar.id} className={sty.pillarDescriptionItem}>
                <div className={sty.pillarDescriptionHeader}>
                  <span className={sty.pillarDescriptionName}>{pillar.name}</span>
                  <span className={sty.pillarDescriptionWeight}>{pillar.weight}%</span>
                </div>
                <p className={sty.pillarDescriptionText}>{pillar.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OEPillarMappingTab;
