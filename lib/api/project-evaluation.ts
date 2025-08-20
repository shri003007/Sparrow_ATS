import { API_CONFIG } from '@/lib/config'

export interface ProjectEvaluationRequest {
  asset_ids: string[]
  job_round_template_id: string
  candidate_id: string
}

export interface ProjectEvaluationQuestion {
  question_id: string
  question: string
  score: number
  explanation: string
}

export interface ProjectCompetencyScore {
  competency_name: string
  questions: ProjectEvaluationQuestion[]
  percentage_score: number
}

export interface ProjectCompetencyEvaluation {
  competency_scores: ProjectCompetencyScore[]
  overall_percentage_score: number
}

export interface ProjectEvaluationResponse {
  success: boolean
  message: string
  candidate_id: string
  job_round_template_id: string
  candidate_round_id: string
  assets_evaluated: number
  evaluation_summary: string
  competency_evaluation: ProjectCompetencyEvaluation
  overall_percentage_score: number
  result_saved: boolean
  result_action: string
  evaluated_asset_ids: string[]
}

const getProjectEvaluationApiUrl = (): string => {
  if (!API_CONFIG.CANDIDATE_PROJECT_EVALUATION_API_URL) {
    throw new Error('Project evaluation API URL not configured')
  }
  return API_CONFIG.CANDIDATE_PROJECT_EVALUATION_API_URL
}

export async function evaluateProjectCandidate(
  request: ProjectEvaluationRequest
): Promise<ProjectEvaluationResponse> {
  const apiUrl = getProjectEvaluationApiUrl()
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Project evaluation failed: ${response.status} ${text}`)
  }

  return await response.json()
}
