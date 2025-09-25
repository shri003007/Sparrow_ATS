"use client"

import { useState } from "react"
import { X, Plus, Trash2, Save, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomFieldsDefinitionModal } from "./custom-fields-definition-modal"
import { CustomFieldValuesApi } from "@/lib/api/custom-field-values"
import type { CandidateCreateRequest } from "@/lib/candidate-types"
import type { CandidateCustomFieldDefinition, CustomFieldType } from "@/lib/custom-field-types"

interface CandidateFormData {
  name: string
  email: string
  mobilePhone?: string
  resumeUrl: string
  experienceYears: string
  currentSalary: string
  currentSalaryCurrency: string
  expectedSalary: string
  expectedSalaryCurrency: string
  availableToJoinDays: string
  currentLocation: string
  customFields: Record<string, any>
}

const emptyCandidateForm: CandidateFormData = {
  name: '',
  email: '',
  mobilePhone: '',
  resumeUrl: '',
  experienceYears: '',
  currentSalary: '',
  currentSalaryCurrency: 'USD',
  expectedSalary: '',
  expectedSalaryCurrency: 'USD',
  availableToJoinDays: '',
  currentLocation: '',
  customFields: {}
}

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  jobOpeningId: string
  customFields?: CandidateCustomFieldDefinition[]
  onSave: (candidates: CandidateCreateRequest[]) => Promise<any[]> // Return created candidates
  onCustomFieldsUpdate?: () => Promise<void>
}

