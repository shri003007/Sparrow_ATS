"use client"

import { useState, useEffect, useRef } from "react"
import { Settings, Plus, Users, Calendar, DollarSign, Clock, MapPin, Play, Loader2, Eye, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CSVImportFlow } from "@/components/candidates/csv-import-flow"
import { ModernCandidatesTable } from "@/components/candidates/modern-candidates-table"
import { CandidateTransformer } from "@/lib/transformers/candidate-transformer"
import { JobRoundTemplatesApi, CandidateRoundsApi } from "@/lib/api/rounds"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { UnsavedChangesDialog } from "@/components/candidates/unsaved-changes-dialog"
import { JobSettingsModal } from "./job-settings-modal"
import { useAuth } from "@/contexts/auth-context"
import { useBulkEvaluation, type JobBulkEvaluationState } from "@/contexts/bulk-evaluation-context"
import { useToast } from "@/hooks/use-toast"
import { getSparrowAssessmentMapping } from "@/lib/api/sparrow-assessment-mapping"
import { evaluateInterviewCandidateFromSparrowInterviewer, evaluateSalesCandidate, type SparrowInterviewerEvaluationRequest, type SalesEvaluationRequest } from "@/lib/api/evaluation"
import type { JobOpeningListItem } from "@/lib/job-types"
import type { CandidateDisplay, CandidateUIStatus } from "@/lib/candidate-types"
import type { 
  StartRoundsFlowState, 
  JobRoundTemplate, 
  CandidateRoundStatusUpdate,
  CandidateRoundCreateRequest,
  BulkCandidateRoundsCreateRequest 
} from "@/lib/round-types"
import type { RoundCandidate } from "@/lib/round-candidate-types"

