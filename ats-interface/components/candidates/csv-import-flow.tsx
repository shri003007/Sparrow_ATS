"use client"

import { useState } from "react"
import { AddCandidatesModal } from "./add-candidates-modal"
import { CSVUploadModal } from "./csv-upload-modal"
import { FieldMappingModal } from "./field-mapping-modal"
import { ReviewValuesModal } from "./review-values-modal"
import { ImportLoadingModal } from "./import-loading-modal"
import { ImportSuccessModal } from "./import-success-modal"
import { ManualEntryModal } from "./manual-entry-modal"
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
    onClose()
  }

  const handleUploadCSV = () => {
    setCurrentStep('upload')
  }

  const handleUploadResumes = () => {
    // TODO: Implement resume upload flow
    console.log('Resume upload not implemented yet')
  }

  const handleManualEntry = () => {
    setShowManualEntry(true)
  }

  const handleManualSave = async (candidates: CandidateCreateRequest[]) => {
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

    // Simulate matching delay
    setTimeout(() => {
      const candidates = CSVProcessor.processCSVData(csvData, mappings)
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
        onNext={handleFieldMappingNext}
        onPrevious={handlePrevious}
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
        onSave={handleManualSave}
      />
    </>
  )
}