export function ManualEntryModal({ 
  isOpen, 
  onClose, 
  jobOpeningId, 
  customFields = [],
  onSave,
  onCustomFieldsUpdate
}: ManualEntryModalProps) {
  const [candidates, setCandidates] = useState<CandidateFormData[]>([{ ...emptyCandidateForm }])
  const [isSaving, setIsSaving] = useState(false)
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false)
  
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  const handleCandidateChange = (index: number, field: keyof CandidateFormData, value: string) => {
    setCandidates(prev => prev.map((candidate, i) => 
      i === index ? { ...candidate, [field]: value } : candidate
    ))
  }

  const handleCustomFieldChange = (candidateIndex: number, fieldName: string, value: any) => {
    setCandidates(prev => prev.map((candidate, i) => 
      i === candidateIndex ? { 
        ...candidate, 
        customFields: { ...candidate.customFields, [fieldName]: value }
      } : candidate
    ))
  }

  const handleSetupCustomFields = () => {
    setShowCustomFieldsModal(true)
  }

  const handleCustomFieldsSave = async (fields: CandidateCustomFieldDefinition[]) => {
    setShowCustomFieldsModal(false)
    if (onCustomFieldsUpdate) {
      await onCustomFieldsUpdate()
    }
    
    // Initialize custom fields for all candidates with the updated fields
    setCandidates(prev => prev.map(candidate => ({
      ...candidate,
      customFields: {
        ...candidate.customFields,
        ...customFields.reduce((acc, field) => {
          if (!(field.field_name in candidate.customFields)) {
            acc[field.field_name] = field.default_value || ''
          }
          return acc
        }, {} as Record<string, any>)
      }
    })))
  }

  const handleCustomFieldsClose = () => {
    setShowCustomFieldsModal(false)
  }

  const addCandidate = () => {
    setCandidates(prev => [...prev, { ...emptyCandidateForm }])
  }

  const removeCandidate = (index: number) => {
    if (candidates.length > 1) {
      setCandidates(prev => prev.filter((_, i) => i !== index))
    }
  }

  const validateCandidate = (candidate: CandidateFormData): string[] => {
    const errors: string[] = []
    
    if (!candidate.name.trim()) errors.push('Name is required')
    if (!candidate.email.trim()) errors.push('Email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) errors.push('Invalid email format')
    // Mobile phone is optional, but if provided, validate format
    if (candidate.mobilePhone && candidate.mobilePhone.trim() !== '' && !/^[\+]?[1-9][\d]{0,15}$/.test(candidate.mobilePhone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Invalid mobile phone format')
    }
    
    // Validate custom fields using the API service
    const customFieldValidation = CustomFieldValuesApi.validateAllCustomFieldValues(
      candidate.customFields,
      customFields
    )
    
    if (!customFieldValidation.isValid) {
      errors.push(...customFieldValidation.errors)
    }
    
    return errors
  }

  const handleSave = async () => {
    const validCandidates: CandidateCreateRequest[] = []
    let hasErrors = false

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const errors = validateCandidate(candidate)
      
      if (errors.length > 0) {
        alert(`Candidate ${i + 1} has errors: ${errors.join(', ')}`)
        hasErrors = true
        break
      }

      validCandidates.push({
        job_opening_id: jobOpeningId,
        resume_url: candidate.resumeUrl || '',
        name: candidate.name,
        email: candidate.email,
        mobile_phone: candidate.mobilePhone || '',
        experience_months: candidate.experienceYears ? Math.round(parseFloat(candidate.experienceYears) * 12) : undefined,
        current_salary: candidate.currentSalary ? parseFloat(candidate.currentSalary) : undefined,
        current_salary_currency: candidate.currentSalaryCurrency,
        expected_salary: candidate.expectedSalary ? parseFloat(candidate.expectedSalary) : undefined,
        expected_salary_currency: candidate.expectedSalaryCurrency,
        available_to_join_days: candidate.availableToJoinDays ? parseInt(candidate.availableToJoinDays) : undefined,
        current_location: candidate.currentLocation || undefined,
        overall_status: 'active'
      })
    }

    if (!hasErrors && validCandidates.length > 0) {
      setIsSaving(true)
      try {
        // Save candidates first
        const candidateResults = await onSave(validCandidates)
        
        // If we have custom fields and candidate results, save custom field values
        if (customFields.length > 0 && candidateResults) {
          await saveCustomFieldValues(candidateResults)
        }
        
        handleClose()
      } catch (error) {
        console.error('Failed to save candidates:', error)
        alert('Failed to save candidates. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const saveCustomFieldValues = async (candidateResults: any[]) => {
    try {
      console.log('💾 Saving custom field values for manual entry candidates...')
      console.log('📊 Form candidates count:', candidates.length)
      console.log('📊 Created candidates count:', candidateResults.length)
      
      // Create email-to-candidate mapping for precise matching
      const createdCandidatesByEmail = new Map<string, any>()
      candidateResults.forEach(candidateResult => {
        if (candidateResult && candidateResult.email) {
          createdCandidatesByEmail.set(candidateResult.email.toLowerCase().trim(), candidateResult)
        }
      })
      
      console.log('🗺️ Created candidates email mapping:', Array.from(createdCandidatesByEmail.keys()))
      
      // Prepare bulk request for all candidates using email matching
      const candidatesData: Array<{ candidate_id: string; field_values: any[] }> = []
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i]
        const candidateEmail = candidate.email.toLowerCase().trim()
        const candidateResult = createdCandidatesByEmail.get(candidateEmail)
        
        console.log(`🔍 Processing manual candidate ${i + 1}:`, {
          formEmail: candidateEmail,
          foundCreatedCandidate: !!candidateResult,
          createdCandidateId: candidateResult?.id,
          hasCustomFields: Object.keys(candidate.customFields).length > 0
        })
        
        if (candidateResult && candidateResult.id) {
          const fieldValuesInput = CustomFieldValuesApi.prepareCustomFieldValuesFromFormData(
            candidate.customFields,
            customFields
          )
          
          if (fieldValuesInput.length > 0) {
            console.log(`💾 Preparing custom fields for candidate "${candidate.name}" (${candidateEmail}):`, fieldValuesInput)
            candidatesData.push({
              candidate_id: candidateResult.id,
              field_values: fieldValuesInput
            })
          }
        } else {
          if (!candidateResult) {
            console.warn(`⚠️ No created candidate found for email: ${candidateEmail}`)
          }
        }
      }
      
      // Call bulk candidates upsert API if we have data
      if (candidatesData.length > 0) {
        console.log('💾 Calling bulk candidates upsert API for manual entry with:', candidatesData.length, 'candidates')
        console.log('📋 Manual entry mapping verification:', candidatesData.map(cd => ({
          candidate_id: cd.candidate_id,
          field_count: cd.field_values.length
        })))
        
        await CustomFieldValuesApi.bulkCandidatesUpsertCustomFieldValues({
          candidates: candidatesData
        })
      } else {
        console.log('ℹ️ No custom field values to save for manual entry candidates')
      }
      
      console.log('✅ Manual entry custom field values saved successfully')
    } catch (error) {
      console.error('❌ Failed to save custom field values:', error)
      // Don't throw error here to avoid blocking the main flow
      alert('Candidates were saved but some custom field values may not have been saved. Please check the candidate details.')
    }
  }

  const handleClose = () => {
    setCandidates([{ ...emptyCandidateForm }])
    onClose()
  }

  const renderCustomField = (field: CandidateCustomFieldDefinition, candidateIndex: number, candidate: CandidateFormData) => {
    const value = candidate.customFields[field.field_name] || field.default_value || ''
    
    const commonInputProps = {
      className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm",
      style: { fontFamily }
    }

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            {...commonInputProps}
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
            placeholder={field.description || `Enter ${field.field_label.toLowerCase()}`}
          />
        )

      case 'textarea':
        return (
          <Textarea
            {...commonInputProps}
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
            placeholder={field.description || `Enter ${field.field_label.toLowerCase()}`}
            rows={3}
          />
        )

      case 'number':
      case 'decimal':
        return (
          <Input
            {...commonInputProps}
            type="number"
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
            placeholder={field.description || `Enter ${field.field_label.toLowerCase()}`}
            step={field.field_type === 'decimal' ? '0.01' : '1'}
          />
        )

      case 'email':
        return (
          <Input
            {...commonInputProps}
            type="email"
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
            placeholder={field.description || 'email@example.com'}
          />
        )

      case 'url':
        return (
          <Input
            {...commonInputProps}
            type="url"
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
            placeholder={field.description || 'https://example.com'}
          />
        )

      case 'date':
        return (
          <Input
            {...commonInputProps}
            type="date"
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => handleCustomFieldChange(candidateIndex, field.field_name, checked)}
            />
            <span className="text-sm text-gray-600">{field.description || 'Yes/No'}</span>
          </div>
        )

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(selectedValue) => handleCustomFieldChange(candidateIndex, field.field_name, selectedValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${field.field_label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.field_options?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : (value ? value.split(',') : [])
        return (
          <div className="space-y-2">
            {field.field_options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked 
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option)
                    handleCustomFieldChange(candidateIndex, field.field_name, newValues)
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        )

      default:
        return (
          <Input
            {...commonInputProps}
            value={value}
            onChange={(e) => handleCustomFieldChange(candidateIndex, field.field_name, e.target.value)}
            placeholder={field.description || `Enter ${field.field_label.toLowerCase()}`}
          />
        )
    }
  }

  const renderCandidateForm = (candidate: CandidateFormData, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium" style={{ color: "#111827", fontFamily }}>
          Candidate {index + 1}
        </h3>
        {candidates.length > 1 && (
          <button
            onClick={() => removeCandidate(index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Required Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={candidate.name}
            onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="Full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={candidate.email}
            onChange={(e) => handleCandidateChange(index, 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Mobile Phone
          </label>
          <input
            type="tel"
            value={candidate.mobilePhone || ''}
            onChange={(e) => handleCandidateChange(index, 'mobilePhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Resume URL
          </label>
          <input
            type="url"
            value={candidate.resumeUrl}
            onChange={(e) => handleCandidateChange(index, 'resumeUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="https://example.com/resume.pdf"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Experience (Years)
          </label>
          <input
            type="number"
            value={candidate.experienceYears}
            onChange={(e) => handleCandidateChange(index, 'experienceYears', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="3.5"
            step="0.5"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Current Salary
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={candidate.currentSalary}
              onChange={(e) => handleCandidateChange(index, 'currentSalary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
              placeholder="50000"
              min="0"
            />
            <select
              value={candidate.currentSalaryCurrency}
              onChange={(e) => handleCandidateChange(index, 'currentSalaryCurrency', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Expected Salary
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={candidate.expectedSalary}
              onChange={(e) => handleCandidateChange(index, 'expectedSalary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
              placeholder="60000"
              min="0"
            />
            <select
              value={candidate.expectedSalaryCurrency}
              onChange={(e) => handleCandidateChange(index, 'expectedSalaryCurrency', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Available to Join (Days)
          </label>
          <input
            type="number"
            value={candidate.availableToJoinDays}
            onChange={(e) => handleCandidateChange(index, 'availableToJoinDays', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="30"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Current Location
          </label>
          <input
            type="text"
            value={candidate.currentLocation}
            onChange={(e) => handleCandidateChange(index, 'currentLocation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="New York, NY"
          />
        </div>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Custom Fields</span>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {customFields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
                    {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                  </label>
                  {renderCustomField(field, index, candidate)}
                  {field.description && (
                    <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg max-w-4xl w-full mx-4 relative max-h-[90vh] flex flex-col"
        style={{ fontFamily }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: "#111827", fontFamily }}
              >
                Add Candidates Manually
              </h2>
              <p
                className="text-gray-600"
                style={{ fontSize: "14px", fontFamily }}
              >
                Enter candidate details manually. You can add multiple candidates at once.
              </p>
            </div>
            {onCustomFieldsUpdate && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSetupCustomFields}
                className="flex items-center space-x-1"
              >
                <Settings className="w-4 h-4" />
                <span>Set Up Custom Fields</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {candidates.map((candidate, index) => renderCandidateForm(candidate, index))}
          </div>

          {/* Add Another Candidate */}
          <div className="mt-6 text-center">
            <button
              onClick={addCandidate}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span style={{ fontFamily }}>Add Another Candidate</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div className="text-sm text-gray-500" style={{ fontFamily }}>
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} to save
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontFamily,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || candidates.length === 0}
              style={{
                backgroundColor: !isSaving && candidates.length > 0 ? "#4F46E5" : "#9CA3AF",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : `Save ${candidates.length} Candidate${candidates.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Fields Definition Modal */}
      <CustomFieldsDefinitionModal
        isOpen={showCustomFieldsModal}
        onClose={handleCustomFieldsClose}
        jobOpeningId={jobOpeningId}
        onSave={handleCustomFieldsSave}
        existingFields={customFields}
      />
    </div>
  )
}