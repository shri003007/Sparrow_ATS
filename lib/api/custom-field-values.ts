import type { CandidateCustomFieldDefinition } from '@/lib/custom-field-types'
import { authenticatedApiService } from './authenticated-api-service'

const API_BASE_URL = process.env.NEXT_PUBLIC_CANDIDATES_API_BASE_URL 

// Types for custom field values
export interface CandidateCustomFieldValue {
  id: string
  candidate_id: string
  field_definition_id: string
  field_value: string
  created_at: string
  updated_at: string
  candidate_custom_field_definitions?: CandidateCustomFieldDefinition
}

export interface CustomFieldValueInput {
  field_definition_id: string
  field_value: string
}

export interface BulkUpsertRequest {
  candidate_id: string
  field_values: CustomFieldValueInput[]
}

export interface BulkUpsertResponse {
  message: string
  candidate_id: string
  total_processed: number
  successful_count: number
  failed_count: number
  processed_values: Array<{
    operation: 'created' | 'updated'
    field_definition_id: string
    field_name: string
    field_value: string
    record_id: string
  }>
  failed_values: any[] | null
}

export interface BulkCandidatesUpsertRequest {
  candidates: Array<{
    candidate_id: string
    field_values: CustomFieldValueInput[]
  }>
}

export interface BulkCandidatesUpsertResponse {
  message: string
  total_candidates: number
  successful_candidates_count: number
  failed_candidates_count: number
  total_field_values_attempted: number
  total_field_values_processed: number
  total_field_values_failed: number
  operation_summary: {
    created: number
    updated: number
  }
  processed_candidates: Array<{
    candidate_id: string
    total_fields: number
    successful_count: number
    failed_count: number
    processed_values: Array<{
      operation: 'created' | 'updated'
      field_definition_id: string
      field_name: string
      field_value: string
      record_id: string
    }>
    failed_values: any[] | null
  }>
  failed_candidates: any[] | null
}

export interface CandidateCustomFieldValuesResponse {
  candidate_id: string
  field_values_count: number
  field_values: CandidateCustomFieldValue[]
}

