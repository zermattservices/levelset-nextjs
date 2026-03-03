import * as React from 'react';
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './TerminationReasonsTab.module.css';
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

type Category = 'Voluntary' | 'Involuntary' | 'Other';

interface TerminationReason {
  id: string;
  reason: string;
  category: Category;
  display_order: number;
  isNew?: boolean;
}

const DEFAULT_REASONS: Omit<TerminationReason, 'id' | 'isNew'>[] = [
  { reason: 'Left for another job', category: 'Voluntary', display_order: 1 },
  { reason: 'Moved away', category: 'Voluntary', display_order: 2 },
  { reason: 'End of Seasonal Employment', category: 'Voluntary', display_order: 3 },
  { reason: 'Conflict with another team member', category: 'Voluntary', display_order: 4 },
  { reason: 'Job Abandonment', category: 'Voluntary', display_order: 5 },
  { reason: 'Other - Voluntary', category: 'Voluntary', display_order: 6 },
  { reason: 'Discipline Point Limit Reached', category: 'Involuntary', display_order: 7 },
  { reason: 'Not a cultural fit', category: 'Involuntary', display_order: 8 },
  { reason: 'Performance', category: 'Involuntary', display_order: 9 },
  { reason: 'Other - Involuntary', category: 'Involuntary', display_order: 10 },
];

const CATEGORIES: Category[] = ['Voluntary', 'Involuntary', 'Other'];

