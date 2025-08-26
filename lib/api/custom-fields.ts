import type { 
  CandidateCustomFieldDefinition,
  CustomFieldDefinitionCreateRequest,
  CustomFieldDefinitionUpdateRequest 
} from '@/lib/custom-field-types'

const API_BASE_URL = process.env.NEXT_PUBLIC_CANDIDATES_API_BASE_URL 


// API Response Types
interface CustomFieldDefinitionResponse {
  message: string
  field_definition: {
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
    created_by: string | null
    created_at: string
    updated_at: string
  }
}

interface CustomFieldDefinitionsListResponse {
  job_opening_id: string
  field_count: number
  field_definitions: Array<{
    id: string
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
  }>
}

interface CustomFieldDefinitionDeleteResponse {
  message: string
}

export class CustomFieldsApi {
  /**
   * Creates a new custom field definition for a job opening
   */
  static async createCustomFieldDefinition(
    request: CustomFieldDefinitionCreateRequest,
    userId: string
  ): Promise<CandidateCustomFieldDefinition> {
    try {
      // Add the required created_by field
      const requestWithCreatedBy = {
        ...request,
        created_by: userId
      }

      const response = await fetch(`${API_BASE_URL}/custom-field-definitions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any required authentication headers here
        },
        body: JSON.stringify(requestWithCreatedBy)
      })

      // Log response details


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to create custom field definition`)
      }

      const data: CustomFieldDefinitionResponse = await response.json()
      
      return {
        id: data.field_definition.id,
        job_opening_id: data.field_definition.job_opening_id,
        field_name: data.field_definition.field_name,
        field_label: data.field_definition.field_label,
        field_type: data.field_definition.field_type as any,
        field_options: data.field_definition.field_options,
        default_value: data.field_definition.default_value || undefined,
        is_required: data.field_definition.is_required,
        validation_rules: data.field_definition.validation_rules,
        display_order: data.field_definition.display_order,
        is_active: data.field_definition.is_active,
        description: data.field_definition.description || undefined,
        created_by: data.field_definition.created_by || undefined,
        created_at: data.field_definition.created_at,
        updated_at: data.field_definition.updated_at
      }
    } catch (error) {
      console.error('Error creating custom field definition:', error)
      throw error
    }
  }



  /**
   * Retrieves all custom field definitions for a specific job opening
   */
  static async getCustomFieldDefinitionsByJob(
    jobOpeningId: string,
    isActive?: boolean
  ): Promise<CandidateCustomFieldDefinition[]> {
    try {
      const queryParams = new URLSearchParams()
      if (isActive !== undefined) {
        queryParams.append('is_active', isActive.toString())
      }

      const url = `${API_BASE_URL}/custom-field-definitions/job/${jobOpeningId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Add any required authentication headers here
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch custom field definitions`)
      }

      const data: CustomFieldDefinitionsListResponse = await response.json()
      
      return data.field_definitions.map(field => ({
        id: field.id,
        job_opening_id: data.job_opening_id,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type as any,
        field_options: field.field_options,
        default_value: field.default_value || undefined,
        is_required: field.is_required,
        validation_rules: field.validation_rules,
        display_order: field.display_order,
        is_active: field.is_active,
        description: field.description || undefined,
        created_by: undefined, // Not provided in list response
        created_at: new Date().toISOString(), // Not provided in list response
        updated_at: new Date().toISOString() // Not provided in list response
      }))
    } catch (error) {
      console.error('Error fetching custom field definitions:', error)
      throw error
    }
  }

  /**
   * Updates an existing custom field definition
   */
  static async updateCustomFieldDefinition(
    fieldDefinitionId: string,
    updateData: Partial<CustomFieldDefinitionUpdateRequest>
  ): Promise<CandidateCustomFieldDefinition> {
    try {


      const response = await fetch(`${API_BASE_URL}/custom-field-definitions/${fieldDefinitionId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })



      if (!response.ok) {
        const errorText = await response.text()
        console.error('Custom field update API error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const data: CustomFieldDefinitionResponse = await response.json()


      // Transform API response to frontend format
      return {
        id: data.field_definition.id,
        job_opening_id: data.field_definition.job_opening_id,
        field_name: data.field_definition.field_name,
        field_label: data.field_definition.field_label,
        field_type: data.field_definition.field_type as any,
        field_options: data.field_definition.field_options,
        default_value: data.field_definition.default_value || undefined,
        is_required: data.field_definition.is_required,
        validation_rules: data.field_definition.validation_rules,
        display_order: data.field_definition.display_order,
        is_active: data.field_definition.is_active,
        description: data.field_definition.description || undefined,
        created_by: data.field_definition.created_by || undefined,
        created_at: data.field_definition.created_at,
        updated_at: data.field_definition.updated_at
      }
    } catch (error) {
      console.error('Error updating custom field definition:', error)
      throw error
    }
  }

  /**
   * Deletes a custom field definition
   */
  static async deleteCustomFieldDefinition(fieldDefinitionId: string): Promise<void> {
    try {


      const response = await fetch(`${API_BASE_URL}/custom-field-definitions/${fieldDefinitionId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })



      if (!response.ok) {
        const errorText = await response.text()
        console.error('Custom field delete API error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const data = await response.json()

    } catch (error) {
      console.error('Error deleting custom field definition:', error)
      throw error
    }
  }

  /**
   * Creates multiple custom field definitions in batch
   */
  static async createCustomFieldDefinitionsBatch(
    requests: CustomFieldDefinitionCreateRequest[],
    userId: string
  ): Promise<CandidateCustomFieldDefinition[]> {
    const results: CandidateCustomFieldDefinition[] = []
    const errors: Error[] = []

    for (const request of requests) {
      try {

        const result = await this.createCustomFieldDefinition(request, userId)
        results.push(result)
      } catch (error) {
        errors.push(error as Error)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      // If all requests failed, throw the first error
      throw errors[0]
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${requests.length} custom field definitions failed to create:`, errors)
    }

    return results
  }

  /**
   * Updates multiple custom field definitions in batch
   */
  static async updateCustomFieldDefinitionsBatch(
    updates: Array<{ id: string; data: Partial<CustomFieldDefinitionUpdateRequest> }>
  ): Promise<CandidateCustomFieldDefinition[]> {
    const results: CandidateCustomFieldDefinition[] = []
    const errors: Error[] = []

    for (const update of updates) {
      try {
        const result = await this.updateCustomFieldDefinition(update.id, update.data)
        results.push(result)
      } catch (error) {
        errors.push(error as Error)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      // If all requests failed, throw the first error
      throw errors[0]
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} out of ${updates.length} custom field definitions failed to update:`, errors)
    }

    return results
  }
}