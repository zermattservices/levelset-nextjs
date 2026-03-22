/**
 * Evaluation Scoring Engine
 *
 * Calculates scores from form fields with scored=true in their settings.
 * Scoring type is auto-derived from field type.
 * Sections aggregate points from their scored children.
 */

import type { FormField } from './schema-builder';

/** Types that can be scored */
export const SCORABLE_TYPES = new Set([
  'rating_1_3',
  'rating_1_5',
  'true_false',
  'numeric_score',
]);

export function isScorable(fieldType: string): boolean {
  return SCORABLE_TYPES.has(fieldType);
}

export interface ScoredQuestion {
  fieldId: string;
  fieldLabel: string;
  sectionId: string | null;
  fieldType: string;
  weight: number;
  maxValue?: number;
  rawAnswer: any;
  earnedPoints: number;
  maxPoints: number;
}

export interface SectionScore {
  sectionId: string;
  sectionName: string;
  questions: ScoredQuestion[];
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
}

export interface EvaluationScore {
  sections: SectionScore[];
  unscoredQuestions: ScoredQuestion[];
  totalEarned: number;
  totalMax: number;
  overallPercentage: number;
}

/**
 * Score a single question answer based on field type.
 */
export function scoreQuestion(
  answer: any,
  fieldType: string,
  weight: number,
  maxValue?: number
): { earned: number; max: number } {
  const max = weight;

  if (answer == null || answer === '') {
    return { earned: 0, max };
  }

  switch (fieldType) {
    case 'rating_1_3': {
      const val = Number(answer);
      if (isNaN(val) || val < 1 || val > 3) return { earned: 0, max };
      // 1=0%, 2=50%, 3=100%
      return { earned: ((val - 1) / 2) * weight, max };
    }
    case 'rating_1_5': {
      const val = Number(answer);
      if (isNaN(val) || val < 1 || val > 5) return { earned: 0, max };
      // 1=0%, 2=25%, 3=50%, 4=75%, 5=100%
      return { earned: ((val - 1) / 4) * weight, max };
    }
    case 'true_false': {
      const isTrue = answer === true || answer === 'true' || answer === 1;
      return { earned: isTrue ? weight : 0, max };
    }
    case 'numeric_score': {
      const val = Number(answer);
      if (isNaN(val) || val < 0) return { earned: 0, max };
      const denominator = maxValue || 1;
      const clamped = Math.min(val, denominator);
      return { earned: (clamped / denominator) * weight, max };
    }
    default:
      return { earned: 0, max };
  }
}

/**
 * Calculate the full evaluation score from fields and response data.
 *
 * Sections are identified by type='section' fields with children arrays.
 * Scored questions are fields with settings.scored=true.
 *
 * @param fields - The form's FormField array (with sections and their children)
 * @param responseData - The submitted form answers keyed by field ID
 */
export function calculateEvaluationScore(
  fields: FormField[],
  responseData: Record<string, any>
): EvaluationScore {
  // Build a map of all fields by ID
  const fieldMap = new Map<string, FormField>();
  for (const f of fields) fieldMap.set(f.id, f);

  // Build section map: sectionId -> child field IDs
  const sections: Array<{ id: string; name: string; childIds: string[] }> = [];
  const childToSection = new Map<string, string>();

  for (const field of fields) {
    if (field.type === 'section' && field.children) {
      sections.push({
        id: field.id,
        name: field.settings.sectionName || field.label,
        childIds: field.children,
      });
      for (const childId of field.children) {
        childToSection.set(childId, field.id);
      }
    }
  }

  // Score all scored fields
  const sectionScoreMap = new Map<string, SectionScore>();
  const unscoredQuestions: ScoredQuestion[] = [];

  for (const section of sections) {
    sectionScoreMap.set(section.id, {
      sectionId: section.id,
      sectionName: section.name,
      questions: [],
      earnedPoints: 0,
      maxPoints: 0,
      percentage: 0,
    });
  }

  for (const field of fields) {
    if (!field.settings.scored || !isScorable(field.type)) continue;

    const weight = field.settings.weight || 0;
    if (weight <= 0) continue;

    const answer = responseData[field.id];
    const { earned, max } = scoreQuestion(
      answer,
      field.type,
      weight,
      field.settings.maxValue
    );

    const scored: ScoredQuestion = {
      fieldId: field.id,
      fieldLabel: field.label || field.id,
      sectionId: childToSection.get(field.id) || null,
      fieldType: field.type,
      weight,
      maxValue: field.settings.maxValue,
      rawAnswer: answer,
      earnedPoints: earned,
      maxPoints: max,
    };

    const parentSectionId = childToSection.get(field.id);
    if (parentSectionId) {
      const section = sectionScoreMap.get(parentSectionId);
      if (section) {
        section.questions.push(scored);
        section.earnedPoints += earned;
        section.maxPoints += max;
      }
    } else {
      unscoredQuestions.push(scored);
    }
  }

  // Calculate section percentages
  for (const section of Array.from(sectionScoreMap.values())) {
    section.percentage = section.maxPoints > 0
      ? (section.earnedPoints / section.maxPoints) * 100
      : 0;
  }

  // Filter to sections with scored questions, maintain order
  const scoredSections = sections
    .map((s) => sectionScoreMap.get(s.id)!)
    .filter((s) => s.questions.length > 0);

  const allQuestions = [
    ...scoredSections.flatMap((s) => s.questions),
    ...unscoredQuestions,
  ];

  const totalEarned = allQuestions.reduce((sum, q) => sum + q.earnedPoints, 0);
  const totalMax = allQuestions.reduce((sum, q) => sum + q.maxPoints, 0);
  const overallPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return {
    sections: scoredSections,
    unscoredQuestions,
    totalEarned,
    totalMax,
    overallPercentage,
  };
}

/**
 * Backward-compatible wrapper for old evaluation settings format.
 * Converts template.settings.evaluation into fields format and scores.
 */
export function calculateEvaluationScoreLegacy(
  responseData: Record<string, any>,
  evaluationSettings: {
    sections?: Array<{ id: string; name: string; order: number }>;
    questions?: Record<string, {
      section_id: string;
      weight: number;
      scoring_type: string;
    }>;
  }
): EvaluationScore {
  // Build synthetic fields from old format
  const fields: FormField[] = [];
  const sections = evaluationSettings.sections || [];
  const questions = evaluationSettings.questions || {};

  // Create section fields
  for (const section of sections) {
    const childIds = Object.entries(questions)
      .filter(([, q]) => q.section_id === section.id)
      .map(([fieldId]) => fieldId);

    fields.push({
      id: section.id,
      type: 'section',
      label: section.name,
      labelEs: '',
      required: false,
      settings: { sectionName: section.name },
      children: childIds,
    });
  }

  // Create question fields
  for (const [fieldId, qConfig] of Object.entries(questions)) {
    // Map old scoring_type to field type
    let fieldType = qConfig.scoring_type;
    if (fieldType === 'percentage') fieldType = 'numeric_score';

    fields.push({
      id: fieldId,
      type: fieldType,
      label: fieldId,
      labelEs: '',
      required: false,
      settings: {
        scored: true,
        weight: qConfig.weight,
      },
    });
  }

  return calculateEvaluationScore(fields, responseData);
}
