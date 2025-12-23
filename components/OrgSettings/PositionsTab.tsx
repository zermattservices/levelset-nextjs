import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TranslateIcon from '@mui/icons-material/Translate';
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

const LanguageSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 13,
  height: 32,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#d1d5db',
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
  name_es: string;
  zone: 'FOH' | 'BOH';
  description: string;
  description_es: string;
  display_order: number;
  is_active: boolean;
  isNew?: boolean;
}

interface PositionsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function PositionsTab({ orgId, disabled = false }: PositionsTabProps) {
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [language, setLanguage] = React.useState<'en' | 'es'>('en');
  const textareaRefs = React.useRef<Map<string, HTMLTextAreaElement>>(new Map());
  
  // Refs to track current state for autosave on unmount
  const positionsRef = React.useRef<Position[]>([]);
  const hasChangesRef = React.useRef(false);
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Keep refs in sync with state
  React.useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);
  
  React.useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);
  
  React.useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

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
          .select('id, name, name_es, zone, description, description_es, display_order, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        setPositions((data || []).map(p => ({
          ...p,
          name_es: p.name_es || '',
          description_es: p.description_es || '',
        })));
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to load positions');
      } finally {
        setLoading(false);
      }
    }

    fetchPositions();
  }, [orgId, supabase]);

  const handleAddPosition = (zone: 'FOH' | 'BOH') => {
    const newPosition: Position = {
      id: `new-${Date.now()}`,
      name: '',
      name_es: '',
      zone,
      description: '',
      description_es: '',
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
            name_es: pos.name_es || null,
            zone: pos.zone,
            description: pos.description,
            description_es: pos.description_es || null,
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
            name_es: pos.name_es || null,
            zone: pos.zone,
            description: pos.description,
            description_es: pos.description_es || null,
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
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving positions:', err);
      setError('Failed to save positions');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      // Save if there are unsaved changes when unmounting
      if (hasChangesRef.current && orgIdRef.current && !disabled) {
        const positionsToSave = positionsRef.current;
        const currentOrgId = orgIdRef.current;
        
        // Fire and forget save
        (async () => {
          try {
            const newPositions = positionsToSave.filter(p => p.isNew);
            const existingPositions = positionsToSave.filter(p => !p.isNew);

            // Update existing positions
            for (const pos of existingPositions) {
              await supabase
                .from('org_positions')
                .update({
                  name: pos.name,
                  name_es: pos.name_es || null,
                  zone: pos.zone,
                  description: pos.description,
                  description_es: pos.description_es || null,
                  display_order: pos.display_order,
                })
                .eq('id', pos.id);
            }

            // Insert new positions
            if (newPositions.length > 0) {
              await supabase
                .from('org_positions')
                .insert(newPositions.map(pos => ({
                  org_id: currentOrgId,
                  name: pos.name,
                  name_es: pos.name_es || null,
                  zone: pos.zone,
                  description: pos.description,
                  description_es: pos.description_es || null,
                  display_order: pos.display_order,
                  is_active: true,
                })));
            }
          } catch (err) {
            console.error('Error autosaving positions:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

  const handleTextareaChange = (id: string, field: 'description' | 'description_es', value: string, textarea: HTMLTextAreaElement) => {
    handlePositionChange(id, field, value);
    // Auto-grow
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleAutoTranslate = async () => {
    if (!positions.length) return;
    
    setTranslating(true);
    setError(null);
    
    try {
      // Collect all texts to translate
      const textsToTranslate: string[] = [];
      positions.forEach(pos => {
        textsToTranslate.push(pos.name || '');
        textsToTranslate.push(pos.description || '');
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
      
      // Apply translations to positions
      setPositions(prev => prev.map((pos, idx) => ({
        ...pos,
        name_es: translations[idx * 2] || pos.name_es,
        description_es: translations[idx * 2 + 1] || pos.description_es,
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

  const renderPositionSection = (sectionPositions: Position[], zone: 'FOH' | 'BOH', title: string) => (
    <div className={sty.section}>
      <div className={sty.sectionHeader}>
        <h4 className={sty.sectionTitle}>{title}</h4>
        {!disabled && (
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
        )}
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
              value={language === 'es' ? position.name_es : position.name}
              onChange={(e) => handlePositionChange(position.id, language === 'es' ? 'name_es' : 'name', e.target.value)}
              placeholder={language === 'es' ? 'Nombre de la posición' : 'Position name'}
              size="small"
              className={sty.nameField}
              disabled={disabled}
            />
            <textarea
              ref={(el) => {
                if (el) textareaRefs.current.set(`${position.id}-${language}`, el);
              }}
              value={language === 'es' ? position.description_es : position.description}
              onChange={(e) => handleTextareaChange(position.id, language === 'es' ? 'description_es' : 'description', e.target.value, e.target)}
              placeholder={language === 'es' ? 'Descripción de la posición...' : 'Position description...'}
              className={sty.descriptionField}
              rows={1}
              disabled={disabled}
            />
            {!disabled && language === 'en' && (
              <IconButton
                size="small"
                onClick={() => handleDeletePosition(position.id)}
                className={sty.deleteButton}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <h3 className={sty.introTitle} style={{ margin: 0 }}>Manage Positions</h3>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {language === 'es' && !disabled && (
              <Button
                variant="outlined"
                size="small"
                startIcon={translating ? <CircularProgress size={14} /> : <TranslateIcon sx={{ fontSize: 16 }} />}
                onClick={handleAutoTranslate}
                disabled={translating || !positions.length}
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
          Define the positions available for positional ratings in your organization. 
          Each position needs a name and an optional description.
          {language === 'es' && ' You are editing Spanish translations.'}
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        {renderPositionSection(fohPositions, 'FOH', 'FOH Positions')}
        {renderPositionSection(bohPositions, 'BOH', 'BOH Positions')}
      </div>

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

export default PositionsTab;
