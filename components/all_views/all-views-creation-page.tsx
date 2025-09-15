"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Eye, Check, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { JobOpeningsApi } from "@/lib/api/job-openings"
import { useAuth } from "@/contexts/auth-context"
import type { JobOpeningListItem } from "@/lib/job-types"

interface AllViewsCreationPageProps {
  onBack: () => void
  onViewCreated: (viewTitle: string, selectedJobs: JobOpeningListItem[], viewId?: string) => void
}

export function AllViewsCreationPage({ onBack, onViewCreated }: AllViewsCreationPageProps) {
  const { apiUser } = useAuth()
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [viewTitle, setViewTitle] = useState("")
  const [jobs, setJobs] = useState<JobOpeningListItem[]>([])
  const [selectedJobs, setSelectedJobs] = useState<JobOpeningListItem[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch jobs when component mounts
  useEffect(() => {
    const fetchJobs = async () => {
      if (!apiUser?.id) return

      try {
        const response = await JobOpeningsApi.getJobOpenings(apiUser.id)
        const sortedJobs = response.job_openings.sort((a, b) => {
          const aDate = a.published_at || a.updated_at
          const bDate = b.published_at || b.updated_at
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        })
        setJobs(sortedJobs)
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setIsLoadingJobs(false)
      }
    }

    fetchJobs()
  }, [apiUser?.id])

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job =>
    job.posting_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.custom_job_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.employment_type?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleJobToggle = (job: JobOpeningListItem, checked: boolean) => {
    setSelectedJobs(prev => {
      if (checked) {
        return [...prev, job]
      } else {
        return prev.filter(j => j.id !== job.id)
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([])
    } else {
      setSelectedJobs(filteredJobs)
    }
  }

  const handleCreateView = async () => {
    if (!viewTitle.trim() || selectedJobs.length === 0 || !apiUser?.id) return

    setIsCreating(true)
    try {
      // Import the API client
      const { AllViewsApi } = await import('@/lib/api/all-views')
      
      // Create the view using the API
      const response = await AllViewsApi.createAllView({
        title: viewTitle.trim(),
        job_opening_ids: selectedJobs.map(job => job.id),
        created_by: apiUser.id
      })

      if (response.success) {
        // Call the parent callback with the created view data
        onViewCreated(response.data.title, selectedJobs, response.data.id)
      } else {
        throw new Error('Failed to create view: ' + response.message)
      }
    } catch (error) {
      console.error('Failed to create view:', error)
      // You might want to show a toast notification here
    } finally {
      setIsCreating(false)
    }
  }

  const canCreate = viewTitle.trim().length > 0 && selectedJobs.length > 0

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: "#E5E7EB" }}>
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <Eye className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#111827", fontFamily }}>
              Create All Views
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily }}>
              Create a custom view to see candidates across multiple job openings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Step 1: View Title */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                1
              </div>
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
                Name Your View
              </h2>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="viewTitle" className="text-sm font-medium text-gray-700">
                View Title
              </Label>
              <Input
                id="viewTitle"
                value={viewTitle}
                onChange={(e) => setViewTitle(e.target.value)}
                placeholder="e.g., Frontend Positions, Q4 Hiring, Senior Roles"
                className="w-full"
                style={{ fontFamily }}
              />
              <p className="text-sm text-gray-500" style={{ fontFamily }}>
                Give your view a descriptive name to easily identify it later
              </p>
            </div>
          </div>

          {/* Step 2: Job Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                viewTitle.trim() ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
                Select Job Openings
              </h2>
            </div>

            {isLoadingJobs ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-gray-600" style={{ fontFamily }}>Loading jobs...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search and Select All */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search job openings..."
                      className="w-full"
                      style={{ fontFamily }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2"
                    disabled={filteredJobs.length === 0}
                  >
                    <Check className="w-4 h-4" />
                    {selectedJobs.length === filteredJobs.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {/* Job List */}
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredJobs.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500" style={{ fontFamily }}>
                        {searchQuery ? `No jobs found matching "${searchQuery}"` : 'No job openings found'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredJobs.map((job) => {
                        const isSelected = selectedJobs.some(j => j.id === job.id)
                        return (
                          <label
                            key={job.id}
                            className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleJobToggle(job, checked as boolean)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily }}>
                                  {job.posting_title}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  job.job_status === 'active' 
                                    ? 'bg-green-100 text-green-800'
                                    : job.job_status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`} style={{ fontFamily }}>
                                  {job.job_status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-2" style={{ fontFamily }}>
                                {job.custom_job_description || 'No description available'}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span>Type: {job.employment_type?.replace('_', ' ')}</span>
                                {job.minimum_experience && (
                                  <span>Experience: {job.minimum_experience}</span>
                                )}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Selection Summary */}
                {selectedJobs.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-orange-800">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium" style={{ fontFamily }}>
                        {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedJobs.map((job) => (
                        <span
                          key={job.id}
                          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full"
                          style={{ fontFamily }}
                        >
                          {job.posting_title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500" style={{ fontFamily }}>
            {selectedJobs.length > 0 && (
              <span>{selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateView}
              disabled={!canCreate || isCreating}
              className="flex items-center gap-2"
              style={{
                backgroundColor: canCreate && !isCreating ? "#FF8D4D" : "#6B7280",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Create View
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
