"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Loader2, AlertCircle, Users, ArrowRight, Settings, RefreshCw } from "lucide-react"
import { SparrowInterviewsCandidatesTable } from "./sparrow-interviews-candidates-table"
import { RoundSettingsModal } from "./round-settings-modal"
import { CompetencyMetricsModal } from "./competency-metrics-modal"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import { evaluateInterviewCandidateFromFile, evaluateInterviewCandidateFromSparrowInterviewer, evaluateSalesCandidate, type SparrowInterviewerEvaluationRequest, type SalesEvaluationRequest } from "@/lib/api/evaluation"
import { getSparrowAssessmentMapping, type SparrowAssessmentMappingResponse } from "@/lib/api/sparrow-assessment-mapping"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse, RoundCandidate } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"
import { useMultiJobContextSafe } from "@/components/all_views/multi-job-context"
import { useToast } from "@/hooks/use-toast"

type RoundStatus = 'selected' | 'rejected' | 'action_pending'
type RoundType = 'INTERVIEW' | 'RAPID_FIRE' | 'GAMES_ARENA' | 'TALK_ON_A_TOPIC' | 'RAPID_FIRE_WITH_GROUNDING'
type SalesRoundType = 'RAPID_FIRE' | 'GAMES_ARENA' | 'TALK_ON_A_TOPIC' | 'RAPID_FIRE_WITH_GROUNDING'

interface SparrowInterviewsRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy?: string
}

// Round type configurations - using INTERVIEW design for all
const ROUND_TYPE_CONFIG = {
  INTERVIEW: {
    defaultName: 'Interview Round',
    description: 'Interview assessment for candidates',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: '#10B981'
  },
  RAPID_FIRE: {
    defaultName: 'Rapid Fire Round',
    description: 'Rapid Fire assessment for candidates',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: '#10B981'
  },
  GAMES_ARENA: {
    defaultName: 'Games Arena Round',
    description: 'Game-based assessment for candidates',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: '#10B981'
  },
  TALK_ON_A_TOPIC: {
    defaultName: 'Talk on Topic Round',
    description: 'Topic-based discussion assessment for candidates',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: '#10B981'
  },
  RAPID_FIRE_WITH_GROUNDING: {
    defaultName: 'Rapid Fire with Grounding Round',
    description: 'Rapid Fire with Grounding assessment for candidates',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: '#10B981'
  }
}

