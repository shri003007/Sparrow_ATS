"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppSidebar } from "@/components/job_listings/sidebar"
import { JobCreationModal } from "@/components/job_opening/job-creation-modal"
import { JobCreationForm } from "@/components/job_opening/job-creation-form"
import { TemplateSelectionModal } from "@/components/job_opening/template-selection-modal"
import { AICreationModal } from "@/components/job_opening/ai-creation-modal"
import { AILoadingModal } from "@/components/job_opening/ai-loading-modal"
import { UploadModal } from "@/components/job_opening/upload-modal"
import type { CreationMethod, JobTemplate, JobFormData } from "@/lib/job-types"
import { JobTemplateTransformer } from "@/lib/transformers/job-template-transformer"
import { JobOpeningsApi } from "@/lib/api/job-openings"
import { JobOpeningTransformer } from "@/lib/transformers/job-opening-transformer"
import { JobRoundTemplatesApi } from "@/lib/api/job-round-templates"
import { JobRoundTemplatesTransformer } from "@/lib/transformers/job-round-templates-transformer"
import { AIJobGenerationApi } from "@/lib/api/ai-job-generation"
import { AIJobTransformer } from "@/lib/transformers/ai-job-transformer"
import type { HiringRound } from "@/lib/hiring-types"
import { HiringRoundsModal } from "@/components/job_opening/hiring-rounds-modal"
import { HiringProcessCanvas } from "@/components/job_opening/hiring-process-canvas"
import { JobPublishConfirmationModal } from "@/components/job_opening/job-publish-confirmation-modal"
import { NavigationWarningDialog } from "@/components/job_opening/navigation-warning-dialog"
import { useNavigationPrevention } from "@/hooks/use-navigation-prevention"
import { JobListingsApp } from "@/components/job_listings/job-listings-app"


type AppView = "job-listings" | "job-creation"
type JobCreationView = "form" | "canvas"

