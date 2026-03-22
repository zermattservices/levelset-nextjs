import * as React from 'react';
import { CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import sty from './EvaluationScoreDisplay.module.css';
import type { EvaluationScore, SectionScore, ScoredQuestion } from '@/lib/forms/scoring';

interface EvaluationScoreDisplayProps {
  score: EvaluationScore;
  aiSummary?: string | null;
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return '#16A34A';
  if (percentage >= 60) return '#FACC15';
  return '#D23230';
}

function getScaleMax(fieldType: string, maxValue?: number): number {
  if (fieldType === 'rating_1_3') return 3;
  if (fieldType === 'rating_1_5') return 5;
  if (fieldType === 'numeric_score') return maxValue ?? 10;
  if (fieldType === 'true_false') return 1;
  return 1;
}

function QuestionRow({ q }: { q: ScoredQuestion }) {
  const pct = q.maxPoints > 0 ? Math.round((q.earnedPoints / q.maxPoints) * 100) : 0;
  const color = getScoreColor(pct);
  const scaleMax = getScaleMax(q.fieldType, q.maxValue);
  const rawDisplay = q.rawAnswer != null ? String(q.rawAnswer) : '0';

  return (
    <div className={sty.questionRow}>
      <span className={sty.questionLabel}>{q.fieldLabel || q.fieldId}</span>
      <span className={sty.questionScore}>
        <span className={sty.questionRaw}>{rawDisplay} / {scaleMax}</span>
        <span className={sty.questionPct} style={{ color }}>{pct}%</span>
      </span>
    </div>
  );
}

function SectionBlock({ section }: { section: SectionScore }) {
  const [expanded, setExpanded] = React.useState(false);
  const color = getScoreColor(section.percentage);
  const pct = Math.round(section.percentage);

  return (
    <div className={sty.sectionCard}>
      <button
        className={`${sty.sectionHeader} ${expanded ? sty.sectionHeaderExpanded : ''}`}
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <ExpandMoreIcon
          className={`${sty.caretIcon} ${expanded ? sty.caretIconExpanded : ''}`}
          sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }}
        />
        <div className={sty.sectionHeaderContent}>
          <div className={sty.sectionLabelRow}>
            <span className={sty.sectionName}>{section.sectionName}</span>
            <span className={sty.sectionStats}>
              <span className={sty.sectionPoints}>
                {section.earnedPoints.toFixed(1)} / {section.maxPoints.toFixed(1)} pts
              </span>
              <span className={sty.sectionPct} style={{ color }}>{pct}%</span>
            </span>
          </div>
          <div className={sty.barTrack}>
            <div
              className={sty.barFill}
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      </button>

      {expanded && section.questions.length > 0 && (
        <div className={sty.questionsList}>
          {section.questions.map((q) => (
            <QuestionRow key={q.fieldId} q={q} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EvaluationScoreDisplay({ score, aiSummary }: EvaluationScoreDisplayProps) {
  const overallPct = Math.round(score.overallPercentage);
  const overallColor = getScoreColor(score.overallPercentage);

  return (
    <div className={sty.container}>
      <div className={aiSummary ? sty.overallSectionWithSummary : sty.overallSection}>
        <div className={sty.overallScoreColumn}>
          <div className={sty.circleWrapper}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={120}
              thickness={4}
              sx={{ color: 'var(--ls-color-neutral-foreground)', position: 'absolute' }}
            />
            <CircularProgress
              variant="determinate"
              value={Math.min(100, overallPct)}
              size={120}
              thickness={4}
              sx={{ color: overallColor, position: 'absolute' }}
            />
            <div className={sty.circleLabel}>
              <span className={sty.circlePercentage} style={{ color: overallColor }}>
                {overallPct}%
              </span>
              <span className={sty.circleSubtext}>Overall</span>
            </div>
          </div>
          <span className={sty.overallPoints}>
            {score.totalEarned.toFixed(1)} / {score.totalMax.toFixed(1)} points
          </span>
        </div>

        {aiSummary && (
          <div className={sty.summaryColumn}>
            <p className={sty.summaryText}>{aiSummary}</p>
          </div>
        )}
      </div>

      <div className={sty.sectionsGrid}>
        <h4 className={sty.breakdownTitle}>Score Breakdown</h4>
        {score.sections.map((section) => (
          <SectionBlock key={section.sectionId} section={section} />
        ))}
      </div>
    </div>
  );
}
