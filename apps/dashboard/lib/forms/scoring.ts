/**
 * Evaluation Scoring Engine
 *
 * Calculates scores for evaluation forms based on question weights,
 * scoring types, and section groupings.
 */

export interface ScoredQuestion {
  fieldId: string;
  sectionId: string | null;
  scoringType: 'rating_1_3' | 'rating_1_5' | 'true_false' | 'percentage';
  weight: number;
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
  totalEarned: number;
  totalMax: number;
  overallPercentage: number;
}

/**
 * Score a single question answer.
 * Returns earned points out of the question's weight.
 */
export function scoreQuestion(
  answer: any,
  scoringType: string,
  weight: number
): { earned: number; max: number } {
  const max = weight;

  if (answer == null || answer === '') {
    return { earned: 0, max };
  }

  switch (scoringType) {
    case 'rating_1_3': {
      const val = Number(answer);
      if (isNaN(val) || val < 1 || val > 3) return { earned: 0, max };
      return { earned: (val / 3) * weight, max };
    }
    case 'rating_1_5': {
      const val = Number(answer);
      if (isNaN(val) || val < 1 || val > 5) return { earned: 0, max };
      return { earned: (val / 5) * weight, max };
    }
    case 'true_false': {
      const isTrue = answer === true || answer === 'true' || answer === 1;
      return { earned: isTrue ? weight : 0, max };
    }
    case 'percentage': {
      const val = Number(answer);
      if (isNaN(val)) return { earned: 0, max };
      const clamped = Math.max(0, Math.min(100, val));
      return { earned: (clamped / 100) * weight, max };
    }
    default:
      return { earned: 0, max };
  }
}

/**
 * Calculate the full evaluation score from response data and template settings.
 *
 * @param responseData - The submitted form answers keyed by field ID
 * @param evaluationSettings - The template.settings.evaluation object
 */
export function calculateEvaluationScore(
  responseData: Record<string, any>,
  evaluationSettings: {
    sections?: Array<{ id: string; name: string; order: number }>;
    questions?: Record<string, {
      section_id: string;
      weight: number;
      scoring_type: string;
      connected_to?: string;
      connector_params?: Record<string, any>;
    }>;
  }
): EvaluationScore {
  const sections = evaluationSettings.sections || [];
  const questions = evaluationSettings.questions || {};

  const sectionMap = new Map<string, SectionScore>();

  for (const section of sections) {
    sectionMap.set(section.id, {
      sectionId: section.id,
      sectionName: section.name,
      questions: [],
      earnedPoints: 0,
      maxPoints: 0,
      percentage: 0,
    });
  }

  // "Uncategorized" bucket for questions without a section
  const uncategorizedId = '__uncategorized__';

  for (const [fieldId, qConfig] of Object.entries(questions)) {
    const answer = responseData[fieldId];
    const { earned, max } = scoreQuestion(answer, qConfig.scoring_type, qConfig.weight);

    const scored: ScoredQuestion = {
      fieldId,
      sectionId: qConfig.section_id || null,
      scoringType: qConfig.scoring_type as ScoredQuestion['scoringType'],
      weight: qConfig.weight,
      rawAnswer: answer,
      earnedPoints: earned,
      maxPoints: max,
    };

    const targetId = qConfig.section_id || uncategorizedId;
    let section = sectionMap.get(targetId);
    if (!section) {
      section = {
        sectionId: targetId,
        sectionName: 'General',
        questions: [],
        earnedPoints: 0,
        maxPoints: 0,
        percentage: 0,
      };
      sectionMap.set(targetId, section);
    }

    section.questions.push(scored);
    section.earnedPoints += earned;
    section.maxPoints += max;
  }

  // Calculate section percentages
  for (const section of sectionMap.values()) {
    section.percentage = section.maxPoints > 0
      ? (section.earnedPoints / section.maxPoints) * 100
      : 0;
  }

  // Sort sections by the order from settings, uncategorized last
  const sectionOrder = new Map(sections.map((s, i) => [s.id, i]));
  const sortedSections = Array.from(sectionMap.values())
    .filter((s) => s.questions.length > 0)
    .sort((a, b) => {
      const orderA = sectionOrder.get(a.sectionId) ?? 999;
      const orderB = sectionOrder.get(b.sectionId) ?? 999;
      return orderA - orderB;
    });

  const totalEarned = sortedSections.reduce((sum, s) => sum + s.earnedPoints, 0);
  const totalMax = sortedSections.reduce((sum, s) => sum + s.maxPoints, 0);
  const overallPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return {
    sections: sortedSections,
    totalEarned,
    totalMax,
    overallPercentage,
  };
}
