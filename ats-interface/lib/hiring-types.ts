// API Response interfaces
export interface RecruitmentRoundCompetencyApiResponse {
  name: string
  description: string
  rubric_scorecard: Record<string, string>
}

export interface RecruitmentRoundApiResponse {
  id: string
  name: string
  type: string
  description: string
  is_default: boolean
  evaluation_criteria: string | null
  competencies: RecruitmentRoundCompetencyApiResponse[]
  created_at: string
  updated_at: string
}

export interface RecruitmentRoundsApiResponse {
  recruitment_rounds: RecruitmentRoundApiResponse[]
}

// UI interfaces (transformed from API)
export interface HiringRound {
  id: string
  name: string
  type: string
  isSelected: boolean
  order: number
  competencies: Competency[]
  description?: string
  duration?: string
  difficulty?: "Easy" | "Intermediate" | "Hard"
  evaluationCriteria: string // Added to the round level
}

export interface Competency {
  id: string
  name: string
  questions: Question[]
  focusAreas?: string[]
  description?: string
  rubricScorecard?: Record<string, string>
}

export interface Question {
  id: string
  text: string
}