export default function ATSInterface() {
  const { user, apiUser, isLoading } = useAuth()
  const router = useRouter()
  
  // All useState hooks must be declared before any conditional returns
  const [activeTab, setActiveTab] = useState("all")
  const [appView, setAppView] = useState<AppView>("job-listings")
  const [jobCreationView, setJobCreationView] = useState<JobCreationView>("form")
  const [jobFormData, setJobFormData] = useState<Partial<JobFormData>>({})
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)

  // Modal states
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showAILoading, setShowAILoading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const [showHiringRoundsModal, setShowHiringRoundsModal] = useState(false)
  const [selectedRounds, setSelectedRounds] = useState<HiringRound[]>([])
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false)
  const [originalTemplateRounds, setOriginalTemplateRounds] = useState<any[]>([])
  const [selectedOriginalTemplates, setSelectedOriginalTemplates] = useState<any[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Navigation prevention states
  const [showNavigationWarning, setShowNavigationWarning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReloadAttempt, setIsReloadAttempt] = useState(false)

  // Check if user is in job creation flow and has unsaved changes
  // Prevent navigation if user is in job creation flow and either:
  // 1. Has a job created (currentJobId exists) - needs to delete
  // 2. Is in the middle of creating (has form data but no job saved yet) - can just leave
  const hasUnsavedJobData = Object.keys(jobFormData).length > 0 && 
    Object.values(jobFormData).some(value => value && value.toString().trim() !== "")
  const shouldPreventNavigation = appView === "job-creation" && (currentJobId !== null || hasUnsavedJobData)
  
  // Navigation prevention hook
  const { safeNavigate, safeReload } = useNavigationPrevention({
    shouldPrevent: shouldPreventNavigation,
    onNavigationAttempt: () => {
      setIsReloadAttempt(false)
      setShowNavigationWarning(true)
    },
    onReloadAttempt: () => {
      setIsReloadAttempt(true)
      setShowNavigationWarning(true)
    }
  })

  // Auth effect - must be after all hooks
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, isLoading, router])
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }
  
  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }

  const handleCreateJobClick = () => {
    setShowCreationModal(true)
  }

  const handleSelectCreationMethod = (method: CreationMethod) => {
    setShowCreationModal(false)
    setSelectedRounds([]) // Reset rounds for a new job

    switch (method) {
      case "scratch":
        setJobFormData({})
        setCurrentJobId(null)
        setAppView("job-creation")
        setJobCreationView("form")
        break
      case "template":
        setShowTemplateModal(true)
        break
      case "ai":
        setShowAIModal(true)
        break
      case "upload":
        setShowUploadModal(true)
        break
    }
  }

  const handleTemplateSelect = (template: JobTemplate) => {
    setShowTemplateModal(false)
    // Use the transformer to properly populate all form fields from template
    const formData = JobTemplateTransformer.transformTemplateToFormData(template)
    setJobFormData(formData)
    setCurrentJobId(null) // Reset job ID for new creation
    setAppView("job-creation")
    setJobCreationView("form")
  }

  const handleAIGenerate = async (prompt: string) => {
    setShowAIModal(false)
    setShowAILoading(true)

    try {
      // Get actual user ID from auth context, fallback to mock if not available
      const userId = apiUser?.id || "6693120e-31e2-4727-92c0-3606885e7e9e"
      
      const response = await AIJobGenerationApi.generateJobDescription({
        user_input: prompt,
        created_by: userId
      })

      if (response.success && response.is_valid) {
        // Success case: AI generated valid job description
        const formData = AIJobTransformer.transformToFormData(response.job_template)
        setJobFormData(formData)
        setCurrentJobId(null)
        setAppView("job-creation")
        setJobCreationView("form")
        console.log('AI job generation successful:', response.generation_info)
      } else {
        // Error case: Invalid/vague input or AI couldn't generate content
        const errorMessage = response.reason || response.error || 'AI could not generate a job description'
        console.warn('AI generation failed - user input issue:', errorMessage)
        
        // TODO: Show user-friendly error message in UI
        // For now, show in console for debugging
        alert(`AI Generation Failed: ${errorMessage}`)
      }
    } catch (error) {
      // Network or other technical errors
      console.error('Failed to generate job with AI (network/technical error):', error)
      alert('AI Generation Failed: Technical error occurred. Please try again.')
    } finally {
      setShowAILoading(false)
    }
  }

  const handleFileUpload = (file: File) => {
    setShowUploadModal(false)
    setJobFormData({
      title: "Senior Software Engineer",
      employmentType: "Full-time",
      minExperience: "5 years",
      compensationType: "Salary Range",
      compensationAmount: "80,000 - 120,000",
      currency: "USD",
      description: "Parsed content from uploaded file...",
    })
    setCurrentJobId(null)
    setAppView("job-creation")
    setJobCreationView("form")
  }

  const handlePasteText = (text: string) => {
    setShowUploadModal(false)
    setJobFormData({
      title: "Product Manager",
      employmentType: "Full-time",
      minExperience: "4 years",
      compensationType: "Salary Range",
      compensationAmount: "90,000 - 130,000",
      currency: "USD",
      description: text,
    })
    setCurrentJobId(null)
    setAppView("job-creation")
    setJobCreationView("form")
  }

  const handleJobFormSubmit = async (data: JobFormData) => {
    try {
      setIsSaving(true)
      // Check if there are changes by comparing current data with initial data
      const hasChanges = JSON.stringify(data) !== JSON.stringify(jobFormData)
      
      if (currentJobId && hasChanges) {
        // Only update existing job if there are changes
        const updateRequest = JobOpeningTransformer.transformFormToUpdateRequest(data)
        const response = await JobOpeningsApi.updateJobOpening(currentJobId, updateRequest)
        console.log('Job updated successfully:', response)
      } else if (!currentJobId) {
        // Create new job
        // Get actual user ID from auth context, fallback to mock if not available
        const userId = apiUser?.id || "6693120e-31e2-4727-92c0-3606885e7e9e"
        const createRequest = JobOpeningTransformer.transformFormToCreateRequest(data, userId)
        const response = await JobOpeningsApi.createJobOpening(createRequest)
        console.log('Job created successfully:', response)
        setCurrentJobId(response.job_opening.id)
      }
      // If currentJobId exists and no changes, skip API call
      
      setJobFormData(data)
      if (selectedRounds.length > 0) {
        setJobCreationView("canvas")
      } else {
        setShowHiringRoundsModal(true)
      }
    } catch (error) {
      console.error('Failed to save job:', error)
      // TODO: Show error notification to user
    } finally {
      setIsSaving(false)
    }
  }

  const handleRoundsContinue = (rounds: HiringRound[], originalTemplates: any[]) => {
    setSelectedRounds(rounds)
    setSelectedOriginalTemplates(originalTemplates)
    setShowHiringRoundsModal(false)
    setJobCreationView("canvas")
  }

  const handleUpdateRounds = (rounds: HiringRound[]) => {
    setSelectedRounds(rounds)
  }

  const handlePublishJob = () => {
    setShowPublishConfirmation(true)
  }

  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true)
      // Save rounds to job opening if we have a job ID and rounds
      if (currentJobId && selectedRounds.length > 0) {
        const roundTemplatesRequest = JobRoundTemplatesTransformer.transformRoundsWithTemplateContext(
          selectedRounds, 
          selectedOriginalTemplates
        )
        const roundTemplatesResponse = await JobRoundTemplatesApi.createJobRoundTemplates(currentJobId, roundTemplatesRequest)
        console.log('Job round templates created successfully:', roundTemplatesResponse)
        
        // After successfully creating round templates, confirm the job opening
        const confirmationResponse = await JobOpeningsApi.confirmJobOpening(currentJobId)
        console.log('Job opening confirmed and published successfully:', confirmationResponse)
      } else if (currentJobId) {
        // If we have a job but no rounds, still confirm it
        const confirmationResponse = await JobOpeningsApi.confirmJobOpening(currentJobId)
        console.log('Job opening confirmed and published successfully:', confirmationResponse)
      }
      
      console.log("Job published:", { jobData: jobFormData, rounds: selectedRounds })
      setShowPublishConfirmation(false)
      setAppView("job-listings")
      setJobFormData({})
      setSelectedRounds([])
      setSelectedOriginalTemplates([])
      setCurrentJobId(null)
    } catch (error) {
      console.error('Failed to publish job:', error)
      // TODO: Show error notification to user
      // For now, continue with the flow even if publishing fails
      setShowPublishConfirmation(false)
      setAppView("job-listings")
      setJobFormData({})
      setSelectedRounds([])
      setSelectedOriginalTemplates([])
      setCurrentJobId(null)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleNavigationWarningCancel = () => {
    setShowNavigationWarning(false)
    setIsReloadAttempt(false)
  }

  const handleNavigationWarningConfirm = async () => {
    const shouldReload = isReloadAttempt
    
    if (!currentJobId) {
      // No job to delete, just reset state and navigate/reload
      setShowNavigationWarning(false)
      setIsReloadAttempt(false)
      setJobFormData({})
      setSelectedRounds([])
      setSelectedOriginalTemplates([])
      setCurrentJobId(null)
      setJobCreationView("form")
      
      if (shouldReload) {
        safeReload()
      } else {
        setAppView("job-listings")
      }
      return
    }

    try {
      setIsDeleting(true)
      await JobOpeningsApi.deleteJobOpening(currentJobId)
      console.log('Job opening deleted successfully')
      
      // Reset all job creation state
      setShowNavigationWarning(false)
      setIsReloadAttempt(false)
      setJobFormData({})
      setSelectedRounds([])
      setSelectedOriginalTemplates([])
      setCurrentJobId(null)
      setJobCreationView("form")
      
      if (shouldReload) {
        safeReload()
      } else {
        setAppView("job-listings")
      }
    } catch (error) {
      console.error('Failed to delete job opening:', error)
      // Even if delete fails, still navigate away
      setShowNavigationWarning(false)
      setIsReloadAttempt(false)
      setJobFormData({})
      setSelectedRounds([])
      setSelectedOriginalTemplates([])
      setCurrentJobId(null)
      setJobCreationView("form")
      
      if (shouldReload) {
        safeReload()
      } else {
        setAppView("job-listings")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const renderJobCreationView = () => {
    return (
      <div className="flex h-screen" style={{ backgroundColor: "#F9F9F7" }}>
        <AppSidebar 
          onCreateJob={handleCreateJobClick}
          mode="creation"
        />
        <div className="flex-1 overflow-y-auto">
          {jobCreationView === "form" && (
            <JobCreationForm
              initialData={jobFormData}
              onSubmit={handleJobFormSubmit}
              onBack={() => {
                if (shouldPreventNavigation) {
                  setShowNavigationWarning(true)
                } else {
                  setAppView("job-listings")
                }
              }}
              hasRoundsConfigured={selectedRounds.length > 0}
              isExistingJob={currentJobId !== null}
              isSaving={isSaving}
            />
          )}
          {jobCreationView === "canvas" && (
            <HiringProcessCanvas
              rounds={selectedRounds}
              onUpdateRounds={handleUpdateRounds}
              onPublish={handlePublishJob}
              onBack={() => setJobCreationView("form")}
              jobTitle={jobFormData.title || ""}
              isPublishing={isPublishing}
            />
          )}
        </div>

        <HiringRoundsModal
          isOpen={showHiringRoundsModal}
          onClose={() => setShowHiringRoundsModal(false)}
          onContinue={handleRoundsContinue}
        />
        <JobPublishConfirmationModal
          isOpen={showPublishConfirmation}
          onClose={() => setShowPublishConfirmation(false)}
          onConfirm={handleConfirmPublish}
          jobData={jobFormData}
          rounds={selectedRounds}
          isPublishing={isPublishing}
        />
      </div>
    )
  }



  return (
    <>
      {appView === "job-listings" && <JobListingsApp onCreateJob={handleCreateJobClick} />}
      {appView === "job-creation" && renderJobCreationView()}

      {/* Global Modals */}
      <JobCreationModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onSelectMethod={handleSelectCreationMethod}
      />
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
      <AICreationModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} onGenerate={handleAIGenerate} />
      <AILoadingModal isOpen={showAILoading} />
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleFileUpload}
        onPasteText={handlePasteText}
      />
      <NavigationWarningDialog
        isOpen={showNavigationWarning}
        onCancel={handleNavigationWarningCancel}
        onConfirm={handleNavigationWarningConfirm}
        isDeleting={isDeleting}
        hasJobToDelete={currentJobId !== null}
        isReloadAttempt={isReloadAttempt}
      />
    </>
  )
}
