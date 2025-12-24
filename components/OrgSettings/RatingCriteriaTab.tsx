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
import TranslateIcon from '@mui/icons-material/Translate';
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

const LanguageSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 13,
  height: 36,
  minWidth: 110,
  borderRadius: 8,
  backgroundColor: '#ffffff',
  '& .MuiSelect-select': {
    padding: '8px 12px',
    paddingRight: '32px !important',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#31664a',
    borderWidth: 1,
  },
  '& .MuiSvgIcon-root': {
    color: '#6b7280',
    right: 8,
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
  name_es: string;
  description: string;
  description_es: string;
  isNew?: boolean;
}

interface RatingCriteriaTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function RatingCriteriaTab({ orgId, disabled = false }: RatingCriteriaTabProps) {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = React.useState<string>('');
  const [criteria, setCriteria] = React.useState<Criteria[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<'en' | 'es'>('en');
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
          .select('id, position_id, criteria_order, name, name_es, description, description_es')
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

  const handleCriteriaChange = (criteriaOrder: number, field: 'name' | 'name_es' | 'description' | 'description_es', value: string) => {
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

  const handleAutoTranslate = async () => {
    if (!criteria.length) return;
    
    setTranslating(true);
    setError(null);
    
    try {
      // Collect all texts to translate
      const textsToTranslate: string[] = [];
      criteria.forEach(c => {
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
      setCriteria(prev => prev.map((c, idx) => ({
        ...c,
        name_es: translations[idx * 2] || c.name_es,
        description_es: translations[idx * 2 + 1] || c.description_es,
      })));
      
      setHasChanges(true);
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
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
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
              <Button
                variant="outlined"
                size="small"
                startIcon={translating ? <CircularProgress size={14} /> : <TranslateIcon sx={{ fontSize: 16 }} />}
                onClick={handleAutoTranslate}
                disabled={translating || !criteria.length || !selectedPositionId}
                sx={{
                  fontFamily,
                  fontSize: 12,
                  textTransform: 'none',
                  borderColor: '#d1d5db',
                  color: '#4b5563',
                  '&:hover': {
                    borderColor: '#31664a',
                    backgroundColor: 'rgba(49, 102, 74, 0.04)',
                  },
                }}
              >
                {translating ? 'Translating...' : 'Auto-translate'}
              </Button>
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
          {language === 'es' && ' You are editing Spanish translations.'}
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.dropdownRow}>
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
      </div>

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
          </div>
        </div>
      )}
    </div>
  );
}

export default RatingCriteriaTab;
