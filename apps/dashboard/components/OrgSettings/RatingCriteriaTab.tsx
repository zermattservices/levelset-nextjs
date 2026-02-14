import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Menu from '@mui/material/Menu';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TranslateIcon from '@mui/icons-material/Translate';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ListItemIcon from '@mui/material/ListItemIcon';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import sty from './RatingCriteriaTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const StyledTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    '&:hover fieldset': {
      borderColor: 'var(--ls-color-brand)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'var(--ls-color-brand)',
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
    borderColor: 'var(--ls-color-brand)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
}));

const LanguageSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 13,
  height: 36,
  minWidth: 110,
  borderRadius: 8,
  backgroundColor: 'var(--ls-color-bg-container)',
  '& .MuiSelect-select': {
    padding: '8px 12px',
    paddingRight: '32px !important',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
    borderRadius: 8,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: 1,
  },
  '& .MuiSvgIcon-root': {
    color: 'var(--ls-color-muted)',
    right: 8,
  },
}));

const PillarSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 12,
  height: 32,
  minWidth: 100,
  borderRadius: 6,
  backgroundColor: 'var(--ls-color-bg-container)',
  '& .MuiSelect-select': {
    padding: '4px 8px',
    paddingRight: '24px !important',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-muted-border)',
    borderRadius: 6,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: 1,
  },
  '& .MuiSvgIcon-root': {
    color: 'var(--ls-color-muted)',
    right: 4,
    fontSize: 18,
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

interface Criteria {
  id: string;
  position_id: string;
  criteria_order: number;
  name: string;
  name_es: string;
  description: string;
  description_es: string;
  pillar_1_id: string | null;
  pillar_2_id: string | null;
  isNew?: boolean;
}

interface RatingCriteriaTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function RatingCriteriaTab({ orgId, disabled = false }: RatingCriteriaTabProps) {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [pillars, setPillars] = React.useState<Pillar[]>([]);
  const [selectedPositionId, setSelectedPositionId] = React.useState<string>('');
  const [criteria, setCriteria] = React.useState<Criteria[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<'en' | 'es'>('en');
  const [translateMenuAnchor, setTranslateMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [descriptionsModalOpen, setDescriptionsModalOpen] = React.useState(false);
  const textareaRefs = React.useRef<Map<string, HTMLTextAreaElement>>(new Map());
  
  // Refs for autosave on unmount
  const criteriaRef = React.useRef<Criteria[]>([]);
  const selectedPositionIdRef = React.useRef<string>('');
  const hasChangesRef = React.useRef(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Keep refs in sync
  React.useEffect(() => {
    criteriaRef.current = criteria;
  }, [criteria]);
  
  React.useEffect(() => {
    selectedPositionIdRef.current = selectedPositionId;
  }, [selectedPositionId]);
  
  React.useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // Auto-resize all textareas on criteria load
  React.useEffect(() => {
    textareaRefs.current.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [criteria]);

  // Fetch positions and pillars
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
        
        // Auto-select first position if available
        if (positionsData && positionsData.length > 0 && !selectedPositionId) {
          setSelectedPositionId(positionsData[0].id);
        }

        // Fetch pillars
        const { data: pillarsData, error: pillarsError } = await supabase
          .from('oe_pillars')
          .select('id, name, display_order, weight, description')
          .order('display_order', { ascending: true });

        if (pillarsError) throw pillarsError;
        setPillars(pillarsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
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
          .select('id, position_id, criteria_order, name, name_es, description, description_es, pillar_1_id, pillar_2_id')
          .eq('position_id', selectedPositionId)
          .order('criteria_order', { ascending: true });

        if (fetchError) throw fetchError;

        // Ensure we always have 5 criteria slots
        const existingCriteria = data || [];
        const fullCriteria: Criteria[] = [];
        
        for (let i = 1; i <= 5; i++) {
          const existing = existingCriteria.find(c => c.criteria_order === i);
          if (existing) {
            fullCriteria.push({
              ...existing,
              name_es: existing.name_es || '',
              description_es: existing.description_es || '',
              pillar_1_id: existing.pillar_1_id || null,
              pillar_2_id: existing.pillar_2_id || null,
            });
          } else {
            fullCriteria.push({
              id: `new-${selectedPositionId}-${i}`,
              position_id: selectedPositionId,
              criteria_order: i,
              name: '',
              name_es: '',
              description: '',
              description_es: '',
              pillar_1_id: null,
              pillar_2_id: null,
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

  const handlePositionChange = async (newPositionId: string) => {
    // Auto-save current criteria before switching
    if (hasChanges) {
      await handleSave();
    }
    setSelectedPositionId(newPositionId);
    setHasChanges(false);
  };

  const handleCriteriaChange = (criteriaOrder: number, field: 'name' | 'name_es' | 'description' | 'description_es' | 'pillar_1_id' | 'pillar_2_id', value: string | null) => {
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
          name_es: c.name_es || null,
          description: c.description,
          description_es: c.description_es || null,
          pillar_1_id: c.pillar_1_id || null,
          pillar_2_id: c.pillar_2_id || null,
        }));

      if (criteriaToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('position_criteria')
          .insert(criteriaToInsert);

        if (insertError) throw insertError;
      }

      setHasChanges(false);
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving criteria:', err);
      setError('Failed to save criteria');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      if (hasChangesRef.current && selectedPositionIdRef.current && !disabled) {
        const criteriaToSave = criteriaRef.current;
        const positionId = selectedPositionIdRef.current;
        
        // Fire and forget save
        (async () => {
          try {
            // Delete existing criteria for this position
            await supabase
              .from('position_criteria')
              .delete()
              .eq('position_id', positionId);

            // Insert new criteria (only non-empty ones)
            const criteriaToInsert = criteriaToSave
              .filter(c => c.name.trim() !== '')
              .map(c => ({
                position_id: positionId,
                criteria_order: c.criteria_order,
                name: c.name,
                name_es: c.name_es || null,
                description: c.description,
                description_es: c.description_es || null,
                pillar_1_id: c.pillar_1_id || null,
                pillar_2_id: c.pillar_2_id || null,
              }));

            if (criteriaToInsert.length > 0) {
              await supabase
                .from('position_criteria')
                .insert(criteriaToInsert);
            }
          } catch (err) {
            console.error('Error autosaving criteria:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

  const handleAutoTranslate = async (scope: 'row' | 'position' | 'all', criteriaOrder?: number) => {
    setTranslateMenuAnchor(null);
    
    setTranslating(true);
    setError(null);
    
    try {
      if (scope === 'all') {
        // Translate criteria for ALL positions
        const { data: allCriteria, error: fetchError } = await supabase
          .from('position_criteria')
          .select('id, position_id, name, description')
          .in('position_id', positions.map(p => p.id));
        
        if (fetchError) throw fetchError;
        if (!allCriteria?.length) {
          setTranslating(false);
          return;
        }
        
        // Collect texts to translate
        const textsToTranslate: string[] = [];
        allCriteria.forEach(c => {
          textsToTranslate.push(c.name || '');
          textsToTranslate.push(c.description || '');
        });
        
        // Call translation API
        const response = await fetch('/api/admin/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: textsToTranslate,
            targetLang: 'ES',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Translation failed');
        }
        
        const { translations } = await response.json();
        
        // Update all criteria in DB
        const updates = allCriteria.map((c, idx) => ({
          id: c.id,
          name_es: translations[idx * 2] || null,
          description_es: translations[idx * 2 + 1] || null,
        }));
        
        for (const update of updates) {
          await supabase
            .from('position_criteria')
            .update({ name_es: update.name_es, description_es: update.description_es })
            .eq('id', update.id);
        }
        
        // Refresh current position's criteria if currently viewing
        if (selectedPositionId) {
          const currentPosCriteria = allCriteria.filter(c => c.position_id === selectedPositionId);
          setCriteria(prev => prev.map(c => {
            const updated = currentPosCriteria.find(u => u.id === c.id);
            if (updated) {
              const idx = allCriteria.findIndex(ac => ac.id === c.id);
              return {
                ...c,
                name_es: translations[idx * 2] || c.name_es,
                description_es: translations[idx * 2 + 1] || c.description_es,
              };
            }
            return c;
          }));
        }
      } else {
        // Translate criteria for current position only (or single row)
        const criteriaToTranslate = scope === 'row' && criteriaOrder !== undefined
          ? criteria.filter(c => c.criteria_order === criteriaOrder)
          : criteria;
        
        if (!criteriaToTranslate.length) {
          setTranslating(false);
          return;
        }
        
        // Collect texts to translate
        const textsToTranslate: string[] = [];
        criteriaToTranslate.forEach(c => {
          textsToTranslate.push(c.name || '');
          textsToTranslate.push(c.description || '');
        });
        
        // Call translation API
        const response = await fetch('/api/admin/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: textsToTranslate,
            targetLang: 'ES',
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Translation failed');
        }
        
        const { translations } = await response.json();
        
        // Apply translations to criteria
        if (scope === 'position') {
          setCriteria(prev => prev.map((c, idx) => ({
            ...c,
            name_es: translations[idx * 2] || c.name_es,
            description_es: translations[idx * 2 + 1] || c.description_es,
          })));
        } else if (scope === 'row' && criteriaOrder !== undefined) {
          setCriteria(prev => prev.map(c => 
            c.criteria_order === criteriaOrder
              ? {
                  ...c,
                  name_es: translations[0] || c.name_es,
                  description_es: translations[1] || c.description_es,
                }
              : c
          ));
        }
        
        setHasChanges(true);
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || 'Failed to auto-translate');
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  const fohPositions = positions.filter(p => p.zone === 'FOH');
  const bohPositions = positions.filter(p => p.zone === 'BOH');

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <h3 className={sty.introTitle} style={{ margin: 0 }}>Rating Criteria</h3>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {language === 'es' && !disabled && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  disableRipple
                  startIcon={translating ? <CircularProgress size={14} /> : <TranslateIcon sx={{ fontSize: 16 }} />}
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: 18, marginLeft: -0.5, transform: translateMenuAnchor ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
                  onClick={(e) => setTranslateMenuAnchor(e.currentTarget)}
                  disabled={translating || !criteria.length || !selectedPositionId}
                  sx={{
                    fontFamily,
                    fontSize: 13,
                    textTransform: 'none',
                    height: 36,
                    minWidth: 110,
                    borderRadius: '8px',
                    borderColor: translateMenuAnchor ? 'var(--ls-color-brand)' : 'var(--ls-color-muted-border)',
                    color: 'var(--ls-color-text-secondary)',
                    backgroundColor: 'var(--ls-color-bg-container)',
                    padding: '8px 12px',
                    '&:hover': {
                      borderColor: 'var(--ls-color-brand)',
                      backgroundColor: 'var(--ls-color-bg-container)',
                    },
                    '&:active': {
                      backgroundColor: 'var(--ls-color-bg-container)',
                    },
                  }}
                >
                  {translating ? 'Translating...' : 'Translate'}
                </Button>
                <Menu
                  anchorEl={translateMenuAnchor}
                  open={Boolean(translateMenuAnchor)}
                  onClose={() => setTranslateMenuAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  transitionDuration={200}
                  slotProps={{
                    paper: {
                      sx: {
                        minWidth: translateMenuAnchor?.offsetWidth || 110,
                        marginTop: '4px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      }
                    }
                  }}
                >
                  <MenuItem 
                    onClick={() => handleAutoTranslate('position')}
                    sx={{ fontFamily, fontSize: 13, py: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CropSquareIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                    </ListItemIcon>
                    This position
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleAutoTranslate('all')}
                    sx={{ fontFamily, fontSize: 13, py: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <ViewModuleIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                    </ListItemIcon>
                    All positions
                  </MenuItem>
                </Menu>
              </>
            )}
            <LanguageSelect
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
              size="small"
            >
              <MenuItem value="en" sx={{ fontFamily, fontSize: 13 }}>English</MenuItem>
              <MenuItem value="es" sx={{ fontFamily, fontSize: 13 }}>Español</MenuItem>
            </LanguageSelect>
          </Box>
        </Box>
        <p className={sty.introDescription}>
          Define the 5 rating criteria for each position. These criteria will be used when 
          submitting positional ratings.
          {language === 'es' && ' You are editing Spanish translations. Use the Translate dropdown to translate this position or all positions at once.'}
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.dropdownRow}>
        <div className={sty.dropdownLeft}>
          <label className={sty.dropdownLabel}>Select a position:</label>
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
                <ListSubheader sx={{ fontFamily, fontWeight: 600, color: 'var(--ls-color-brand)' }}>
                  FOH Positions
                </ListSubheader>
              )}
              {fohPositions.map(pos => (
                <MenuItem key={pos.id} value={pos.id} sx={{ fontFamily }}>
                  {pos.name}
                </MenuItem>
              ))}
              {bohPositions.length > 0 && (
                <ListSubheader sx={{ fontFamily, fontWeight: 600, color: 'var(--ls-color-brand)' }}>
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
        </div>
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
            borderColor: 'var(--ls-color-muted-border)',
            color: 'var(--ls-color-text-secondary)',
            backgroundColor: 'var(--ls-color-bg-container)',
            padding: '8px 12px',
            '&:hover': {
              borderColor: 'var(--ls-color-brand)',
              backgroundColor: 'var(--ls-color-bg-container)',
            },
            '&:active': {
              backgroundColor: 'var(--ls-color-bg-container)',
            },
          }}
        >
          Pillar Descriptions
        </Button>
      </div>

      {selectedPositionId && (
        <div className={sty.scrollContainer}>
          <div className={sty.criteriaHeader}>
            <span className={sty.headerNumber}>#</span>
            <span className={sty.headerCriteriaName}>Criteria Name</span>
            <span className={sty.headerDescription}>Description</span>
            <span className={sty.headerPillar}>Pillar 1</span>
            <span className={sty.headerPillar}>Pillar 2</span>
          </div>

          <div className={sty.criteriaList}>
            {criteria.map((c, index) => (
              <div key={c.criteria_order} className={sty.criteriaRow}>
                <span className={sty.criteriaNumber}>{index + 1}</span>
                <StyledTextField
                  value={language === 'es' ? c.name_es : c.name}
                  onChange={(e) => handleCriteriaChange(c.criteria_order, language === 'es' ? 'name_es' : 'name', e.target.value)}
                  placeholder={language === 'es' ? 'Nombre del criterio' : 'Criteria name'}
                  size="small"
                  className={sty.criteriaNameField}
                  disabled={disabled}
                />
                <textarea
                  ref={(el) => {
                    if (el) textareaRefs.current.set(`${c.criteria_order}-${language}`, el);
                  }}
                  value={language === 'es' ? c.description_es : c.description}
                  onChange={(e) => {
                    handleCriteriaChange(c.criteria_order, language === 'es' ? 'description_es' : 'description', e.target.value);
                    // Auto-grow
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder={language === 'es' ? 'Descripción (opcional)' : 'Description (optional)'}
                  className={sty.descriptionTextarea}
                  rows={1}
                  disabled={disabled}
                />
                <FormControl size="small" className={sty.pillarField}>
                  <PillarSelect
                    value={c.pillar_1_id || ''}
                    onChange={(e) => handleCriteriaChange(c.criteria_order, 'pillar_1_id', e.target.value as string || null)}
                    displayEmpty
                    disabled={disabled}
                    MenuProps={{
                      PaperProps: {
                        sx: { maxHeight: 250 }
                      }
                    }}
                  >
                    <MenuItem value="" sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-disabled-text)' }}>
                      None
                    </MenuItem>
                    {pillars.map((pillar) => (
                      <MenuItem
                        key={pillar.id}
                        value={pillar.id}
                        disabled={pillar.id === c.pillar_2_id}
                        sx={{ fontFamily, fontSize: 12 }}
                      >
                        {pillar.name}
                      </MenuItem>
                    ))}
                  </PillarSelect>
                </FormControl>
                <FormControl size="small" className={sty.pillarField}>
                  <PillarSelect
                    value={c.pillar_2_id || ''}
                    onChange={(e) => handleCriteriaChange(c.criteria_order, 'pillar_2_id', e.target.value as string || null)}
                    displayEmpty
                    disabled={disabled}
                    MenuProps={{
                      PaperProps: {
                        sx: { maxHeight: 250 }
                      }
                    }}
                  >
                    <MenuItem value="" sx={{ fontFamily, fontSize: 12, color: 'var(--ls-color-disabled-text)' }}>
                      None
                    </MenuItem>
                    {pillars.map((pillar) => (
                      <MenuItem
                        key={pillar.id}
                        value={pillar.id}
                        disabled={pillar.id === c.pillar_1_id}
                        sx={{ fontFamily, fontSize: 12 }}
                      >
                        {pillar.name}
                      </MenuItem>
                    ))}
                  </PillarSelect>
                </FormControl>
                {!disabled && language === 'es' && (
                  <IconButton
                    size="small"
                    onClick={() => handleAutoTranslate('row', c.criteria_order)}
                    disabled={translating}
                    title="Translate this criteria"
                    sx={{ color: 'var(--ls-color-muted)', '&:hover': { color: 'var(--ls-color-brand)' } }}
                  >
                    <TranslateIcon fontSize="small" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!disabled && (
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
                  borderColor: 'var(--ls-color-brand)',
                  color: 'var(--ls-color-brand)',
                  '&:hover': {
                    borderColor: 'var(--ls-color-brand)',
                    backgroundColor: 'rgba(49, 102, 74, 0.08)',
                  },
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
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
            sx={{ color: 'var(--ls-color-muted)' }}
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

export default RatingCriteriaTab;
