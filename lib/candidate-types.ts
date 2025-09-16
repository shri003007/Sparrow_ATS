// Candidate Database Types
export interface Candidate {
  id: string
  job_opening_id: string
  resume_url: string
  name: string
  email: string
  mobile_phone: string
  experience_months?: number
  current_salary?: number
  current_salary_currency?: string
  expected_salary?: number
  expected_salary_currency?: string
  available_to_join_days?: number
  current_location?: string
  overall_status: 'active' | 'hired' | 'rejected' | 'withdrawn' | 'on_hold'
  source?: string
  notes?: string
  created_at: string
  updated_at: string
}

// API Request/Response Types
export interface CandidateCreateRequest {
  job_opening_id: string
  resume_url: string
  name: string
  email: string
  mobile_phone: string
  experience_months?: number
  current_salary?: number
  current_salary_currency?: string
  expected_salary?: number
  expected_salary_currency?: string
  available_to_join_days?: number
  current_location?: string
  overall_status?: 'active' | 'hired' | 'rejected' | 'withdrawn' | 'on_hold'
  source?: string
  notes?: string
}

export interface CandidateBulkCreateRequest {
  candidates: CandidateCreateRequest[]
}

export interface CandidateResponse {
  id: string
  job_opening_id: string
  resume_url: string
  name: string
  email: string
  mobile_phone: string
  experience_months?: number
  current_salary?: number
  current_salary_currency?: string
  expected_salary?: number
  expected_salary_currency?: string
  available_to_join_days?: number
  current_location?: string
  overall_status: string
  source?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CandidatesListResponse {
  candidates: CandidateResponse[]
}

export interface CandidateBulkCreateResponse {
  message: string
  total_processed: number
  successful_count: number
  failed_count: number
  created_candidates: CandidateApiResponse[]
  failed_candidates: any[] | null
}

// New types to match your API response
export interface CandidateApiResponse {
  id: string
  job_opening_id: string
  resume_url: string
  name: string
  email: string
  mobile_phone: string
  experience_years: number
  experience_months: number
  current_salary: number
  current_salary_currency: string
  expected_salary: number
  expected_salary_currency: string
  available_to_join_days: number
  current_location: string
  overall_status: 'active' | 'hired' | 'rejected' | 'withdrawn' | 'on_hold'
  round_status: 'action_pending' | 'selected' | 'rejected' // Added round_status field
  source: string | null
  notes: string | null
  created_at: string
  updated_at: string
  overall_evaluation?: {
    round_scores: Record<string, {
      order: number
      score: number
      round_name: string
      round_type: string
    }>
    overall_score: number
  }
}

export interface CandidatesByJobResponse {
  job_opening_id: string
  candidate_count: number
  candidates: CandidateApiResponse[]
}

export interface CandidateCreateResponse {
  message: string
  candidate: CandidateApiResponse
}

// UI Status types (what users see)
export type CandidateUIStatus = 'selected' | 'action_pending' | 'rejected'

// UI representation of candidate for display
export interface CandidateDisplay {
  id: string
  name: string
  email: string
  mobile_phone: string
  resume_url: string
  experience_display: string // "5 yrs 6 mos"
  current_salary_display: string // "$75,000 USD"
  expected_salary_display: string // "$85,000 USD"
  available_to_join_display: string // "30 days"
  current_location: string
  status: CandidateUIStatus
  source: string | null
  notes: string | null
  created_at: string
  overall_score?: number // Overall evaluation score from rounds
  custom_field_values?: Array<{
    id: string
    field_value: string
    field_definition: {
      field_name: string
      field_label: string
      field_type: string
      field_options: string[]
      is_required: boolean
      description: string | null
    }
  }>
}

// CSV Processing Types
export interface CSVData {
  headers: string[]
  rows: string[][]
}

export interface CandidatePreview {
  name: string
  email: string
  mobilePhone: string
  resumeUrl?: string
  experienceMonths?: number
  currentSalary?: number
  currentSalaryCurrency?: string
  expectedSalary?: number
  expectedSalaryCurrency?: string
  availableToJoinDays?: number
  currentLocation?: string
  customFields?: Record<string, any> // Custom field values
  isValid: boolean
  issues: string[]
  originalRowIndex: number
}

export interface FieldMapping {
  fieldName: string
  csvColumn: string
  isRequired: boolean
  fieldType: 'text' | 'email' | 'phone' | 'number' | 'date'
}

// Validation Types
export interface ValidationResult {
  isValid: boolean
  issues: string[]
}

// CSV Import Process State
export type ImportStep = 'select' | 'upload' | 'processing' | 'mapping' | 'review' | 'importing' | 'success'

export interface ImportState {
  step: ImportStep
  file: File | null
  csvData: CSVData | null
  fieldMappings: Record<string, string>
  candidatesPreview: CandidatePreview[]
  isLoading: boolean
  error: string | null
}