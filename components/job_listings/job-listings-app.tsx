"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AppSidebar } from "./sidebar"
import { JobDetailsView } from "./job-details-view"
import { RoundDetailsView } from "./round-details-view"
import { AllViewsCombinedView } from "../all_views/combined-view"
import { AllViewsCreationPage } from "../all_views/all-views-creation-page"
import { CandidateDetailsView } from "./candidate-details-view"
import { CandidatesApi } from "@/lib/api/candidates"
import { CandidateTransformer } from "@/lib/transformers/candidate-transformer"
import type { JobOpeningListItem } from "@/lib/job-types"
import type { CandidateDisplay, CandidateUIStatus } from "@/lib/candidate-types"

interface JobListingsAppProps {
  onCreateJob?: () => void
  newlyCreatedJobId?: string | null
  onSettingsClick?: () => void
}

type JobView = 'candidates' | 'rounds' | 'candidate-details'
type AppMode = 'single-job' | 'all-views' | 'all-views-creation'

export function JobListingsApp({ onCreateJob, newlyCreatedJobId, onSettingsClick }: JobListingsAppProps) {
  const [selectedJob, setSelectedJob] = useState<JobOpeningListItem | null>(null)
  const [currentView, setCurrentView] = useState<JobView>('candidates')
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [jobsList, setJobsList] = useState<JobOpeningListItem[]>([])
  const [appMode, setAppMode] = useState<AppMode>('single-job')
  const [selectedJobsForAllViews, setSelectedJobsForAllViews] = useState<JobOpeningListItem[]>([])
  const [allViewsTitle, setAllViewsTitle] = useState<string>('')
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [refreshViewsTrigger, setRefreshViewsTrigger] = useState<number>(0)
  const [isLoadingViewJobs, setIsLoadingViewJobs] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDisplay | null>(null)
  
  // Candidates state (moved from JobDetailsView)
  const [candidates, setCandidates] = useState<CandidateDisplay[]>([])
  const [candidatesCount, setCandidatesCount] = useState(0)
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  const [originalCandidatesState, setOriginalCandidatesState] = useState<Record<string, CandidateUIStatus>>({})
  const [pendingStatusChanges, setPendingStatusChanges] = useState<Record<string, CandidateUIStatus>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const navigationCheckRef = useRef<((callback: () => void) => void) | null>(null)

  // Constants for localStorage keys
  const SELECTED_JOB_KEY = 'ats_selected_job'
  const CURRENT_VIEW_KEY = 'ats_current_view'
  const CURRENT_ROUND_INDEX_KEY = 'ats_current_round_index'

  // Load selected job from localStorage on mount (but always use job's has_rounds_started for view)
  useEffect(() => {
    try {
      const savedJob = localStorage.getItem(SELECTED_JOB_KEY)

      if (savedJob) {
        const jobData = JSON.parse(savedJob)
        setSelectedJob(jobData)
        // Always set view based on job's has_rounds_started flag, not saved view
        setCurrentView(jobData.has_rounds_started ? 'rounds' : 'candidates')
      }
    } catch (error) {
      console.warn('Failed to load saved job selection from localStorage:', error)
    }
  }, [])

  // Save selected job and view to localStorage whenever they change
  useEffect(() => {
    try {
      if (selectedJob) {
        localStorage.setItem(SELECTED_JOB_KEY, JSON.stringify(selectedJob))
      } else {
        localStorage.removeItem(SELECTED_JOB_KEY)
      }
    } catch (error) {
      console.warn('Failed to save selected job to localStorage:', error)
    }
  }, [selectedJob])

  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_VIEW_KEY, currentView)
    } catch (error) {
      console.warn('Failed to save current view to localStorage:', error)
    }
  }, [currentView])

  const handleJobSelect = useCallback((job: JobOpeningListItem) => {
    // Check for unsaved changes before switching jobs
    if (navigationCheckRef.current) {
      navigationCheckRef.current(() => {
        setAppMode('single-job')
        setSelectedViewId(null) // Clear selected view when selecting a job
        setIsLoadingViewJobs(false) // Clear view loading state
        setSelectedCandidate(null) // Clear selected candidate when switching jobs
        setCandidates([]) // Clear candidates when switching jobs to force fresh fetch
        setSelectedJob(job)
        // Always set view based on has_rounds_started flag (like the previous working version)
        setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
        // Clear round index when switching to a different job
        try {
          localStorage.removeItem(CURRENT_ROUND_INDEX_KEY)
        } catch (error) {
          console.warn('Failed to clear round index:', error)
        }
      })
    } else {
      setAppMode('single-job')
      setSelectedViewId(null) // Clear selected view when selecting a job
      setIsLoadingViewJobs(false) // Clear view loading state
      setSelectedCandidate(null) // Clear selected candidate when switching jobs
      setCandidates([]) // Clear candidates when switching jobs to force fresh fetch
      setSelectedJob(job)
      // Always set view based on has_rounds_started flag (like the previous working version)
      setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
      // Clear round index when switching to a different job
      try {
        localStorage.removeItem(CURRENT_ROUND_INDEX_KEY)
      } catch (error) {
        console.warn('Failed to clear round index:', error)
      }
    }
  }, [CURRENT_ROUND_INDEX_KEY])

  const handleJobSelectById = useCallback((jobId: string) => {
    const job = jobsList.find(j => j.id === jobId)
    if (job) {
      handleJobSelect(job)
    } else {
      console.warn(`Job with ID ${jobId} not found in jobsList`)
    }
  }, [jobsList, handleJobSelect])

  const handleJobsLoaded = useCallback((jobs: JobOpeningListItem[]) => {
    setIsLoadingJobs(false)
    setJobsList(jobs || [])

    // Priority 1: Select newly created job if available
    if (newlyCreatedJobId && jobs && Array.isArray(jobs)) {
      const newlyCreatedJob = jobs.find(job => job.id === newlyCreatedJobId)
      if (newlyCreatedJob) {
        console.log('Selecting newly created job:', newlyCreatedJob.posting_title)
        setSelectedJob(newlyCreatedJob)
        setCurrentView(newlyCreatedJob.has_rounds_started ? 'rounds' : 'candidates')
        return // Exit early, we found and selected the newly created job
      }
    }

    // Priority 2: Check if the saved job is still in the list
    if (selectedJob && jobs && Array.isArray(jobs)) {
      const jobStillExists = jobs.some(job => job.id === selectedJob.id)
      if (!jobStillExists) {
        // Saved job no longer exists, select most recent job as fallback
        console.warn('Previously selected job no longer exists, selecting most recent job as fallback')
        localStorage.removeItem(SELECTED_JOB_KEY)
        localStorage.removeItem(CURRENT_VIEW_KEY)
        localStorage.removeItem(CURRENT_ROUND_INDEX_KEY)
        
        if (jobs.length > 0) {
          // Select the most recent job (first in the sorted list)
          const mostRecentJob = jobs[0]
          setSelectedJob(mostRecentJob)
          setCurrentView(mostRecentJob.has_rounds_started ? 'rounds' : 'candidates')
          console.log('Selected fallback job:', mostRecentJob.posting_title)
        } else {
          setSelectedJob(null)
        }
      }
    } else {
      // If no job is selected but we have jobs, try to restore from localStorage
      try {
        const savedJob = localStorage.getItem(SELECTED_JOB_KEY)

        if (savedJob && jobs && Array.isArray(jobs)) {
          const jobData = JSON.parse(savedJob)
          const jobStillExists = jobs.some(job => job.id === jobData.id)
          if (jobStillExists) {
            setSelectedJob(jobData)
            // Always set view based on job's has_rounds_started flag
            setCurrentView(jobData.has_rounds_started ? 'rounds' : 'candidates')
          } else {
            // Saved job was deleted, clear localStorage and select most recent job
            console.warn('Saved job no longer exists, selecting most recent job as fallback')
            localStorage.removeItem(SELECTED_JOB_KEY)
            localStorage.removeItem(CURRENT_VIEW_KEY)
            localStorage.removeItem(CURRENT_ROUND_INDEX_KEY)
            
            if (jobs.length > 0) {
              const mostRecentJob = jobs[0]
              setSelectedJob(mostRecentJob)
              setCurrentView(mostRecentJob.has_rounds_started ? 'rounds' : 'candidates')
              console.log('Selected fallback job:', mostRecentJob.posting_title)
            }
          }
        } else if (jobs.length > 0 && !selectedJob) {
          // No saved job, select the most recent one
          const mostRecentJob = jobs[0]
          setSelectedJob(mostRecentJob)
          setCurrentView(mostRecentJob.has_rounds_started ? 'rounds' : 'candidates')
          console.log('No saved job, selected most recent:', mostRecentJob.posting_title)
        }
      } catch (error) {
        console.warn('Failed to restore saved job, selecting most recent as fallback:', error)
        // Clear corrupted localStorage and select most recent job
        localStorage.removeItem(SELECTED_JOB_KEY)
        localStorage.removeItem(CURRENT_VIEW_KEY)
        localStorage.removeItem(CURRENT_ROUND_INDEX_KEY)
        
        if (jobs.length > 0) {
          const mostRecentJob = jobs[0]
          setSelectedJob(mostRecentJob)
          setCurrentView(mostRecentJob.has_rounds_started ? 'rounds' : 'candidates')
        }
      }
    }
  }, [selectedJob, appMode, newlyCreatedJobId])

  // Fetch candidates when selected job changes
  useEffect(() => {
    const abortController = new AbortController()
    
    if (selectedJob?.id) {
      // Force refresh when job changes to ensure fresh data
      fetchCandidates(selectedJob.id, abortController.signal, true)
    }
    
    // Cleanup function to cancel request when job changes or component unmounts
    return () => {
      abortController.abort()
    }
  }, [selectedJob?.id])

  const fetchCandidates = async (jobId: string, abortSignal?: AbortSignal, forceRefresh: boolean = false) => {
    setIsLoadingCandidates(true)
    try {
      // Force refresh to bypass cache for new job selections
      const response = await CandidatesApi.getCandidatesByJob(jobId, forceRefresh)
      
      // Check if request was cancelled
      if (abortSignal?.aborted) {
        return
      }
      
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
      // Don't show errors for cancelled requests
      if (abortSignal?.aborted) {
        return
      }
      
      console.error('Failed to fetch candidates:', error)
      
      // Check if this is a 404/500 error indicating the job might be deleted
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch candidates'
      if (errorMessage.includes('500') || errorMessage.includes('404')) {
        console.warn('Job may have been deleted, clearing localStorage')
        // Clear localStorage to prevent repeated errors
        try {
          localStorage.removeItem('ats_selected_job')
          localStorage.removeItem('ats_current_view')
          localStorage.removeItem('ats_current_round_index')
        } catch (storageError) {
          console.warn('Failed to clear localStorage:', storageError)
        }
      }
      
      setCandidates([])
      setCandidatesCount(0)
      setOriginalCandidatesState({})
    } finally {
      if (!abortSignal?.aborted) {
        setIsLoadingCandidates(false)
      }
    }
  }

  const handleNavigationCheck = (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => {
    navigationCheckRef.current = hasUnsavedChanges ? checkFunction : null
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

  const savePendingChanges = async (): Promise<boolean> => {
    if (Object.keys(pendingStatusChanges).length === 0) {
      return true // Nothing to save
    }

    try {
      const { CandidateRoundsApi } = await import('@/lib/api/rounds')
      const candidateStatusUpdates = Object.entries(pendingStatusChanges).map(([candidateId, status]) => {
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

  const updateCandidateStatus = (candidateId: string, status: CandidateUIStatus) => {
    setCandidates(prev => 
      prev.map(candidate => 
        candidate.id === candidateId 
          ? { ...candidate, status }
          : candidate
      )
    )
  }

  const handleCreateJob = useCallback(() => {
    // Check for unsaved changes before creating new job
    if (navigationCheckRef.current && onCreateJob) {
      navigationCheckRef.current(() => {
        onCreateJob()
      })
    } else if (onCreateJob) {
      onCreateJob()
    }
  }, [onCreateJob])

  const handleSettings = () => {
    // Check for unsaved changes before going to settings
    if (navigationCheckRef.current) {
      navigationCheckRef.current(() => {
        // TODO: Implement settings functionality
        console.log('Settings clicked for job:', selectedJob?.id)
      })
    } else {
      // TODO: Implement settings functionality
      console.log('Settings clicked for job:', selectedJob?.id)
    }
  }

  const handleAddCandidates = () => {
    // TODO: Implement add candidates functionality
    console.log('Add candidates clicked for job:', selectedJob?.id)
  }

  const handleGoToRounds = () => {
    setCurrentView('rounds')
  }

  const handleBackToCandidates = () => {
    setCurrentView('candidates')
    setSelectedCandidate(null) // Clear selected candidate
    // Clear round index when going back to candidates
    try {
      localStorage.removeItem(CURRENT_ROUND_INDEX_KEY)
    } catch (error) {
      console.warn('Failed to clear round index:', error)
    }
  }

  const handleCandidateClick = (candidate: CandidateDisplay) => {
    setSelectedCandidate(candidate)
    setCurrentView('candidate-details')
  }

  const handleBackToCandidatesFromDetails = () => {
    setSelectedCandidate(null)
    setCurrentView('candidates')
  }

  const handleCreateAllViews = useCallback(() => {
    // Check for unsaved changes before switching to creation page
    if (navigationCheckRef.current) {
      navigationCheckRef.current(() => {
        setAppMode('all-views-creation')
        setSelectedJob(null) // Clear single job selection
      })
    } else {
      setAppMode('all-views-creation')
      setSelectedJob(null) // Clear single job selection
    }
  }, [])

  const handleAllViewsCreated = (viewTitle: string, jobs: JobOpeningListItem[]) => {
    setAllViewsTitle(viewTitle)
    setSelectedJobsForAllViews(jobs)
    setAppMode('all-views') // Go directly to rounds view (no toggle needed)

    // Trigger sidebar refresh to show the newly created view
    setRefreshViewsTrigger(prev => prev + 1)
  }

  const handleBackFromAllViewsCreation = () => {
    setSelectedViewId(null)
    setAppMode('single-job')
    setIsLoadingViewJobs(false)
  }

  const handleSelectSavedView = useCallback(async (view: any) => {
    try {
      // Clear selected job when selecting a view and switch to all-views mode immediately
      setSelectedJob(null);
      setAppMode('all-views');
      setIsLoadingViewJobs(true);
      
      // Set view title and ID immediately for better UX
      setSelectedViewId(view.id);
      setAllViewsTitle(view.title);
      setSelectedJobsForAllViews([]); // Clear jobs initially to show loading state

      // Use the helper method to get jobs for this view
      const { AllViewsApi } = await import('@/lib/api/all-views');

      if (view.job_opening_ids && view.job_opening_ids.length > 0) {
        // Use the helper method to fetch job details
        const jobs = await AllViewsApi.getJobsForView(view.job_opening_ids, view.created_by);

        // Set the jobs data
        setSelectedJobsForAllViews(jobs);
        setIsLoadingViewJobs(false);
      } else {
        // Handle case where view has no jobs
        setSelectedJobsForAllViews([]);
        setIsLoadingViewJobs(false);
      }
    } catch (error) {
      console.error('Failed to load saved view:', error);
      setIsLoadingViewJobs(false);
      // Show error to user - you might want to add a toast notification here
    }
  }, [])


  return (
    <div className="flex h-screen bg-white" style={{ gap: 0 }}>
      <AppSidebar
        onCreateJob={handleCreateJob}
        onJobSelect={handleJobSelect}
        selectedJobId={selectedJob?.id || null}
        selectedViewId={selectedViewId}
        mode="listing"
        onJobsLoaded={handleJobsLoaded}
        onCreateAllViews={handleCreateAllViews}
        onSelectSavedView={handleSelectSavedView}
        appMode={appMode}
        refreshViewsTrigger={refreshViewsTrigger}
        onSettingsClick={onSettingsClick}
      />
      {appMode === 'all-views-creation' ? (
        <AllViewsCreationPage
          onBack={handleBackFromAllViewsCreation}
          onViewCreated={handleAllViewsCreated}
        />
      ) : appMode === 'all-views' ? (
        <AllViewsCombinedView
          selectedJobs={selectedJobsForAllViews}
          onNavigationCheck={handleNavigationCheck}
          isLoadingJobs={isLoadingViewJobs}
          viewTitle={allViewsTitle}
          viewId={selectedViewId || undefined}
        />
      ) : (
        // Single job mode (existing functionality)
        currentView === 'candidates' ? (
          <JobDetailsView
            job={selectedJob}
            candidates={candidates}
            candidatesCount={candidatesCount}
            isLoadingCandidates={isLoadingCandidates}
            onStatusChange={handleStatusChange}
            hasUnsavedChanges={hasUnsavedChanges}
            pendingStatusChanges={pendingStatusChanges}
            onRefreshCandidates={(forceRefresh = false) => {
              if (selectedJob?.id) {
                fetchCandidates(selectedJob.id, undefined, forceRefresh)
              }
            }}
            onSavePendingChanges={savePendingChanges}
            onUpdateCandidateStatus={updateCandidateStatus}
            onSettings={handleSettings}
            onAddCandidates={handleAddCandidates}
            onNavigationCheck={handleNavigationCheck}
            onGoToRounds={handleGoToRounds}
            onCandidateClick={handleCandidateClick}
            isLoadingJobs={isLoadingJobs}
          />
        ) : currentView === 'candidate-details' && selectedCandidate ? (
          <CandidateDetailsView
            candidate={selectedCandidate}
            onBack={handleBackToCandidatesFromDetails}
            onJobSelect={handleJobSelectById}
            currentJobId={selectedJob?.id}
          />
        ) : (
          <RoundDetailsView
            job={selectedJob}
            onBackToCandidates={handleBackToCandidates}
          />
        )
      )}
    </div>
  )
}