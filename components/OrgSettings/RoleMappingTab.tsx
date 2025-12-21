import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormControl from '@mui/material/FormControl';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './RoleMappingTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

const fontFamily = '"Satoshi", sans-serif';

const StyledSelect = styled(Select)(() => ({
  fontFamily,
  fontSize: 14,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e0e0e0',
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

interface Role {
  role_name: string;
  hierarchy_level: number;
}

interface RoleMapping {
  position_id: string;
  role_name: string;
  is_default: boolean;
  is_locked: boolean;
}

interface RoleMappingTabProps {
  orgId: string | null;
}

export function RoleMappingTab({ orgId }: RoleMappingTabProps) {
  const { selectedLocationId } = useLocationContext();
  const [positions, setPositions] = React.useState<Position[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [mappings, setMappings] = React.useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Determine which roles should be locked (level 0 and 1)
  const lockedRoles = React.useMemo(() => {
    return new Set(roles.filter(r => r.hierarchy_level <= 1).map(r => r.role_name));
  }, [roles]);

  // Determine default roles (level 0, 1, and 2)
  const defaultRoles = React.useMemo(() => {
    return new Set(roles.filter(r => r.hierarchy_level <= 2).map(r => r.role_name));
  }, [roles]);

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

        // Fetch roles from location_role_hierarchy
        if (selectedLocationId) {
          const { data: rolesData, error: rolesError } = await supabase
            .from('location_role_hierarchy')
            .select('role_name, hierarchy_level')
            .eq('location_id', selectedLocationId)
            .order('hierarchy_level', { ascending: true });

          if (rolesError) throw rolesError;

          if (rolesData && rolesData.length > 0) {
            setRoles(rolesData);
          } else {
            // Fallback to default roles if no hierarchy defined
            setRoles([
              { role_name: 'Operator', hierarchy_level: 0 },
              { role_name: 'Director', hierarchy_level: 1 },
              { role_name: 'Team Lead', hierarchy_level: 2 },
              { role_name: 'Trainer', hierarchy_level: 3 },
              { role_name: 'Team Member', hierarchy_level: 4 },
            ]);
          }
        }

        // Fetch existing mappings
        if (positionsData && positionsData.length > 0) {
          const { data: mappingsData, error: mappingsError } = await supabase
            .from('position_role_permissions')
            .select('position_id, role_name')
            .in('position_id', positionsData.map(p => p.id));

          if (mappingsError) throw mappingsError;

          // Build mappings map
          const newMappings = new Map<string, Set<string>>();
          positionsData.forEach(pos => {
            newMappings.set(pos.id, new Set());
          });

          (mappingsData || []).forEach(m => {
            const existing = newMappings.get(m.position_id);
            if (existing) {
              existing.add(m.role_name);
            }
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
  }, [orgId, selectedLocationId, supabase]);

  // Initialize mappings with defaults for positions that have no mappings
  React.useEffect(() => {
    if (positions.length > 0 && roles.length > 0 && mappings.size > 0) {
      let needsUpdate = false;
      const newMappings = new Map(mappings);

      positions.forEach(pos => {
        const positionMappings = newMappings.get(pos.id);
        if (positionMappings && positionMappings.size === 0) {
          // Add default roles for positions with no mappings
          defaultRoles.forEach(role => {
            positionMappings.add(role);
          });
          needsUpdate = true;
        }
      });

      if (needsUpdate) {
        setMappings(newMappings);
        // Auto-save defaults
        saveAllMappings(newMappings);
      }
    }
  }, [positions, roles, defaultRoles]);

  const saveAllMappings = async (mappingsToSave: Map<string, Set<string>>) => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Delete all existing mappings for this org's positions
      const positionIds = positions.map(p => p.id);
      
      if (positionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('position_role_permissions')
          .delete()
          .in('position_id', positionIds);

        if (deleteError) throw deleteError;
      }

      // Insert new mappings
      const insertData: any[] = [];
      mappingsToSave.forEach((roleSet, positionId) => {
        roleSet.forEach(roleName => {
          const role = roles.find(r => r.role_name === roleName);
          insertData.push({
            position_id: positionId,
            role_name: roleName,
            is_default: role ? role.hierarchy_level <= 2 : false,
            is_locked: role ? role.hierarchy_level <= 1 : false,
          });
        });
      });

      if (insertData.length > 0) {
        const { error: insertError } = await supabase
          .from('position_role_permissions')
          .insert(insertData);

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Error saving mappings:', err);
      setError('Failed to save role mappings');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (positionId: string, selectedRoles: string[]) => {
    // Ensure locked roles are always included
    const finalRoles = new Set(selectedRoles);
    lockedRoles.forEach(role => finalRoles.add(role));

    const newMappings = new Map(mappings);
    newMappings.set(positionId, finalRoles);
    setMappings(newMappings);

    // Auto-save
    await saveAllMappings(newMappings);
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
            const positionRoles = mappings.get(pos.id) || new Set();
            const selectedArray = Array.from(positionRoles);

            return (
              <div key={pos.id} className={sty.positionRow}>
                <span className={sty.positionName}>{pos.name}</span>
                <FormControl size="small" sx={{ flex: 1, minWidth: 200 }}>
                  <StyledSelect
                    multiple
                    value={selectedArray}
                    onChange={(e) => handleRoleChange(pos.id, e.target.value as string[])}
                    input={<OutlinedInput />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip
                            key={value}
                            label={value}
                            size="small"
                            sx={{
                              fontFamily,
                              fontSize: 12,
                              backgroundColor: lockedRoles.has(value) ? '#f0f0f0' : '#f6fffa',
                              color: lockedRoles.has(value) ? '#666' : '#31664a',
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    disabled={saving}
                  >
                    {roles.map((role) => (
                      <MenuItem
                        key={role.role_name}
                        value={role.role_name}
                        disabled={lockedRoles.has(role.role_name)}
                        sx={{ fontFamily }}
                      >
                        {role.role_name}
                        {lockedRoles.has(role.role_name) && (
                          <span className={sty.lockedBadge}>Required</span>
                        )}
                      </MenuItem>
                    ))}
                  </StyledSelect>
                </FormControl>
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
        <h3 className={sty.introTitle}>Role Mapping</h3>
        <p className={sty.introDescription}>
          Configure which roles can submit ratings for each position. Operator and the next 
          leadership level are always required and cannot be removed.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      {renderPositionSection(fohPositions, 'FOH Positions')}
      {renderPositionSection(bohPositions, 'BOH Positions')}

      {saving && (
        <div className={sty.savingIndicator}>
          <CircularProgress size={16} sx={{ color: '#31664a' }} />
          <span>Saving...</span>
        </div>
      )}
    </div>
  );
}

export default RoleMappingTab;
