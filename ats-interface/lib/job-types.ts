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

export type CreationMethod = "scratch" | "template" | "ai" | "upload"
export type JobCreationStep = "method" | "form" | "template" | "ai-input" | "ai-loading" | "upload"