export class CustomFieldValuesApi {
  /**
   * Get all custom field values for a specific candidate
   */
  static async getCustomFieldValuesByCandidate(
    candidateId: string
  ): Promise<CandidateCustomFieldValue[]> {
    try {
      const response = await authenticatedApiService.get(`${API_BASE_URL}/custom-field-values/candidate/${candidateId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch custom field values`)
      }

      const data: CandidateCustomFieldValuesResponse = await response.json()
      return data.field_values || []
    } catch (error) {
      console.error('Error fetching custom field values:', error)
      throw error
    }
  }

  /**
   * Bulk upsert custom field values for a candidate
   */
  static async bulkUpsertCustomFieldValues(
    request: BulkUpsertRequest
  ): Promise<BulkUpsertResponse> {
    try {
      const response = await authenticatedApiService.post(`${API_BASE_URL}/custom-field-values/bulk-upsert`, request)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to upsert custom field values`)
      }

      const data: BulkUpsertResponse = await response.json()
      
      return data
    } catch (error) {
      console.error('Error upserting custom field values:', error)
      throw error
    }
  }

  /**
   * Bulk upsert custom field values for multiple candidates
   */
  static async bulkCandidatesUpsertCustomFieldValues(
    request: BulkCandidatesUpsertRequest
  ): Promise<BulkCandidatesUpsertResponse> {
    try {
      const response = await authenticatedApiService.post(`${API_BASE_URL}/custom-field-values/bulk-candidates-upsert`, request)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to bulk upsert custom field values for candidates`)
      }

      const data: BulkCandidatesUpsertResponse = await response.json()
      
      return data
    } catch (error) {
      console.error('Error bulk upserting custom field values for candidates:', error)
      throw error
    }
  }

  /**
   * Helper function to prepare custom field values for API from form data
   */
  static prepareCustomFieldValuesFromFormData(
    customFieldsData: Record<string, any>,
    customFieldDefinitions: CandidateCustomFieldDefinition[]
  ): CustomFieldValueInput[] {
    const fieldValues: CustomFieldValueInput[] = []

    customFieldDefinitions.forEach(definition => {
      const value = customFieldsData[definition.field_name]
      
      // Include field if it exists in the data (even if empty) or if it's required
      if (value !== undefined && value !== null) {
        // Convert value to string based on field type
        let stringValue = ''
        
        switch (definition.field_type) {
          case 'boolean':
            stringValue = value === true || value === 'true' ? 'true' : 'false'
            break
          case 'multiselect':
            if (Array.isArray(value)) {
              stringValue = value.join(',')
            } else {
              stringValue = String(value)
            }
            break
          case 'number':
          case 'decimal':
            stringValue = String(value)
            break
          case 'date':
            // Ensure date is in proper format
            if (value instanceof Date) {
              stringValue = value.toISOString().split('T')[0] // YYYY-MM-DD format
            } else {
              stringValue = String(value)
            }
            break
          default:
            stringValue = String(value)
        }

        fieldValues.push({
          field_definition_id: definition.id,
          field_value: stringValue
        })
      }
    })

    return fieldValues
  }

  /**
   * Helper function to convert API response back to form data structure
   */
  static convertCustomFieldValuesToFormData(
    fieldValues: CandidateCustomFieldValue[]
  ): Record<string, any> {
    const formData: Record<string, any> = {}

    fieldValues.forEach(fieldValue => {
      if (fieldValue.candidate_custom_field_definitions) {
        const definition = fieldValue.candidate_custom_field_definitions
        const fieldName = definition.field_name
        let parsedValue: any = fieldValue.field_value

        // Convert string value back to appropriate type
        switch (definition.field_type) {
          case 'boolean':
            parsedValue = fieldValue.field_value === 'true' || fieldValue.field_value === '1'
            break
          case 'number':
            parsedValue = parseInt(fieldValue.field_value)
            break
          case 'decimal':
            parsedValue = parseFloat(fieldValue.field_value)
            break
          case 'multiselect':
            parsedValue = fieldValue.field_value.split(',').filter(v => v.trim())
            break
          default:
            parsedValue = fieldValue.field_value
        }

        formData[fieldName] = parsedValue
      }
    })

    return formData
  }

  /**
   * Validate custom field value based on field definition
   */
  static validateCustomFieldValue(
    value: any,
    definition: CandidateCustomFieldDefinition
  ): { isValid: boolean; error?: string } {
    // Check required fields
    if (definition.is_required && (value === undefined || value === null || value === '')) {
      return { isValid: false, error: `${definition.field_label} is required` }
    }

    // Skip validation for empty optional fields
    if (!definition.is_required && (value === undefined || value === null || value === '')) {
      return { isValid: true }
    }

    const stringValue = String(value)

    switch (definition.field_type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(stringValue)) {
          return { isValid: false, error: `${definition.field_label} must be a valid email address` }
        }
        break

      case 'url':
        if (!stringValue.startsWith('http://') && !stringValue.startsWith('https://')) {
          return { isValid: false, error: `${definition.field_label} must be a valid URL starting with http:// or https://` }
        }
        break

      case 'number':
        if (isNaN(parseInt(stringValue))) {
          return { isValid: false, error: `${definition.field_label} must be a valid number` }
        }
        break

      case 'decimal':
        if (isNaN(parseFloat(stringValue))) {
          return { isValid: false, error: `${definition.field_label} must be a valid decimal number` }
        }
        break

      case 'select':
        if (definition.field_options && !definition.field_options.includes(stringValue)) {
          return { isValid: false, error: `${definition.field_label} must be one of: ${definition.field_options.join(', ')}` }
        }
        break

      case 'multiselect':
        if (definition.field_options) {
          const selectedValues = stringValue.split(',').map(v => v.trim())
          const invalidValues = selectedValues.filter(v => !definition.field_options!.includes(v))
          if (invalidValues.length > 0) {
            return { isValid: false, error: `${definition.field_label} contains invalid options: ${invalidValues.join(', ')}` }
          }
        }
        break

      case 'boolean':
        const validBooleanValues = ['true', 'false', '1', '0']
        if (!validBooleanValues.includes(stringValue.toLowerCase())) {
          return { isValid: false, error: `${definition.field_label} must be true or false` }
        }
        break
    }

    return { isValid: true }
  }

  /**
   * Validate all custom field values for a candidate
   */
  static validateAllCustomFieldValues(
    customFieldsData: Record<string, any>,
    customFieldDefinitions: CandidateCustomFieldDefinition[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    customFieldDefinitions.forEach(definition => {
      const value = customFieldsData[definition.field_name]
      const validation = this.validateCustomFieldValue(value, definition)
      
      if (!validation.isValid && validation.error) {
        errors.push(validation.error)
      }
    })

    return { isValid: errors.length === 0, errors }
  }
}