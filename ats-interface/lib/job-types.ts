// API Response types
export interface JobTemplateApiResponse {
  id: string
  title: string
  job_description: string
  created_by: string
  created_at: string
  updated_at: string
  employment_type: string
  minimum_experience: string
  compensation_type: string
  compensation_value: number
  compensation_currency: string
}

export interface JobTemplatesApiResponse {
  job_templates: JobTemplateApiResponse[]
}

// UI types (transformed from API)
export interface JobTemplate {
  id: string
  title: string
  employmentType: string
  minExperience: string
  compensation: string
  description: string
  summary: string
  responsibilities: string[]
}

export interface JobFormData {
  title: string
  employmentType: string
  minExperience: string
  compensationType: string
  compensationAmount: string
  currency: string
  description: string
}

// Job Opening API types
export interface JobOpeningCreateRequest {
  posting_title: string
  custom_job_description: string
  employment_type: string
  minimum_experience?: string
  compensation_type?: string
  compensation_value?: number
  compensation_currency?: string
  created_by: string
  expires_at?: string
}

export interface JobOpeningUpdateRequest {
  posting_title?: string
  custom_job_description?: string
  job_status?: string
  employment_type?: string
  minimum_experience?: string
  compensation_type?: string
  compensation_value?: number
  compensation_currency?: string
  expires_at?: string
  published_at?: string
}

export interface JobOpeningResponse {
  id: string
  posting_title: string
  custom_job_description: string
  job_status: string
  employment_type: string
  minimum_experience?: string
  compensation_type?: string
  compensation_value?: number
  compensation_currency?: string
  created_by: string
  created_at: string
  updated_at: string
  published_at?: string
  expires_at?: string
}

export interface JobOpeningApiResponse {
  message: string
  job_opening: JobOpeningResponse
}

export type CreationMethod = "scratch" | "template" | "ai" | "upload"
export type JobCreationStep = "method" | "form" | "template" | "ai-input" | "ai-loading" | "upload"

// Job Round Templates API Types
export interface JobRoundTemplateCompetency {
  name: string
  description: string
  rubric_scorecard: Record<string, string>
}

export interface JobRoundTemplateRequest {
  round_id?: string | null
  round_name: string
  round_type: string
  order_index: number
  is_active?: boolean
  is_required?: boolean
  custom_evaluation_criteria?: string
  custom_competencies?: JobRoundTemplateCompetency[]
}

export interface JobRoundTemplateBulkRequest {
  templates: JobRoundTemplateRequest[]
}

export interface JobRoundTemplateResponse {
  id: string
  job_opening_id: string
  round_id: string | null
  round_name: string
  round_type: string
  order_index: number
  is_active: boolean
  is_required: boolean
  custom_evaluation_criteria: string | null
  custom_competencies: JobRoundTemplateCompetency[] | null
  created_at: string
}

export interface JobRoundTemplateBulkResponse {
  message: string
  job_round_templates: JobRoundTemplateResponse[]
  job_opening_id: string
}

// Job Confirmation API Types
export interface JobConfirmationResponse {
  message: string
  job_opening: JobOpeningResponse
  previous_status?: string
  new_status?: string
  published_at?: string
}

// AI Job Generation API Types
export interface AIJobGenerationRequest {
  user_input: string
  created_by: string
}

export interface AIJobGenerationInfo {
  model_used: string
  input_tokens: number
  output_tokens: number
  reason: string
}

export interface AIGeneratedJobTemplate {
  success: boolean
  is_valid: boolean
  title: string
  job_description: string
  created_by: string
  created_at: string
  updated_at: string
  employment_type: string
  minimum_experience: string
  compensation_type: string
  compensation_value: number
  compensation_currency: string
}

// Success response type
export interface AIJobGenerationSuccessResponse {
  success: true
  is_valid: true
  job_template: AIGeneratedJobTemplate
  message: string
  generation_info: AIJobGenerationInfo
}

// Error response type
export interface AIJobGenerationErrorResponse {
  success: false
  is_valid: false
  error: string
  reason: string
}

// Union type for all possible responses
export type AIJobGenerationResponse = AIJobGenerationSuccessResponse | AIJobGenerationErrorResponse
