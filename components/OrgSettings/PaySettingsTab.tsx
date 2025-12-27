import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import BusinessIcon from '@mui/icons-material/Business';
import CircularProgress from '@mui/material/CircularProgress';
import { createSupabaseClient } from '@/util/supabase/component';
import { RolePill } from '@/components/CodeComponents/shared/RolePill';
import type { RoleColorKey } from '@/lib/role-utils';
import sty from './PaySettingsTab.module.css';

const fontFamily = '"Satoshi", sans-serif';

const OrgLevelTag = styled(Chip)(() => ({
  fontFamily,
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  '& .MuiChip-icon': {
    fontSize: 14,
    color: '#166534',
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
  '& .MuiInputBase-input': {
    textAlign: 'center',
    padding: '8px 8px 8px 0',
  },
  '& .MuiInputAdornment-root': {
    marginRight: 0,
  },
}));

const DescriptionTextField = styled(TextField)(() => ({
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

interface OrgRole {
  id: string;
  role_name: string;
  hierarchy_level: number;
  color: RoleColorKey;
}

interface PayConfig {
  id?: string;
  org_id: string;
  role_name: string;
  has_availability_rules: boolean;
  has_zone_rules: boolean;
  has_certification_rules: boolean;
  availability_description: string | null;
}

interface PayRate {
  id?: string;
  org_id: string;
  role_name: string;
  zone: 'FOH' | 'BOH' | null;
  availability: 'Limited' | 'Available' | null;
  is_certified: boolean;
  hourly_rate: number;
}

interface PaySettingsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function PaySettingsTab({ orgId, disabled = false }: PaySettingsTabProps) {
  const [roles, setRoles] = React.useState<OrgRole[]>([]);
  const [payConfigs, setPayConfigs] = React.useState<PayConfig[]>([]);
  const [payRates, setPayRates] = React.useState<PayRate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [locationCount, setLocationCount] = React.useState<number>(0);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch location count for the organization
  React.useEffect(() => {
    async function fetchLocationCount() {
      if (!orgId) return;
      
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);
      
      setLocationCount(count || 0);
    }
    
    fetchLocationCount();
  }, [orgId, supabase]);

  // Fetch roles and pay configurations
  React.useEffect(() => {
    async function fetchData() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch roles (excluding Operator), ordered from lowest to highest (highest hierarchy_level first)
        const { data: rolesData, error: rolesError } = await supabase
          .from('org_roles')
          .select('id, role_name, hierarchy_level, color')
          .eq('org_id', orgId)
          .neq('hierarchy_level', 0)
          .order('hierarchy_level', { ascending: false });

        if (rolesError) throw rolesError;
        setRoles(rolesData || []);

        // Fetch pay configurations
        const { data: configData, error: configError } = await supabase
          .from('org_pay_config')
          .select('*')
          .eq('org_id', orgId);

        if (configError && configError.code !== 'PGRST116') throw configError;
        
        // Initialize configs for roles without existing config
        const existingConfigs = configData || [];
        const configMap = new Map(existingConfigs.map(c => [c.role_name, c]));
        
        const allConfigs = (rolesData || []).map(role => {
          const existing = configMap.get(role.role_name);
          if (existing) {
            return existing;
          }
          return {
            org_id: orgId,
            role_name: role.role_name,
            has_availability_rules: false,
            has_zone_rules: false,
            has_certification_rules: false,
            availability_description: null,
          };
        });
        
        setPayConfigs(allConfigs);

        // Fetch pay rates
        const { data: ratesData, error: ratesError } = await supabase
          .from('org_pay_rates')
          .select('*')
          .eq('org_id', orgId);

        if (ratesError && ratesError.code !== 'PGRST116') throw ratesError;
        setPayRates(ratesData || []);

      } catch (err) {
        console.error('Error fetching pay settings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgId, supabase]);

  // Auto-save pay config changes
  const savePayConfig = React.useCallback(async (config: PayConfig) => {
    if (!orgId || disabled) return;

    setSaving(true);
    try {
      if (config.id) {
        await supabase
          .from('org_pay_config')
          .update({
            has_availability_rules: config.has_availability_rules,
            has_zone_rules: config.has_zone_rules,
            has_certification_rules: config.has_certification_rules,
            availability_description: config.availability_description,
          })
          .eq('id', config.id);
      } else {
        const { data } = await supabase
          .from('org_pay_config')
          .insert({
            org_id: orgId,
            role_name: config.role_name,
            has_availability_rules: config.has_availability_rules,
            has_zone_rules: config.has_zone_rules,
            has_certification_rules: config.has_certification_rules,
            availability_description: config.availability_description,
          })
          .select()
          .single();
        
        if (data) {
          setPayConfigs(prev => prev.map(c => 
            c.role_name === config.role_name ? { ...c, id: data.id } : c
          ));
        }
      }
    } catch (err) {
      console.error('Error saving pay config:', err);
    } finally {
      setSaving(false);
    }
  }, [orgId, disabled, supabase]);

  // Handle checkbox changes for rule toggles
  const handleRuleToggle = (roleName: string, field: keyof PayConfig) => {
    setPayConfigs(prev => {
      const updated = prev.map(config => {
        if (config.role_name === roleName) {
          const newConfig = { ...config, [field]: !config[field as keyof PayConfig] };
          savePayConfig(newConfig);
          return newConfig;
        }
        return config;
      });
      return updated;
    });
  };

  // Handle availability description change
  const handleDescriptionChange = (roleName: string, description: string) => {
    setPayConfigs(prev => prev.map(config => 
      config.role_name === roleName 
        ? { ...config, availability_description: description }
        : config
    ));
  };

  const handleDescriptionBlur = (roleName: string) => {
    const config = payConfigs.find(c => c.role_name === roleName);
    if (config) {
      savePayConfig(config);
    }
  };

  // Get or create pay rate
  const getPayRate = (roleName: string, zone: 'FOH' | 'BOH' | null, availability: 'Limited' | 'Available' | null, isCertified: boolean): number => {
    const rate = payRates.find(r => 
      r.role_name === roleName && 
      r.zone === zone && 
      r.availability === availability && 
      r.is_certified === isCertified
    );
    return rate?.hourly_rate || 0;
  };

  // Save pay rate
  const savePayRate = React.useCallback(async (roleName: string, zone: 'FOH' | 'BOH' | null, availability: 'Limited' | 'Available' | null, isCertified: boolean, rate: number) => {
    if (!orgId || disabled) return;

    setSaving(true);
    try {
      const existing = payRates.find(r => 
        r.role_name === roleName && 
        r.zone === zone && 
        r.availability === availability && 
        r.is_certified === isCertified
      );

      if (existing?.id) {
        await supabase
          .from('org_pay_rates')
          .update({ hourly_rate: rate })
          .eq('id', existing.id);
      } else {
        const { data } = await supabase
          .from('org_pay_rates')
          .insert({
            org_id: orgId,
            role_name: roleName,
            zone,
            availability,
            is_certified: isCertified,
            hourly_rate: rate,
          })
          .select()
          .single();
        
        if (data) {
          setPayRates(prev => [...prev, data]);
        }
      }
    } catch (err) {
      console.error('Error saving pay rate:', err);
    } finally {
      setSaving(false);
    }
  }, [orgId, disabled, supabase, payRates]);

  // Handle pay rate change - with optional linking for roles without zone rules
  const handlePayRateChange = (roleName: string, zone: 'FOH' | 'BOH' | null, availability: 'Limited' | 'Available' | null, isCertified: boolean, value: string, linkZones: boolean = false) => {
    const rate = parseFloat(value) || 0;
    
    setPayRates(prev => {
      let updated = [...prev];
      
      // Helper to update or add a rate
      const updateRate = (z: 'FOH' | 'BOH' | null, avail: 'Limited' | 'Available' | null) => {
        const existingIndex = updated.findIndex(r => 
          r.role_name === roleName && 
          r.zone === z && 
          r.availability === avail && 
          r.is_certified === isCertified
        );
        
        if (existingIndex >= 0) {
          updated[existingIndex] = { ...updated[existingIndex], hourly_rate: rate };
        } else {
          updated.push({
            org_id: orgId!,
            role_name: roleName,
            zone: z,
            availability: avail,
            is_certified: isCertified,
            hourly_rate: rate,
          });
        }
      };
      
      // If linking zones, update both FOH and BOH
      if (linkZones) {
        updateRate('FOH', availability);
        updateRate('BOH', availability);
      } else {
        updateRate(zone, availability);
      }
      
      return updated;
    });
  };

  const handlePayRateBlur = async (roleName: string, zone: 'FOH' | 'BOH' | null, availability: 'Limited' | 'Available' | null, isCertified: boolean, linkZones: boolean = false) => {
    const rate = getPayRate(roleName, zone, availability, isCertified);
    
    if (linkZones) {
      // Save to both zones
      await savePayRate(roleName, 'FOH', availability, isCertified, rate);
      await savePayRate(roleName, 'BOH', availability, isCertified, rate);
    } else {
      await savePayRate(roleName, zone, availability, isCertified, rate);
    }
  };

  // Get config for a role
  const getConfig = (roleName: string): PayConfig | undefined => {
    return payConfigs.find(c => c.role_name === roleName);
  };

  // Get role color
  const getRoleColorKey = (roleName: string): RoleColorKey => {
    const role = roles.find(r => r.role_name === roleName);
    return role?.color || 'blue';
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={40} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className={sty.container}>
        <p className={sty.errorText}>Please select a location to view pay settings.</p>
      </div>
    );
  }

  return (
    <div className={sty.container}>
      {/* Header */}
      <div className={sty.header}>
        <div className={sty.headerText}>
          <div className={sty.titleRow}>
            <h2 className={sty.title}>Pay Settings</h2>
            {locationCount > 1 && (
              <OrgLevelTag
                icon={<BusinessIcon />}
                label="Applies to all locations"
                size="small"
              />
            )}
            {saving && <CircularProgress size={16} sx={{ color: '#31664a', ml: 1 }} />}
          </div>
          <p className={sty.description}>
            Configure pay rules and rates for each role in your organization.
          </p>
        </div>
      </div>

      {/* Section 1: Role Rule Configuration */}
      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Rule Configuration</h3>
        <p className={sty.sectionDescription}>
          Select which pay rules apply to each role.
        </p>
        
        <div className={sty.configTable}>
          <div className={sty.configHeader}>
            <div className={sty.configCell} style={{ flex: 2 }}>Role</div>
            <div className={sty.configCell}>Availability</div>
            <div className={sty.configCell}>FOH/BOH</div>
            <div className={sty.configCell}>Certification</div>
          </div>
          
          {roles.map(role => {
            const config = getConfig(role.role_name);
            return (
              <div key={role.id} className={sty.configRow}>
                <div className={sty.configCell} style={{ flex: 2 }}>
                  <RolePill role={role.role_name} colorKey={role.color} />
                </div>
                <div className={sty.configCell}>
                  <Checkbox
                    checked={config?.has_availability_rules || false}
                    onChange={() => handleRuleToggle(role.role_name, 'has_availability_rules')}
                    disabled={disabled}
                    sx={{
                      color: '#31664a',
                      '&.Mui-checked': { color: '#31664a' },
                    }}
                  />
                </div>
                <div className={sty.configCell}>
                  <Checkbox
                    checked={config?.has_zone_rules || false}
                    onChange={() => handleRuleToggle(role.role_name, 'has_zone_rules')}
                    disabled={disabled}
                    sx={{
                      color: '#31664a',
                      '&.Mui-checked': { color: '#31664a' },
                    }}
                  />
                </div>
                <div className={sty.configCell}>
                  <Checkbox
                    checked={config?.has_certification_rules || false}
                    onChange={() => handleRuleToggle(role.role_name, 'has_certification_rules')}
                    disabled={disabled}
                    sx={{
                      color: '#31664a',
                      '&.Mui-checked': { color: '#31664a' },
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Pay Rates Table */}
      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Pay Rates</h3>
        <p className={sty.sectionDescription}>
          Set hourly pay rates based on the rules configured above.
        </p>
        
        {(() => {
          // Check if any role has zone rules enabled
          const hasAnyZoneRules = payConfigs.some(c => c.has_zone_rules);
          const hasAnyCertificationRules = payConfigs.some(c => c.has_certification_rules);
          
          // Helper to render a $ input field
          const renderDollarInput = (
            role: OrgRole, 
            zone: 'FOH' | 'BOH' | null, 
            availability: 'Limited' | 'Available' | null, 
            isCertified: boolean,
            linkZones: boolean = false
          ) => {
            // When zones are linked, use FOH as the source of truth
            const effectiveZone = linkZones ? 'FOH' : zone;
            const rate = getPayRate(role.role_name, effectiveZone, availability, isCertified);
            
            return (
              <StyledTextField
                type="number"
                size="small"
                value={rate || ''}
                onChange={(e) => handlePayRateChange(role.role_name, effectiveZone, availability, isCertified, e.target.value, linkZones)}
                onBlur={() => handlePayRateBlur(role.role_name, effectiveZone, availability, isCertified, linkZones)}
                disabled={disabled}
                inputProps={{ min: 0, step: 0.25, style: { textAlign: 'center' } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                sx={{ width: 90 }}
              />
            );
          };
          
          // Helper to render rate input cell
          const renderRateCell = (role: OrgRole, zone: 'FOH' | 'BOH' | null, isCertified: boolean, isSecondZoneRow: boolean = false) => {
            const config = getConfig(role.role_name);
            const hasZoneRules = config?.has_zone_rules || false;
            const hasAvailRules = config?.has_availability_rules || false;
            const hasCertRules = config?.has_certification_rules || false;
            
            // If certification row but role doesn't have cert rules, show dash
            if (isCertified && !hasCertRules) {
              if (hasAvailRules) {
                return (
                  <React.Fragment key={`${role.id}-${zone}-${isCertified}`}>
                    <td className={sty.rateInputCell}>-</td>
                    <td className={sty.rateInputCell}>-</td>
                  </React.Fragment>
                );
              }
              return <td key={`${role.id}-${zone}-${isCertified}`} className={sty.rateInputCell}>-</td>;
            }
            
            // When we're in a zone table but role doesn't have zone rules:
            // Show the same input for both FOH and BOH (linked)
            // But for the second zone row (BOH), we still show the same input
            const shouldLinkZones = zone !== null && !hasZoneRules;
            
            if (hasAvailRules) {
              return (
                <React.Fragment key={`${role.id}-${zone}-${isCertified}`}>
                  <td className={sty.rateInputCell}>
                    {renderDollarInput(role, zone, 'Limited', isCertified, shouldLinkZones)}
                  </td>
                  <td className={sty.rateInputCell}>
                    {renderDollarInput(role, zone, 'Available', isCertified, shouldLinkZones)}
                  </td>
                </React.Fragment>
              );
            }
            
            return (
              <td key={`${role.id}-${zone}-${isCertified}`} className={sty.rateInputCell}>
                {renderDollarInput(role, zone, null, isCertified, shouldLinkZones)}
              </td>
            );
          };
          
          return (
            <div className={sty.ratesTableContainer}>
              <table className={sty.ratesTable}>
                <thead>
                  <tr>
                    <th className={sty.rateHeaderCell}></th>
                    {roles.map(role => {
                      const config = getConfig(role.role_name);
                      const colSpan = config?.has_availability_rules ? 2 : 1;
                      return (
                        <th 
                          key={role.id} 
                          className={sty.rateHeaderCell}
                          colSpan={colSpan}
                        >
                          <RolePill role={role.role_name} colorKey={role.color} />
                        </th>
                      );
                    })}
                  </tr>
                  {/* Sub-header for availability */}
                  <tr>
                    <th className={sty.rateSubHeaderCell}></th>
                    {roles.map(role => {
                      const config = getConfig(role.role_name);
                      if (config?.has_availability_rules) {
                        return (
                          <React.Fragment key={role.id}>
                            <th className={sty.rateSubHeaderCell}>Limited</th>
                            <th className={sty.rateSubHeaderCell}>Full</th>
                          </React.Fragment>
                        );
                      }
                      return <th key={role.id} className={sty.rateSubHeaderCell}>-</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {hasAnyZoneRules ? (
                    <>
                      {/* FOH Section */}
                      <tr className={sty.zoneSectionRow}>
                        <td colSpan={100} className={sty.zoneSectionCell}>FOH</td>
                      </tr>
                      <tr>
                        <td className={sty.rateLabelCell}>Starting</td>
                        {roles.map(role => renderRateCell(role, 'FOH', false))}
                      </tr>
                      {hasAnyCertificationRules && (
                        <tr>
                          <td className={sty.rateLabelCell}>Certified</td>
                          {roles.map(role => renderRateCell(role, 'FOH', true))}
                        </tr>
                      )}

                      {/* BOH Section */}
                      <tr className={sty.zoneSectionRow}>
                        <td colSpan={100} className={sty.zoneSectionCell}>BOH</td>
                      </tr>
                      <tr>
                        <td className={sty.rateLabelCell}>Starting</td>
                        {roles.map(role => renderRateCell(role, 'BOH', false, true))}
                      </tr>
                      {hasAnyCertificationRules && (
                        <tr>
                          <td className={sty.rateLabelCell}>Certified</td>
                          {roles.map(role => renderRateCell(role, 'BOH', true, true))}
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      {/* No zone rules - simple table */}
                      <tr>
                        <td className={sty.rateLabelCell}>Starting</td>
                        {roles.map(role => renderRateCell(role, null, false))}
                      </tr>
                      {hasAnyCertificationRules && (
                        <tr>
                          <td className={sty.rateLabelCell}>Certified</td>
                          {roles.map(role => renderRateCell(role, null, true))}
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Section 3: Availability Descriptions */}
      <div className={sty.section}>
        <h3 className={sty.sectionTitle}>Availability Requirements</h3>
        <p className={sty.sectionDescription}>
          Define what full availability means for each role.
        </p>
        
        <div className={sty.descriptionList}>
          {roles.filter(role => {
            const config = getConfig(role.role_name);
            return config?.has_availability_rules;
          }).map(role => (
            <div key={role.id} className={sty.descriptionRow}>
              <div className={sty.descriptionLabel}>
                <RolePill role={role.role_name} colorKey={role.color} />
              </div>
              <DescriptionTextField
                fullWidth
                size="small"
                placeholder="e.g., Must be available 5 days per week including weekends"
                value={getConfig(role.role_name)?.availability_description || ''}
                onChange={(e) => handleDescriptionChange(role.role_name, e.target.value)}
                onBlur={() => handleDescriptionBlur(role.role_name)}
                disabled={disabled}
              />
            </div>
          ))}
          {roles.filter(role => getConfig(role.role_name)?.has_availability_rules).length === 0 && (
            <p className={sty.noDataText}>
              Enable availability rules for roles above to set requirements.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaySettingsTab;
