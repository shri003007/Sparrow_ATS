/**
 * Types for job round templates and candidate rounds management
 */

// Job Round Template Types
export interface JobRoundTemplate {
  id: string
  job_opening_id: string
  round_id: string | null
  order_index: number
  is_active: boolean
  is_required: boolean
  custom_evaluation_criteria: string | null
  custom_competencies: Competency[] | null
  created_at: string
  round_name: string
  round_type: string
}

export interface JobRoundTemplatesResponse {
  job_round_templates: JobRoundTemplate[]
}

// Competency structure for rounds
export interface Competency {
  name: string
  description: string
  rubric_scorecard: Record<string, string>
}

// Candidate Round Status Update Types
export interface CandidateRoundStatusUpdate {
  candidate_id: string
  round_status: 'action_pending' | 'selected' | 'rejected'
}

export interface BulkCandidateRoundStatusRequest {
  candidates: CandidateRoundStatusUpdate[]
}

export interface BulkCandidateRoundStatusResponse {
  message: string
  total_processed: number
  successful_count: number
  failed_count: number
  status_summary: {
    selected: number
    rejected: number
    action_pending: number
  }
  updated_candidates: {
    candidate_id: string
    round_status: string
    candidate_data: {
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
      round_status: string
    }
  }[]
  failed_candidates: any[] | null
}

// Start Rounds Types
export interface StartRoundsResponse {
  message: string
  job_opening: {
    id: string
    posting_title?: string
    job_status?: string
    has_rounds_started: boolean
    updated_at: string
  }
  previous_rounds_status?: boolean
  new_rounds_status?: boolean
}

// Candidate Rounds Creation Types
export interface CandidateRoundCreateRequest {
  candidate_id: string
  job_round_template_id?: string
  round_id?: string
  order_index: number
  round_type?: string
  evaluation_criteria?: string
  competencies?: Competency[]
  created_by: string
  notes?: string
}

export interface BulkCandidateRoundsCreateRequest {
  candidates: {
    candidate_id: string
    status: 'selected' | 'rejected' | 'action_pending'
  }[]
  job_round_template_id: string
  created_by: string
}

export interface CandidateRoundCreateResponse {
  id: string
  candidate_id: string
  job_round_template_id: string | null
  round_id: string | null
  order_index: number
  round_type: string
  is_active: boolean
  evaluation_criteria: string | null
  competencies: Competency[] | null
  created_by: string
  notes: string | null
  status: string
  is_evaluation: boolean
  is_deleted: boolean
  created_at: string
}

export interface BulkCandidateRoundsCreateResponse {
  message: string
  job_round_template_id: string
  template_info: {
    round_name: string
    round_type: string
    order_index: number
  }
  total_processed: number
  successful_count: number
  failed_count: number
  operation_summary: {
    created: number
    updated: number
  }
  status_summary: {
    selected: number
    rejected: number
    action_pending: number
  }
  processed_rounds: {
    operation: 'created' | 'updated'
    candidate_id: string
    status: string
    is_deleted: boolean
    is_active: boolean
    round_data: CandidateRoundCreateResponse
  }[]
  failed_rounds: any[] | null
}

// Start Rounds Flow State
export interface StartRoundsFlowState {
  isLoading: boolean
  currentStep: 'idle' | 'fetching-templates' | 'updating-status' | 'starting-rounds' | 'creating-rounds' | 'completed' | 'error'
  error: string | null
  progress: {
    templatesLoaded: boolean
    statusUpdated: boolean
    roundsStarted: boolean
    candidateRoundsCreated: boolean
  }
}