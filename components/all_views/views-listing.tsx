"use client"

import { useState, useEffect } from "react"
import type { JobOpeningListItem } from "@/lib/job-types"
import { AllViewsCombinedView } from "./combined-view"
import { AllViewsCreationPage } from "./all-views-creation-page"
import { AllViewsApi, type AllView } from "@/lib/api/all-views"
import { useAuth } from "@/contexts/auth-context"

type ViewsAppMode = 'creation' | 'viewing'

interface ViewsListingProps {
  onBack: () => void
}

export function ViewsListing({ onBack }: ViewsListingProps) {
  const { apiUser } = useAuth()
  const [appMode, setAppMode] = useState<ViewsAppMode>('creation')
  const [selectedView, setSelectedView] = useState<AllView | null>(null)
  const [selectedJobs, setSelectedJobs] = useState<JobOpeningListItem[]>([])
  const [viewTitle, setViewTitle] = useState("")

  const handleViewCreated = async (title: string, jobs: JobOpeningListItem[], viewId?: string) => {
    setViewTitle(title)
    setSelectedJobs(jobs)
    
    // If we have a viewId, we could store it for future operations
    if (viewId) {
      // Find the created view data
      const viewData: AllView = {
        id: viewId,
        title,
        created_by: apiUser?.id || '',
        created_at: new Date().toISOString(),
        job_opening_ids: jobs.map(job => job.id)
      }
      setSelectedView(viewData)
    }
    
    setAppMode('viewing')
  }

  const handleBackFromCreation = () => {
    onBack()
  }

  const handleBackFromViewing = () => {
    setAppMode('creation')
    setSelectedView(null)
    setSelectedJobs([])
    setViewTitle("")
  }

  const handleLoadExistingView = async (view: AllView) => {
    try {
      if (!apiUser?.id) return

      // Get jobs for this view using the helper function
      const jobs = await AllViewsApi.getJobsForView(view.job_opening_ids, apiUser.id)
      
      setSelectedView(view)
      setSelectedJobs(jobs)
      setViewTitle(view.title)
      setAppMode('viewing')
    } catch (error) {
      console.error('Failed to load view:', error)
    }
  }

  if (appMode === 'creation') {
    return (
      <AllViewsCreationPage
        onBack={handleBackFromCreation}
        onViewCreated={handleViewCreated}
      />
    )
  }

  return (
    <AllViewsCombinedView
      selectedJobs={selectedJobs}
      onNavigationCheck={() => {}} // TODO: Implement navigation check if needed
      isLoadingJobs={false}
      viewTitle={viewTitle}
      onBack={handleBackFromViewing}
    />
  )
}
