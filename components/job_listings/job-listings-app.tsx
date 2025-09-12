"use client"

import { useState, useRef } from "react"
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
  const [appMode, setAppMode] = useState<AppMode>('single-job')
  const [selectedJobsForAllViews, setSelectedJobsForAllViews] = useState<JobOpeningListItem[]>([])
  const [allViewsTitle, setAllViewsTitle] = useState<string>('')
  const navigationCheckRef = useRef<((callback: () => void) => void) | null>(null)

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

  const handleJobsLoaded = () => {
    setIsLoadingJobs(false)
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