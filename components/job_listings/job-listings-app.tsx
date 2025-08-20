"use client"

import { useState, useRef } from "react"
import { AppSidebar } from "./sidebar"
import { JobDetailsView } from "./job-details-view"
import { RoundDetailsView } from "./round-details-view"
import type { JobOpeningListItem } from "@/lib/job-types"

interface JobListingsAppProps {
  onCreateJob?: () => void
}

type JobView = 'candidates' | 'rounds'

export function JobListingsApp({ onCreateJob }: JobListingsAppProps) {
  const [selectedJob, setSelectedJob] = useState<JobOpeningListItem | null>(null)
  const [currentView, setCurrentView] = useState<JobView>('candidates')
  const navigationCheckRef = useRef<((callback: () => void) => void) | null>(null)

  const handleJobSelect = (job: JobOpeningListItem) => {
    // Check for unsaved changes before switching jobs
    if (navigationCheckRef.current) {
      navigationCheckRef.current(() => {
        setSelectedJob(job)
        // Set view based on has_rounds_started flag
        setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
      })
    } else {
      setSelectedJob(job)
      // Set view based on has_rounds_started flag
      setCurrentView(job.has_rounds_started ? 'rounds' : 'candidates')
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

  return (
    <div className="flex h-screen bg-white">
      <AppSidebar
        onCreateJob={handleCreateJob}
        onJobSelect={handleJobSelect}
        selectedJobId={selectedJob?.id || null}
        mode="listing"
      />
      {currentView === 'candidates' ? (
        <JobDetailsView
          job={selectedJob}
          onSettings={handleSettings}
          onAddCandidates={handleAddCandidates}
          onNavigationCheck={handleNavigationCheck}
          onGoToRounds={handleGoToRounds}
        />
      ) : (
        <RoundDetailsView
          job={selectedJob}
          onBackToCandidates={handleBackToCandidates}
        />
      )}
    </div>
  )
}