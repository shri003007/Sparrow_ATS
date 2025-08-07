"use client"

import { useState } from "react"
import { AddCandidatesModal } from "./add-candidates-modal"
import { CSVUploadModal } from "./csv-upload-modal"
import { FieldMappingModal } from "./field-mapping-modal"
import { ReviewValuesModal } from "./review-values-modal"
import { ImportLoadingModal } from "./import-loading-modal"
import { ImportSuccessModal } from "./import-success-modal"
import { ManualEntryModal } from "./manual-entry-modal"
import { CustomFieldsConfirmationModal } from "./custom-fields-confirmation-modal"
import { CustomFieldsDefinitionModal } from "./custom-fields-definition-modal"
import { CSVProcessor } from "@/lib/utils/csv-processor"
import { CandidatesApi } from "@/lib/api/candidates"
import { CandidateTransformer } from "@/lib/transformers/candidate-transformer"
import type { 
  ImportStep, 
  CSVData, 
  CandidatePreview, 
  CandidateCreateRequest,
  CandidateBulkCreateRequest
} from "@/lib/candidate-types"
import type { CandidateCustomFieldDefinition } from "@/lib/custom-field-types"
import { useCustomFields } from "@/hooks/use-custom-fields"
import { CustomFieldValuesApi } from "@/lib/api/custom-field-values"

interface CSVImportFlowProps {
  isOpen: boolean
  onClose: () => void
  jobOpeningId: string
  onImportComplete: (candidatesCount: number) => void
}

