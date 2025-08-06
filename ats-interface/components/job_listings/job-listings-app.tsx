"use client"

import { useState, useRef } from "react"
import { AppSidebar } from "./sidebar"
import { JobDetailsView } from "./job-details-view"
import type { JobOpeningListItem } from "@/lib/job-types"

interface JobListingsAppProps {
  onCreateJob?: () => void
}

export function JobListingsApp({ onCreateJob }: JobListingsAppProps) {
  const [selectedJob, setSelectedJob] = useState<JobOpeningListItem | null>(null)
  const navigationCheckRef = useRef<((callback: () => void) => void) | null>(null)

  const handleJobSelect = (job: JobOpeningListItem) => {
    // Check for unsaved changes before switching jobs
    if (navigationCheckRef.current) {
      navigationCheckRef.current(() => {
        setSelectedJob(job)
      })
    } else {
      setSelectedJob(job)
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

  return (
    <div className="flex h-screen bg-white">
      <AppSidebar
        onCreateJob={handleCreateJob}
        onJobSelect={handleJobSelect}
        selectedJobId={selectedJob?.id || null}
        mode="listing"
      />
      <JobDetailsView
        job={selectedJob}
        onSettings={handleSettings}
        onAddCandidates={handleAddCandidates}
        onNavigationCheck={handleNavigationCheck}
      />
    </div>
  )
}