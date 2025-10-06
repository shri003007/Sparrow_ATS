// Types for round candidates API responses

export interface PaginationInfo {
  current_page: number
  total_pages: number
  total_count: number
  limit: number
  has_next: boolean
  has_previous: boolean
  current_page_count: number
}

export interface RoundCandidateResponse {
  job_round_template_id: string
  template_info: {
    round_name: string
    round_type: string
    order_index: number
    round_id: string
    evaluation_criteria: string | null
    competencies: any | null
  } | null
  pagination?: PaginationInfo
  candidate_count?: number // Legacy field, use pagination.total_count instead
  candidates: RoundCandidate[]
  custom_field_definitions: CustomFieldDefinition[]
  custom_fields_included: boolean
  evaluations_included: boolean
}

export interface RoundCandidate {
  id: string
  job_opening_id: string
  resume_url: string
  name: string
  email: string
  mobile_phone: string
  experience_years: number | null
  experience_months: number | null
  current_salary: number | null
  current_salary_currency: string
  expected_salary: number | null
  expected_salary_currency: string
  available_to_join_days: number | null
  current_location: string
  overall_status: string
  source: string | null
  notes: string | null
  created_at: string
  updated_at: string
  round_status: 'selected' | 'rejected' | 'action_pending'
  custom_field_values: CustomFieldValue[]
  candidate_rounds: CandidateRound[]
}

export interface CustomFieldValue {
  id: string
  candidate_id: string
  field_definition_id: string
  field_value: string
  created_at: string
  updated_at: string
  field_definition: {
    field_name: string
    field_label: string
    field_type: string
    field_options: string[]
    is_required: boolean
    description: string | null
  }
}

export interface CandidateRound {
  id: string
  candidate_id: string
  job_round_template_id: string
  round_id: string
  order_index: number
  round_type: string
  is_active: boolean
  evaluation_criteria: string | null
  competencies: any | null
  created_at: string
  created_by: string
  notes: string | null
  status: 'selected' | 'rejected' | 'action_pending'
  is_evaluation: boolean
  is_deleted: boolean
  evaluations: CandidateEvaluation[]
}

export interface CandidateEvaluation {
  id: string
  candidate_round_id: string
  created_at: string
  updated_at: string
  evaluation_result: EvaluationResult
}

export interface EvaluationResult {
  evaluation_summary?: string
  competency_evaluation?: {
    competency_scores: Array<{
      competency_name: string
      questions: Array<{
        question_id: string
        question: string
        score: number
        explanation: string
      }>
      percentage_score: number
    }>
    overall_percentage_score: number
  }
  overall_percentage_score?: number
  comprehensive_evaluation?: string
  rapid_fire_evaluation?: string
  transcript_text?: string
  qa_pairs?: any
  grounding_results?: any[]
  cheating_score?: {
    cheating_score: number
    risk_level: string
    delayed_response_count: number
    question_repetition_count: number
    visual_score: number
    suspicious_indicators: string[]
    image_analysis_summary: string
    images_analyzed?: number
    batches_processed?: number
    analyzed_at?: string
    user_email?: string
    assessment_id?: string
  }
}

export interface CustomFieldDefinition {
  id: string
  job_opening_id: string
  field_name: string
  field_label: string
  field_type: string
  field_options: string[]
  default_value: string | null
  is_required: boolean
  validation_rules: Record<string, any>
  display_order: number
  is_active: boolean
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}