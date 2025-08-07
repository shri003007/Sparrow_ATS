"use client"

import { useState } from "react"
import { X, Plus, Trash2, GripVertical, Info, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCustomFields } from "@/hooks/use-custom-fields"
import type { 
  CandidateCustomFieldDefinition, 
  CustomFieldFormData, 
  CustomFieldType 
} from "@/lib/custom-field-types"

interface CustomFieldsDefinitionModalProps {
  isOpen: boolean
  onClose: () => void
  jobOpeningId: string
  onSave: (customFields: CandidateCustomFieldDefinition[]) => void
  existingFields?: CandidateCustomFieldDefinition[]
}

export function CustomFieldsDefinitionModal({ 
  isOpen, 
  onClose, 
  jobOpeningId, 
  onSave,
  existingFields = []
}: CustomFieldsDefinitionModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  // Use the custom fields hook for API integration
  const { 
    customFields: apiCustomFields, 
    isLoading: apiLoading, 
    error: apiError, 
    createCustomFields,
    updateCustomField,
    deleteCustomField,
    clearError
  } = useCustomFields(jobOpeningId)

  // Extended form data to track existing vs new fields
  interface CustomFieldFormDataWithId extends CustomFieldFormData {
    id?: string // If present, this is an existing field that needs update/delete
    isMarkedForDeletion?: boolean
  }

  function getEmptyField(displayOrder: number = 0): CustomFieldFormDataWithId {
    return {
      field_name: "",
      field_label: "",
      field_type: "text",
      field_options: [],
      default_value: "",
      is_required: false,
      description: "",
      display_order: displayOrder
    }
  }

  const [customFields, setCustomFields] = useState<CustomFieldFormDataWithId[]>(
    existingFields.length > 0 
      ? existingFields.map(field => ({
          id: field.id, // Track existing field ID
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: field.field_options || [],
          default_value: field.default_value || "",
          is_required: field.is_required,
          description: field.description || "",
          display_order: field.display_order,
          isMarkedForDeletion: false
        }))
      : [getEmptyField()]
  )
  
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const fieldTypeOptions: { value: CustomFieldType; label: string; description: string }[] = [
    { value: "text", label: "Short Text", description: "Single line text input" },
    { value: "textarea", label: "Long Text", description: "Multi-line text area" },
    { value: "number", label: "Number", description: "Numeric input (integers)" },
    { value: "decimal", label: "Decimal", description: "Decimal numbers" },
    { value: "email", label: "Email", description: "Email address with validation" },
    { value: "url", label: "URL", description: "Website URL with validation" },
    { value: "date", label: "Date", description: "Date picker" },
    { value: "boolean", label: "Yes/No", description: "True/False toggle" },
    { value: "select", label: "Dropdown", description: "Single selection from options" },
    { value: "multiselect", label: "Multi-Select", description: "Multiple selections from options" }
  ]

  const addField = () => {
    setCustomFields([...customFields, getEmptyField(customFields.length)])
  }

  const removeField = (index: number) => {
    const field = customFields[index]
    if (field.id) {
      // Mark existing field for deletion instead of removing it immediately
      setCustomFields(prev => 
        prev.map((f, i) => 
          i === index ? { ...f, isMarkedForDeletion: true } : f
        )
      )
    } else {
      // Remove new fields immediately
      setCustomFields(customFields.filter((_, i) => i !== index))
    }
  }

  const restoreField = (index: number) => {
    setCustomFields(prev => 
      prev.map((f, i) => 
        i === index ? { ...f, isMarkedForDeletion: false } : f
      )
    )
  }

  const updateField = (index: number, updates: Partial<CustomFieldFormData>) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], ...updates }
    
    // Auto-generate field_name from field_label if field_name is empty
    if (updates.field_label && !updated[index].field_name) {
      updated[index].field_name = updates.field_label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    }
    
    setCustomFields(updated)
  }

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === customFields.length - 1)
    ) return

    const updated = [...customFields]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]]
    
    // Update display orders
    updated[index].display_order = index
    updated[targetIndex].display_order = targetIndex
    
    setCustomFields(updated)
  }

  const updateFieldOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const updated = [...customFields]
    const options = [...updated[fieldIndex].field_options]
    options[optionIndex] = value
    updated[fieldIndex].field_options = options
    setCustomFields(updated)
  }

  const addFieldOption = (fieldIndex: number) => {
    const updated = [...customFields]
    updated[fieldIndex].field_options = [...updated[fieldIndex].field_options, ""]
    setCustomFields(updated)
  }

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const updated = [...customFields]
    updated[fieldIndex].field_options = updated[fieldIndex].field_options.filter((_, i) => i !== optionIndex)
    setCustomFields(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)
    clearError()

    try {
      // Separate fields into different operations
      const fieldsToDelete = customFields.filter(f => f.id && f.isMarkedForDeletion)
      const fieldsToUpdate = customFields.filter(f => f.id && !f.isMarkedForDeletion && f.field_label.trim() && f.field_name.trim())
      const fieldsToCreate = customFields.filter(f => !f.id && f.field_label.trim() && f.field_name.trim())



      // 1. Delete marked fields
      for (const field of fieldsToDelete) {
        if (field.id) {
          await deleteCustomField(field.id)
        }
      }

      // 2. Update existing fields
      for (const field of fieldsToUpdate) {
        if (field.id) {
          const updateData = {
            field_label: field.field_label,
            field_type: field.field_type,
            field_options: ['select', 'multiselect'].includes(field.field_type) 
              ? field.field_options.filter(opt => opt.trim()) 
              : undefined,
            default_value: field.default_value || undefined,
            is_required: field.is_required,
            validation_rules: {},
            display_order: field.display_order,
            description: field.description || undefined
          }
          await updateCustomField(field.id, updateData)
        }
      }

      // 3. Create new fields
      if (fieldsToCreate.length > 0) {
        const createRequests = fieldsToCreate.map((field, index) => ({
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          field_options: ['select', 'multiselect'].includes(field.field_type) 
            ? field.field_options.filter(opt => opt.trim()) 
            : undefined,
          default_value: field.default_value || undefined,
          is_required: field.is_required,
          validation_rules: {},
          display_order: fieldsToUpdate.length + index, // Continue numbering after existing fields
          description: field.description || undefined
        }))

        await createCustomFields(createRequests)
      }

      // Validate we have at least one field remaining
      const remainingFields = customFields.filter(f => !f.isMarkedForDeletion && f.field_label.trim())
      if (remainingFields.length === 0) {
        alert("You must have at least one custom field. Please add a field or restore a deleted one.")
        return
      }
      
      // Pass the updated fields to the parent component
      onSave(apiCustomFields)
      onClose()
    } catch (error) {
      console.error('Error saving custom fields:', error)
      // Error is handled by the useCustomFields hook
    } finally {
      setIsSaving(false)
    }
  }

  const needsOptions = (fieldType: CustomFieldType) => {
    return ['select', 'multiselect'].includes(fieldType)
  }

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg max-w-4xl w-full mx-4 relative max-h-[90vh] flex flex-col"
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
              Custom Fields Setup
            </h2>
            <p
              className="text-gray-600"
              style={{ fontSize: "14px", fontFamily }}
            >
              Define custom fields for candidate data collection. These fields will be available during candidate import and manual entry.
            </p>
          </div>

                  {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {apiError && (
            <Alert className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>{apiError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="h-auto p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
              {customFields.map((field, index) => (
                <div 
                  key={field.id || index} 
                  className={`border rounded-lg p-4 space-y-4 transition-all ${
                    field.isMarkedForDeletion 
                      ? 'border-red-200 bg-red-50 opacity-60' 
                      : 'border-gray-200'
                  }`}
                >
                  {/* Field Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        field.isMarkedForDeletion ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        Field {index + 1}
                        {field.id && <span className="text-xs ml-1">(Existing)</span>}
                        {field.isMarkedForDeletion && <span className="text-xs ml-1">(Marked for deletion)</span>}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0 || field.isMarkedForDeletion}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {field.isMarkedForDeletion ? (
                        <button
                          onClick={() => restoreField(index)}
                          className="p-1 hover:bg-green-100 rounded text-green-600 text-xs px-2 py-1 border border-green-200"
                        >
                          Restore
                        </button>
                      ) : (
                        customFields.filter(f => !f.isMarkedForDeletion).length > 1 && (
                          <button
                            onClick={() => removeField(index)}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                            title={field.id ? "Mark for deletion" : "Remove field"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Field Configuration */}
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${field.isMarkedForDeletion ? 'pointer-events-none' : ''}`}>
                    {/* Field Label */}
                    <div>
                      <Label htmlFor={`field_label_${index}`}>
                        Field Label <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`field_label_${index}`}
                        value={field.field_label}
                        onChange={(e) => updateField(index, { field_label: e.target.value })}
                        placeholder="e.g., Portfolio URL, Years of Experience"
                        className="mt-1"
                      />
                    </div>

                    {/* Field Name */}
                    <div>
                      <div className="flex items-center space-x-1">
                        <Label htmlFor={`field_name_${index}`}>
                          Field Name <span className="text-red-500">*</span>
                        </Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Internal name used for data storage (auto-generated)</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id={`field_name_${index}`}
                        value={field.field_name}
                        onChange={(e) => updateField(index, { field_name: e.target.value })}
                        placeholder="portfolio_url, years_experience"
                        className="mt-1 font-mono text-sm"
                      />
                    </div>

                    {/* Field Type */}
                    <div>
                      <Label>Field Type</Label>
                      <Select 
                        value={field.field_type} 
                        onValueChange={(value: CustomFieldType) => updateField(index, { field_type: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id={`required_${index}`}
                        checked={field.is_required}
                        onCheckedChange={(checked) => updateField(index, { is_required: checked })}
                      />
                      <Label htmlFor={`required_${index}`}>Required field</Label>
                    </div>
                  </div>

                  {/* Options for select/multiselect */}
                  {needsOptions(field.field_type) && (
                    <div>
                      <Label>Options</Label>
                      <div className="mt-2 space-y-2">
                        {field.field_options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <Input
                              value={option}
                              onChange={(e) => updateFieldOption(index, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1"
                            />
                            <button
                              onClick={() => removeFieldOption(index, optionIndex)}
                              className="p-2 hover:bg-red-100 rounded text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addFieldOption(index)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Option
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Default Value */}
                  <div>
                    <Label htmlFor={`default_value_${index}`}>Default Value (Optional)</Label>
                    <Input
                      id={`default_value_${index}`}
                      value={field.default_value}
                      onChange={(e) => updateField(index, { default_value: e.target.value })}
                      placeholder="Default value for this field"
                      className="mt-1"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor={`description_${index}`}>Description (Optional)</Label>
                    <Textarea
                      id={`description_${index}`}
                      value={field.description}
                      onChange={(e) => updateField(index, { description: e.target.value })}
                      placeholder="Help text or description for this field"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </div>
              ))}

              {/* Add Field Button */}
              <Button
                type="button"
                variant="outline"
                onClick={addField}
                className="w-full border-dashed border-2 py-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Field
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-between">
            <div className="text-sm text-gray-500">
              {customFields.filter(f => f.field_label.trim()).length} field(s) configured
            </div>
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
              onClick={handleSave}
              disabled={isSaving || apiLoading}
              style={{
                backgroundColor: !isSaving && !apiLoading ? "#4F46E5" : "#9CA3AF",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Custom Fields'
              )}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}