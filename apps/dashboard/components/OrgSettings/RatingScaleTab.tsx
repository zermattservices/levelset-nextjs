import * as React from 'react';
import { styled } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import sty from './RatingScaleTab.module.css';
import { createSupabaseClient } from '@/util/supabase/component';

const fontFamily = '"Satoshi", sans-serif';

const ThresholdInput = styled(TextField)(() => ({
  width: 80,
  '& .MuiOutlinedInput-root': {
    fontFamily,
    fontSize: 14,
    backgroundColor: 'white',
    borderRadius: 8,
    '& input': {
      textAlign: 'center',
      padding: '8px 12px',
    },
    '&:hover fieldset': {
      borderColor: '#31664a',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#31664a',
    },
  },
}));

interface RatingScaleTabProps {
  orgId: string | null;
  disabled?: boolean;
}

export function RatingScaleTab({ orgId, disabled = false }: RatingScaleTabProps) {
  const [yellowThreshold, setYellowThreshold] = React.useState<string>('1.75');
  const [greenThreshold, setGreenThreshold] = React.useState<string>('2.75');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [thresholdId, setThresholdId] = React.useState<string | null>(null);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch existing thresholds
  React.useEffect(() => {
    async function fetchThresholds() {
      if (!orgId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('rating_thresholds')
          .select('*')
          .eq('org_id', orgId)
          .is('location_id', null)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
          setThresholdId(data.id);
          setYellowThreshold(data.yellow_threshold?.toString() || '1.75');
          setGreenThreshold(data.green_threshold?.toString() || '2.75');
        }
      } catch (err) {
        console.error('Error fetching thresholds:', err);
        setError('Failed to load thresholds');
      } finally {
        setLoading(false);
      }
    }

    fetchThresholds();
  }, [orgId, supabase]);

  const saveThresholds = async (yellow: string, green: string) => {
    if (!orgId) return;

    const yellowNum = parseFloat(yellow);
    const greenNum = parseFloat(green);

    // Validate
    if (isNaN(yellowNum) || isNaN(greenNum)) return;
    if (yellowNum < 1 || yellowNum > 3 || greenNum < 1 || greenNum > 3) return;
    if (yellowNum >= greenNum) return;

    setSaving(true);
    setError(null);

    try {
      if (thresholdId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('rating_thresholds')
          .update({
            yellow_threshold: yellowNum,
            green_threshold: greenNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', thresholdId);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { data: insertData, error: insertError } = await supabase
          .from('rating_thresholds')
          .insert({
            org_id: orgId,
            yellow_threshold: yellowNum,
            green_threshold: greenNum,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setThresholdId(insertData.id);
      }
    } catch (err) {
      console.error('Error saving thresholds:', err);
      setError('Failed to save thresholds');
    } finally {
      setSaving(false);
    }
  };

  const handleYellowChange = (value: string) => {
    setYellowThreshold(value);
  };

  const handleGreenChange = (value: string) => {
    setGreenThreshold(value);
  };

  const handleBlur = () => {
    saveThresholds(yellowThreshold, greenThreshold);
  };

  if (loading) {
    return (
      <div className={sty.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  const yellowNum = parseFloat(yellowThreshold) || 1.75;
  const greenNum = parseFloat(greenThreshold) || 2.75;

  return (
    <div className={sty.container}>
      <div className={sty.intro}>
        <h3 className={sty.introTitle}>Rating Scale</h3>
        <p className={sty.introDescription}>
          Configure the thresholds that determine rating color categories. These thresholds 
          apply to all locations in your organization.
        </p>
      </div>

      {error && <div className={sty.errorMessage}>{error}</div>}

      <div className={sty.scaleContainer}>
        <h4 className={sty.scaleTitle}>Rating Scale</h4>
        
        <div className={sty.scaleGraphic}>
          <div className={sty.colorBar}>
            <div className={sty.redSection}>
              <span className={sty.colorLabel}>Not Yet</span>
            </div>
            <div className={sty.thresholdDivider}>
              <ThresholdInput
                value={yellowThreshold}
                onChange={(e) => handleYellowChange(e.target.value)}
                onBlur={handleBlur}
                type="number"
                inputProps={{ 
                  min: 1, 
                  max: 3, 
                  step: 0.01,
                }}
                disabled={saving || disabled}
              />
            </div>
            <div className={sty.yellowSection}>
              <span className={sty.colorLabel}>On the Rise</span>
            </div>
            <div className={sty.thresholdDivider}>
              <ThresholdInput
                value={greenThreshold}
                onChange={(e) => handleGreenChange(e.target.value)}
                onBlur={handleBlur}
                type="number"
                inputProps={{ 
                  min: 1, 
                  max: 3, 
                  step: 0.01,
                }}
                disabled={saving || disabled}
              />
            </div>
            <div className={sty.greenSection}>
              <span className={sty.colorLabel}>Crushing It</span>
            </div>
          </div>
        </div>

        <div className={sty.scaleInfo}>
          <div className={sty.rangeInfo}>
            <div className={sty.rangeItem}>
              <span className={sty.rangeDot} style={{ backgroundColor: '#c94a4a' }} />
              <span className={sty.rangeText}>Not Yet: 1.0 — {(yellowNum - 0.01).toFixed(2)}</span>
            </div>
            <div className={sty.rangeItem}>
              <span className={sty.rangeDot} style={{ backgroundColor: '#d4a847' }} />
              <span className={sty.rangeText}>On the Rise: {yellowNum.toFixed(2)} — {(greenNum - 0.01).toFixed(2)}</span>
            </div>
            <div className={sty.rangeItem}>
              <span className={sty.rangeDot} style={{ backgroundColor: '#4a9c6d' }} />
              <span className={sty.rangeText}>Crushing It: {greenNum.toFixed(2)} — 3.0</span>
            </div>
          </div>
        </div>

        {saving && (
          <div className={sty.savingIndicator}>
            <CircularProgress size={16} sx={{ color: '#31664a' }} />
            <span>Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default RatingScaleTab;
