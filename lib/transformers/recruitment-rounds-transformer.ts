import type { RecruitmentRoundApiResponse, HiringRound, Competency } from '@/lib/hiring-types'

export class RecruitmentRoundsTransformer {
  static transformApiToUi(apiRound: RecruitmentRoundApiResponse, order: number = 0): HiringRound {
    // Transform competencies from API format to UI format
    const competencies: Competency[] = apiRound.competencies.map((comp, index) => ({
      id: `comp-${apiRound.id}-${index}`,
      name: comp.name,
      description: comp.description,
      rubricScorecard: comp.rubric_scorecard,
      questions: Object.entries(comp.rubric_scorecard || {}).map(([key, text]) => ({
        id: `q-${apiRound.id}-${index}-${key}`,
        text: text
      })),
      focusAreas: [] // API doesn't provide focus areas
    }))

    return {
      id: apiRound.id,
      name: apiRound.name,
      type: apiRound.type, // Use actual round type from API (INTERVIEW, RAPID_FIRE, etc.)
      isSelected: apiRound.is_default, // Auto-select default rounds
      order: order,
      description: apiRound.description,
      evaluationCriteria: apiRound.evaluation_criteria || "",
      questionLevelEvaluationCriteria: "", // Initialize as empty for template rounds
      competencies,
      // These fields don't exist in API but are needed for UI compatibility
      duration: undefined,
      difficulty: undefined
    }
  }

  static transformApiListToUi(apiRounds: RecruitmentRoundApiResponse[]): HiringRound[] {
    // Sort rounds: default rounds first, then others
    const sortedRounds = [...apiRounds].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1
      if (!a.is_default && b.is_default) return 1
      return 0
    })
    
    return sortedRounds.map((round, index) => this.transformApiToUi(round, index + 1))
  }
}