export function SparrowInterviewsRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: SparrowInterviewsRoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const { selectedJobs, isMultiJobMode, filteredJobIds } = useMultiJobContextSafe()
  const { toast } = useToast()

  // Determine round type and configuration
  const roundType = currentRound?.round_type as RoundType
  const config = ROUND_TYPE_CONFIG[roundType] || ROUND_TYPE_CONFIG.INTERVIEW

  // Toast notification tracking for bulk evaluation
  const bulkEvaluationToastRef = useRef<{ id: string; update: (props: any) => void } | null>(null)

  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  const [localCandidates, setLocalCandidates] = useState<RoundCandidate[]>([])
  const [originalStatusById, setOriginalStatusById] = useState<Record<string, RoundStatus>>({})
  const [currentStatusById, setCurrentStatusById] = useState<Record<string, RoundStatus>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, RoundStatus>>({})
  
  // Pagination states
  const [isLoadingMoreCandidates, setIsLoadingMoreCandidates] = useState(false)
  const [hasMoreCandidates, setHasMoreCandidates] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0)
  
  // Re-evaluation states for all candidates
  const [candidateReEvaluationStates, setCandidateReEvaluationStates] = useState<Record<string, {
    isReEvaluating: boolean
    reEvaluationError: string | null
    showReEvaluationOptions: boolean
  }>>({})
  
  // Settings state - unified for both interview and sales
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [primaryId, setPrimaryId] = useState<string>('') // sparrowRoundId for INTERVIEW, sparrowAssessmentId for sales
  const [secondaryId, setSecondaryId] = useState<string>('surveysparrow') // brandId for sales only
  const [tempPrimaryId, setTempPrimaryId] = useState<string>('')
  const [tempSecondaryId, setTempSecondaryId] = useState<string>('surveysparrow')
  const [assessmentMapping, setAssessmentMapping] = useState<SparrowAssessmentMappingResponse | null>(null)
  // Store mappings for all job round templates (for multi-job scenarios)
  const [allAssessmentMappings, setAllAssessmentMappings] = useState<Record<string, SparrowAssessmentMappingResponse>>({})
  // Store candidate-specific mapping data
  const [candidateMappings, setCandidateMappings] = useState<Record<string, { primaryId: string; secondaryId: string; jobRoundTemplateId: string }>>({})
  
  // Global bulk evaluation state - keyed by round ID
  const [globalBulkEvaluationState, setGlobalBulkEvaluationState] = useState<Record<string, {
    isEvaluating: boolean
    progress: { completed: number; total: number }
    error: string | null
    roundName: string
  }>>({})

  // Current round's bulk evaluation state
  const currentRoundId = currentRound?.id || ''
  const isBulkEvaluating = globalBulkEvaluationState[currentRoundId]?.isEvaluating || false
  const bulkEvaluationProgress = globalBulkEvaluationState[currentRoundId]?.progress || { completed: 0, total: 0 }
  const bulkEvaluationError = globalBulkEvaluationState[currentRoundId]?.error || null
  
  // Bulk status update state
  const [selectedBulkStatus, setSelectedBulkStatus] = useState<RoundStatus | ''>('')
  const [isBulkStatusUpdate, setIsBulkStatusUpdate] = useState(false)
  const [bulkStatusError, setBulkStatusError] = useState<string | null>(null)

  // Metrics modal state
  const [showMetricsModal, setShowMetricsModal] = useState(false)

  // Multi-job data fetching function with parallel processing
  const fetchMultiJobRoundData = async (roundType: string, roundName: string, abortSignal: AbortSignal, forceRefresh: boolean = false) => {
    if (!isMultiJobMode || selectedJobs.length === 0) {
      return null
    }

    const allCandidates: any[] = []
    let templateInfo = null
    let customFieldDefinitions: any[] = []

    // Filter jobs based on current selection
    const jobsToProcess = selectedJobs.filter(job => 
      !filteredJobIds || filteredJobIds.has(job.id)
    )

    console.log('Fetching multi-job round data in parallel for filtered jobs:', jobsToProcess.map(j => j.posting_title))
    const startTime = performance.now()

    // Process all jobs in parallel
    const jobPromises = jobsToProcess.map(async (job) => {
      try {
        // Get round templates for this job
        const templatesResponse = await JobRoundTemplatesApi.getJobRoundTemplates(job.id)
        const matchingRounds = templatesResponse.job_round_templates?.filter(
          round => round.round_type === roundType && round.round_name === roundName
        ) || []

        // Fetch candidates and assessment mappings for all matching rounds in parallel
        const candidatePromises = matchingRounds.map(async (round) => {
          try {
            // Fetch both candidates and assessment mapping in parallel
            const [candidatesResponse, mappingResponse] = await Promise.all([
              RoundCandidatesApi.getCandidatesByRoundTemplate(round.id, abortSignal, forceRefresh),
              getSparrowAssessmentMapping(round.id, abortSignal).catch(error => {
                if (error.name !== 'AbortError') {
                  console.warn(`Failed to fetch assessment mapping for round ${round.id}:`, error)
                }
                return null
              })
            ])
            
            if (candidatesResponse.candidates) {
              // Add job context and mapping info to each candidate
              const candidatesWithJobInfo = candidatesResponse.candidates.map(candidate => ({
                ...candidate,
                jobTitle: job.posting_title,
                jobId: job.id,
                jobRoundTemplateId: round.id // Store the job round template ID for mapping lookup
              }))
              
              return {
                candidates: candidatesWithJobInfo,
                templateInfo: candidatesResponse.template_info,
                customFieldDefinitions: candidatesResponse.custom_field_definitions,
                jobRoundTemplateId: round.id,
                assessmentMapping: mappingResponse
              }
            }
            
            return {
              candidates: [],
              templateInfo: candidatesResponse.template_info,
              customFieldDefinitions: candidatesResponse.custom_field_definitions,
              jobRoundTemplateId: round.id,
              assessmentMapping: mappingResponse
            }
          } catch (error) {
            if ((error as any)?.name !== 'AbortError') {
              console.error(`Failed to fetch candidates for round ${round.id}:`, error)
            }
            return { 
              candidates: [], 
              templateInfo: null, 
              customFieldDefinitions: [],
              jobRoundTemplateId: round.id,
              assessmentMapping: null
            }
          }
        })

        const candidateResults = await Promise.all(candidatePromises)
        
        return {
          job,
          candidateResults,
          success: true
        }
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') {
          console.error(`Failed to fetch round templates for job ${job.posting_title}:`, error)
        }
        return {
          job,
          candidateResults: [],
          success: false,
          error
        }
      }
    })

    // Wait for all jobs to complete
    const jobResults = await Promise.all(jobPromises)
    const endTime = performance.now()
    console.log(`Parallel multi-job fetch completed in ${Math.round(endTime - startTime)}ms for ${jobsToProcess.length} jobs`)

    // Aggregate results from all jobs and store assessment mappings
    const newAllAssessmentMappings: Record<string, SparrowAssessmentMappingResponse> = {}
    const newCandidateMappings: Record<string, { primaryId: string; secondaryId: string; jobRoundTemplateId: string }> = {}
    
    for (const jobResult of jobResults) {
      if (jobResult.success) {
        for (const candidateResult of jobResult.candidateResults) {
          allCandidates.push(...candidateResult.candidates)
          
          // Store assessment mapping for this job round template
          if (candidateResult.assessmentMapping && candidateResult.jobRoundTemplateId) {
            newAllAssessmentMappings[candidateResult.jobRoundTemplateId] = candidateResult.assessmentMapping
            
            // Create candidate-specific mapping data
            const mapping = candidateResult.assessmentMapping.mappings?.[0]
            if (mapping) {
              const primaryId = mapping.sparrow_assessment_id || ''
              const secondaryId = mapping.filter_column || 'surveysparrow'
              
              // Map each candidate to their specific assessment mapping
              candidateResult.candidates.forEach(candidate => {
                newCandidateMappings[candidate.id] = {
                  primaryId,
                  secondaryId,
                  jobRoundTemplateId: candidateResult.jobRoundTemplateId
                }
              })
            }
          }
          
          // Use the first available template info and custom fields
          if (!templateInfo && candidateResult.templateInfo) {
            templateInfo = candidateResult.templateInfo
          }
          if (customFieldDefinitions.length === 0 && candidateResult.customFieldDefinitions) {
            customFieldDefinitions = candidateResult.customFieldDefinitions
          }
        }
      }
    }
    
    // Store the mappings in state
    setAllAssessmentMappings(newAllAssessmentMappings)
    setCandidateMappings(newCandidateMappings)

    return {
      candidates: allCandidates,
      template_info: templateInfo || {
        round_name: roundName,
        round_type: roundType,
        order_index: 0,
        round_id: '',
        evaluation_criteria: null,
        competencies: null
      },
      custom_field_definitions: customFieldDefinitions,
      candidate_count: allCandidates.length,
      job_round_template_id: templateInfo?.round_id || '',
      custom_fields_included: true,
      evaluations_included: true
    }
  }

  // Ref to track if data is currently being fetched to prevent duplicate calls
  const isLoadingRef = useRef(false)
  const currentRoundIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<number>(0)
  const isFirstRenderRef = useRef(true)

  // Load saved settings from localStorage or fetch from API
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentRound?.id) return

      const storageKey = `sparrow_settings_${currentRound.id}`
      
      // Priority 1: Try to get from API mapping first
      try {
        const mappingResponse = await getSparrowAssessmentMapping(currentRound.id)
        if (mappingResponse.mappings && mappingResponse.mappings.length > 0) {
          const firstMapping = mappingResponse.mappings[0]
          if (firstMapping.sparrow_assessment_id) {
            console.log('Using settings from API mapping:', firstMapping.sparrow_assessment_id)
            setPrimaryId(firstMapping.sparrow_assessment_id)
            setSecondaryId(firstMapping.filter_column || 'surveysparrow')
            setAssessmentMapping(mappingResponse)
            return
          }
        }
      } catch (error) {
        console.warn('Failed to fetch sparrow assessment mapping from API:', error)
      }

      // Priority 2: Use saved settings from localStorage
      const savedSettings = localStorage.getItem(storageKey)
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          console.log('Using settings from localStorage:', parsed)
          setPrimaryId(parsed.primaryId || '')
          setSecondaryId(parsed.secondaryId || 'surveysparrow')
        } catch (error) {
          console.error('Failed to parse saved settings:', error)
        }
      } else {
        // Priority 3: Try fallback based on round name for INTERVIEW rounds
        if (roundType === 'INTERVIEW') {
          const fallbackId = getFallbackAssessmentId(currentRound.round_name)
          if (fallbackId) {
            console.log('Using fallback assessment ID:', fallbackId)
            setPrimaryId(fallbackId)
          }
        }
      }
    }

    loadSettings()
  }, [currentRound?.id, roundType])

  // Fallback round ID mappings for common round names (INTERVIEW only)
  const getFallbackAssessmentId = (roundName?: string): string | null => {
    if (!roundName) return null
    
    const roundMappings: Record<string, string> = {
      'Statistics': 'statistics-001',
      'ML-Foundation': 'classical-ml-001', 
      'LLM': 'llm-001',
      'DEEP LEARNING': 'deep-learning-001'
    }
    
    // Try exact match first
    if (roundMappings[roundName]) {
      return roundMappings[roundName]
    }
    
    // Try case-insensitive match
    const lowerRoundName = roundName.toLowerCase()
    for (const [key, value] of Object.entries(roundMappings)) {
      if (key.toLowerCase() === lowerRoundName) {
        return value
      }
    }
    
    return null
  }

  // Save settings to localStorage
  const saveSettings = (primary: string, secondary?: string) => {
    if (currentRound?.id) {
      const storageKey = `sparrow_settings_${currentRound.id}`
      const settings = {
        primaryId: primary,
        secondaryId: secondary || 'surveysparrow'
      }
      localStorage.setItem(storageKey, JSON.stringify(settings))
      setPrimaryId(primary)
      if (secondary !== undefined) {
        setSecondaryId(secondary)
      }
    }
  }

  // Memoize filteredJobIds array to prevent unnecessary re-renders
  const filteredJobIdsArray = useMemo(() => {
    return filteredJobIds ? Array.from(filteredJobIds).sort() : null
  }, [filteredJobIds])

  // Create a stable string representation for dependency comparison
  const filteredJobIdsString = useMemo(() => {
    return filteredJobIdsArray ? filteredJobIdsArray.join(',') : ''
  }, [filteredJobIdsArray])

  // Fetch round candidates data when current round changes
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) return
      
      console.log(`🎯 [COMPONENT] SparrowInterviewsRoundContent - Starting data fetch for round: ${currentRound.round_name} (${currentRound.id}), isMultiJobMode: ${isMultiJobMode}`)
      
      // Generate unique request ID
      const currentRequestId = ++requestIdRef.current
      
      // Prevent duplicate calls for the same round and configuration
      const currentConfig = `${currentRound.id}-${isMultiJobMode}-${filteredJobIdsString}`
      if (isLoadingRef.current && currentRoundIdRef.current === currentConfig) {
        console.log(`🟡 [DUPLICATE PREVENTION] Skipping duplicate fetch for round: ${currentRound.round_name}`)
        return
      }
      
      // Only cancel previous request if this is NOT the first render and we're switching rounds
      if (abortControllerRef.current && !isFirstRenderRef.current && currentRoundIdRef.current !== currentRound.id) {
        abortControllerRef.current.abort()
      }
      
      // Mark that we've passed the first render
      isFirstRenderRef.current = false
      
      // Create new abort controller for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      
      isLoadingRef.current = true
      currentRoundIdRef.current = currentConfig

      // Clear previous data immediately to show loader
      setRoundData(null)
      setLocalCandidates([])
      setAssessmentMapping(null)
      setAllAssessmentMappings({})
      setCandidateMappings({})
      setIsLoading(true)
      setError(null)

      try {
        let roundResponse
        let mappingResponse = null

        if (isMultiJobMode) {
          console.log(`🎯 [COMPONENT] Multi-job mode - fetching data for ${selectedJobs.length} jobs, filtered: ${filteredJobIds ? filteredJobIds.size : 'none'}`)
          // Multi-job mode: fetch candidates from all jobs with the same round type
          const [multiJobRoundData, mapping] = await Promise.all([
            fetchMultiJobRoundData(currentRound.round_type, currentRound.round_name, abortController.signal),
            getSparrowAssessmentMapping(currentRound.id, abortController.signal).catch(error => {
              if (error.name !== 'AbortError') {
                console.error('Failed to fetch assessment mapping:', error)
              }
              return null
            })
          ])
          
          roundResponse = multiJobRoundData
          mappingResponse = mapping
        } else {
          console.log(`🎯 [COMPONENT] Single-job mode - fetching data for round template: ${currentRound.id}`)
          // Single-job mode: fetch data normally
          const [singleRoundResponse, singleMappingResponse] = await Promise.all([
            RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal),
            getSparrowAssessmentMapping(currentRound.id, abortController.signal).catch(error => {
              // Don't log abort errors as they're expected during navigation
              if (error.name !== 'AbortError') {
                console.error('Failed to fetch assessment mapping:', error)
              }
              return null // Return null on error, don't fail the entire request
            })
          ])
          
          roundResponse = singleRoundResponse
          mappingResponse = singleMappingResponse
        }
        
        // Check if request was aborted before updating state
        if (abortController.signal.aborted) {
          return
        }

        // Only set round data if we have a valid response
        if (roundResponse) {
          setRoundData(roundResponse)
          setLocalCandidates(roundResponse.candidates || [])
          
          // Update pagination states
          if ('pagination' in roundResponse && roundResponse.pagination) {
            setHasMoreCandidates(roundResponse.pagination.has_next)
            setCurrentPage(roundResponse.pagination.current_page)
            setTotalCandidatesCount(roundResponse.pagination.total_count)
          } else {
            // Legacy response without pagination or multi-job response
            setHasMoreCandidates(false)
            setCurrentPage(1)
            setTotalCandidatesCount(
              ('candidate_count' in roundResponse ? roundResponse.candidate_count : undefined) || 
              roundResponse.candidates?.length || 
              0
            )
          }
        }

        // Handle assessment mapping response
        if (mappingResponse) {
          setAssessmentMapping(mappingResponse)

          // Auto-populate settings if mapping exists
          if (mappingResponse.mappings && mappingResponse.mappings.length > 0) {
            const firstMapping = mappingResponse.mappings[0]
            setPrimaryId(firstMapping.sparrow_assessment_id)
            setSecondaryId(firstMapping.filter_column || 'surveysparrow')
            setTempPrimaryId(firstMapping.sparrow_assessment_id)
            setTempSecondaryId(firstMapping.filter_column || 'surveysparrow')
          }
        } else {
          // If mapping fetch failed, set default values for sales rounds
          if (roundType !== 'INTERVIEW') {
            console.warn('Sparrow assessment mapping not available, using default values')
            setAssessmentMapping(null)
            setSecondaryId('surveysparrow')
            setTempSecondaryId('surveysparrow')
          }
        }
        
        // Initialize status maps from API response
        const initialOriginal: Record<string, RoundStatus> = {}
        const initialCurrent: Record<string, RoundStatus> = {}

        if (roundResponse?.candidates) {
          roundResponse.candidates.forEach(candidate => {
            const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
            initialOriginal[candidate.id] = status
            initialCurrent[candidate.id] = status
          })
        }
        
        setOriginalStatusById(initialOriginal)
        setCurrentStatusById(initialCurrent)
        setPendingChanges({})
      } catch (error: any) {
        // Don't show error for aborted requests (happens during navigation)
        if (error.name !== 'AbortError') {
          console.error('Error fetching round candidates:', error)
          setError('Failed to load round candidates')
        }
      } finally {
        // Always set loading to false since we're handling request ordering properly
        // The abort signal check in the try block already handles stale requests
        if (!abortController.signal.aborted) {
          setIsLoading(false)
          isLoadingRef.current = false
        }
      }
    }

    fetchRoundData()
    
    // Cleanup function - only abort on unmount, not on round changes
    return () => {
      // We handle round switching inside fetchRoundData, so cleanup only aborts on unmount
      // This prevents the first render from being cancelled
    }
  }, [currentRound?.id, filteredJobIdsString, isMultiJobMode, roundType])

  // Log dependency changes to track why useEffect is triggering (only when actually needed)
  useEffect(() => {
    if (currentRound?.id) {
      console.log(`🔄 [DEPENDENCY CHANGE] SparrowInterviewsRoundContent useEffect dependencies changed:`, {
        currentRoundId: currentRound?.id,
        filteredJobIdsString,
        isMultiJobMode,
        roundType,
        selectedJobsCount: selectedJobs.length
      })
    }
  }, [currentRound?.id, filteredJobIdsString, isMultiJobMode, roundType, selectedJobs.length])

  // Function to load more candidates (next page)
  const handleLoadMoreCandidates = async () => {
    if (!currentRound?.id || isLoadingMoreCandidates || !hasMoreCandidates || isMultiJobMode) {
      return
    }

    setIsLoadingMoreCandidates(true)
    
    try {
      const nextPage = currentPage + 1
      const nextPageResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(
        currentRound.id,
        undefined, // no abort signal for load more
        false, // don't force refresh
        nextPage,
        100
      )

      if (nextPageResponse) {
        // Append new candidates to existing ones
        setLocalCandidates(prevCandidates => [...prevCandidates, ...nextPageResponse.candidates])
        
        // Update pagination states
        if (nextPageResponse.pagination) {
          setHasMoreCandidates(nextPageResponse.pagination.has_next)
          setCurrentPage(nextPageResponse.pagination.current_page)
        }

        // Initialize status tracking for new candidates
        const newOriginalStatus: Record<string, RoundStatus> = {}
        const newCurrentStatus: Record<string, RoundStatus> = {}
        
        nextPageResponse.candidates.forEach(candidate => {
          const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
          newOriginalStatus[candidate.id] = status
          newCurrentStatus[candidate.id] = status
        })
        
        setOriginalStatusById(prev => ({ ...prev, ...newOriginalStatus }))
        setCurrentStatusById(prev => ({ ...prev, ...newCurrentStatus }))
      }
    } catch (error: any) {
      console.error('Error loading more candidates:', error)
      toast({
        title: "Error",
        description: "Failed to load more candidates. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingMoreCandidates(false)
    }
  }

  const handleRefresh = async () => {
    if (!currentRound?.id) return

    console.log('🔄 [REFRESH] Refreshing interview round data for round:', currentRound.id)

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Clear cache to ensure fresh data
      console.log('🔄 [REFRESH] Clearing cache before refresh')
      RoundCandidatesApi.clearCache()
      
      // Clear previous data immediately to show loader
      setRoundData(null)
      setLocalCandidates([])
      setCandidateMappings({})
      setIsLoading(true)
      setError(null)
      // Reset pagination
      setCurrentPage(1)
      setHasMoreCandidates(false)
      setTotalCandidatesCount(0)

      console.log('🔄 [REFRESH] Calling API: getCandidatesByRoundTemplate with forceRefresh=true')
      let roundResponse
      let mappingResponse = null

      if (isMultiJobMode) {
        console.log(`🔄 [REFRESH] Multi-job mode - fetching data for ${selectedJobs.length} jobs with forceRefresh=true`)
        const [multiJobRoundData, mapping] = await Promise.all([
          fetchMultiJobRoundData(currentRound.round_type, currentRound.round_name, abortController.signal, true),
          getSparrowAssessmentMapping(currentRound.id, abortController.signal).catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Failed to fetch assessment mapping:', error)
            }
            return null
          })
        ])
        
        roundResponse = multiJobRoundData
        mappingResponse = mapping
      } else {
        console.log(`🔄 [REFRESH] Single-job mode - fetching data for round template: ${currentRound.id}`)
        const [singleRoundResponse, singleMappingResponse] = await Promise.all([
          RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id, abortController.signal, true),
          getSparrowAssessmentMapping(currentRound.id, abortController.signal).catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Failed to fetch assessment mapping:', error)
            }
            return null
          })
        ])
        
        roundResponse = singleRoundResponse
        mappingResponse = singleMappingResponse
      }
      
      // Check if request was aborted before updating state
      if (abortController.signal.aborted) {
        return
      }

      console.log('✅ [REFRESH] Data refreshed successfully, candidates count:', roundResponse?.candidates?.length || 0)

      // Only set round data if we have a valid response
      if (roundResponse) {
        setRoundData(roundResponse)
        setLocalCandidates(roundResponse.candidates || [])
        
        // Update pagination states
        if ('pagination' in roundResponse && roundResponse.pagination) {
          setHasMoreCandidates(roundResponse.pagination.has_next)
          setCurrentPage(roundResponse.pagination.current_page)
          setTotalCandidatesCount(roundResponse.pagination.total_count)
        } else {
          setHasMoreCandidates(false)
          setCurrentPage(1)
          setTotalCandidatesCount(
            ('candidate_count' in roundResponse ? roundResponse.candidate_count : undefined) || 
            roundResponse.candidates?.length || 
            0
          )
        }
      }

      // Handle assessment mapping response
      if (mappingResponse) {
        setAssessmentMapping(mappingResponse)

        // Auto-populate settings if mapping exists
        if (mappingResponse.mappings && mappingResponse.mappings.length > 0) {
          const firstMapping = mappingResponse.mappings[0]
          setPrimaryId(firstMapping.sparrow_assessment_id)
          setSecondaryId(firstMapping.filter_column || 'surveysparrow')
          setTempPrimaryId(firstMapping.sparrow_assessment_id)
          setTempSecondaryId(firstMapping.filter_column || 'surveysparrow')
        }
      }

      // Initialize status tracking
      const initialOriginal: Record<string, RoundStatus> = {}
      const initialCurrent: Record<string, RoundStatus> = {}
      for (const candidate of roundResponse?.candidates || []) {
        const status = (candidate.candidate_rounds?.[0]?.status || candidate.round_status || 'action_pending') as RoundStatus
        initialOriginal[candidate.id] = status
        initialCurrent[candidate.id] = status
      }
      setOriginalStatusById(initialOriginal)
      setCurrentStatusById(initialCurrent)
    } catch (err: any) {
      // Don't show error for aborted requests
      if (err.name !== 'AbortError') {
        console.error('❌ [REFRESH] Failed to refresh round data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load round data')
      }
    } finally {
      // Only set loading to false if request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    setLocalCandidates(prevCandidates =>
      prevCandidates.map(candidate => {
        if (candidate.id === candidateId) {
          const updatedCandidate = { ...candidate }
          if (updatedCandidate.candidate_rounds && updatedCandidate.candidate_rounds.length > 0) {
            updatedCandidate.candidate_rounds[0].status = newStatus
          } else {
            updatedCandidate.round_status = newStatus
          }
          return updatedCandidate
        }
        return candidate
      })
    )

    setCurrentStatusById(prev => ({
      ...prev,
      [candidateId]: newStatus
    }))

    // Track changes compared to original state
    const originalStatus = originalStatusById[candidateId]
    if (originalStatus === newStatus) {
      // Remove from pending changes if reverting to original
      setPendingChanges(prev => {
        const newPending = { ...prev }
        delete newPending[candidateId]
        return newPending
      })
    } else {
      // Add/update pending change
      setPendingChanges(prev => ({
        ...prev,
        [candidateId]: newStatus
      }))
    }
  }

  // Handle re-evaluation state changes
  const handleReEvaluationStateChange = (candidateId: string, state: {
    isReEvaluating?: boolean
    reEvaluationError?: string | null
    showReEvaluationOptions?: boolean
  }) => {
    setCandidateReEvaluationStates(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        ...state
      }
    }))
  }

  // Helper function to update bulk evaluation state for current round
  const updateBulkEvaluationState = (updates: Partial<{
    isEvaluating: boolean
    progress: { completed: number; total: number }
    error: string | null
  }>) => {
    setGlobalBulkEvaluationState(prev => ({
      ...prev,
      [currentRoundId]: {
        isEvaluating: prev[currentRoundId]?.isEvaluating || false,
        progress: prev[currentRoundId]?.progress || { completed: 0, total: 0 },
        error: prev[currentRoundId]?.error || null,
        roundName: currentRound?.round_name || config.defaultName,
        ...updates
      }
    }))
  }

  // Get candidates without evaluations
  const getCandidatesWithoutEvaluations = () => {
    return localCandidates.filter(candidate => !candidate.candidate_rounds?.[0]?.is_evaluation)
  }

  // Check if assessment ID is available
  const hasValidConfiguration = () => {
    return primaryId && primaryId.trim() !== ''
  }

  // Unified bulk evaluation function that handles both INTERVIEW and sales rounds
  const handleBulkEvaluation = async () => {
    if (!primaryId || primaryId.trim() === '') {
      updateBulkEvaluationState({ 
        error: roundType === 'INTERVIEW' 
          ? 'No sparrow round ID available. Please configure round ID in settings.'
          : 'No assessment ID available. Please configure assessment ID in settings.'
      })
      return
    }

    // For sales rounds, check brand ID
    if (roundType !== 'INTERVIEW' && (!secondaryId || secondaryId.trim() === '')) {
      updateBulkEvaluationState({ error: 'Brand ID not configured. Please ensure the sparrow assessment mapping is properly set up.' })
      return
    }

    // Set initial loading state
    updateBulkEvaluationState({
      isEvaluating: true,
      error: null,
      progress: { completed: 0, total: 0 }
    })

    // Fetch ALL candidates across all pages for the current round
    let candidatesWithoutEvaluation: RoundCandidate[]
    try {
      const allCandidatesResponse = await RoundCandidatesApi.getAllCandidatesByRoundTemplate(
        currentRound!.id,
        undefined,
        (currentPage, totalPages, candidates) => {
          console.log(`Fetching candidates for bulk evaluation: page ${currentPage}/${totalPages}, total: ${candidates.length}`)
        }
      )

      const allCandidates = allCandidatesResponse.candidates

      // Filter candidates without evaluations from ALL candidates
      candidatesWithoutEvaluation = allCandidates.filter(
        candidate => !candidate.candidate_rounds?.[0]?.is_evaluation
      )

      if (candidatesWithoutEvaluation.length === 0) {
        updateBulkEvaluationState({ 
          isEvaluating: false,
          error: 'All candidates already have evaluations' 
        })
        return
      }

      updateBulkEvaluationState({
        isEvaluating: true,
        error: null,
        progress: { completed: 0, total: candidatesWithoutEvaluation.length }
      })
    } catch (error) {
      console.error('Error fetching candidates for bulk evaluation:', error)
      updateBulkEvaluationState({ 
        isEvaluating: false,
        error: 'Failed to fetch candidates. Please try again.' 
      })
      return
    }

    // Show initial toast notification with round information
    const roundDisplayName = currentRound?.round_name || config.defaultName
    const initialToast = toast({
      title: "Bulk Evaluation Started",
      description: `Evaluating ${candidatesWithoutEvaluation.length} candidates for "${roundDisplayName}" in background...`,
      duration: 8000, // 8 seconds
    })
    bulkEvaluationToastRef.current = initialToast

    const BATCH_SIZE = roundType === 'INTERVIEW' ? 33 : 60 // Different batch sizes for different round types
    const results = []
    let completed = 0

    // Split candidates into batches
    const batches = []
    for (let i = 0; i < candidatesWithoutEvaluation.length; i += BATCH_SIZE) {
      batches.push(candidatesWithoutEvaluation.slice(i, i + BATCH_SIZE))
    }

    console.log(`Processing ${candidatesWithoutEvaluation.length} candidates in ${batches.length} batches of up to ${BATCH_SIZE}`)
    if (roundType !== 'INTERVIEW') {
      console.log(`Using brand_id: ${secondaryId} (from filter_column in sparrow assessment mapping)`)
    }

    // Process each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      try {
        // Process current batch in parallel
        const batchPromises = batch.map(async (candidate) => {
          try {
            if (!candidate.candidate_rounds?.[0]?.id) {
              return { 
                candidate: candidate.id, 
                success: false, 
                error: 'Missing candidate_round_id' 
              }
            }

            // Get candidate-specific mapping data (for multi-job scenarios)
            const candidateMapping = candidateMappings[candidate.id]
            const candidatePrimaryId = candidateMapping?.primaryId || primaryId
            const candidateSecondaryId = candidateMapping?.secondaryId || secondaryId
            
            console.log(`🎯 [EVALUATION] Using mapping for candidate ${candidate.id}:`, {
              candidatePrimaryId,
              candidateSecondaryId,
              jobRoundTemplateId: candidateMapping?.jobRoundTemplateId,
              isFromCandidateMapping: !!candidateMapping
            })

            let result: any
            if (roundType === 'INTERVIEW') {
              // INTERVIEW round evaluation
              if (!candidate.job_opening_id) {
                return { 
                  candidate: candidate.id, 
                  success: false, 
                  error: 'Missing job_opening_id' 
                }
              }

              const request: SparrowInterviewerEvaluationRequest = {
                email: candidate.email,
                job_round_template_id: candidatePrimaryId, // Use candidate-specific ID
                candidate_round_id: candidate.candidate_rounds[0].id,
                job_opening_id: candidate.job_opening_id
              }

              result = await evaluateInterviewCandidateFromSparrowInterviewer(request)
              
              if (result.success) {
                // Update candidate with evaluation
                const updatedCandidate: RoundCandidate = {
                  ...candidate,
                  candidate_rounds: candidate.candidate_rounds.map(round => ({
                    ...round,
                    is_evaluation: true,
                    evaluations: [{
                      id: result.result_id || `eval-${Date.now()}`,
                      candidate_round_id: round.id,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      evaluation_result: {
                        evaluation_summary: result.evaluation_summary || '',
                        competency_evaluation: result.competency_evaluation || {
                          competency_scores: [],
                          overall_percentage_score: 0
                        },
                        overall_percentage_score: result.competency_evaluation?.overall_percentage_score || 0,
                        interviewer_evaluation_summary: result.interviewer_evaluation_summary || '',
                        transcript_text: result.file_metadata?.transcript_text || ''
                      }
                    }]
                  }))
                }

                // Update local candidates list
                setLocalCandidates(prev => 
                  prev.map(c => c.id === candidate.id ? updatedCandidate : c)
                )

                return { candidate: candidate.id, success: true, updatedCandidate }
              } else {
                return { candidate: candidate.id, success: false, error: result.error_message }
              }
            } else {
              // Sales round evaluation
              const request: SalesEvaluationRequest = {
                email: candidate.email,
                sparrow_assessment_id: candidatePrimaryId, // Use candidate-specific ID
                candidate_round_id: candidate.candidate_rounds[0].id,
                account_id: 'salesai',
                brand_id: candidateSecondaryId // Use candidate-specific brand ID
              }

              result = await evaluateSalesCandidate(request, roundType as SalesRoundType)
              return { candidate: candidate.id, success: result.success, error: result.error_message }
            }
          } catch (error) {
            console.error(`Error evaluating candidate ${candidate.id}:`, error)
            return { 
              candidate: candidate.id, 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }
          }
        })

        // Wait for all promises in the batch to complete
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Update progress
        completed += batch.length
        updateBulkEvaluationState({
          progress: { completed, total: candidatesWithoutEvaluation.length }
        })

        // Update toast with progress including round information
        if (bulkEvaluationToastRef.current) {
          bulkEvaluationToastRef.current.update({
            title: "Bulk Evaluation in Progress",
            description: `Evaluated ${completed} of ${candidatesWithoutEvaluation.length} candidates for "${roundDisplayName}"...`,
            duration: 6000, // 6 seconds
          })
        }

        // Add delay between batches to avoid overwhelming the server
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay between batches
        }

      } catch (error) {
        console.error(`Failed to process batch ${batchIndex + 1}:`, error)
        // Continue with next batch instead of failing entirely
        completed += batch.length
        updateBulkEvaluationState({
          progress: { completed, total: candidatesWithoutEvaluation.length }
        })
      }
    }

    updateBulkEvaluationState({ isEvaluating: false })

    // Show summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    // Show final toast notification with detailed results
    if (bulkEvaluationToastRef.current) {
      const totalProcessed = results.length
      const errorMessages = results
        .filter(r => !r.success && r.error)
        .map(r => r.error)
        .slice(0, 3) // Show only first 3 errors to keep toast readable

      let description = `Processed ${totalProcessed} candidates: ${successful} successful`
      if (failed > 0) {
        description += `, ${failed} failed`
        if (errorMessages.length > 0) {
          description += `\nErrors: ${errorMessages.join('; ')}`
          if (results.filter(r => !r.success && r.error).length > 3) {
            description += ` (+${results.filter(r => !r.success && r.error).length - 3} more errors)`
          }
        }
      }

      bulkEvaluationToastRef.current.update({
        title: failed === 0 ? "Bulk Evaluation Complete" : "Bulk Evaluation Finished with Issues",
        description: `${description} (Round: "${roundDisplayName}")`,
        duration: failed === 0 ? 4000 : 8000, // 4 seconds for success, 8 seconds for errors
      })
    }

    const finalError = failed === 0 
      ? null 
      : `Bulk evaluation completed with ${failed} failures out of ${results.length} candidates for "${roundDisplayName}"`
    
    updateBulkEvaluationState({ error: finalError })

    // Refresh data after bulk evaluation
    if (currentRound?.id) {
      try {
        const refreshResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
        setRoundData(refreshResponse)
        setLocalCandidates(refreshResponse.candidates || [])
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError)
      }
    }
  }

  // Bulk status update function
  const handleBulkStatusUpdate = async () => {
    if (!selectedBulkStatus) {
      setBulkStatusError('Please select a status to apply to all candidates')
      return
    }

    if (localCandidates.length === 0) {
      setBulkStatusError('No candidates found to update')
      return
    }

    setIsBulkStatusUpdate(true)
    setBulkStatusError(null)

    try {
      // Update all candidates locally first for immediate UI feedback
      const updatedCandidates = localCandidates.map(candidate => ({
        ...candidate,
        candidate_rounds: candidate.candidate_rounds.map(round => ({
          ...round,
          status: selectedBulkStatus
        }))
      }))

      setLocalCandidates(updatedCandidates)

      // Update currentStatusById for consistency
      const statusUpdates: Record<string, RoundStatus> = {}
      localCandidates.forEach(candidate => {
        statusUpdates[candidate.id] = selectedBulkStatus as RoundStatus
      })
      setCurrentStatusById(prev => ({ ...prev, ...statusUpdates }))

      setBulkStatusError(`Successfully updated status to "${selectedBulkStatus}" for all ${localCandidates.length} candidates`)
      setSelectedBulkStatus('')
      
    } catch (error) {
      console.error('Error updating bulk status:', error)
      setBulkStatusError('Failed to update candidate statuses')
    } finally {
      setIsBulkStatusUpdate(false)
    }
  }

  const handleProgressToNextRound = async () => {
    if (!currentRound?.id || !roundData) return

    setIsProgressingCandidates(true)
    try {
      // 1) Fetch ALL candidates across all pages for the current round
      const allCandidatesResponse = await RoundCandidatesApi.getAllCandidatesByRoundTemplate(
        currentRound.id,
        undefined,
        (currentPage, totalPages, candidates) => {
          console.log(`Fetching candidates: page ${currentPage}/${totalPages}, total: ${candidates.length}`)
        }
      )

      const allCandidates = allCandidatesResponse.candidates

      // 2) Persist ALL statuses for CURRENT round (not just changed)
      const currentRoundUpdates = allCandidates.map(c => ({
        candidate_id: c.id,
        status: (currentStatusById[c.id] || 'action_pending') as RoundStatus,
      }))
      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: currentRoundUpdates,
      })

      // 3) Build full candidate list for the NEXT round using current statuses
      const allCandidateIds = allCandidates.map(c => c.id)

      const nextRound = rounds[currentStepIndex + 1]
      if (!nextRound) {
        alert('No next round available.')
        return
      }

      // 4) Progress candidates to next round using the same status from the current round, for ALL candidates
      const candidate_updates = allCandidateIds.map(candidate_id => ({
        candidate_id,
        status: (currentStatusById[candidate_id] || 'action_pending') as 'selected' | 'rejected' | 'action_pending'
      }))

      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: nextRound.id,
        candidate_updates
      })

      // Confirm/activate the next round template so the UI can navigate
      await JobRoundTemplatesApi.confirmJobRoundTemplate(nextRound.id)

      // Create/update candidate_rounds for the next round with ALL candidates and individual statuses
      await CandidateRoundsApi.bulkCreateCandidateRounds({
        job_round_template_id: nextRound.id,
        candidates: candidate_updates,
        created_by: createdBy || 'system'
      })

      // Navigate to next round immediately
      onNextRound()
      
    } catch (error) {
      console.error('Error progressing candidates:', error)
      setError('Failed to progress candidates to next round')
    } finally {
      setIsProgressingCandidates(false)
    }
  }

  const selectedCount = Object.values(currentStatusById).filter(status => status === 'selected').length
  const rejectedCount = Object.values(currentStatusById).filter(status => status === 'rejected').length
  const pendingCount = Object.values(currentStatusById).filter(status => status === 'action_pending').length
  const hasChanges = Object.keys(pendingChanges).length > 0
  const isLastRound = currentStepIndex === rounds.length - 1

  if (!currentRound) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-500 mb-2" style={{ fontFamily }}>
            No round selected
          </div>
          <div className="text-sm text-gray-400" style={{ fontFamily }}>
            Please select a round from the stepper above
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2" style={{ fontFamily }}>
            Error Loading Round Data
          </h3>
          <p className="text-red-600 mb-4" style={{ fontFamily }}>
            {error}
          </p>
          <Button
            onClick={() => setError(null)}
            style={{
              backgroundColor: "#EF4444",
              color: "#FFFFFF",
              fontFamily,
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const selectedCandidatesCount = localCandidates.filter(candidate => {
    const current = currentStatusById[candidate.id]
    const original = originalStatusById[candidate.id]
    return current === 'selected' && current !== original
  }).length

  const hasNextRound = currentStepIndex < rounds.length - 1
  const nextRound = hasNextRound ? rounds[currentStepIndex + 1] : null

  return (
    <div className="flex-1 bg-gray-50">
      <div className="w-full p-6">
        {/* Round Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily }}>
                  {currentRound.round_name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span style={{ fontFamily }}>
                    Round {currentRound.order_index} of {rounds.length}
                  </span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: currentRound.is_active ? '#DCFCE7' : '#FEE2E2',
                      color: currentRound.is_active ? '#16A34A' : '#DC2626',
                      fontFamily
                    }}
                  >
                    {currentRound.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Round Stats & Actions */}
              <div className="flex items-center gap-6">
                {roundData && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-1" style={{ fontFamily }}>
                      {totalCandidatesCount}
                    </div>
                    <div className="text-sm text-gray-600" style={{ fontFamily }}>
                      Candidate{totalCandidatesCount !== 1 ? 's' : ''}
                      {localCandidates.length < totalCandidatesCount && (
                        <span className="text-xs text-gray-500 block">
                          Showing {localCandidates.length} of {totalCandidatesCount}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Radar Chart Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMetricsModal(true)}
                  className="flex items-center gap-2"
                  disabled={!roundData?.candidates?.some(c => c.candidate_rounds?.[0]?.is_evaluation)}
                  style={{ fontFamily }}
                >
                  <Users className="w-4 h-4" />
                  Radar Chart
                </Button>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="flex items-center gap-2"
                  disabled={isLoading}
                  style={{ fontFamily }}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>

                {/* Settings Button - Hide in multi-job mode */}
                {!isMultiJobMode && (
                  <Button
                    onClick={() => {
                      setTempPrimaryId(primaryId)
                      setTempSecondaryId(secondaryId)
                      setShowSettingsModal(true)
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    style={{ fontFamily }}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* Unified candidates table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
            <SparrowInterviewsCandidatesTable
              candidates={localCandidates}
              customFieldDefinitions={roundData?.custom_field_definitions || []}
              isLoading={isLoading}
              roundInfo={roundData?.template_info}
              jobOpeningId={roundData?.candidates?.[0]?.job_opening_id}
              onStatusChange={handleStatusChange}
              onCandidateUpdated={(updatedCandidate) => {
                setLocalCandidates(prev => 
                  prev.map(candidate => 
                    candidate.id === updatedCandidate.id ? updatedCandidate : candidate
                  )
                )
              }}
              sparrowRoundId={primaryId}
              currentRoundName={currentRound?.round_name || config.defaultName}
              candidateReEvaluationStates={candidateReEvaluationStates}
              onReEvaluationStateChange={handleReEvaluationStateChange}
              roundType={roundType}
              candidateMappings={candidateMappings}
              defaultSecondaryId={secondaryId}
            />
          </div>
          
          {/* Load More Candidates Button */}
          {hasMoreCandidates && !isMultiJobMode && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-center">
              <Button
                onClick={handleLoadMoreCandidates}
                disabled={isLoadingMoreCandidates}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 mx-auto"
                style={{ fontFamily }}
              >
                {isLoadingMoreCandidates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Load {Math.min(100, totalCandidatesCount - localCandidates.length)} more
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <RoundSettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false)
          updateBulkEvaluationState({ error: null })
          setBulkStatusError(null)
          setSelectedBulkStatus('')
        }}
        roundType={roundType}
        roundName={currentRound?.round_name || config.defaultName}
        primaryId={tempPrimaryId}
        setPrimaryId={setTempPrimaryId}
        secondaryId={tempSecondaryId}
        setSecondaryId={setTempSecondaryId}
        candidatesCount={localCandidates.length}
        candidatesWithoutEvaluations={getCandidatesWithoutEvaluations().length}
        isBulkEvaluating={isBulkEvaluating}
        bulkEvaluationProgress={bulkEvaluationProgress}
        bulkEvaluationError={bulkEvaluationError}
        onBulkEvaluation={handleBulkEvaluation}
        selectedBulkStatus={selectedBulkStatus}
        setSelectedBulkStatus={setSelectedBulkStatus}
        isBulkStatusUpdate={isBulkStatusUpdate}
        bulkStatusError={bulkStatusError}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        hasNextRound={hasNextRound}
        selectedCandidatesCount={selectedCandidatesCount}
        isProgressingCandidates={isProgressingCandidates}
        onNextRound={handleProgressToNextRound}
        onSave={() => {
          saveSettings(tempPrimaryId, tempSecondaryId)
          setShowSettingsModal(false)
        }}
        onCancel={() => setShowSettingsModal(false)}
        hasValidConfiguration={() => tempPrimaryId.trim() !== ''}
      />

      {/* Competency Metrics Modal */}
      <CompetencyMetricsModal
        isOpen={showMetricsModal}
        onClose={() => setShowMetricsModal(false)}
        candidates={roundData?.candidates || []}
        roundInfo={roundData?.template_info}
      />
    </div>
  )
}
