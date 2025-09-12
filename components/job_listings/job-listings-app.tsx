"use client"

import { useState, useRef, useEffect } from "react"
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
      }

      if (savedView && (savedView === 'candidates' || savedView === 'rounds')) {
        setCurrentView(savedView)
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

  const handleJobSelect = (job: JobOpeningListItem) => {
    // Check for unsaved changes before switching jobs
    if (navigationCheckRef.current) {
      navigationCheckRef.current(() => {
        setAppMode('single-job')
        setSelectedJob(job)
        // Set view based on has_rounds_started flag
        setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
      })
    } else {
      setAppMode('single-job')
      setSelectedJob(job)
      // Set view based on has_rounds_started flag
      setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
    }
  }

  const handleJobsLoaded = (jobs: JobOpeningListItem[]) => {
    setIsLoadingJobs(false)
    setJobsList(jobs)

    // Check if the saved job is still in the list
    if (selectedJob) {
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
        if (savedJob) {
          const jobData = JSON.parse(savedJob)
          const jobStillExists = jobs.some(job => job.id === jobData.id)
          if (jobStillExists) {
            setSelectedJob(jobData)
            setCurrentView(jobData.has_rounds_started ? 'rounds' : 'candidates')
          }
        }
      } catch (error) {
        console.warn('Failed to restore saved job:', error)
      }
    }
  }

  const handleNavigationCheck = (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => {
    navigationCheckRef.current = hasUnsavedChanges ? checkFunction : null
  }

  const handleCreateJob = () => {
    // Check for unsaved changes before creating new job
    if (navigationCheckRef.current && onCreateJob) {
      navigationCheckRef.current(() => {
        onCreateJob()
      })
    } else if (onCreateJob) {
      onCreateJob()
    }
  }

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

  const handleCreateAllViews = () => {
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
  }

  const handleAllViewsCreated = (viewTitle: string, jobs: JobOpeningListItem[]) => {
    setAllViewsTitle(viewTitle)
    setSelectedJobsForAllViews(jobs)
    setAppMode('all-views') // Go directly to rounds view (no toggle needed)
  }

  const handleBackFromAllViewsCreation = () => {
    setAppMode('single-job')
  }


  return (
    <div className="flex h-screen bg-white" style={{ gap: 0 }}>
      <AppSidebar
        onCreateJob={handleCreateJob}
        onJobSelect={handleJobSelect}
        selectedJobId={selectedJob?.id || null}
        mode="listing"
        onJobsLoaded={handleJobsLoaded}
        onCreateAllViews={handleCreateAllViews}
        appMode={appMode}
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
          isLoadingJobs={isLoadingJobs}
          viewTitle={allViewsTitle}
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