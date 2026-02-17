import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './SchedulingPositionsTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

// Colors matching PositionalRatings.tsx AreaPill
const fohColor = '#006391';
const bohColor = '#ffcc5b';
const fohColorLight = '#eaf9ff';
const bohColorLight = '#fffcf0';
const customColor = 'var(--ls-color-brand)';
const customColorLight = 'rgba(49, 102, 74, 0.08)';

const AreaPill = styled(Box)<{ selected?: boolean; areaType: 'FOH' | 'BOH' | 'custom' }>(({ selected, areaType }) => {
  const baseColor = areaType === 'FOH' ? fohColor : areaType === 'BOH' ? bohColor : customColor;
  const lightColor = areaType === 'FOH' ? fohColorLight : areaType === 'BOH' ? bohColorLight : customColorLight;

  return {
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: selected ? baseColor : lightColor,
    color: selected ? '#ffffff' : baseColor,
    border: `2px solid ${baseColor}`,
    '&:hover': {
      opacity: 0.9,
    },
  };
});

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

const BrandSwitch = styled(Switch)(() => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: 'var(--ls-color-brand)',
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: 'var(--ls-color-brand)',
  },
}));

/**
 * A position row in local state.
 * - Standard positions come from the DB and are read-only (name locked, type locked).
 *   They get a toggle to enable/disable for scheduling.
 * - scheduling_only positions are created on this page. Their name is editable.
 */
interface PositionLocal {
  id: string;
  name: string;
  zone: 'FOH' | 'BOH';
  display_order: number;
  is_active: boolean;
  position_type: 'standard' | 'scheduling_only';
  area_id: string | null;
  scheduling_enabled: boolean;
  isNew?: boolean;
}

interface AreaLocal {
  id: string;
  name: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  isNew?: boolean;
}

interface SchedulingPositionsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function SchedulingPositionsTab({ orgId, disabled = false }: SchedulingPositionsTabProps) {
  const [positions, setPositions] = React.useState<PositionLocal[]>([]);
  const [areas, setAreas] = React.useState<AreaLocal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = React.useState<string | null>(null);
  const [addAreaOpen, setAddAreaOpen] = React.useState(false);
  const [newAreaName, setNewAreaName] = React.useState('');

  // Refs for autosave on unmount
  const positionsRef = React.useRef<PositionLocal[]>([]);
  const areasRef = React.useRef<AreaLocal[]>([]);
  const hasChangesRef = React.useRef(false);
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  React.useEffect(() => { positionsRef.current = positions; }, [positions]);
  React.useEffect(() => { areasRef.current = areas; }, [areas]);
  React.useEffect(() => { hasChangesRef.current = hasChanges; }, [hasChanges]);
  React.useEffect(() => { orgIdRef.current = orgId; }, [orgId]);

  // Fetch areas then positions
  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch areas
        const { data: areasData, error: areasError } = await supabase
          .from('scheduling_areas')
          .select('id, name, display_order, is_default, is_active')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (areasError) throw areasError;
        if (cancelled) return;

        let finalAreas: AreaLocal[] = areasData || [];

        // Seed defaults if no areas exist (new org)
        if (finalAreas.length === 0) {
          const defaults = [
            { org_id: orgId, name: 'FOH', display_order: 0, is_default: true },
            { org_id: orgId, name: 'BOH', display_order: 1, is_default: true },
            { org_id: orgId, name: 'Administrative', display_order: 2, is_default: true },
          ];
          const { data: seeded, error: seedErr } = await supabase
            .from('scheduling_areas')
            .upsert(defaults, { onConflict: 'org_id,name' })
            .select('id, name, display_order, is_default, is_active');

          if (!seedErr && seeded) {
            finalAreas = seeded;
          } else {
            const { data: reFetched } = await supabase
              .from('scheduling_areas')
              .select('id, name, display_order, is_default, is_active')
              .eq('org_id', orgId)
              .eq('is_active', true)
              .order('display_order', { ascending: true });
            finalAreas = reFetched || [];
          }
        }

        if (cancelled) return;
        setAreas(finalAreas);
        if (finalAreas.length > 0) setSelectedAreaId(finalAreas[0].id);

        // 2. Fetch positions
        const { data: posData, error: posError } = await supabase
          .from('org_positions')
          .select('id, name, zone, display_order, is_active, position_type, area_id, scheduling_enabled')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (posError) throw posError;
        if (cancelled) return;

