"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AppSidebar } from "./sidebar"
import { JobDetailsView } from "./job-details-view"
import { RoundDetailsView } from "./round-details-view"
import { AllViewsCombinedView } from "../all_views/combined-view"
import { AllViewsCreationPage } from "../all_views/all-views-creation-page"
import type { JobOpeningListItem } from "@/lib/job-types"

interface JobListingsAppProps {
  onCreateJob?: () => void
}

type JobView = 'candidates' | 'rounds'
type AppMode = 'single-job' | 'all-views' | 'all-views-creation'

export function JobListingsApp({ onCreateJob }: JobListingsAppProps) {
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
  const navigationCheckRef = useRef<((callback: () => void) => void) | null>(null)

  // Constants for localStorage keys
  const SELECTED_JOB_KEY = 'ats_selected_job'
  const CURRENT_VIEW_KEY = 'ats_current_view'

  // Load selected job and view from localStorage on mount
  useEffect(() => {
    try {
      const savedJob = localStorage.getItem(SELECTED_JOB_KEY)
      const savedView = localStorage.getItem(CURRENT_VIEW_KEY)

      if (savedJob) {
        const jobData = JSON.parse(savedJob)
        setSelectedJob(jobData)

        // Always restore the view if we have a saved job
        if (savedView && (savedView === 'candidates' || savedView === 'rounds')) {
          setCurrentView(savedView)
        } else {
          // Default to candidates if no saved view
          setCurrentView('candidates')
        }
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
        setSelectedJob(job)
        // Only set view if we're actually switching jobs (not restoring)
        // If we already have this job selected, preserve the current view
        if (selectedJob?.id !== job.id) {
          setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
        }
      })
    } else {
      setAppMode('single-job')
      setSelectedViewId(null) // Clear selected view when selecting a job
      setIsLoadingViewJobs(false) // Clear view loading state
      setSelectedJob(job)
      // Only set view if we're actually switching jobs (not restoring)
      // If we already have this job selected, preserve the current view
      if (selectedJob?.id !== job.id) {
        setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
      }
    }
  }, [])

  const handleJobsLoaded = useCallback((jobs: JobOpeningListItem[]) => {
    setIsLoadingJobs(false)
    setJobsList(jobs || [])

    // Check if the saved job is still in the list
    if (selectedJob && jobs && Array.isArray(jobs)) {
      const jobStillExists = jobs.some(job => job.id === selectedJob.id)
      if (!jobStillExists) {
        // Saved job no longer exists, clear it
        setSelectedJob(null)
        localStorage.removeItem(SELECTED_JOB_KEY)
        console.warn('Previously selected job no longer exists, clearing selection')
      }
    } else {
      // If no job is selected but we have jobs, try to restore from localStorage

      try {
        const savedJob = localStorage.getItem(SELECTED_JOB_KEY)
        const savedView = localStorage.getItem(CURRENT_VIEW_KEY)

        if (savedJob && jobs && Array.isArray(jobs)) {
          const jobData = JSON.parse(savedJob)
          const jobStillExists = jobs.some(job => job.id === jobData.id)
          if (jobStillExists) {
            setSelectedJob(jobData)

            // Use saved view if available, otherwise use job's rounds status
            if (savedView && (savedView === 'candidates' || savedView === 'rounds')) {
              setCurrentView(savedView)
            } else {

              setCurrentView(jobData.has_rounds_started ? 'rounds' : 'candidates')
            }
          }
        } catch (error) {
          console.warn('Failed to restore saved job:', error)
        }
      }
    }
  }, [selectedJob, appMode])

  const handleNavigationCheck = (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => {
    navigationCheckRef.current = hasUnsavedChanges ? checkFunction : null
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

      // Use the helper method to get jobs for this view
      const { AllViewsApi } = await import('@/lib/api/all-views');

      if (view.job_opening_ids && view.job_opening_ids.length > 0) {
        // Use the helper method to fetch job details
        const jobs = await AllViewsApi.getJobsForView(view.job_opening_ids, view.created_by);

        // Set the view data
        setSelectedViewId(view.id);
        setAllViewsTitle(view.title);
        setSelectedJobsForAllViews(jobs);
        setIsLoadingViewJobs(false);
      } else {
        // Handle case where view has no jobs
        setSelectedViewId(view.id);
        setAllViewsTitle(view.title);
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
            onSettings={handleSettings}
            onAddCandidates={handleAddCandidates}
            onNavigationCheck={handleNavigationCheck}
            onGoToRounds={handleGoToRounds}
            isLoadingJobs={isLoadingJobs}
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