export function CSVImportFlow({ 
  isOpen, 
  onClose, 
  jobOpeningId, 
  onImportComplete 
}: CSVImportFlowProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>('select')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [csvData, setCSVData] = useState<CSVData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [candidatesPreview, setCandidatesPreview] = useState<CandidatePreview[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [showCustomFieldsConfirmation, setShowCustomFieldsConfirmation] = useState(false)
  const [showCustomFieldsDefinition, setShowCustomFieldsDefinition] = useState(false)
  const [hasSetupCustomFields, setHasSetupCustomFields] = useState(false)

  // Use the custom fields hook for API integration
  const { 
    customFields, 
    isLoading: customFieldsLoading, 
    refreshCustomFields 
  } = useCustomFields(jobOpeningId)

  const handleClose = () => {
    // Reset all state when closing
    setCurrentStep('select')
    setUploadedFile(null)
    setCSVData(null)
    setFieldMappings({})
    setCandidatesPreview([])
    setIsProcessing(false)
    setImportedCount(0)
    setShowManualEntry(false)
    setShowCustomFieldsConfirmation(false)
    setShowCustomFieldsDefinition(false)
    setHasSetupCustomFields(false)
    onClose()
  }

  const handleUploadCSV = () => {
    // Show custom fields confirmation first
    setShowCustomFieldsConfirmation(true)
  }

  const handleUploadResumes = () => {
    // TODO: Implement resume upload flow
    console.log('Resume upload not implemented yet')
  }

  const handleManualEntry = () => {
    setShowManualEntry(true)
  }

  const handleCustomFieldsConfirmationClose = () => {
    setShowCustomFieldsConfirmation(false)
  }

  const handleContinueWithoutCustomFields = () => {
    setShowCustomFieldsConfirmation(false)
    setHasSetupCustomFields(true) // Mark as handled
    setCurrentStep('upload')
  }

  const handleSetupCustomFields = () => {
    setShowCustomFieldsConfirmation(false)
    setShowCustomFieldsDefinition(true)
  }

  const handleCustomFieldsSave = async (fields: CandidateCustomFieldDefinition[]) => {
    setShowCustomFieldsDefinition(false)
    setHasSetupCustomFields(true)
    // Refresh custom fields from the API to get the latest data
    await refreshCustomFields()
    setCurrentStep('upload')
  }

  const handleCustomFieldsDefinitionClose = () => {
    setShowCustomFieldsDefinition(false)
    setShowCustomFieldsConfirmation(true) // Go back to confirmation
  }

  const handleManualSave = async (candidates: CandidateCreateRequest[]): Promise<any[]> => {
    setIsProcessing(true)
    try {
      // Manual entry already provides data in API format, no need to transform
      const bulkRequest: CandidateBulkCreateRequest = {
        candidates: candidates
      }

      const response = await CandidatesApi.createCandidatesBulk(bulkRequest)
      
      setImportedCount(response.successful_count)
      setShowManualEntry(false)
      setCurrentStep('success')
      onImportComplete(response.successful_count)
      
      // Return the created candidates for custom field values saving
      return response.created_candidates || []
    } catch (error) {
      console.error('Failed to save candidates:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
  }

  const handleProcessCSV = async () => {
    if (!uploadedFile) return

    setIsProcessing(true)
    setCurrentStep('processing')

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const parsedData = await CSVProcessor.parseCSV(uploadedFile)
      setCSVData(parsedData)
      setCurrentStep('mapping')
    } catch (error) {
      console.error('Failed to process CSV:', error)
      alert('Failed to process CSV file. Please check the file format and try again.')
      setCurrentStep('upload')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFieldMappingNext = (mappings: Record<string, string>) => {
    if (!csvData) return

    setFieldMappings(mappings)
    setCurrentStep('matching')

    // Debug logging for field mappings
    console.log('🗺️ CSV Field mappings:', mappings)
    console.log('🔧 Custom fields available:', customFields)

    // Simulate matching delay
    setTimeout(() => {
      const candidates = CSVProcessor.processCSVData(csvData, mappings, customFields)
      console.log('📊 Processed candidates with custom fields:', candidates)
      setCandidatesPreview(candidates)
      setCurrentStep('review')
    }, 1000)
  }

  const handleReviewConfirm = async () => {
    setCurrentStep('importing')
    setIsProcessing(true)

    try {
      // Filter valid candidates and transform to API format
      const validCandidates = candidatesPreview.filter(c => c.isValid)
      const apiRequests = validCandidates.map(candidate => 
        CandidateTransformer.transformCSVToApiRequest(candidate, jobOpeningId)
      )

      // Call bulk create API
      const bulkRequest: CandidateBulkCreateRequest = {
        candidates: apiRequests
      }

      const response = await CandidatesApi.createCandidatesBulk(bulkRequest)
      
      // Save custom field values for successfully created candidates using bulk API
      if (customFields.length > 0 && response.created_candidates && response.created_candidates.length > 0) {
        await saveCSVCustomFieldValuesBulk(validCandidates, response.created_candidates)
      }
      
      setImportedCount(response.successful_count)
      setCurrentStep('success')
      onImportComplete(response.successful_count)

      // Log any failed candidates for debugging
      if (response.failed_count > 0) {
        console.warn(`${response.failed_count} candidates failed to import:`, response.failed_candidates)
      }
    } catch (error) {
      console.error('Failed to import candidates:', error)
      alert('Failed to import candidates. Please try again.')
      setCurrentStep('review')
    } finally {
      setIsProcessing(false)
    }
  }

  const saveCSVCustomFieldValuesBulk = async (validCandidates: CandidatePreview[], createdCandidates: any[]) => {
    try {
      console.log('💾 Saving custom field values for CSV imported candidates using bulk API...')
      console.log('📊 Valid candidates count:', validCandidates.length)
      console.log('📊 Created candidates count:', createdCandidates.length)
      
      // Create email-to-candidate mapping for precise matching
      const createdCandidatesByEmail = new Map<string, any>()
      createdCandidates.forEach(candidate => {
        if (candidate && candidate.email) {
          createdCandidatesByEmail.set(candidate.email.toLowerCase().trim(), candidate)
        }
      })
      
      console.log('🗺️ Created candidates email mapping:', Array.from(createdCandidatesByEmail.keys()))
      
      // Prepare bulk request for all candidates using email matching
      const candidatesData: Array<{ candidate_id: string; field_values: any[] }> = []
      
      validCandidates.forEach((candidatePreview, index) => {
        const candidateEmail = candidatePreview.email.toLowerCase().trim()
        const createdCandidate = createdCandidatesByEmail.get(candidateEmail)
        
        console.log(`🔍 Processing candidate ${index + 1}:`, {
          previewEmail: candidateEmail,
          foundCreatedCandidate: !!createdCandidate,
          createdCandidateId: createdCandidate?.id,
          hasCustomFields: !!candidatePreview.customFields
        })
        
        if (createdCandidate && createdCandidate.id && candidatePreview.customFields) {
          const fieldValuesInput = CustomFieldValuesApi.prepareCustomFieldValuesFromFormData(
            candidatePreview.customFields || {},
            customFields
          )
          
          if (fieldValuesInput.length > 0) {
            console.log(`💾 Preparing custom fields for candidate "${candidatePreview.name}" (${candidateEmail}):`, fieldValuesInput)
            candidatesData.push({
              candidate_id: createdCandidate.id,
              field_values: fieldValuesInput
            })
          }
        } else {
          if (!createdCandidate) {
            console.warn(`⚠️ No created candidate found for email: ${candidateEmail}`)
          } else if (!candidatePreview.customFields) {
            console.log(`ℹ️ No custom fields for candidate: ${candidateEmail}`)
          }
        }
      })
      
      // Call bulk candidates upsert API if we have data
      if (candidatesData.length > 0) {
        console.log('💾 Calling bulk candidates upsert API with:', candidatesData.length, 'candidates')
        console.log('📋 Final mapping verification:', candidatesData.map(cd => ({
          candidate_id: cd.candidate_id,
          field_count: cd.field_values.length
        })))
        
        const bulkResponse = await CustomFieldValuesApi.bulkCandidatesUpsertCustomFieldValues({
          candidates: candidatesData
        })
        
        console.log('✅ Bulk CSV custom field values saved successfully:', bulkResponse)
      } else {
        console.log('ℹ️ No custom field values to save for CSV candidates')
      }
    } catch (error) {
      console.error('❌ Failed to save CSV custom field values:', error)
      // Don't throw error here to avoid blocking the main import flow
      console.warn('Candidates were imported but some custom field values may not have been saved.')
    }
  }

  const handleGoToList = () => {
    handleClose()
  }

  const handlePrevious = () => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('select')
        break
      case 'mapping':
        setCurrentStep('upload')
        break
      case 'review':
        setCurrentStep('mapping')
        break
      default:
        break
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Step 1: Select import method */}
      <AddCandidatesModal
        isOpen={currentStep === 'select'}
        onClose={handleClose}
        onUploadCSV={handleUploadCSV}
        onUploadResumes={handleUploadResumes}
        onManualEntry={handleManualEntry}
      />

      {/* Step 2: Upload CSV file */}
      <CSVUploadModal
        isOpen={currentStep === 'upload'}
        onClose={handleClose}
        onFileUpload={handleFileUpload}
        onProcessCSV={handleProcessCSV}
        uploadedFile={uploadedFile}
        isProcessing={isProcessing}
      />

      {/* Loading: Processing CSV */}
      <ImportLoadingModal
        isOpen={currentStep === 'processing'}
        onClose={handleClose}
        step="processing"
      />

      {/* Step 3: Map fields */}
      <FieldMappingModal
        isOpen={currentStep === 'mapping'}
        onClose={handleClose}
        csvHeaders={csvData?.headers || []}
        customFields={customFields}
        jobOpeningId={jobOpeningId}
        onNext={handleFieldMappingNext}
        onPrevious={handlePrevious}
        onCustomFieldsUpdate={refreshCustomFields}
      />

      {/* Loading: Matching records */}
      <ImportLoadingModal
        isOpen={currentStep === 'matching'}
        onClose={handleClose}
        step="matching"
      />

      {/* Step 4: Review values */}
      <ReviewValuesModal
        isOpen={currentStep === 'review'}
        onClose={handleClose}
        candidates={candidatesPreview}
        onConfirm={handleReviewConfirm}
        onPrevious={handlePrevious}
        isImporting={isProcessing}
      />

      {/* Loading: Importing data */}
      <ImportLoadingModal
        isOpen={currentStep === 'importing'}
        onClose={handleClose}
        step="importing"
      />

      {/* Step 5: Success */}
      <ImportSuccessModal
        isOpen={currentStep === 'success'}
        onClose={handleClose}
        importedCount={importedCount}
        onGoToList={handleGoToList}
      />

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        jobOpeningId={jobOpeningId}
        customFields={customFields}
        onSave={handleManualSave}
        onCustomFieldsUpdate={refreshCustomFields}
      />

      {/* Custom Fields Confirmation Modal */}
      <CustomFieldsConfirmationModal
        isOpen={showCustomFieldsConfirmation}
        onClose={handleCustomFieldsConfirmationClose}
        onContinueWithoutCustomFields={handleContinueWithoutCustomFields}
        onSetupCustomFields={handleSetupCustomFields}
      />

      {/* Custom Fields Definition Modal */}
      <CustomFieldsDefinitionModal
        isOpen={showCustomFieldsDefinition}
        onClose={handleCustomFieldsDefinitionClose}
        jobOpeningId={jobOpeningId}
        onSave={handleCustomFieldsSave}
        existingFields={customFields}
      />
    </>
  )
}