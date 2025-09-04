"use client"

import { useState, useEffect } from "react"
import { Settings, Plus, Users, Calendar, DollarSign, Clock, MapPin, Play, Loader2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CSVImportFlow } from "@/components/candidates/csv-import-flow"
import { ModernCandidatesTable } from "@/components/candidates/modern-candidates-table"
import { CandidatesApi } from "@/lib/api/candidates"
import { CandidateTransformer } from "@/lib/transformers/candidate-transformer"
import { JobRoundTemplatesApi, CandidateRoundsApi } from "@/lib/api/rounds"
import { UnsavedChangesDialog } from "@/components/candidates/unsaved-changes-dialog"
import { useAuth } from "@/contexts/auth-context"
import type { JobOpeningListItem } from "@/lib/job-types"
import type { CandidateDisplay, CandidateUIStatus } from "@/lib/candidate-types"
import type { 
  StartRoundsFlowState, 
  JobRoundTemplate, 
  CandidateRoundStatusUpdate,
  CandidateRoundCreateRequest,
  BulkCandidateRoundsCreateRequest 
} from "@/lib/round-types"

interface JobDetailsViewProps {
  job: JobOpeningListItem | null
  onSettings?: () => void
  onAddCandidates?: () => void
  onNavigationCheck?: (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => void
  onGoToRounds?: () => void
}

export function JobDetailsView({ job, onSettings, onAddCandidates, onNavigationCheck, onGoToRounds }: JobDetailsViewProps) {
  const { apiUser } = useAuth()
  const [showImportFlow, setShowImportFlow] = useState(false)
  const [candidates, setCandidates] = useState<CandidateDisplay[]>([])
  const [candidatesCount, setCandidatesCount] = useState(0)
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  
  // Store original API state separately from UI state for accurate comparison
  const [originalCandidatesState, setOriginalCandidatesState] = useState<Record<string, CandidateUIStatus>>({})
  
  // Start Rounds flow state
  const [startRoundsFlow, setStartRoundsFlow] = useState<StartRoundsFlowState>({
    isLoading: false,
    currentStep: 'idle',
    error: null,
    progress: {
      templatesLoaded: false,
      statusUpdated: false,
      roundsStarted: false,
      candidateRoundsCreated: false
    }
  })

  // Track pending status changes (not yet saved to API)
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<string, CandidateUIStatus>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Fetch candidates when job changes
  useEffect(() => {
    if (job?.id) {
      fetchCandidates(job.id)
    }
  }, [job?.id])

  // Notify parent about unsaved changes state
  useEffect(() => {
    if (onNavigationCheck) {
      onNavigationCheck(hasUnsavedChanges, handleNavigationWithCheck)
    }
  }, [hasUnsavedChanges, onNavigationCheck])

  // Protect against hard refresh/browser close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const message = `You have ${Object.keys(pendingStatusChanges).length} unsaved candidate status changes. Your progress will be lost if you leave.`
        event.preventDefault()
        event.returnValue = message
        return message
      }
    }

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, pendingStatusChanges])

  const fetchCandidates = async (jobId: string) => {
    setIsLoadingCandidates(true)
    try {
      const response = await CandidatesApi.getCandidatesByJob(jobId)
      const displayCandidates = CandidateTransformer.transformApiListToDisplay(response.candidates)
      setCandidates(displayCandidates)
      setCandidatesCount(response.candidate_count)
      
      // Store original API state as baseline for change tracking
      const originalState: Record<string, CandidateUIStatus> = {}
      displayCandidates.forEach(candidate => {
        originalState[candidate.id] = candidate.status
      })
      setOriginalCandidatesState(originalState)
      
      // Clear pending changes when fresh data is loaded (reset baseline)
      setPendingStatusChanges({})
      setHasUnsavedChanges(false)
      
      console.log('Fetched candidates with original state:', {
        candidateCount: displayCandidates.length,
        originalState: Object.keys(originalState).length
      })
    } catch (error) {
      console.error('Failed to fetch candidates:', error)
      setCandidates([])
      setCandidatesCount(0)
      setOriginalCandidatesState({})
    } finally {
      setIsLoadingCandidates(false)
    }
  }

  const handleStatusChange = (candidateId: string, newStatus: CandidateUIStatus) => {
    // Use the original API state as baseline for comparison
    const originalStatus = originalCandidatesState[candidateId] || 'action_pending'
    
    // Update local UI state immediately
    setCandidates(prev => 
      prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, status: newStatus }
          : candidate
      )
    )

    // Track this change as pending (not saved to API yet)
    setPendingStatusChanges(prev => {
      const updated = { ...prev }
      
      // If the new status matches the original API status, remove from pending changes
      if (newStatus === originalStatus) {
        delete updated[candidateId]
      } else {
        updated[candidateId] = newStatus
      }
      
      // Update hasUnsavedChanges based on the new pending changes
      setHasUnsavedChanges(Object.keys(updated).length > 0)
      
      return updated
    })
    
    console.log(`Status change tracked: candidate ${candidateId}: ${originalStatus} → ${newStatus}`, {
      isActualChange: newStatus !== originalStatus,
      pendingChangesCount: Object.keys(pendingStatusChanges).length + (newStatus !== originalStatus ? 1 : 0)
    })
  }

  // Save only the pending status changes
  const savePendingChanges = async (): Promise<boolean> => {
    if (Object.keys(pendingStatusChanges).length === 0) {
      return true // Nothing to save
    }

    try {
      const candidateStatusUpdates: CandidateRoundStatusUpdate[] = Object.entries(pendingStatusChanges).map(([candidateId, status]) => {
        const roundStatus = CandidateTransformer.mapUIStatusToRoundStatus(status)
        return {
          candidate_id: candidateId,
          round_status: roundStatus as 'action_pending' | 'selected' | 'rejected'
        }
      })

      await CandidateRoundsApi.bulkUpdateRoundStatus({ candidates: candidateStatusUpdates })
      
      // Update the original state baseline with the saved changes
      setOriginalCandidatesState(prev => {
        const updated = { ...prev }
        Object.entries(pendingStatusChanges).forEach(([candidateId, status]) => {
          updated[candidateId] = status
        })
        return updated
      })
      
      // Clear pending changes
      setPendingStatusChanges({})
      setHasUnsavedChanges(false)
      
      console.log(`Successfully saved ${candidateStatusUpdates.length} status changes and updated baseline`)
      return true
    } catch (error) {
      console.error('Failed to save status changes:', error)
      alert('Failed to save status changes. Please try again.')
      return false
    }
  }

  // Handle navigation with unsaved changes check
  const handleNavigationWithCheck = (navigationAction: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navigationAction)
      setShowUnsavedDialog(true)
    } else {
      navigationAction()
    }
  }

  // Dialog handlers
  const handleSaveAndContinue = async () => {
    const saved = await savePendingChanges()
    if (saved && pendingNavigation) {
      setShowUnsavedDialog(false)
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  const handleDiscardChanges = async () => {
    // Revert to original status by refetching from API
    if (job?.id) {
      await fetchCandidates(job.id) // This will reset to API state and clear pending changes
    } else {
      // Fallback: just clear pending changes
      setPendingStatusChanges({})
      setHasUnsavedChanges(false)
    }
    
    // Execute navigation
    if (pendingNavigation) {
      setShowUnsavedDialog(false)
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  // Save Changes functionality (when rounds already started)
  const handleSaveChangesAndGoToRounds = async () => {
    if (!job?.id || candidates.length === 0) return

    setStartRoundsFlow({
      isLoading: true,
      currentStep: 'updating-status',
      error: null,
      progress: {
        templatesLoaded: true, // Skip template loading since rounds already started
        statusUpdated: false,
        roundsStarted: true, // Already started
        candidateRoundsCreated: false
      }
    })

    try {
      // Step 1: Get job round templates (needed for candidate rounds creation)
      const templatesResponse = await JobRoundTemplatesApi.getJobRoundTemplates(job.id)
      
      if (!templatesResponse.job_round_templates || templatesResponse.job_round_templates.length === 0) {
        throw new Error('No round templates found for this job')
      }

      // Get the first round template (order_index = 1)
      const firstRoundTemplate = templatesResponse.job_round_templates
        .sort((a, b) => a.order_index - b.order_index)[0]

      // Step 2: Update candidate round status (ONLY for candidates with actual changes)
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'updating-status' }))
      
      // Only include candidates that actually have pending status changes
      const candidateStatusUpdates: CandidateRoundStatusUpdate[] = []
      
      for (const [candidateId, newStatus] of Object.entries(pendingStatusChanges)) {
        const roundStatus = CandidateTransformer.mapUIStatusToRoundStatus(newStatus)
        candidateStatusUpdates.push({
          candidate_id: candidateId,
          round_status: roundStatus as 'action_pending' | 'selected' | 'rejected'
        })
      }

      // Only make API call if there are actual changes
      let bulkUpdateResponse = null
      if (candidateStatusUpdates.length > 0) {
        bulkUpdateResponse = await CandidateRoundsApi.bulkUpdateRoundStatus({ candidates: candidateStatusUpdates })
        
        // Update the original state baseline with the saved changes
        setOriginalCandidatesState(prev => {
          const updated = { ...prev }
          Object.entries(pendingStatusChanges).forEach(([candidateId, status]) => {
            updated[candidateId] = status
          })
          return updated
        })
      }
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, statusUpdated: true },
        currentStep: 'creating-rounds'
      }))

      // Step 3: Create/update candidate rounds to sync with rounds page
      const candidateRoundsData: Array<{
        candidate_id: string
        status: 'selected' | 'rejected' | 'action_pending'
      }> = []
      
      for (const candidate of candidates) {
        const currentStatus = pendingStatusChanges[candidate.id] || candidate.status
        const roundStatus = CandidateTransformer.mapUIStatusToRoundStatus(currentStatus)
        
        candidateRoundsData.push({
          candidate_id: candidate.id,
          status: roundStatus as 'action_pending' | 'selected' | 'rejected'
        })
      }

      // Step 4: Confirm job round template before creating candidate rounds
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'starting-rounds' }))
      
      await JobRoundTemplatesApi.confirmJobRoundTemplate(firstRoundTemplate.id)

      // Step 5: Always sync all candidates with rounds page
      if (candidateRoundsData.length > 0) {
        const bulkCreateRequest: BulkCandidateRoundsCreateRequest = {
          candidates: candidateRoundsData,
          job_round_template_id: firstRoundTemplate.id,
          created_by: apiUser?.id || "6693120e-31e2-4727-92c0-3606885e7e9e" // Use authenticated user ID with fallback
        }

        await CandidateRoundsApi.bulkCreateCandidateRounds(bulkCreateRequest)
      }
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, candidateRoundsCreated: true },
        currentStep: 'completed',
        isLoading: false
      }))

      // Clear pending changes since they've been saved
      setPendingStatusChanges({})
      setHasUnsavedChanges(false)

      // Reset flow state after a delay and redirect to rounds page
      setTimeout(() => {
        setStartRoundsFlow({
          isLoading: false,
          currentStep: 'idle',
          error: null,
          progress: {
            templatesLoaded: false,
            statusUpdated: false,
            roundsStarted: false,
            candidateRoundsCreated: false
          }
        })
        // Redirect to rounds page after successful save
        if (onGoToRounds) {
          onGoToRounds()
        }
      }, 2000)

    } catch (error) {
      console.error('Failed to save changes and sync with rounds:', error)
      setStartRoundsFlow({
        isLoading: false,
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Failed to save changes',
        progress: {
          templatesLoaded: false,
          statusUpdated: false,
          roundsStarted: false,
          candidateRoundsCreated: false
        }
      })
    }
  }

  // Start Rounds functionality
  const handleStartRounds = async () => {
    if (!job?.id || candidates.length === 0) return

    setStartRoundsFlow({
      isLoading: true,
      currentStep: 'fetching-templates',
      error: null,
      progress: {
        templatesLoaded: false,
        statusUpdated: false,
        roundsStarted: false,
        candidateRoundsCreated: false
      }
    })

    try {
      // Step 1: Get job round templates
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'fetching-templates' }))
      const templatesResponse = await JobRoundTemplatesApi.getJobRoundTemplates(job.id)
      
      if (!templatesResponse.job_round_templates || templatesResponse.job_round_templates.length === 0) {
        throw new Error('No round templates found for this job')
      }

      // Get the first round template (order_index = 1)
      const firstRoundTemplate = templatesResponse.job_round_templates
        .sort((a, b) => a.order_index - b.order_index)[0]
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, templatesLoaded: true }
      }))

      // Step 2: Update candidate round status (ONLY for candidates with actual changes)
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'updating-status' }))
      
      // Only include candidates that actually have pending status changes
      const candidateStatusUpdates: CandidateRoundStatusUpdate[] = []
      
      for (const [candidateId, newStatus] of Object.entries(pendingStatusChanges)) {
        const roundStatus = CandidateTransformer.mapUIStatusToRoundStatus(newStatus)
        candidateStatusUpdates.push({
          candidate_id: candidateId,
          round_status: roundStatus as 'action_pending' | 'selected' | 'rejected'
        })
      }

      console.log('Bulk update: Sending only changed candidates:', {
        totalCandidates: candidates.length,
        changedCandidates: candidateStatusUpdates.length,
        changes: candidateStatusUpdates.map(u => ({ id: u.candidate_id, status: u.round_status }))
      })

      // Only make API call if there are actual changes
      let bulkUpdateResponse = null
      if (candidateStatusUpdates.length > 0) {
        bulkUpdateResponse = await CandidateRoundsApi.bulkUpdateRoundStatus({ candidates: candidateStatusUpdates })
        
        // Update the original state baseline with the saved changes
        setOriginalCandidatesState(prev => {
          const updated = { ...prev }
          Object.entries(pendingStatusChanges).forEach(([candidateId, status]) => {
            updated[candidateId] = status
          })
          return updated
        })
        
        console.log('Bulk status update completed:', {
          totalProcessed: bulkUpdateResponse.total_processed,
          statusSummary: bulkUpdateResponse.status_summary
        })
      } else {
        console.log('No status changes to save, skipping bulk update')
      }
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, statusUpdated: true }
      }))

      // Step 3: Start rounds for the job opening
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'starting-rounds' }))
      await JobRoundTemplatesApi.startRounds(job.id)
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, roundsStarted: true }
      }))

      // Step 4: Create/update candidate rounds for ALL changed candidates
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'creating-rounds' }))
      
      // Use the same candidate status updates that were sent to bulk-round-status-update
      const candidateRoundsData: { candidate_id: string, status: 'selected' | 'rejected' | 'action_pending' }[] = []
      
      if (candidateStatusUpdates.length > 0) {
        candidateStatusUpdates.forEach(update => {
          candidateRoundsData.push({
            candidate_id: update.candidate_id,
            status: update.round_status as 'selected' | 'rejected' | 'action_pending'
          })
        })
      }

      console.log('Creating/updating rounds for changed candidates:', {
        totalCandidates: candidates.length,
        changedCandidates: candidateRoundsData.length,
        candidateChanges: candidateRoundsData.map(c => ({ 
          id: c.candidate_id, 
          status: c.status 
        }))
      })

      // Step 4.5: Confirm job round template before creating candidate rounds
      await JobRoundTemplatesApi.confirmJobRoundTemplate(firstRoundTemplate.id)

      // Only make API call if there are candidate changes
      if (candidateRoundsData.length > 0) {
        const bulkCreateRequest: BulkCandidateRoundsCreateRequest = {
          candidates: candidateRoundsData,
          job_round_template_id: firstRoundTemplate.id,
          created_by: apiUser?.id || "6693120e-31e2-4727-92c0-3606885e7e9e" // Use authenticated user ID with fallback
        }

        const createResponse = await CandidateRoundsApi.bulkCreateCandidateRounds(bulkCreateRequest)
        
        console.log('Candidate rounds processing completed:', {
          templateInfo: createResponse.template_info,
          totalProcessed: createResponse.total_processed,
          successfulCount: createResponse.successful_count,
          failedCount: createResponse.failed_count,
          operationSummary: createResponse.operation_summary,
          statusSummary: createResponse.status_summary
        })
      } else {
        console.log('No candidate changes found, skipping candidate rounds processing')
      }
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, candidateRoundsCreated: true },
        currentStep: 'completed',
        isLoading: false
      }))

      // Clear pending changes since they've been saved
      setPendingStatusChanges({})
      setHasUnsavedChanges(false)

      // Reset flow state after a delay and redirect to rounds page
      setTimeout(() => {
        setStartRoundsFlow({
          isLoading: false,
          currentStep: 'idle',
          error: null,
          progress: {
            templatesLoaded: false,
            statusUpdated: false,
            roundsStarted: false,
            candidateRoundsCreated: false
          }
        })
        // Redirect to rounds page after successful start
        if (onGoToRounds) {
          onGoToRounds()
        }
      }, 2000)

    } catch (error) {
      console.error('Failed to start rounds:', error)
      setStartRoundsFlow({
        isLoading: false,
        currentStep: 'error',
        error: error instanceof Error ? error.message : 'Failed to start rounds',
        progress: {
          templatesLoaded: false,
          statusUpdated: false,
          roundsStarted: false,
          candidateRoundsCreated: false
        }
      })
    }
  }

  // Helper function to get loading text based on current step
  const getLoadingText = (step: StartRoundsFlowState['currentStep']): string => {
    switch (step) {
      case 'fetching-templates':
        return 'Loading templates...'
      case 'updating-status':
        return 'Updating candidates...'
      case 'starting-rounds':
        return 'Starting rounds...'
      case 'creating-rounds':
        return 'Creating rounds...'
      case 'completed':
        return 'Completed!'
      case 'error':
        return 'Error occurred'
      default:
        return 'Processing...'
    }
  }

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No job selected</h3>
          <p className="text-gray-500">Select a job from the sidebar to view details</p>
        </div>
      </div>
    )
  }

  const formatCompensation = (value: number, currency: string) => {
    if (currency === 'INR') {
      const lpa = value / 100000
      return `₹${lpa.toFixed(1)} LPA`
    }
    return `${currency} ${value.toLocaleString()}`
  }

  const formatEmploymentType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: '#DCFCE7', text: '#16A34A' }
      case 'draft':
        return { bg: '#FEF3C7', text: '#D97706' }
      case 'paused':
        return { bg: '#FEE2E2', text: '#DC2626' }
      case 'closed':
        return { bg: '#F3F4F6', text: '#6B7280' }
      default:
        return { bg: '#F3F4F6', text: '#6B7280' }
    }
  }

  const statusColor = getStatusColor(job.job_status)

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: "#E5E7EB" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold" style={{ color: "#111827", fontFamily }}>
                  {job.posting_title}
                </h1>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: statusColor.bg,
                    color: statusColor.text,
                    fontFamily,
                  }}
                >
                  {job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm" style={{ color: "#6B7280", fontFamily }}>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{candidatesCount} people applied to this role</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Role opened on{" "}
                    {job.published_at 
                      ? formatDate(job.published_at)
                      : formatDate(job.created_at)
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onSettings}
              className="flex items-center gap-2"
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontFamily,
              }}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
            
            {/* Start/View Rounds Button - Only show if there are candidates */}
            {candidates.length > 0 && (
              <>
                {job?.has_rounds_started ? (
                  <Button
                    onClick={hasUnsavedChanges ? handleSaveChangesAndGoToRounds : onGoToRounds}
                    disabled={startRoundsFlow.isLoading}
                    className="flex items-center gap-2 relative"
                    style={{
                      backgroundColor: startRoundsFlow.isLoading ? "#6B7280" : hasUnsavedChanges ? "#059669" : "#3B82F6",
                      color: "#FFFFFF",
                      fontFamily,
                    }}
                  >
                    {hasUnsavedChanges && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"></div>
                    )}
                    {startRoundsFlow.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {startRoundsFlow.isLoading 
                      ? getLoadingText(startRoundsFlow.currentStep)
                      : hasUnsavedChanges 
                        ? 'Save & View Rounds'
                        : 'View Rounds'
                    }
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartRounds}
                    disabled={startRoundsFlow.isLoading}
                    className="flex items-center gap-2 relative"
                    style={{
                      backgroundColor: startRoundsFlow.isLoading ? "#6B7280" : "#059669",
                      color: "#FFFFFF",
                      fontFamily,
                    }}
                  >
                    {hasUnsavedChanges && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full"></div>
                    )}
                    {startRoundsFlow.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {startRoundsFlow.isLoading 
                      ? getLoadingText(startRoundsFlow.currentStep)
                      : hasUnsavedChanges 
                        ? 'Save & Start Rounds'
                        : 'Start Rounds'
                    }
                  </Button>
                )}
              </>
            )}
            
            <Button
              onClick={() => handleNavigationWithCheck(() => setShowImportFlow(true))}
              className="flex items-center gap-2"
              style={{
                backgroundColor: "#111827",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              <Plus className="w-4 h-4" />
              Add candidates
            </Button>
          </div>
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-4 gap-6 p-4 rounded-lg" style={{ backgroundColor: "#F9FAFB" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: "#6B7280" }} />
              <span className="text-sm font-medium" style={{ color: "#374151", fontFamily }}>
                Employment Type
              </span>
            </div>
            <span className="text-sm" style={{ color: "#6B7280", fontFamily }}>
              {formatEmploymentType(job.employment_type)}
            </span>
          </div>
          
          {job.minimum_experience && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4" style={{ color: "#6B7280" }} />
                <span className="text-sm font-medium" style={{ color: "#374151", fontFamily }}>
                  Experience
                </span>
              </div>
              <span className="text-sm" style={{ color: "#6B7280", fontFamily }}>
                {job.minimum_experience}
              </span>
            </div>
          )}
          
          {job.compensation_value && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4" style={{ color: "#6B7280" }} />
                <span className="text-sm font-medium" style={{ color: "#374151", fontFamily }}>
                  Compensation
                </span>
              </div>
              <span className="text-sm" style={{ color: "#6B7280", fontFamily }}>
                {formatCompensation(job.compensation_value, job.compensation_currency || 'INR')}
              </span>
            </div>
          )}
          
          {job.expires_at && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4" style={{ color: "#6B7280" }} />
                <span className="text-sm font-medium" style={{ color: "#374151", fontFamily }}>
                  Expires
                </span>
              </div>
              <span className="text-sm" style={{ color: "#6B7280", fontFamily }}>
                {formatDate(job.expires_at)}
              </span>
            </div>
          )}
        </div>
      </div>





      {/* Candidates Content */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        {isLoadingCandidates ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-500" style={{ fontFamily }}>Loading candidates...</p>
            </div>
          </div>
        ) : (
          <ModernCandidatesTable 
            candidates={candidates} 
            onStatusChange={handleStatusChange} 
          />
        )}
      </div>

      {/* CSV Import Flow */}
      <CSVImportFlow
        isOpen={showImportFlow}
        onClose={() => setShowImportFlow(false)}
        jobOpeningId={job.id}
        onImportComplete={(count) => {
          setCandidatesCount(prev => prev + count)
          setShowImportFlow(false)
          // Refresh candidates list
          if (job?.id) {
            fetchCandidates(job.id)
          }
        }}
      />

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onSave={handleSaveAndContinue}
        onDiscard={handleDiscardChanges}
        onCancel={handleCancelNavigation}
        pendingChangesCount={Object.keys(pendingStatusChanges).length}
      />
    </div>
  )
}