import * as React from 'react';
import styles from './DisciplineStep.module.css';

interface InfractionItem {
  name: string;
  points: number | null;
  fromLevi?: boolean;
}

interface ActionItem {
  name: string;
  pointsThreshold: number | null;
  fromLevi?: boolean;
}

interface DisciplineStepProps {
  orgId: string;
  analysisData: {
    infractions: Array<{ name: string; points: number | null; description?: string; fromLevi?: boolean }>;
    actions: Array<{ name: string; pointsThreshold: number | null; fromLevi?: boolean }>;
  } | null;
  initialData: {
    infractions: Array<{ name: string; points: number | null }>;
    actions: Array<{ name: string; pointsThreshold: number | null }>;
  } | null;
  onComplete: (data: {
    infractions: Array<{ name: string; points: number }>;
    actions: Array<{ name: string; pointsThreshold: number }>;
  }) => void;
  onSkip: () => void;
  onBack?: () => void;
}

const MAX_INFRACTIONS = 30;
const MAX_ACTIONS = 10;

function getDefaultActions(): ActionItem[] {
  return [
    { name: 'Written Warning', pointsThreshold: 5 },
    { name: 'Final Written Warning', pointsThreshold: 10 },
    { name: 'Suspension', pointsThreshold: 15 },
    { name: 'Termination', pointsThreshold: 20 },
  ];
}

