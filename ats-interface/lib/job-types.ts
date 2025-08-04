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
