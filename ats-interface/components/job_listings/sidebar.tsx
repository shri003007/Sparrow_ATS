"use client"

import { useState, useEffect } from "react"
import { Search, BarChart3, Users, Briefcase, CreditCard, Plus, ChevronDown } from "lucide-react"
import { JobOpeningsApi } from "@/lib/api/job-openings"
import type { JobOpeningListItem } from "@/lib/job-types"

interface AppSidebarProps {
  onCreateJob?: () => void
  onJobSelect?: (job: JobOpeningListItem) => void
  selectedJobId?: string | null
  mode?: 'listing' | 'creation' // New prop to handle different modes
}

export function AppSidebar({ onCreateJob, onJobSelect, selectedJobId, mode = 'listing' }: AppSidebarProps) {
  const [jobs, setJobs] = useState<JobOpeningListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllJobs, setShowAllJobs] = useState(false)

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await JobOpeningsApi.getJobOpenings()
        // Sort by published_at desc (most recent first), then by updated_at desc
        const sortedJobs = response.job_openings.sort((a, b) => {
          const aDate = a.published_at || a.updated_at
          const bDate = b.published_at || b.updated_at
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        })
        setJobs(sortedJobs)
        
        // Auto-select the first job if none is selected and we're in listing mode
        if (sortedJobs.length > 0 && !selectedJobId && mode === 'listing') {
          onJobSelect?.(sortedJobs[0])
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [selectedJobId, onJobSelect, mode])

  const navigationItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard", isActive: false },
    { icon: Briefcase, label: "All roles", href: "/roles", isActive: true, hasSubmenu: true },
    { icon: Users, label: "All candidates", href: "/candidates", isActive: false },
    { icon: BarChart3, label: "Analytics", href: "/analytics", isActive: false },
    { icon: CreditCard, label: "Billing", href: "/billing", isActive: false },
  ]

  // Show first 3 jobs by default, or all when expanded
  const displayedJobs = showAllJobs ? jobs : jobs.slice(0, 3)
  const hasMoreJobs = jobs.length > 3

  return (
    <div
      className="w-80 bg-white border-r flex flex-col h-screen"
      style={{
        borderColor: "#E5E7EB",
        backgroundColor: "#FAFAFA",
        fontFamily,
      }}
    >
      {/* Brand Header */}
      <div className="p-4 border-b" style={{ borderColor: "#F3F4F6" }}>
        <div
          className="w-full flex items-center justify-between p-3 rounded-full cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ backgroundColor: "#F3F4F6" }}
        >
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#5BA4A4" }}>
              <span className="text-white text-sm font-bold">✱</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="font-medium"
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#111827",
                  fontFamily,
                }}
              >
                Sparrow ATS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder="Search anything"
            className="w-full pl-10 pr-12 py-2.5 rounded-lg border text-sm"
            style={{
              backgroundColor: "#F3F4F6",
              borderColor: "#E5E7EB",
              color: "#111827",
              fontSize: "14px",
              fontFamily,
            }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                backgroundColor: "#E5E7EB",
                color: "#6B7280",
                fontFamily,
              }}
            >
              ⌘K
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280", fontFamily }}>
            NAVIGATE
          </h3>

          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.label}>
                <div
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    item.isActive ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" style={{ color: "#6B7280" }} />
                    <span
                      className="text-sm"
                      style={{
                        color: "#374151",
                        fontSize: "14px",
                        fontWeight: 400,
                        fontFamily,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.hasSubmenu && (
                    <Plus
                      className="w-4 h-4 cursor-pointer hover:text-gray-600 transition-colors"
                      style={{ color: "#9CA3AF" }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCreateJob?.()
                      }}
                    />
                  )}
                </div>

                {/* Job Roles Submenu */}
                {item.label === "All roles" && (
                  <div className="ml-7 mt-1 space-y-1">
                    {loading ? (
                      <div
                        className="flex items-center px-3 py-2 text-sm"
                        style={{
                          color: "#6B7280",
                          fontSize: "14px",
                          fontFamily,
                        }}
                      >
                        Loading jobs...
                      </div>
                    ) : jobs.length === 0 ? (
                      <div
                        className="flex items-center px-3 py-2 text-sm"
                        style={{
                          color: "#6B7280",
                          fontSize: "14px",
                          fontFamily,
                        }}
                      >
                        No jobs found
                      </div>
                    ) : (
                      <>
                        {displayedJobs.map((job) => (
                          <div
                            key={job.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                              selectedJobId === job.id ? "text-white" : "hover:bg-gray-50"
                            }`}
                            style={{
                              backgroundColor: selectedJobId === job.id ? "#111827" : "transparent",
                              fontSize: "14px",
                              fontFamily,
                            }}
                            onClick={() => mode === 'listing' ? onJobSelect?.(job) : undefined}
                          >
                            <div
                              className="w-2 h-2 rounded-full border"
                              style={{
                                borderColor: selectedJobId === job.id ? "#FFFFFF" : "#9CA3AF",
                              }}
                            />
                            <span className="truncate">{job.posting_title}</span>
                          </div>
                        ))}
                        {hasMoreJobs && (
                          <div
                            className="flex items-center px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 rounded-lg"
                            style={{
                              color: "#6B7280",
                              fontSize: "14px",
                              fontFamily,
                            }}
                            onClick={() => setShowAllJobs(!showAllJobs)}
                          >
                            {showAllJobs ? 'Show less' : `See all ${jobs.length} jobs`}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
}

// Alias for backward compatibility
export { AppSidebar as JobListingSidebar }