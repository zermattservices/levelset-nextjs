import * as React from 'react';
import {
  getTemplatePositionsByZone,
  getTemplateCriteria,
  isTemplatePosition,
} from '@/lib/onboarding/position-template';
import styles from './PositionsStep.module.css';

interface Criterion {
  name: string;
  description: string;
  criteria_order: number;
}

interface Position {
  name: string;
  zone: 'FOH' | 'BOH';
  description: string;
  displayOrder: number;
  isTemplate: boolean;
  criteria: Criterion[];
}

interface PositionsStepProps {
  orgId: string;
  locations: Array<{ id: string; name: string; location_number: string }>;
  initialData: { positions: Position[] } | null;
  onComplete: (data: { positions: Position[] }) => void;
  onBack?: () => void;
}

function buildDefaultCriteria(): Criterion[] {
  return Array.from({ length: 5 }, (_, i) => ({
    name: '',
    description: '',
    criteria_order: i + 1,
  }));
}

function getDefaultPositions(): Position[] {
  const foh = getTemplatePositionsByZone('FOH');
  const boh = getTemplatePositionsByZone('BOH');

  const positions: Position[] = [];

  boh.forEach((tp, i) => {
    positions.push({
      name: tp.name,
      zone: 'BOH',
      description: tp.description,
      displayOrder: i + 1,
      isTemplate: true,
      criteria: tp.criteria.map(c => ({ ...c })),
    });
  });

  foh.forEach((tp, i) => {
    positions.push({
      name: tp.name,
      zone: 'FOH',
      description: tp.description,
      displayOrder: i + 1,
      isTemplate: true,
      criteria: tp.criteria.map(c => ({ ...c })),
    });
  });

  return positions;
}

/** Ensure a position always has exactly 5 criteria slots */
function padCriteriaTo5(criteria: Criterion[]): Criterion[] {
  const padded = [...criteria];
  while (padded.length < 5) {
    padded.push({ name: '', description: '', criteria_order: padded.length + 1 });
  }
  return padded.slice(0, 5);
}

