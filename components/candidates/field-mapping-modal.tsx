"use client"

import { useState } from "react"
import { X, ChevronDown, Settings, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomFieldsDefinitionModal } from "./custom-fields-definition-modal"
import type { CandidateCustomFieldDefinition } from "@/lib/custom-field-types"

interface FieldMapping {
  fieldName: string
  csvColumn: string
  isRequired: boolean
  fieldType: 'text' | 'email' | 'phone' | 'number' | 'date'
}

interface FieldMappingModalProps {
  isOpen: boolean
  onClose: () => void
  csvHeaders: string[]
  customFields?: CandidateCustomFieldDefinition[]
  jobOpeningId?: string
  onNext: (mappings: Record<string, string>) => void
  onPrevious: () => void
  onCustomFieldsUpdate?: () => Promise<void>
}

export function FieldMappingModal({ 
  isOpen, 
  onClose, 
  csvHeaders, 
  customFields = [],
  jobOpeningId,
  onNext,
  onPrevious,
  onCustomFieldsUpdate
}: FieldMappingModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Define the required and optional fields based on your database schema
  const requiredFields: FieldMapping[] = [
    { fieldName: "Name", csvColumn: "", isRequired: true, fieldType: "text" },
    { fieldName: "Email", csvColumn: "", isRequired: true, fieldType: "email" },
    { fieldName: "Mobile Phone", csvColumn: "", isRequired: true, fieldType: "phone" },
  ]

  const optionalFields: FieldMapping[] = [
    { fieldName: "Resume URL", csvColumn: "", isRequired: false, fieldType: "text" },
    { fieldName: "Experience (Years)", csvColumn: "", isRequired: false, fieldType: "number" },
    { fieldName: "Current Salary", csvColumn: "", isRequired: false, fieldType: "number" },
    { fieldName: "Current Salary Currency", csvColumn: "", isRequired: false, fieldType: "text" },
    { fieldName: "Expected Salary", csvColumn: "", isRequired: false, fieldType: "number" },
    { fieldName: "Expected Salary Currency", csvColumn: "", isRequired: false, fieldType: "text" },
    { fieldName: "Available to Join (Days)", csvColumn: "", isRequired: false, fieldType: "number" },
    { fieldName: "Current Location", csvColumn: "", isRequired: false, fieldType: "text" },
  ]

  // Convert custom fields to field mapping format
  const customFieldMappings: FieldMapping[] = customFields.map(field => ({
    fieldName: field.field_name,  // Use field_name as the key, not field_label
    csvColumn: "",
    isRequired: field.is_required,
    fieldType: mapCustomFieldTypeToFieldType(field.field_type)
  }))

  // Helper function to map custom field types to basic field types
  function mapCustomFieldTypeToFieldType(customType: string): 'text' | 'email' | 'phone' | 'number' | 'date' {
    switch (customType) {
      case 'email': return 'email'
      case 'number': 
      case 'decimal': return 'number'
      case 'date': return 'date'
      case 'phone': return 'phone'
      default: return 'text'
    }
  }

  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(() => {
    const initialMappings: Record<string, string> = {}
    
    // Auto-map fields based on common column names
    const autoMapField = (fieldName: string, possibleNames: string[]) => {
      const header = csvHeaders.find(header => 
        possibleNames.some(name => {
          // Remove suffixes like "_2", "_3" that were added for uniqueness
          const cleanHeader = header.replace(/_\d+$/, '').toLowerCase()
          return cleanHeader.includes(name.toLowerCase())
        })
      )
      if (header) {
        initialMappings[fieldName] = header
      }
    }

    autoMapField("Name", ["name", "full name", "first name", "candidate name"])
    autoMapField("Email", ["email", "mail", "email address"])
    autoMapField("Mobile Phone", ["phone", "mobile", "contact", "phone number"])
    autoMapField("Resume URL", ["resume", "cv", "resume url", "cv url", "resume link"])
    autoMapField("Experience (Years)", ["experience", "years", "exp"])
    autoMapField("Current Salary", ["current salary", "salary", "current pay"])
    autoMapField("Expected Salary", ["expected salary", "expected pay", "desired salary"])
    autoMapField("Current Location", ["location", "city", "current location"])
    
    // Auto-map custom fields
    customFields.forEach(field => {
      autoMapField(field.field_name, [field.field_name, field.field_label.toLowerCase()])
    })

    return initialMappings
  })

  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false)

  if (!isOpen) return null

  const handleMappingChange = (fieldName: string, csvColumn: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldName]: csvColumn
    }))
  }

  const handleNext = () => {
    // Validate required standard fields are mapped
    const requiredStandardMappings = requiredFields.filter(field => 
      fieldMappings[field.fieldName] && fieldMappings[field.fieldName] !== ""
    )
    
    if (requiredStandardMappings.length < requiredFields.length) {
      alert("Please map all required standard fields before proceeding.")
      return
    }

    // Validate required custom fields are mapped
    const requiredCustomFields = customFieldMappings.filter(field => field.isRequired)
    const requiredCustomMappings = requiredCustomFields.filter(field => 
      fieldMappings[field.fieldName] && fieldMappings[field.fieldName] !== ""
    )
    
    if (requiredCustomMappings.length < requiredCustomFields.length) {
      alert("Please map all required custom fields before proceeding.")
      return
    }

    onNext(fieldMappings)
  }

  const handleSetupCustomFields = () => {
    setShowCustomFieldsModal(true)
  }

  const handleCustomFieldsSave = async (fields: CandidateCustomFieldDefinition[]) => {
    setShowCustomFieldsModal(false)
    if (onCustomFieldsUpdate) {
      await onCustomFieldsUpdate()
    }
  }

  const handleCustomFieldsClose = () => {
    setShowCustomFieldsModal(false)
  }

  // Helper function to get display name for custom fields
  const getFieldDisplayName = (field: FieldMapping) => {
    // For custom fields, find the original custom field to get the label
    const customField = customFields.find(cf => cf.field_name === field.fieldName)
    return customField ? customField.field_label : field.fieldName
  }

  const renderFieldMapping = (field: FieldMapping) => (
    <div key={field.fieldName} className="flex items-center justify-between py-3 border-b border-gray-100">
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span
            className="font-medium"
            style={{ color: "#111827", fontSize: "14px", fontFamily }}
          >
            {getFieldDisplayName(field)}
          </span>
          {field.isRequired && (
            <span
              className="text-red-500 text-sm"
              style={{ fontFamily }}
            >
              *
            </span>
          )}
          <span
            className="text-gray-500 text-xs uppercase px-2 py-1 bg-gray-100 rounded"
            style={{ fontFamily }}
          >
            {field.fieldType}
          </span>
        </div>
      </div>
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <select
            value={fieldMappings[field.fieldName] || ""}
            onChange={(e) => handleMappingChange(field.fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white pr-8"
            style={{ fontFamily }}
          >
            <option value="">Select CSV column</option>
            {csvHeaders.map((header, index) => (
              <option key={`${header}-${index}`} value={header}>
                {header}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg max-w-2xl w-full mx-4 relative max-h-[90vh] flex flex-col"
        style={{ fontFamily }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "#111827", fontFamily }}
          >
            Map Fields
          </h2>
          <p
            className="text-gray-600"
            style={{ fontSize: "14px", fontFamily }}
          >
            Map the columns in your import to the right fields
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-medium text-gray-700">
            <div style={{ fontFamily }}>Field name</div>
            <div style={{ fontFamily }}>CSV column</div>
          </div>

          {/* Required Fields */}
          <div className="mb-8">
            <h3
              className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide"
              style={{ fontFamily }}
            >
              Required Fields
            </h3>
            <div className="space-y-0">
              {requiredFields.map(renderFieldMapping)}
            </div>
          </div>

          {/* Optional Fields */}
          <div>
            <h3
              className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide"
              style={{ fontFamily }}
            >
              Optional Fields
            </h3>
            <div className="space-y-0">
              {optionalFields.map(renderFieldMapping)}
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center space-x-2"
                style={{ fontFamily }}
              >
                <Settings className="w-4 h-4" />
                <span>Custom Fields</span>
              </h3>
              {jobOpeningId && onCustomFieldsUpdate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSetupCustomFields}
                  className="flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Set Up Custom Fields</span>
                </Button>
              )}
            </div>
            {customFieldMappings.length > 0 ? (
              <div className="space-y-0">
                {customFieldMappings.map(renderFieldMapping)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No custom fields configured for this job</p>
                {jobOpeningId && onCustomFieldsUpdate && (
                  <p className="text-xs mt-1">Click "Set Up Custom Fields" to add job-specific fields</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={onPrevious}
            style={{
              borderColor: "#E5E7EB",
              color: "#374151",
              fontFamily,
            }}
          >
            ← Upload
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontFamily,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              style={{
                backgroundColor: "#4F46E5",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              → Next
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Fields Definition Modal */}
      {jobOpeningId && (
        <CustomFieldsDefinitionModal
          isOpen={showCustomFieldsModal}
          onClose={handleCustomFieldsClose}
          jobOpeningId={jobOpeningId}
          onSave={handleCustomFieldsSave}
          existingFields={customFields}
        />
      )}
    </div>
  )
}