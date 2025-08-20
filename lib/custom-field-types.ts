// Custom Field Definition Types (based on DB schema)
export interface CandidateCustomFieldDefinition {
  id: string
  job_opening_id: string
  field_name: string
  field_label: string
  field_type: CustomFieldType
  field_options?: string[] // For select/multiselect
  default_value?: string
  is_required: boolean
  validation_rules?: Record<string, any>
  display_order: number
  is_active: boolean
  description?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type CustomFieldType = 
  | 'text'        // Short text input
  | 'textarea'    // Long text input
  | 'number'      // Numeric input
  | 'decimal'     // Decimal numbers
  | 'boolean'     // True/False
  | 'date'        // Date picker
  | 'email'       // Email validation
  | 'url'         // URL validation
  | 'select'      // Dropdown selection
  | 'multiselect' // Multiple selections

// Custom Field Value Types
export interface CandidateCustomFieldValue {
  id: string
  candidate_id: string
  field_definition_id: string
  field_value: string
  created_at: string
  updated_at: string
}

// UI Types for creating/editing custom fields
export interface CustomFieldFormData {
  field_name: string
  field_label: string
  field_type: CustomFieldType
  field_options: string[]
  default_value: string
  is_required: boolean
  description: string
  display_order: number
}

// Extended candidate types to include custom fields
export interface CandidateWithCustomFields {
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
  custom_fields: Record<string, any> // field_name -> value
  created_at: string
  updated_at: string
}

// Extended CSV preview to include custom fields
export interface CandidatePreviewWithCustomFields {
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
  custom_fields: Record<string, any>
  isValid: boolean
  issues: string[]
  originalRowIndex: number
}

// API Request types
export interface CustomFieldDefinitionCreateRequest {
  job_opening_id: string
  field_name: string
  field_label: string
  field_type: CustomFieldType
  field_options?: string[]
  default_value?: string
  is_required: boolean
  validation_rules?: Record<string, any>
  display_order: number
  description?: string
  created_by?: string // Optional since it's added automatically in the API service
}

export interface CustomFieldDefinitionUpdateRequest extends Partial<CustomFieldDefinitionCreateRequest> {
  id: string
}

export interface CustomFieldValueCreateRequest {
  candidate_id: string
  field_definition_id: string
  field_value: string
}

// Validation helper types
export interface CustomFieldValidationRule {
  min_length?: number
  max_length?: number
  min_value?: number
  max_value?: number
  pattern?: string
  required_if?: string // field dependency
}

// Custom field display configuration
export interface CustomFieldDisplayConfig {
  showInTable: boolean
  showInDetails: boolean
  columnWidth?: number
  sortable: boolean
  filterable: boolean
}

// Mock data for development
export const MOCK_CUSTOM_FIELD_DEFINITIONS: CandidateCustomFieldDefinition[] = [
  {
    id: "1",
    job_opening_id: "job_123",
    field_name: "portfolio_url",
    field_label: "Portfolio URL",
    field_type: "url",
    is_required: false,
    display_order: 1,
    is_active: true,
    description: "Link to candidate's portfolio or work samples",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "2", 
    job_opening_id: "job_123",
    field_name: "skill_rating",
    field_label: "Skill Rating",
    field_type: "select",
    field_options: ["Beginner", "Intermediate", "Advanced", "Expert"],
    is_required: true,
    display_order: 2,
    is_active: true,
    description: "Overall skill level assessment",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "3",
    job_opening_id: "job_123", 
    field_name: "years_of_experience",
    field_label: "Years of Experience",
    field_type: "number",
    is_required: false,
    display_order: 3,
    is_active: true,
    description: "Total years of relevant work experience",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "4",
    job_opening_id: "job_123",
    field_name: "preferred_technologies",
    field_label: "Preferred Technologies",
    field_type: "multiselect",
    field_options: ["React", "Vue", "Angular", "Node.js", "Python", "Java", "C#", ".NET"],
    is_required: false,
    display_order: 4,
    is_active: true,
    description: "Technologies the candidate prefers to work with",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "5",
    job_opening_id: "job_123",
    field_name: "available_for_interview",
    field_label: "Available for Interview",
    field_type: "date",
    is_required: false,
    display_order: 5,
    is_active: true,
    description: "Earliest date candidate is available for interview",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]