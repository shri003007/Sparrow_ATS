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