export function DisciplineStep({
  orgId,
  analysisData,
  initialData,
  onComplete,
  onSkip,
  onBack,
}: DisciplineStepProps) {
  const [infractions, setInfractions] = React.useState<InfractionItem[]>(() => {
    if (initialData) {
      return initialData.infractions.map(i => ({ ...i }));
    }
    if (analysisData) {
      return analysisData.infractions.map(i => ({
        name: i.name,
        points: i.points,
        fromLevi: i.fromLevi,
      }));
    }
    return [];
  });

  const [actions, setActions] = React.useState<ActionItem[]>(() => {
    if (initialData) {
      return initialData.actions.map(a => ({ ...a }));
    }
    if (analysisData) {
      return analysisData.actions.map(a => ({
        name: a.name,
        pointsThreshold: a.pointsThreshold,
        fromLevi: a.fromLevi,
      }));
    }
    return getDefaultActions();
  });

  const [error, setError] = React.useState<string | null>(null);
  const [showValidation, setShowValidation] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const addInfraction = () => {
    if (infractions.length >= MAX_INFRACTIONS) return;
    setInfractions(prev => [...prev, { name: '', points: null }]);
  };

  const addAction = () => {
    if (actions.length >= MAX_ACTIONS) return;
    setActions(prev => [...prev, { name: '', pointsThreshold: null }]);
  };

  const updateInfraction = (index: number, updates: Partial<InfractionItem>) => {
    setInfractions(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const updateAction = (index: number, updates: Partial<ActionItem>) => {
    setActions(prev =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const deleteInfraction = (index: number) => {
    setInfractions(prev => prev.filter((_, i) => i !== index));
  };

  const deleteAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  // Compute invalid fields from current state (re-evaluates every render)
  const isInfractionInvalid = (inf: InfractionItem) =>
    inf.name.trim() !== '' && (inf.points === null || inf.points <= 0);
  const isActionInvalid = (act: ActionItem) =>
    act.name.trim() !== '' && (act.pointsThreshold === null || act.pointsThreshold <= 0);

  const invalidCount = showValidation
    ? infractions.filter(isInfractionInvalid).length + actions.filter(isActionInvalid).length
    : 0;

  // Auto-clear the error banner once all fields are fixed
  React.useEffect(() => {
    if (showValidation && invalidCount === 0) {
      setError(null);
    }
  }, [showValidation, invalidCount]);

  const handleSubmit = () => {
    setError(null);

    const hasInvalid =
      infractions.some(isInfractionInvalid) || actions.some(isActionInvalid);

    if (hasInvalid) {
      setShowValidation(true);
      const badCount =
        infractions.filter(isInfractionInvalid).length +
        actions.filter(isActionInvalid).length;
      setError(`${badCount} field${badCount > 1 ? 's' : ''} need${badCount === 1 ? 's' : ''} a value greater than 0`);

      // Scroll to the first invalid field
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-discipline-invalid="true"]');
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    const validInfractions = infractions.filter(i => i.name.trim() !== '');
    const validActions = actions.filter(a => a.name.trim() !== '');

    setIsSubmitting(true);
    onComplete({
      infractions: validInfractions.map(i => ({
        name: i.name.trim(),
        points: i.points as number,
      })),
      actions: validActions.map(a => ({
        name: a.name.trim(),
        pointsThreshold: a.pointsThreshold as number,
      })),
    });
  };

  const hasLeviSuggestions = analysisData && !initialData;
  const leviFoundItems =
    hasLeviSuggestions &&
    (analysisData.infractions.length > 0 || analysisData.actions.length > 0);

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Discipline Setup</h3>
        <p className={styles.sectionDescription}>
          Configure your discipline infractions and actions. Infractions are behaviors
          that earn points. Actions are consequences triggered when point thresholds
          are reached.
        </p>

        {hasLeviSuggestions && leviFoundItems && (
          <div className={styles.infoBanner}>
            <span className={styles.infoBannerIcon}>&#9432;</span>
            <span>
              Levi has pre-filled some suggestions based on your uploaded documents.
              Review and adjust as needed.
            </span>
          </div>
        )}

        {hasLeviSuggestions && !leviFoundItems && (
          <div className={styles.warningBanner}>
            <span className={styles.warningBannerIcon}>&#9888;</span>
            <span>
              Levi couldn&apos;t find any discipline policies in your uploaded documents.
              Add infractions and actions manually below, or skip and configure later in Settings.
            </span>
          </div>
        )}

        {/* Infractions Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <span className={styles.sectionLabel}>Infractions</span>
              <span className={styles.countBadge}>{infractions.filter(i => i.name.trim()).length}</span>
            </div>
            {infractions.length < MAX_INFRACTIONS && (
              <button
                type="button"
                className={styles.addItemBtn}
                onClick={addInfraction}
              >
                + Add Infraction
              </button>
            )}
          </div>

          {infractions.length === 0 && (
            <div className={styles.emptyState}>
              No infractions added yet. Click &quot;+ Add Infraction&quot; to get started.
            </div>
          )}

          {infractions.map((inf, index) => (
            <div key={index} className={styles.itemRow}>
              <input
                type="text"
                className={styles.nameInput}
                value={inf.name}
                onChange={e => updateInfraction(index, { name: e.target.value })}
                placeholder="Infraction name"
              />
              <input
                type="number"
                data-discipline-invalid={showValidation && isInfractionInvalid(inf) ? 'true' : undefined}
                className={`${styles.pointsInput} ${showValidation && isInfractionInvalid(inf) ? styles.pointsInputError : ''}`}
                value={inf.points === null ? '' : inf.points}
                onChange={e => {
                  const val = e.target.value;
                  updateInfraction(index, {
                    points: val === '' ? null : parseFloat(val),
                  });
                }}
                placeholder="Pts"
                step="0.5"
                min="0"
              />
              {inf.fromLevi && (
                <span className={styles.leviBadge}>Suggested by Levi</span>
              )}
              <button
                type="button"
                className={styles.deleteItemBtn}
                onClick={() => deleteInfraction(index)}
                title="Remove infraction"
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>

        {/* Actions Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <span className={styles.sectionLabel}>Disciplinary Actions</span>
              <span className={styles.countBadge}>{actions.filter(a => a.name.trim()).length}</span>
            </div>
            {actions.length < MAX_ACTIONS && (
              <button
                type="button"
                className={styles.addItemBtn}
                onClick={addAction}
              >
                + Add Action
              </button>
            )}
          </div>

          {actions.length === 0 && (
            <div className={styles.emptyState}>
              No actions added yet. Click &quot;+ Add Action&quot; to get started.
            </div>
          )}

          {actions.map((act, index) => (
            <div key={index} className={styles.itemRow}>
              <input
                type="text"
                className={styles.nameInput}
                value={act.name}
                onChange={e => updateAction(index, { name: e.target.value })}
                placeholder="Action name"
              />
              <input
                type="number"
                data-discipline-invalid={showValidation && isActionInvalid(act) ? 'true' : undefined}
                className={`${styles.pointsInput} ${showValidation && isActionInvalid(act) ? styles.pointsInputError : ''}`}
                value={act.pointsThreshold === null ? '' : act.pointsThreshold}
                onChange={e => {
                  const val = e.target.value;
                  updateAction(index, {
                    pointsThreshold: val === '' ? null : parseFloat(val),
                  });
                }}
                placeholder="Threshold"
                step="0.5"
                min="0"
              />
              {act.fromLevi && (
                <span className={styles.leviBadge}>Suggested by Levi</span>
              )}
              <button
                type="button"
                className={styles.deleteItemBtn}
                onClick={() => deleteAction(index)}
                title="Remove action"
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.skipLink}
        onClick={onSkip}
      >
        Skip &mdash; configure later in Settings
      </button>

      <div className={styles.navRow}>
        {onBack && (
          <button type="button" className={styles.stepBackBtn} onClick={onBack}>
            &#8592; Back
          </button>
        )}
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
