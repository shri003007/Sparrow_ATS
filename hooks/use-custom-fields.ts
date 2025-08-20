import { useState, useEffect, useCallback } from 'react'
import { CustomFieldsApi } from '@/lib/api/custom-fields'
import type { 
  CandidateCustomFieldDefinition, 
  CustomFieldDefinitionCreateRequest,
  CustomFieldDefinitionUpdateRequest 
} from '@/lib/custom-field-types'

interface UseCustomFieldsResult {
  customFields: CandidateCustomFieldDefinition[]
  isLoading: boolean
  error: string | null
  createCustomField: (field: Omit<CustomFieldDefinitionCreateRequest, 'job_opening_id'>) => Promise<void>
  createCustomFields: (fields: Omit<CustomFieldDefinitionCreateRequest, 'job_opening_id'>[]) => Promise<void>
  updateCustomField: (fieldId: string, updates: Partial<CustomFieldDefinitionUpdateRequest>) => Promise<void>
  deleteCustomField: (fieldId: string) => Promise<void>
  refreshCustomFields: () => Promise<void>
  clearError: () => void
}

export function useCustomFields(jobOpeningId?: string): UseCustomFieldsResult {
  const [customFields, setCustomFields] = useState<CandidateCustomFieldDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const refreshCustomFields = useCallback(async () => {
    if (!jobOpeningId) {
      setCustomFields([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fields = await CustomFieldsApi.getCustomFieldDefinitionsByJob(jobOpeningId, true)
      setCustomFields(fields)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load custom fields'
      setError(errorMessage)
      console.error('Error loading custom fields:', err)
    } finally {
      setIsLoading(false)
    }
  }, [jobOpeningId])

  const createCustomField = useCallback(async (
    field: Omit<CustomFieldDefinitionCreateRequest, 'job_opening_id'>
  ) => {
    if (!jobOpeningId) {
      throw new Error('Job opening ID is required')
    }

    setError(null)

    try {
      const request: CustomFieldDefinitionCreateRequest = {
        ...field,
        job_opening_id: jobOpeningId
      }

      const newField = await CustomFieldsApi.createCustomFieldDefinition(request)
      setCustomFields(prev => [...prev, newField].sort((a, b) => a.display_order - b.display_order))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom field'
      setError(errorMessage)
      throw err
    }
  }, [jobOpeningId])

  const createCustomFields = useCallback(async (
    fields: Omit<CustomFieldDefinitionCreateRequest, 'job_opening_id'>[]
  ) => {
    if (!jobOpeningId) {
      throw new Error('Job opening ID is required')
    }

    setError(null)

    try {
      const requests: CustomFieldDefinitionCreateRequest[] = fields.map(field => ({
        ...field,
        job_opening_id: jobOpeningId
      }))



      const newFields = await CustomFieldsApi.createCustomFieldDefinitionsBatch(requests)
      setCustomFields(prev => [...prev, ...newFields].sort((a, b) => a.display_order - b.display_order))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom fields'
      setError(errorMessage)
      throw err
    }
  }, [jobOpeningId])

  const updateCustomField = useCallback(async (
    fieldId: string, 
    updates: Partial<CustomFieldDefinitionUpdateRequest>
  ) => {
    setError(null)

    try {
      const updatedField = await CustomFieldsApi.updateCustomFieldDefinition(fieldId, updates)
      setCustomFields(prev => 
        prev.map(field => field.id === fieldId ? updatedField : field)
          .sort((a, b) => a.display_order - b.display_order)
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update custom field'
      setError(errorMessage)
      throw err
    }
  }, [])

  const deleteCustomField = useCallback(async (fieldId: string) => {
    setError(null)

    try {
      await CustomFieldsApi.deleteCustomFieldDefinition(fieldId)
      setCustomFields(prev => prev.filter(field => field.id !== fieldId))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete custom field'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Load custom fields when jobOpeningId changes
  useEffect(() => {
    refreshCustomFields()
  }, [refreshCustomFields])

  return {
    customFields,
    isLoading,
    error,
    createCustomField,
    createCustomFields,
    updateCustomField,
    deleteCustomField,
    refreshCustomFields,
    clearError
  }
}