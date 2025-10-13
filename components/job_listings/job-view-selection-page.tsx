"use client"

import { useState, useEffect } from "react"
import { ChevronRight, Plus } from "lucide-react"
import { JobOpeningsApi } from "@/lib/api/job-openings"
import type { JobOpeningListItem } from "@/lib/job-types"
import { useAuth } from "@/contexts/auth-context"
import type { AllView } from "@/lib/api/all-views"

interface SavedView extends AllView {
  job_openings: Array<{
    id: string
    posting_title: string
  }>
}

interface JobViewSelectionPageProps {
  onJobSelect: (job: JobOpeningListItem) => void
  onViewSelect: (view: SavedView) => void
  onSkip: () => void
  onCreateJob: () => void
  onCreateView: () => void
}

export function JobViewSelectionPage({
  onJobSelect,
  onViewSelect,
  onSkip,
  onCreateJob,
  onCreateView
}: JobViewSelectionPageProps) {
  const { apiUser } = useAuth()
  const [jobs, setJobs] = useState<JobOpeningListItem[]>([])
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingViews, setLoadingViews] = useState(true)
  const [selectedType, setSelectedType] = useState<'job' | 'view' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      if (!apiUser?.id) return

      setLoadingJobs(true)
      try {
        const response = await JobOpeningsApi.getJobOpenings(apiUser.id)
        // Sort by published_at desc (most recent first), then by updated_at desc
        const sortedJobs = response.job_openings.sort((a, b) => {
          const aDate = a.published_at || a.updated_at
          const bDate = b.published_at || b.updated_at
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        })
        setJobs(sortedJobs)
      } catch (error) {
        console.error("Failed to fetch jobs:", error)
        setJobs([])
      } finally {
        setLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [apiUser?.id])

  // Fetch saved views
  useEffect(() => {
    const fetchSavedViews = async () => {
      if (!apiUser?.id) return

      setLoadingViews(true)
      try {
        const { AllViewsApi } = await import('@/lib/api/all-views')

        // Check if user is admin to decide which endpoint to use
        const isAdmin = apiUser.role === 'admin'

        const response = isAdmin
          ? await AllViewsApi.getAllViews() // Admin sees all views
          : await AllViewsApi.getAllViewsForUser(apiUser.id) // Regular user sees only their views

        // Convert AllView[] to SavedView[] by adding empty job_openings array
        const viewsWithJobOpenings = response.all_views.map(view => ({
          ...view,
          job_openings: [] // Will be populated later if needed
        }))

        setSavedViews(viewsWithJobOpenings)
      } catch (error) {
        console.error('Failed to fetch saved views:', error)
        setSavedViews([])
      } finally {
        setLoadingViews(false)
      }
    }

    fetchSavedViews()
  }, [apiUser?.id, apiUser?.role])

  const handleJobClick = (job: JobOpeningListItem) => {
    setSelectedType('job')
    setSelectedId(job.id)
    onJobSelect(job)
  }

  const handleViewClick = (view: SavedView) => {
    setSelectedType('view')
    setSelectedId(view.id)
    onViewSelect(view)
  }

  const handleSkip = () => {
    // If nothing is selected, select the first available item
    if (!selectedType) {
      if (jobs.length > 0) {
        onJobSelect(jobs[0])
      } else if (savedViews.length > 0) {
        onViewSelect(savedViews[0])
      }
    }
    onSkip()
  }

  const isLoading = loadingJobs || loadingViews

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl">
          {/* Title - Always visible */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-orange-500 mb-3" style={{ fontFamily }}>
              Welcome to Sparrow ATS
            </h1>
            <p className="text-lg text-gray-600" style={{ fontFamily }}>
              Choose what you'd like to view first
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-8">
              {/* Job Roles Column Skeleton */}
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-700 mb-6" style={{ fontFamily }}>
                  Job Roles
                </h2>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`job-skeleton-${index}`}
                      className="w-full p-4 rounded-lg bg-gray-50 animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-5 h-5 bg-gray-200 rounded ml-3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Job Views Column Skeleton */}
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-700 mb-6" style={{ fontFamily }}>
                  Job Views
                </h2>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`view-skeleton-${index}`}
                      className="w-full p-4 rounded-lg bg-gray-50 animate-pulse"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="h-5 bg-gray-200 rounded mb-2 w-2/3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="w-5 h-5 bg-gray-200 rounded ml-3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {/* Job Roles Column */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-700" style={{ fontFamily }}>
                    Job Roles
                  </h2>
                  <button
                    onClick={onCreateJob}
                    className="flex items-center justify-center w-10 h-10 bg-orange-50 hover:bg-orange-100 rounded-full border border-orange-200 transition-colors"
                    style={{ fontFamily }}
                  >
                    <Plus className="w-5 h-5 text-orange-600" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {loadingJobs ? (
                    // Skeleton loading for job roles
                    Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={`job-skeleton-${index}`}
                        className="w-full p-4 rounded-lg bg-gray-50 animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-5 bg-gray-200 rounded mb-2 w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="w-5 h-5 bg-gray-200 rounded ml-3"></div>
                        </div>
                      </div>
                    ))
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400" style={{ fontFamily }}>
                        No job roles available
                      </p>
                    </div>
                  ) : (
                    jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => handleJobClick(job)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg transition-all hover:bg-gray-100 ${
                          selectedType === 'job' && selectedId === job.id
                            ? 'bg-orange-50 shadow-sm'
                            : 'bg-gray-50'
                        }`}
                        style={{ fontFamily }}
                      >
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-800 text-base mb-1">
                            {job.posting_title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.job_status.charAt(0).toUpperCase() + job.job_status.slice(1)} • {job.employment_type.replace('_', ' ')}
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 flex-shrink-0 ml-3 ${
                          selectedType === 'job' && selectedId === job.id ? 'text-orange-600' : 'text-gray-400'
                        }`} />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Job Views Column */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-700" style={{ fontFamily }}>
                    Job Views
                  </h2>
                  <button
                    onClick={onCreateView}
                    className="flex items-center justify-center w-10 h-10 bg-orange-50 hover:bg-orange-100 rounded-full border border-orange-200 transition-colors"
                    style={{ fontFamily }}
                  >
                    <Plus className="w-5 h-5 text-orange-600" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {loadingViews ? (
                    // Skeleton loading for job views
                    Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`view-skeleton-${index}`}
                        className="w-full p-4 rounded-lg bg-gray-50 animate-pulse"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="h-5 bg-gray-200 rounded mb-2 w-2/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          </div>
                          <div className="w-5 h-5 bg-gray-200 rounded ml-3"></div>
                        </div>
                      </div>
                    ))
                  ) : savedViews.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400" style={{ fontFamily }}>
                        No saved views available
                      </p>
                    </div>
                  ) : (
                    savedViews.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => handleViewClick(view)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg transition-all hover:bg-gray-100 ${
                          selectedType === 'view' && selectedId === view.id
                            ? 'bg-orange-50 shadow-sm'
                            : 'bg-gray-50'
                        }`}
                        style={{ fontFamily }}
                      >
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-800 text-base mb-1">
                            {view.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {view.job_opening_ids?.length || 0} job{view.job_opening_ids?.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 flex-shrink-0 ml-3 ${
                          selectedType === 'view' && selectedId === view.id ? 'text-orange-600' : 'text-gray-400'
                        }`} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end p-8">
        <button
          onClick={handleSkip}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 text-base text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontFamily }}
        >
          {selectedType ? 'Continue' : 'Skip'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