        setPositions((posData || []).map(p => ({
          ...p,
          position_type: (p.position_type || 'standard') as 'standard' | 'scheduling_only',
          area_id: p.area_id || null,
          scheduling_enabled: p.scheduling_enabled ?? true,
        })));
      } catch (err) {
        console.error('Error fetching scheduling positions data:', err);
        if (!cancelled) setError('Failed to load data. Please try refreshing the page.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [orgId, supabase]);

  /** Map position to area: use area_id if set, else match zone name to a default area */
  const getPositionAreaId = React.useCallback(
    (position: PositionLocal): string | null => {
      if (position.area_id) return position.area_id;
      const match = areas.find(a => a.name.toUpperCase() === position.zone.toUpperCase());
      return match ? match.id : null;
    },
    [areas]
  );

  const getZoneForArea = (area: AreaLocal): 'FOH' | 'BOH' => {
    if (area.name.toUpperCase() === 'BOH') return 'BOH';
    return 'FOH';
  };

  // --- Position handlers ---

  const handleToggleSchedulingEnabled = (id: string) => {
    setPositions(positions.map(pos =>
      pos.id === id ? { ...pos, scheduling_enabled: !pos.scheduling_enabled } : pos
    ));
    setHasChanges(true);
  };

  const handleAddPosition = (areaId: string, zone: 'FOH' | 'BOH') => {
    const areaPositions = positions.filter(p => getPositionAreaId(p) === areaId);
    const newPos: PositionLocal = {
      id: `new-${Date.now()}`,
      name: '',
      zone,
      display_order: areaPositions.length,
      is_active: true,
      position_type: 'scheduling_only',
      area_id: areaId,
      scheduling_enabled: true,
      isNew: true,
    };
    setPositions([...positions, newPos]);
    setHasChanges(true);
  };

  const handlePositionNameChange = (id: string, name: string) => {
    setPositions(positions.map(pos =>
      pos.id === id ? { ...pos, name } : pos
    ));
    setHasChanges(true);
  };

  const handleDeletePosition = (id: string) => {
    const pos = positions.find(p => p.id === id);
    if (!pos || pos.position_type === 'standard') return;
    setPositions(positions.filter(p => p.id !== id));
    setHasChanges(true);
  };

  // --- Area handlers ---

  const handleAddArea = () => {
    if (!newAreaName.trim()) return;
    const newArea: AreaLocal = {
      id: `new-area-${Date.now()}`,
      name: newAreaName.trim(),
      display_order: areas.length,
      is_default: false,
      is_active: true,
      isNew: true,
    };
    setAreas([...areas, newArea]);
    setSelectedAreaId(newArea.id);
    setNewAreaName('');
    setAddAreaOpen(false);
    setHasChanges(true);
  };

  const handleDeleteArea = async (areaId: string) => {
    const area = areas.find(a => a.id === areaId);
    if (!area || area.is_default) return;

    const defaultArea = areas.find(a => a.is_default);
    if (!defaultArea) return;

    setPositions(positions.map(pos => {
      if (getPositionAreaId(pos) === areaId) {
        return { ...pos, area_id: defaultArea.id };
      }
      return pos;
    }));

    const remaining = areas.filter(a => a.id !== areaId);

    if (area.isNew) {
      setAreas(remaining);
    } else {
      try {
        await supabase.from('scheduling_areas').update({ is_active: false }).eq('id', areaId);
        setAreas(remaining);
      } catch (err) {
        console.error('Error deleting area:', err);
        setError('Failed to delete area');
        return;
      }
    }

    // If deleted area was selected, select the first remaining area
    if (selectedAreaId === areaId && remaining.length > 0) {
      setSelectedAreaId(remaining[0].id);
    }
    setHasChanges(true);
  };

  // --- Save ---

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Insert new areas
      const newAreas = areas.filter(a => a.isNew);
      const existingAreas = areas.filter(a => !a.isNew);
      const areaIdMap = new Map<string, string>();

      if (newAreas.length > 0) {
        const { data: inserted, error: insertErr } = await supabase
          .from('scheduling_areas')
          .insert(newAreas.map(a => ({
            org_id: orgId, name: a.name, display_order: a.display_order,
            is_default: false, is_active: true,
          })))
          .select();

        if (insertErr) throw insertErr;
        if (inserted) {
          inserted.forEach((ins, idx) => areaIdMap.set(newAreas[idx].id, ins.id));
          setAreas([...existingAreas, ...inserted.map(a => ({ ...a, isNew: false }))]);
          // Update selectedAreaId if it was a temp ID
          if (selectedAreaId && areaIdMap.has(selectedAreaId)) {
            setSelectedAreaId(areaIdMap.get(selectedAreaId)!);
          }
        }
      }

      // 2. Resolve temp area IDs
      const resolved = positions.map(pos => {
        let areaId = pos.area_id;
        if (areaId && areaIdMap.has(areaId)) areaId = areaIdMap.get(areaId)!;
        return { ...pos, area_id: areaId };
      });

      // 3. Update existing positions
      for (const pos of resolved.filter(p => !p.isNew)) {
        const updatePayload: any = {
          scheduling_enabled: pos.scheduling_enabled,
          area_id: pos.area_id,
        };
        // Only update name/order for scheduling_only positions
        if (pos.position_type === 'scheduling_only') {
          updatePayload.name = pos.name;
          updatePayload.display_order = pos.display_order;
        }
        const { error: upErr } = await supabase
          .from('org_positions').update(updatePayload).eq('id', pos.id);
        if (upErr) throw upErr;
      }

      // 4. Insert new scheduling_only positions
      const newPos = resolved.filter(p => p.isNew);
      if (newPos.length > 0) {
        const { data: insertedPos, error: insErr } = await supabase
          .from('org_positions')
          .insert(newPos.map(pos => ({
            org_id: orgId, name: pos.name, zone: pos.zone,
            display_order: pos.display_order, is_active: true,
            position_type: 'scheduling_only', area_id: pos.area_id,
            scheduling_enabled: true,
          })))
          .select();

        if (insErr) throw insErr;
        if (insertedPos) {
          const existingIds = new Set(resolved.filter(p => !p.isNew).map(p => p.id));
          setPositions([
            ...resolved.filter(p => existingIds.has(p.id)),
            ...insertedPos.map(p => ({
              ...p,
              position_type: 'scheduling_only' as const,
              area_id: p.area_id || null,
              scheduling_enabled: true,
              isNew: false,
            })),
          ]);
        }
      } else {
        setPositions(resolved);
      }

      setHasChanges(false);
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount
  React.useEffect(() => {
    return () => {
      if (hasChangesRef.current && orgIdRef.current && !disabled) {
        const posToSave = positionsRef.current;
        const arToSave = areasRef.current;
        const curOrgId = orgIdRef.current;

        (async () => {
          try {
            const newAreas = arToSave.filter(a => a.isNew);
            const areaIdMap = new Map<string, string>();
            if (newAreas.length > 0) {
              const { data: ins } = await supabase
                .from('scheduling_areas')
                .insert(newAreas.map(a => ({
                  org_id: curOrgId, name: a.name, display_order: a.display_order,
                  is_default: false, is_active: true,
                })))
                .select();
              if (ins) ins.forEach((i, idx) => areaIdMap.set(newAreas[idx].id, i.id));
            }

            const resolved = posToSave.map(pos => {
              let areaId = pos.area_id;
              if (areaId && areaIdMap.has(areaId)) areaId = areaIdMap.get(areaId)!;
              return { ...pos, area_id: areaId };
            });

            for (const pos of resolved.filter(p => !p.isNew)) {
              const payload: any = { scheduling_enabled: pos.scheduling_enabled, area_id: pos.area_id };
              if (pos.position_type === 'scheduling_only') {
                payload.name = pos.name;
                payload.display_order = pos.display_order;
              }
              await supabase.from('org_positions').update(payload).eq('id', pos.id);
            }

            const newPos = resolved.filter(p => p.isNew);
            if (newPos.length > 0) {
              await supabase.from('org_positions').insert(newPos.map(pos => ({
                org_id: curOrgId, name: pos.name, zone: pos.zone,
                display_order: pos.display_order, is_active: true,
                position_type: 'scheduling_only', area_id: pos.area_id,
                scheduling_enabled: true,
              })));
            }
          } catch (err) {
            console.error('Error autosaving:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

  // --- Render ---

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  const renderPositionSection = (area: AreaLocal) => {
    const areaPositions = positions
      .filter(p => getPositionAreaId(p) === area.id)
      .sort((a, b) => a.display_order - b.display_order);
    const zone = getZoneForArea(area);

    return (
      <div key={area.id} className={sty.section}>
        <div className={sty.sectionHeader}>
          <h4 className={sty.sectionTitle}>
            {area.name}
            <span className={sty.positionCount}>({areaPositions.length})</span>
          </h4>
          {!disabled && (
            <Button
              variant="text"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleAddPosition(area.id, zone)}
              sx={{
                fontFamily, fontSize: 12, textTransform: 'none',
                color: 'var(--ls-color-brand)',
                '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.08)' },
              }}
            >
              Add Position
            </Button>
          )}
        </div>

        <div className={sty.positionsHeader}>
          <span className={sty.headerLabel}>Name</span>
          <span className={sty.headerLabel}>Type</span>
          <span className={sty.headerLabel} style={{ textAlign: 'center' }}>Scheduling</span>
          <span className={sty.headerLabel}></span>
        </div>

        {areaPositions.length === 0 ? (
          <div className={sty.emptySection}>No positions in this area yet</div>
        ) : (
          areaPositions.map((position) => {
            const isStandard = position.position_type === 'standard';
            const isSchedulingOnly = position.position_type === 'scheduling_only';

            return (
              <div key={position.id} className={sty.positionRow}>
                {isStandard ? (
                  <div className={sty.positionName}>{position.name}</div>
                ) : (
                  <StyledTextField
                    value={position.name}
                    onChange={(e) => handlePositionNameChange(position.id, e.target.value)}
                    placeholder="Position name"
                    size="small"
                    className={sty.nameField}
                    disabled={disabled}
                  />
                )}

                <div className={sty.typeBadge}>
                  {isSchedulingOnly ? (
                    <span className={sty.schedulingBadge}>Scheduling Only</span>
                  ) : (
                    <span className={sty.standardBadge}>Standard</span>
                  )}
                </div>

                <div className={sty.toggleCell}>
                  {isStandard ? (
                    <BrandSwitch
                      size="small"
                      checked={position.scheduling_enabled}
                      onChange={() => handleToggleSchedulingEnabled(position.id)}
                      disabled={disabled}
                    />
                  ) : (
                    <span className={sty.alwaysOn}>Always on</span>
                  )}
                </div>

                <div className={sty.actionCell}>
                  {isSchedulingOnly && !disabled ? (
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePosition(position.id)}
                      className={sty.deleteButton}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Position Setup</h3>
        <p className={sty.introDescription}>
          Manage which positions are available for scheduling. Standard positions from Positional Excellence
          can be enabled or disabled for scheduling. You can also create scheduling-only positions that won't appear
          in positional excellence ratings.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      {/* Area pills — same style as PositionalRatings AreaPill */}
      <div className={sty.areasBar}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {areas.map(area => {
            const upper = area.name.toUpperCase();
            const areaType: 'FOH' | 'BOH' | 'custom' = upper === 'FOH' ? 'FOH' : upper === 'BOH' ? 'BOH' : 'custom';
            return (
              <AreaPill
                key={area.id}
                selected={selectedAreaId === area.id}
                areaType={areaType}
                onClick={() => setSelectedAreaId(area.id)}
              >
                {area.name}
              </AreaPill>
            );
          })}
        </Box>
        {!disabled && (
          <Button
            variant="text"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddAreaOpen(true)}
            sx={{
              fontFamily, fontSize: 12, textTransform: 'none',
              color: 'var(--ls-color-brand)',
              '&:hover': { backgroundColor: 'rgba(49, 102, 74, 0.08)' },
            }}
          >
            Add Area
          </Button>
        )}
      </div>

      <div className={sty.scrollContainer}>
        {areas.filter(a => a.id === selectedAreaId).map(area => renderPositionSection(area))}
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
                  fontFamily, textTransform: 'none',
                  backgroundColor: 'var(--ls-color-brand)',
                  '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                  '&.Mui-disabled': { backgroundColor: '#e0e0e0' },
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={addAreaOpen}
        onClose={() => { setAddAreaOpen(false); setNewAreaName(''); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px', fontFamily } }}
      >
        <DialogTitle sx={{ fontFamily, fontSize: 16, fontWeight: 600 }}>Add Area</DialogTitle>
        <DialogContent>
          <StyledTextField
            autoFocus fullWidth size="small" placeholder="Area name"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddArea(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { setAddAreaOpen(false); setNewAreaName(''); }}
            sx={{ fontFamily, textTransform: 'none', color: 'var(--ls-color-muted)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddArea}
            disabled={!newAreaName.trim()}
            variant="contained"
            sx={{
              fontFamily, textTransform: 'none',
              backgroundColor: 'var(--ls-color-brand)',
              '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default SchedulingPositionsTab;
