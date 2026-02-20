import * as React from 'react';
import { CircularProgress } from '@mui/material';
import sty from './EvaluationScoreDisplay.module.css';
import type { EvaluationScore, SectionScore } from '@/lib/forms/scoring';

interface EvaluationScoreDisplayProps {
  score: EvaluationScore;
}

function getScoreColor(percentage: number): string {
  if (percentage >= 80) return '#16A34A';
  if (percentage >= 60) return '#FACC15';
  return '#D23230';
}

function formatAnswer(raw: any): string {
  if (raw == null || raw === '') return '\u2014';
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  return String(raw);
}

function SectionBlock({ section }: { section: SectionScore }) {
  const [expanded, setExpanded] = React.useState(false);
  const color = getScoreColor(section.percentage);
  const pct = Math.round(section.percentage);

  return (
    <div className={sty.sectionRow}>
      <div className={sty.sectionLabelRow}>
        <span className={sty.sectionName}>{section.sectionName}</span>
        <span className={sty.sectionPct} style={{ color }}>
          {pct}%
        </span>
      </div>

      <div className={sty.barTrack}>
        <div
          className={sty.barFill}
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>

      <span className={sty.sectionPoints}>
        {section.earnedPoints.toFixed(1)} / {section.maxPoints.toFixed(1)} pts
      </span>

      {section.questions.length > 0 && (
        <>
          <button
            className={sty.questionsToggle}
            onClick={() => setExpanded(!expanded)}
            type="button"
          >
            {expanded ? 'Hide details' : `Show ${section.questions.length} questions`}
          </button>

          {expanded && (
            <div className={sty.questionsList}>
              {section.questions.map((q) => {
                const qColor = getScoreColor(
                  q.maxPoints > 0 ? (q.earnedPoints / q.maxPoints) * 100 : 0
                );
                return (
                  <div key={q.fieldId} className={sty.questionRow}>
                    <span className={sty.questionLabel}>{q.fieldId}</span>
                    <span className={sty.questionAnswer}>{formatAnswer(q.rawAnswer)}</span>
                    <span className={sty.questionPoints} style={{ color: qColor }}>
                      {q.earnedPoints.toFixed(1)} / {q.maxPoints.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function EvaluationScoreDisplay({ score }: EvaluationScoreDisplayProps) {
  const overallPct = Math.round(score.overallPercentage);
  const overallColor = getScoreColor(score.overallPercentage);

  return (
    <div className={sty.container}>
      <div className={sty.overallSection}>
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

      <div className={sty.sectionsGrid}>
        <h4 className={sty.sectionHeader}>Section Breakdown</h4>
        {score.sections.map((section) => (
          <SectionBlock key={section.sectionId} section={section} />
        ))}
      </div>
    </div>
  );
}
