import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './BreakRulesTab.module.css';
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

interface BreakRule {
  id: string;
  break_duration_minutes: number;
  trigger_hours: number;
  is_active: boolean;
  display_order: number;
  isNew?: boolean;
}

interface BreakRulesTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function BreakRulesTab({ orgId, disabled = false }: BreakRulesTabProps) {
  const [rules, setRules] = React.useState<BreakRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Refs for autosave on unmount
  const rulesRef = React.useRef<BreakRule[]>([]);
  const hasChangesRef = React.useRef(false);
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Keep refs in sync
  React.useEffect(() => {
    rulesRef.current = rules;
  }, [rules]);

  React.useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  React.useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  // Fetch break rules
  React.useEffect(() => {
    async function fetchRules() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('break_rules')
          .select('id, break_duration_minutes, trigger_hours, is_active, display_order')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        // Ensure numeric fields are proper numbers (Supabase returns NUMERIC as strings)
        setRules((data || []).map(r => ({
          ...r,
          break_duration_minutes: Number(r.break_duration_minutes),
          trigger_hours: Number(r.trigger_hours),
        })));
      } catch (err) {
        console.error('Error fetching break rules:', err);
        setError('Failed to load break rules');
      } finally {
        setLoading(false);
      }
    }

    fetchRules();
  }, [orgId, supabase]);

  const handleAddRule = () => {
    const newRule: BreakRule = {
      id: `new-${Date.now()}`,
      break_duration_minutes: 30,
      trigger_hours: 6,
      is_active: true,
      display_order: rules.length,
      isNew: true,
    };
    setRules([...rules, newRule]);
    setHasChanges(true);
  };

  const handleRuleChange = (id: string, field: keyof BreakRule, value: any) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
    setHasChanges(true);
  };

  const handleDeleteRule = async (id: string) => {
    const rule = rules.find(r => r.id === id);

    // If it's a new item, just filter out locally
    if (rule && rule.isNew) {
      setRules(rules.filter(r => r.id !== id));
      setHasChanges(true);
      return;
    }

    // For existing items, mark as is_active: false in database
    if (rule && !rule.isNew) {
      try {
        const { error: updateError } = await supabase
          .from('break_rules')
          .update({ is_active: false })
          .eq('id', id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Error deleting break rule:', err);
        setError('Failed to delete break rule');
        return;
      }
    }

    setRules(rules.filter(r => r.id !== id));
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      // Separate new rules from existing ones
      const newRules = rules.filter(r => r.isNew);
      const existingRules = rules.filter(r => !r.isNew);

      // Update existing rules
      for (const rule of existingRules) {
        const { error: updateError } = await supabase
          .from('break_rules')
          .update({
            break_duration_minutes: rule.break_duration_minutes,
            trigger_hours: rule.trigger_hours,
            display_order: rule.display_order,
          })
          .eq('id', rule.id);

        if (updateError) throw updateError;
      }

      // Insert new rules
      if (newRules.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('break_rules')
          .insert(newRules.map((rule, index) => ({
            org_id: orgId,
            break_duration_minutes: rule.break_duration_minutes,
            trigger_hours: rule.trigger_hours,
            is_active: true,
            display_order: existingRules.length + index,
          })))
          .select();

        if (insertError) throw insertError;

        // Update local state with real IDs
        if (insertedData) {
          setRules(prev => {
            const existingIds = new Set(existingRules.map(r => r.id));
            const filteredPrev = prev.filter(r => existingIds.has(r.id));
            const combined = [...filteredPrev, ...insertedData.map(r => ({ ...r, isNew: false }))];
            return combined;
          });
        }
      }

      setHasChanges(false);
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving break rules:', err);
      setError('Failed to save break rules');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      if (hasChangesRef.current && orgIdRef.current && !disabled) {
        const rulesToSave = rulesRef.current;
        const currentOrgId = orgIdRef.current;

        // Fire and forget save
        (async () => {
          try {
            const newRules = rulesToSave.filter(r => r.isNew);
            const existingRules = rulesToSave.filter(r => !r.isNew);

            // Update existing
            for (const rule of existingRules) {
              await supabase
                .from('break_rules')
                .update({
                  break_duration_minutes: rule.break_duration_minutes,
                  trigger_hours: rule.trigger_hours,
                  display_order: rule.display_order,
                })
                .eq('id', rule.id);
            }

            // Insert new
            if (newRules.length > 0) {
              await supabase
                .from('break_rules')
                .insert(newRules.map((rule, index) => ({
                  org_id: currentOrgId,
                  break_duration_minutes: rule.break_duration_minutes,
                  trigger_hours: rule.trigger_hours,
                  is_active: true,
                  display_order: existingRules.length + index,
                })));
            }
          } catch (err) {
            console.error('Error autosaving break rules:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Break Rules</h3>
        <p className={sty.introDescription}>
          Define automatic break rules for scheduling. Each rule specifies a break duration that applies when a shift exceeds a certain number of hours.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        <div className={sty.rulesHeader}>
          <span className={sty.headerLabel}>Duration</span>
          <span className={sty.headerLabel}>Trigger</span>
          <span className={sty.headerLabel}>Description</span>
          <span className={sty.headerLabel}></span>
        </div>

        {rules.length === 0 ? (
          <div className={sty.emptyState}>
            No break rules defined yet. Add a rule to configure automatic break calculations for scheduling.
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className={sty.ruleRow}>
              <div className={sty.inputGroup}>
                <StyledTextField
                  value={rule.break_duration_minutes || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    handleRuleChange(rule.id, 'break_duration_minutes', val ? parseInt(val, 10) : 0);
                  }}
                  placeholder="30"
                  size="small"
                  inputProps={{ inputMode: 'numeric' }}
                  disabled={disabled}
                  sx={{ width: 80 }}
                />
                <span className={sty.inputSuffix}>min</span>
              </div>
              <div className={sty.inputGroup}>
                <StyledTextField
                  value={rule.trigger_hours || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    handleRuleChange(rule.id, 'trigger_hours', val ? parseFloat(val) : 0);
                  }}
                  placeholder="6"
                  size="small"
                  inputProps={{ inputMode: 'decimal' }}
                  disabled={disabled}
                  sx={{ width: 80 }}
                />
                <span className={sty.inputSuffix}>hrs</span>
              </div>
              <span className={sty.ruleDescription}>
                {rule.break_duration_minutes} min break for every {rule.trigger_hours} hrs
              </span>
              {!disabled && (
                <IconButton
                  size="small"
                  onClick={() => handleDeleteRule(rule.id)}
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
            onClick={handleAddRule}
            sx={{
              fontFamily,
              fontSize: 12,
              textTransform: 'none',
              color: 'var(--ls-color-brand)',
              alignSelf: 'flex-start',
              marginTop: 2,
              '&:hover': {
                backgroundColor: 'rgba(49, 102, 74, 0.08)',
              },
            }}
          >
            Add Break Rule
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
                  backgroundColor: 'var(--ls-color-brand)',
                  '&:hover': {
                    backgroundColor: 'var(--ls-color-brand-hover)',
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

export default BreakRulesTab;