export function PositionsStep({ orgId, locations, initialData, onComplete, onBack }: PositionsStepProps) {
  const [activeTab, setActiveTab] = React.useState(0);
  const [positions, setPositions] = React.useState<Position[]>(() => {
    if (initialData?.positions) {
      // Pad criteria back to 5 — empty ones were stripped on save
      return initialData.positions.map(p => ({
        ...p,
        criteria: padCriteriaTo5(p.criteria || []),
      }));
    }
    return getDefaultPositions();
  });
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Flag to show validation highlights after first submit attempt
  const [showValidation, setShowValidation] = React.useState(false);

  const fohPositions = positions.filter(p => p.zone === 'FOH');
  const bohPositions = positions.filter(p => p.zone === 'BOH');

  const getPositionKey = (pos: Position, index: number) =>
    `${pos.zone}-${index}`;

  const renamePosition = (oldName: string, zone: 'FOH' | 'BOH', newName: string) => {
    setPositions(prev =>
      prev.map(p => {
        if (p.name === oldName && p.zone === zone) {
          const nowTemplate = isTemplatePosition(newName);
          return {
            ...p,
            name: newName,
            isTemplate: nowTemplate,
            criteria: nowTemplate
              ? getTemplateCriteria(newName).map(c => ({ ...c }))
              : p.criteria,
          };
        }
        return p;
      })
    );
  };

  const updateCriterion = (
    posName: string,
    zone: 'FOH' | 'BOH',
    criterionIndex: number,
    updates: Partial<Criterion>
  ) => {
    setPositions(prev =>
      prev.map(p => {
        if (p.name === posName && p.zone === zone) {
          const newCriteria = [...p.criteria];
          newCriteria[criterionIndex] = { ...newCriteria[criterionIndex], ...updates };
          return { ...p, criteria: newCriteria };
        }
        return p;
      })
    );
  };

  const updatePositionDescription = (posName: string, zone: 'FOH' | 'BOH', description: string) => {
    setPositions(prev =>
      prev.map(p => {
        if (p.name === posName && p.zone === zone) {
          return { ...p, description };
        }
        return p;
      })
    );
  };

  const addPosition = (zone: 'FOH' | 'BOH') => {
    const zonePositions = positions.filter(p => p.zone === zone);
    const maxOrder = Math.max(0, ...zonePositions.map(p => p.displayOrder));

    setPositions(prev => [
      ...prev,
      {
        name: '',
        zone,
        description: '',
        displayOrder: maxOrder + 1,
        isTemplate: false,
        criteria: buildDefaultCriteria(),
      },
    ]);
  };

  const deletePosition = (name: string, zone: 'FOH' | 'BOH') => {
    setPositions(prev => prev.filter(p => !(p.name === name && p.zone === zone)));
    setExpandedKey(null);
  };

  const toggleExpand = (key: string) => {
    setExpandedKey(prev => (prev === key ? null : key));
  };

  /** Check if a criterion is invalid (has a position with a name but criterion name is empty) */
  const isCriterionInvalid = (criterion: Criterion) => !criterion.name.trim();

  /** Check if a position has any invalid criteria */
  const positionHasInvalidCriteria = (pos: Position) =>
    pos.name.trim() !== '' && pos.criteria.some(isCriterionInvalid);

  // Auto-clear error banner when all criteria are fixed
  React.useEffect(() => {
    if (showValidation && !positions.some(positionHasInvalidCriteria)) {
      setError(null);
    }
  }, [showValidation, positions]);

  const handleSubmit = () => {
    setError(null);

    const emptyPositions = positions.filter(p => !p.name.trim());
    if (emptyPositions.length > 0) {
      setError('All positions must have a name');
      return;
    }

    for (const zone of ['FOH', 'BOH'] as const) {
      const zoneNames = positions
        .filter(p => p.zone === zone)
        .map(p => p.name.trim().toLowerCase());
      const uniqueNames = new Set(zoneNames);
      if (uniqueNames.size !== zoneNames.length) {
        setError(`Duplicate position names in ${zone}`);
        return;
      }
    }

    if (positions.length === 0) {
      setError('Add at least one position');
      return;
    }

    // Validate that every position has all 5 criteria filled in
    const hasInvalid = positions.some(positionHasInvalidCriteria);

    if (hasInvalid) {
      setShowValidation(true);
      setError('Every position needs all 5 rating criteria filled in.');

      // Expand the first position with missing criteria and scroll to it
      let firstBadKey: string | null = null;
      for (const zone of ['FOH', 'BOH'] as const) {
        const zonePositions = positions.filter(p => p.zone === zone);
        for (let posIdx = 0; posIdx < zonePositions.length; posIdx++) {
          if (positionHasInvalidCriteria(zonePositions[posIdx])) {
            firstBadKey = `${zone}-${posIdx}`;
            break;
          }
        }
        if (firstBadKey) break;
      }

      if (firstBadKey) {
        setExpandedKey(firstBadKey);
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-position-key="${firstBadKey}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
      return;
    }

    setIsSubmitting(true);
    onComplete({
      positions: positions.map(p => ({
        ...p,
        name: p.name.trim(),
        criteria: p.criteria.filter(c => c.name.trim() !== ''),
      })),
    });
  };

  const renderCriteriaSection = (pos: Position, zone: 'FOH' | 'BOH', posIdx: number) => (
    <div className={styles.criteriaSection}>
      {/* Position description — editable for all positions */}
      <div className={styles.posDescriptionField}>
        <label className={styles.posDescriptionLabel}>Position Description</label>
        <textarea
          className={styles.posDescriptionInput}
          value={pos.description}
          onChange={e => updatePositionDescription(pos.name, pos.zone, e.target.value)}
          placeholder="Describe what this position does..."
          rows={3}
        />
      </div>

      <div className={styles.criteriaHeader}>
        <span className={styles.criteriaTitle}>Rating Criteria</span>
        <span className={styles.criteriaSubtitle}>
          {pos.isTemplate ? 'Pre-filled from template' : 'Define how team members are scored'}
        </span>
      </div>
      {pos.criteria.map((criterion, ci) => {
        const isInvalid = showValidation && pos.name.trim() !== '' && isCriterionInvalid(criterion);
        return (
          <div key={ci} className={styles.criterionRow}>
            <div className={`${styles.criterionNumber} ${isInvalid ? styles.criterionNumberError : ''}`}>{ci + 1}</div>
            <div className={styles.criterionFields}>
              <input
                type="text"
                className={`${styles.criterionName} ${isInvalid ? styles.criterionNameError : ''}`}
                value={criterion.name}
                onChange={e => updateCriterion(pos.name, pos.zone, ci, { name: e.target.value })}
                placeholder={`Criterion ${ci + 1} name`}
              />
              <textarea
                className={styles.criterionDescription}
                value={criterion.description}
                onChange={e => updateCriterion(pos.name, pos.zone, ci, { description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
              />
            </div>
          </div>
        );
      })}
      <p className={styles.criteriaNote}>
        You can finish setting up rating criteria later in <strong>Settings &gt; Positional Excellence</strong>.
      </p>
    </div>
  );

  const renderPositionList = (zone: 'FOH' | 'BOH', zonePositions: Position[]) => (
    <>
      <div className={styles.zoneHeader}>
        <span className={styles.zoneLabel}>{zone === 'FOH' ? 'Front of House' : 'Back of House'}</span>
        <button
          type="button"
          className={styles.addPositionBtn}
          onClick={() => addPosition(zone)}
        >
          + Add Position
        </button>
      </div>

      {zonePositions.map((pos, index) => {
        const key = getPositionKey(pos, index);
        const isExpanded = expandedKey === key;
        // Check if this position has any invalid criteria
        const hasErrors = showValidation && positionHasInvalidCriteria(pos);

        return (
          <div
            key={key}
            data-position-key={key}
            className={`${styles.positionCard} ${isExpanded ? styles.positionCardExpanded : ''} ${hasErrors && !isExpanded ? styles.positionCardError : ''}`}
          >
            <div className={styles.positionCardMain}>
              <button
                type="button"
                className={styles.expandToggle}
                onClick={() => toggleExpand(key)}
                title={isExpanded ? 'Collapse criteria' : 'View rating criteria'}
              >
                <span className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`}>
                  &#9654;
                </span>
              </button>
              <div className={styles.positionNumber}>{index + 1}</div>
              <div className={styles.positionContent}>
                <div className={styles.positionNameRow}>
                  <input
                    type="text"
                    className={styles.positionName}
                    value={pos.name}
                    onChange={e => renamePosition(pos.name, zone, e.target.value)}
                    placeholder="Position name"
                  />
                  {pos.isTemplate && (
                    <span className={styles.templateBadge}>Template</span>
                  )}
                </div>
                {hasErrors && !isExpanded && (
                  <div className={styles.positionErrorHint}>Missing criteria — expand to fill in</div>
                )}
                {pos.description && !isExpanded && !hasErrors && (
                  <div className={styles.positionDescription}>{pos.description}</div>
                )}
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={() => deletePosition(pos.name, zone)}
                title="Remove position"
              >
                &#10005;
              </button>
            </div>

            {isExpanded && renderCriteriaSection(pos, zone, index)}
          </div>
        );
      })}
    </>
  );

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Positions</h3>
        <p className={styles.sectionDescription}>
          These positions define how you rate team members.
          We've pre-filled common positions — edit, add, or remove to match your store.
          Click the arrow on any position to view and edit its rating criteria.
        </p>

        <div className={styles.infoBanner}>
          <span className={styles.infoBannerIcon}>&#9432;</span>
          <span>
            You can always edit positions later in <strong>Settings &gt; Positional Excellence</strong>.
            Template positions include pre-built rating criteria.
          </span>
        </div>

        {locations.length > 1 && (
          <div className={styles.tabs}>
            {locations.map((loc, index) => (
              <button
                key={loc.id}
                type="button"
                className={`${styles.tab} ${activeTab === index ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(index)}
              >
                {loc.name || `Location ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        {renderPositionList('FOH', fohPositions)}
        {renderPositionList('BOH', bohPositions)}
      </div>

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