interface TerminationReasonsTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function TerminationReasonsTab({ orgId, disabled = false }: TerminationReasonsTabProps) {
  const [reasons, setReasons] = React.useState<TerminationReason[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Refs for autosave on unmount
  const reasonsRef = React.useRef<TerminationReason[]>([]);
  const hasChangesRef = React.useRef(false);
  const orgIdRef = React.useRef(orgId);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Keep refs in sync
  React.useEffect(() => {
    reasonsRef.current = reasons;
  }, [reasons]);

  React.useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  React.useEffect(() => {
    orgIdRef.current = orgId;
  }, [orgId]);

  // Fetch termination reasons, lazy-seed if empty
  React.useEffect(() => {
    async function fetchReasons() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        let { data, error: fetchError } = await supabase
          .from('termination_reasons')
          .select('id, reason, category, display_order')
          .eq('org_id', orgId)
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (fetchError) throw fetchError;

        // Lazy seed: if no reasons exist for this org, insert defaults
        if (!data || data.length === 0) {
          const { error: insertError } = await supabase
            .from('termination_reasons')
            .insert(DEFAULT_REASONS.map(r => ({
              org_id: orgId,
              ...r,
            })));

          if (insertError) {
            // Ignore unique constraint violations (race condition with another user)
            if (!insertError.message?.includes('duplicate')) {
              throw insertError;
            }
          }

          // Re-fetch after seeding
          const { data: seededData, error: refetchError } = await supabase
            .from('termination_reasons')
            .select('id, reason, category, display_order')
            .eq('org_id', orgId)
            .eq('active', true)
            .order('display_order', { ascending: true });

          if (refetchError) throw refetchError;
          data = seededData;
        }

        setReasons(data || []);
      } catch (err) {
        console.error('Error fetching termination reasons:', err);
        setError('Failed to load termination reasons');
      } finally {
        setLoading(false);
      }
    }

    fetchReasons();
  }, [orgId, supabase]);

  const handleAddReason = () => {
    const maxOrder = reasons.length > 0 ? Math.max(...reasons.map(r => r.display_order)) : 0;
    const newReason: TerminationReason = {
      id: `new-${Date.now()}`,
      reason: '',
      category: 'Other',
      display_order: maxOrder + 1,
      isNew: true,
    };
    setReasons([...reasons, newReason]);
    setHasChanges(true);
  };

  const handleReasonChange = (id: string, field: keyof TerminationReason, value: any) => {
    setReasons(reasons.map(r =>
      r.id === id ? { ...r, [field]: value } : r
    ));
    setHasChanges(true);
  };

  const handleDeleteReason = async (id: string) => {
    const reason = reasons.find(r => r.id === id);

    // If it's not a new item, soft-delete in database
    if (reason && !reason.isNew) {
      try {
        const { error: updateError } = await supabase
          .from('termination_reasons')
          .update({ active: false })
          .eq('id', id);

        if (updateError) throw updateError;
      } catch (err) {
        console.error('Error deleting termination reason:', err);
        setError('Failed to delete termination reason');
        return;
      }
    }

    setReasons(reasons.filter(r => r.id !== id));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      const newReasons = reasons.filter(r => r.isNew && r.reason.trim() !== '');
      const existingReasons = reasons.filter(r => !r.isNew);

      // Update existing reasons
      for (const r of existingReasons) {
        const { error: updateError } = await supabase
          .from('termination_reasons')
          .update({
            reason: r.reason,
            category: r.category,
            display_order: r.display_order,
          })
          .eq('id', r.id);

        if (updateError) throw updateError;
      }

      // Insert new reasons
      if (newReasons.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('termination_reasons')
          .insert(newReasons.map(r => ({
            org_id: orgId,
            reason: r.reason,
            category: r.category,
            display_order: r.display_order,
          })))
          .select();

        if (insertError) throw insertError;

        // Update local state with real IDs
        if (insertedData) {
          setReasons(prev => {
            const existingIds = new Set(existingReasons.map(r => r.id));
            const filteredPrev = prev.filter(r => existingIds.has(r.id));
            return [...filteredPrev, ...insertedData.map(r => ({ ...r, isNew: false }))];
          });
        }
      }

      setHasChanges(false);
      hasChangesRef.current = false;
    } catch (err) {
      console.error('Error saving termination reasons:', err);
      setError('Failed to save termination reasons');
    } finally {
      setSaving(false);
    }
  };

  // Autosave on unmount (when switching tabs)
  React.useEffect(() => {
    return () => {
      if (hasChangesRef.current && orgIdRef.current && !disabled) {
        const reasonsToSave = reasonsRef.current;
        const currentOrgId = orgIdRef.current;

        // Fire and forget save
        (async () => {
          try {
            const newReasons = reasonsToSave.filter(r => r.isNew && r.reason.trim() !== '');
            const existingReasons = reasonsToSave.filter(r => !r.isNew);

            // Update existing
            for (const r of existingReasons) {
              await supabase
                .from('termination_reasons')
                .update({
                  reason: r.reason,
                  category: r.category,
                  display_order: r.display_order,
                })
                .eq('id', r.id);
            }

            // Insert new
            if (newReasons.length > 0) {
              await supabase
                .from('termination_reasons')
                .insert(newReasons.map(r => ({
                  org_id: currentOrgId,
                  reason: r.reason,
                  category: r.category,
                  display_order: r.display_order,
                })));
            }
          } catch (err) {
            console.error('Error autosaving termination reasons:', err);
          }
        })();
      }
    };
  }, [disabled, supabase]);

  // Group reasons by category for display
  const groupedReasons = React.useMemo(() => {
    const groups: Record<Category, TerminationReason[]> = {
      Voluntary: [],
      Involuntary: [],
      Other: [],
    };
    for (const r of reasons) {
      const cat = CATEGORIES.includes(r.category as Category) ? r.category as Category : 'Other';
      groups[cat].push(r);
    }
    return groups;
  }, [reasons]);

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
        <h3 className={sty.introTitle}>Termination Reasons</h3>
        <p className={sty.introDescription}>
          Define the termination reasons available when deactivating employees. Reasons are grouped by category for reporting.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scrollContainer}>
        <div className={sty.header}>
          <span className={sty.headerName}>Reason</span>
          <span className={sty.headerCategory}>Category</span>
          <span className={sty.headerActions}></span>
        </div>

        {reasons.length === 0 ? (
          <div className={sty.emptyState}>
            No termination reasons configured yet. Click &quot;Add Reason&quot; to get started.
          </div>
        ) : (
          CATEGORIES.map(category => {
            const categoryReasons = groupedReasons[category];
            if (categoryReasons.length === 0) return null;
            return (
              <div key={category} className={sty.categorySection}>
                <div className={sty.categoryHeader}>{category}</div>
                {categoryReasons.map((reason) => (
                  <div key={reason.id} className={sty.row}>
                    <StyledTextField
                      value={reason.reason}
                      onChange={(e) => handleReasonChange(reason.id, 'reason', e.target.value)}
                      placeholder="Reason name"
                      size="small"
                      className={sty.nameField}
                      disabled={disabled}
                    />
                    <FormControl size="small" className={sty.categoryField}>
                      <Select
                        value={reason.category}
                        onChange={(e) => handleReasonChange(reason.id, 'category', e.target.value)}
                        disabled={disabled}
                        sx={{ fontFamily, fontSize: 14 }}
                      >
                        <MenuItem value="Voluntary">Voluntary</MenuItem>
                        <MenuItem value="Involuntary">Involuntary</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>
                    {!disabled && (
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteReason(reason.id)}
                        className={sty.deleteButton}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </div>
                ))}
              </div>
            );
          })
        )}

        {!disabled && (
          <Button
            variant="text"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddReason}
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
            Add Reason
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
                    backgroundColor: 'var(--ls-color-muted-border)',
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

export default TerminationReasonsTab;