interface JobDetailsViewProps {
  job: JobOpeningListItem | null
  candidates: CandidateDisplay[]
  candidatesCount: number
  isLoadingCandidates: boolean
  onStatusChange: (candidateId: string, newStatus: CandidateUIStatus) => void
  hasUnsavedChanges: boolean
  pendingStatusChanges: Record<string, CandidateUIStatus>
  onRefreshCandidates: (forceRefresh?: boolean) => void
  onSavePendingChanges: () => Promise<boolean>
  onUpdateCandidateStatus: (candidateId: string, status: CandidateUIStatus) => void
  onSettings?: () => void // Keep for backward compatibility, but not used internally anymore
  onAddCandidates?: () => void
  onNavigationCheck?: (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => void
  onGoToRounds?: () => void
  onCandidateClick?: (candidate: CandidateDisplay) => void
  isLoadingJobs?: boolean
}


interface RoundEvaluationData {
  roundTemplate: JobRoundTemplate
  candidates: RoundCandidate[]
  mappings: {
    primaryId?: string
    secondaryId?: string
    candidateMappings?: Record<string, { primaryId?: string; secondaryId?: string }>
  }
}

export function JobDetailsView({ 
  job, 
  candidates, 
  candidatesCount, 
  isLoadingCandidates, 
  onStatusChange, 
  hasUnsavedChanges, 
  pendingStatusChanges, 
  onRefreshCandidates,
  onSavePendingChanges,
  onUpdateCandidateStatus,
  onSettings, 
  onAddCandidates, 
  onNavigationCheck, 
  onGoToRounds, 
  onCandidateClick, 
  isLoadingJobs = false 
}: JobDetailsViewProps) {
  const { apiUser } = useAuth()
  const { getEvaluationState, updateEvaluationState } = useBulkEvaluation()
  const { toast } = useToast()
  const [showImportFlow, setShowImportFlow] = useState(false)
  
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

  // Job-level bulk evaluation state - now managed globally
  const jobBulkEvaluation = job?.id ? getEvaluationState(job.id) : {
    isEvaluating: false,
    currentStep: 'idle' as const,
    progress: {
      roundsProcessed: 0,
      totalRounds: 0,
      candidatesEvaluated: 0,
      totalCandidates: 0
    },
    error: null
  }
  
  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false)


  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

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
    const saved = await onSavePendingChanges()
    if (saved && pendingNavigation) {
      setShowUnsavedDialog(false)
      pendingNavigation()
      setPendingNavigation(null)
    }
  }

  const handleDiscardChanges = async () => {
    // Revert to original status by refetching from API
    onRefreshCandidates(true) // Force refresh to reset to API state and clear pending changes
    
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
        
        // State is managed at parent level - no need to update local state
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

      // Pending changes are managed at parent level

      // Clear caches to ensure fresh data when viewing rounds
      console.log('🔄 Clearing caches after start rounds completion...')
      JobRoundTemplatesApi.clearCache() // Clear round templates cache
      RoundCandidatesApi.clearCache()   // Clear round candidates cache
      
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

      // Step 2: Update candidate round status for ALL candidates (not just changed ones)
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'updating-status' }))
      
      // Include ALL candidates with their current status (changed or unchanged)
      const candidateStatusUpdates: CandidateRoundStatusUpdate[] = []
      
      for (const candidate of candidates) {
        // Use pending status if changed, otherwise use current status
        const currentStatus = pendingStatusChanges[candidate.id] || candidate.status
        const roundStatus = CandidateTransformer.mapUIStatusToRoundStatus(currentStatus)
        candidateStatusUpdates.push({
          candidate_id: candidate.id,
          round_status: roundStatus as 'action_pending' | 'selected' | 'rejected'
        })
      }

      console.log('Bulk update: Sending ALL candidates for start rounds:', {
        totalCandidates: candidates.length,
        allCandidates: candidateStatusUpdates.length,
        statusBreakdown: candidateStatusUpdates.reduce((acc, u) => {
          acc[u.round_status] = (acc[u.round_status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

      // Always make API call for all candidates when starting rounds
      let bulkUpdateResponse = null
      if (candidateStatusUpdates.length > 0) {
        bulkUpdateResponse = await CandidateRoundsApi.bulkUpdateRoundStatus({ candidates: candidateStatusUpdates })
        
        // State is managed at parent level - no need to update local state
        
        console.log('Bulk status update completed:', {
          totalProcessed: bulkUpdateResponse.total_processed,
          statusSummary: bulkUpdateResponse.status_summary
        })
      } else {
        console.log('No candidates found, skipping bulk update')
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

      // Step 4: Create/update candidate rounds for ALL candidates
      setStartRoundsFlow(prev => ({ ...prev, currentStep: 'creating-rounds' }))
      
      // Use the same candidate status updates that were sent to bulk-round-status-update
      const candidateRoundsData: { candidate_id: string, status: 'selected' | 'rejected' | 'action_pending' }[] = []
      
      // Process ALL candidates (same as candidateStatusUpdates)
      candidateStatusUpdates.forEach(update => {
        candidateRoundsData.push({
          candidate_id: update.candidate_id,
          status: update.round_status as 'selected' | 'rejected' | 'action_pending'
        })
      })

      console.log('Creating/updating rounds for ALL candidates:', {
        totalCandidates: candidates.length,
        allCandidates: candidateRoundsData.length,
        statusBreakdown: candidateRoundsData.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      })

      // Step 4.5: Confirm job round template before creating candidate rounds
      await JobRoundTemplatesApi.confirmJobRoundTemplate(firstRoundTemplate.id)

      // Always make API call for all candidates when starting rounds
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
        console.log('No candidates found, skipping candidate rounds processing')
      }
      
      setStartRoundsFlow(prev => ({ 
        ...prev, 
        progress: { ...prev.progress, candidateRoundsCreated: true },
        currentStep: 'completed',
        isLoading: false
      }))

      // Pending changes are managed at parent level

      // Clear caches to ensure fresh data when viewing rounds
      console.log('🔄 Clearing caches after start rounds completion...')
      JobRoundTemplatesApi.clearCache() // Clear round templates cache
      RoundCandidatesApi.clearCache()   // Clear round candidates cache

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

  const getBulkEvaluationLoadingText = (step: JobBulkEvaluationState['currentStep']): string => {
    switch (step) {
      case 'fetching-rounds':
        return 'Fetching rounds...'
      case 'fetching-candidates':
        return 'Loading candidates...'
      case 'fetching-mappings':
        return 'Loading mappings...'
      case 'evaluating':
        return 'Evaluating candidates...'
      case 'completed':
        return 'Completed!'
      case 'error':
        return 'Error occurred'
      default:
        return 'Processing...'
    }
  }

  // Job-level bulk evaluation logic
  const handleJobBulkEvaluation = async () => {
    if (!job?.id) {
      toast({
        title: "Error",
        description: "No job selected for bulk evaluation",
        variant: "destructive",
      })
      return
    }

    if (!job.has_rounds_started) {
      toast({
        title: "Cannot Bulk Evaluate",
        description: "Rounds must be started before bulk evaluation. Please start rounds first.",
        variant: "destructive",
      })
      return
    }

    updateEvaluationState(job.id, {
      isEvaluating: true,
      currentStep: 'fetching-rounds',
      progress: { roundsProcessed: 0, totalRounds: 0, candidatesEvaluated: 0, totalCandidates: 0 },
      error: null,
      jobTitle: job.posting_title
    })

    try {
      // Step 1: Fetch all round templates for the job
      console.log(`🚀 [JOB BULK EVAL] Starting bulk evaluation for job ${job.id}`)
      const templatesResponse = await JobRoundTemplatesApi.getJobRoundTemplates(job.id)
      
      if (!templatesResponse.job_round_templates || templatesResponse.job_round_templates.length === 0) {
        throw new Error('No round templates found for this job')
      }

      // Filter for evaluable round types
      const evaluableRoundTypes = ['INTERVIEW', 'RAPID_FIRE', 'TALK_ON_A_TOPIC', 'GAMES_ARENA']
      const evaluableRounds = templatesResponse.job_round_templates.filter(round => 
        evaluableRoundTypes.includes(round.round_type)
      )

      if (evaluableRounds.length === 0) {
        throw new Error('No evaluable rounds found. Only INTERVIEW and sales rounds (RAPID_FIRE, TALK_ON_A_TOPIC, GAMES_ARENA) can be bulk evaluated.')
      }

      console.log(`📋 [JOB BULK EVAL] Found ${evaluableRounds.length} evaluable rounds:`, 
        evaluableRounds.map(r => `${r.round_name} (${r.round_type})`))

      updateEvaluationState(job.id, {
        currentStep: 'fetching-candidates',
        progress: { ...jobBulkEvaluation.progress, totalRounds: evaluableRounds.length }
      })

      // Step 2: Fetch candidates and mappings for all evaluable rounds in parallel
      const roundDataPromises = evaluableRounds.map(async (round): Promise<RoundEvaluationData> => {
        try {
          // Fetch candidates and mappings in parallel
          const [candidatesResponse, mappingsResponse] = await Promise.all([
            RoundCandidatesApi.getCandidatesByRoundTemplate(round.id),
            getSparrowAssessmentMapping(round.id).catch(error => {
              console.warn(`Failed to fetch mappings for round ${round.id}:`, error)
              return { job_round_template_id: round.id, template_info: { round_name: round.round_name, round_type: round.round_type }, mappings_count: 0, mappings: [] }
            })
          ])

          // Process mappings to extract primary and secondary IDs
          const mappings: RoundEvaluationData['mappings'] = {}
          const candidateMappings: Record<string, { primaryId?: string; secondaryId?: string }> = {}

          if (mappingsResponse.mappings && mappingsResponse.mappings.length > 0) {
            // Use first mapping as default
            const defaultMapping = mappingsResponse.mappings[0]
            mappings.primaryId = defaultMapping.sparrow_assessment_id
            mappings.secondaryId = defaultMapping.filter_column || 'surveysparrow'

            // Create candidate-specific mappings
            mappingsResponse.mappings.forEach(mapping => {
              // For now, we'll use the mapping for all candidates
              // In a more complex scenario, you might have candidate-specific logic here
              candidateMappings[mapping.sparrow_assessment_id] = {
                primaryId: mapping.sparrow_assessment_id,
                secondaryId: mapping.filter_column || 'surveysparrow'
              }
            })
          }

          mappings.candidateMappings = candidateMappings

          console.log(`📊 [JOB BULK EVAL] Round ${round.round_name}: ${candidatesResponse.candidates?.length || 0} candidates, ${mappingsResponse.mappings_count} mappings`)

          return {
            roundTemplate: round,
            candidates: candidatesResponse.candidates || [],
            mappings
          }
        } catch (error) {
          console.error(`Failed to fetch data for round ${round.id}:`, error)
          return {
            roundTemplate: round,
            candidates: [],
            mappings: {}
          }
        }
      })

      updateEvaluationState(job.id, { currentStep: 'fetching-mappings' })
      const roundsData = await Promise.all(roundDataPromises)

      // Step 3: Filter candidates that need evaluation and prepare for bulk processing
      const evaluationTasks: Array<{
        round: JobRoundTemplate
        candidate: RoundCandidate
        primaryId: string
        secondaryId?: string
      }> = []

      roundsData.forEach(({ roundTemplate, candidates, mappings }) => {
        const candidatesNeedingEvaluation = candidates.filter(candidate => {
          const hasEvaluation = candidate.candidate_rounds?.[0]?.is_evaluation
          // Only check is_evaluation field - if it's false, candidate needs evaluation
          // Don't check score as 0 is a valid score and should not trigger re-evaluation
          return !hasEvaluation
        })

        console.log(`🔍 [JOB BULK EVAL] Round ${roundTemplate.round_name}: ${candidatesNeedingEvaluation.length}/${candidates.length} candidates need evaluation`)

        candidatesNeedingEvaluation.forEach(candidate => {
          // Use candidate-specific mapping if available, otherwise use round default
          const candidateMapping = mappings.candidateMappings?.[candidate.id]
          const primaryId = candidateMapping?.primaryId || mappings.primaryId
          const secondaryId = candidateMapping?.secondaryId || mappings.secondaryId

          if (primaryId) {
            evaluationTasks.push({
              round: roundTemplate,
              candidate,
              primaryId,
              secondaryId
            })
          } else {
            console.warn(`⚠️ [JOB BULK EVAL] No primary ID found for candidate ${candidate.id} in round ${roundTemplate.round_name}`)
          }
        })
      })

      if (evaluationTasks.length === 0) {
        updateEvaluationState(job.id, {
          isEvaluating: false,
          currentStep: 'completed',
          progress: { roundsProcessed: evaluableRounds.length, totalRounds: evaluableRounds.length, candidatesEvaluated: 0, totalCandidates: 0 },
          error: null
        })
        
        toast({
          title: "Bulk Evaluation Complete",
          description: "All candidates already have evaluations",
        })
        return
      }

      console.log(`🎯 [JOB BULK EVAL] Starting evaluation of ${evaluationTasks.length} candidates across ${evaluableRounds.length} rounds`)

      updateEvaluationState(job.id, {
        currentStep: 'evaluating',
        progress: { ...jobBulkEvaluation.progress, totalCandidates: evaluationTasks.length }
      })

      // Show initial toast
      toast({
        title: "Job Bulk Evaluation Started",
        description: `Evaluating ${evaluationTasks.length} candidates across ${evaluableRounds.length} rounds...`,
        duration: 10000,
      })

      // Step 4: Process evaluations in parallel batches
      const BATCH_SIZE = 50 // Process 50 evaluations in parallel
      const results: Array<{ success: boolean; candidate: string; round: string; error?: string; missedRound?: boolean }> = []
      let completed = 0

      // Split tasks into batches
      const batches = []
      for (let i = 0; i < evaluationTasks.length; i += BATCH_SIZE) {
        batches.push(evaluationTasks.slice(i, i + BATCH_SIZE))
      }

      console.log(`⚡ [JOB BULK EVAL] Processing ${evaluationTasks.length} evaluations in ${batches.length} batches of up to ${BATCH_SIZE}`)

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        
        try {
          // Process current batch in parallel
          const batchPromises = batch.map(async ({ round, candidate, primaryId, secondaryId }) => {
            try {
              if (!candidate.candidate_rounds?.[0]?.id) {
                return { 
                  success: false, 
                  candidate: candidate.id, 
                  round: round.round_name,
                  error: 'Missing candidate_round_id',
                  missedRound: false
                }
              }

              let result: any
              let errorMessage: string = ''
              let evaluationSuccess = false

              try {
                if (round.round_type === 'INTERVIEW') {
                  // Interview evaluation
                  const request: SparrowInterviewerEvaluationRequest = {
                    email: candidate.email,
                    job_round_template_id: round.id,
                    candidate_round_id: candidate.candidate_rounds[0].id,
                    job_opening_id: candidate.job_opening_id
                  }

                  result = await evaluateInterviewCandidateFromSparrowInterviewer(request)
                  evaluationSuccess = result.success
                  errorMessage = result.error_message || ''
                } else {
                  // Sales evaluation
                  const request: SalesEvaluationRequest = {
                    email: candidate.email,
                    sparrow_assessment_id: primaryId,
                    candidate_round_id: candidate.candidate_rounds[0].id,
                    account_id: 'salesai',
                    brand_id: secondaryId || 'surveysparrow'
                  }

                  result = await evaluateSalesCandidate(request, round.round_type as 'RAPID_FIRE' | 'TALK_ON_A_TOPIC' | 'GAMES_ARENA')
                  evaluationSuccess = result.success
                  errorMessage = result.error_message || ''
                }
              } catch (error) {
                // Handle thrown errors from the evaluation functions
                evaluationSuccess = false
                errorMessage = error instanceof Error ? error.message : 'Unknown error'
                console.log(`🔍 [EVAL ERROR] Caught error for candidate ${candidate.id} in round ${round.round_name}:`, errorMessage)
              }

              // Check if candidate missed the round (404 error or assessment not found)
              const missedRound = !evaluationSuccess && !!errorMessage && (
                errorMessage.includes('404') ||
                errorMessage.includes('not found') ||
                errorMessage.includes('Assessment retrieval failed') ||
                errorMessage.includes('Assessment API request failed: 404') ||
                errorMessage.includes('Rapid-fire evaluation failed: Assessment retrieval failed') ||
                errorMessage.includes('Games arena evaluation failed: Assessment retrieval failed') ||
                errorMessage.includes('Assessment data not available') ||
                errorMessage.includes('Games Arena evaluation failed') ||
                errorMessage.includes('Rapid-fire evaluation failed')
              )
              
              return { 
                success: evaluationSuccess, 
                candidate: candidate.id, 
                round: round.round_name,
                error: errorMessage,
                missedRound: missedRound
              }
            } catch (error) {
              console.error(`Error evaluating candidate ${candidate.id} in round ${round.round_name}:`, error)
              return { 
                success: false, 
                candidate: candidate.id, 
                round: round.round_name,
                error: error instanceof Error ? error.message : 'Unknown error',
                missedRound: false
              }
            }
          })

          // Wait for all promises in the batch to complete
          const batchResults = await Promise.all(batchPromises)
          results.push(...batchResults)

          // Update progress
          completed += batch.length
          updateEvaluationState(job.id, {
            progress: { 
              ...jobBulkEvaluation.progress, 
              candidatesEvaluated: completed,
              roundsProcessed: Math.min(jobBulkEvaluation.progress.totalRounds, Math.ceil(completed / (evaluationTasks.length / evaluableRounds.length)))
            }
          })

          // Progress toast is handled by the context on completion

          // Add delay between batches to avoid overwhelming the server
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
          }

        } catch (error) {
          console.error(`Failed to process batch ${batchIndex + 1}:`, error)
          // Continue with next batch instead of failing entirely
        }
      }

      // Calculate final results
      const successCount = results.filter(r => r.success).length
      const missedRoundCount = results.filter(r => !r.success && r.missedRound).length
      const actualFailureCount = results.filter(r => !r.success && !r.missedRound).length

      console.log(`✅ [JOB BULK EVAL] Completed: ${successCount} successful, ${missedRoundCount} missed rounds, ${actualFailureCount} failed`)

      updateEvaluationState(job.id, {
        isEvaluating: false,
        currentStep: 'completed',
        progress: { 
          roundsProcessed: evaluableRounds.length, 
          totalRounds: evaluableRounds.length, 
          candidatesEvaluated: completed, 
          totalCandidates: evaluationTasks.length 
        },
        error: null,
        results: {
          successCount,
          failedCount: actualFailureCount,
          missedRoundCount
        }
      })

      // Final toast is handled by the context automatically

    } catch (error) {
      console.error('Job bulk evaluation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      updateEvaluationState(job.id, {
        isEvaluating: false,
        currentStep: 'error',
        progress: { roundsProcessed: 0, totalRounds: 0, candidatesEvaluated: 0, totalCandidates: 0 },
        error: errorMessage
      })

      toast({
        title: "Bulk Evaluation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  if (!job) {
    if (isLoadingJobs) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500" style={{ fontFamily }}>Loading jobs...</p>
          </div>
        </div>
      )
    }
    
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
    <>
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
            {/* Bulk Evaluation Status Indicator */}
            {jobBulkEvaluation.isEvaluating && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm" style={{ fontFamily }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating in background...</span>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
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
                    disabled={startRoundsFlow.isLoading || jobBulkEvaluation.isEvaluating}
                    className="flex items-center gap-2 relative"
                    style={{
                      backgroundColor: (startRoundsFlow.isLoading || jobBulkEvaluation.isEvaluating) ? "#6B7280" : hasUnsavedChanges ? "#059669" : "#3B82F6",
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
            onStatusChange={onStatusChange}
            hasRoundsStarted={job?.has_rounds_started || false}
            onCandidateClick={onCandidateClick}
          />
        )}
      </div>

      {/* CSV Import Flow */}
      <CSVImportFlow
        isOpen={showImportFlow}
        onClose={() => setShowImportFlow(false)}
        jobOpeningId={job.id}
        onImportComplete={(count) => {
          setShowImportFlow(false)
          // Refresh candidates list
          onRefreshCandidates(true) // Force refresh after import
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

    {/* Job Settings Modal - Outside main container like RoundSettingsModal */}
    <JobSettingsModal
      isOpen={showSettingsModal}
      onClose={() => setShowSettingsModal(false)}
      jobTitle={job?.posting_title || 'Unknown Job'}
      hasRoundsStarted={job?.has_rounds_started || false}
      candidatesCount={candidates.length}
      bulkEvaluationState={jobBulkEvaluation}
      onBulkEvaluation={handleJobBulkEvaluation}
    />
  </>
  )
}