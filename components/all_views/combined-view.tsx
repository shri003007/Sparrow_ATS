"use client"

import { Users, Eye, ArrowLeft } from "lucide-react"
import { UnifiedRoundsView } from "./unified-rounds-view"
import type { JobOpeningListItem } from "@/lib/job-types"

interface AllViewsCombinedViewProps {
  selectedJobs: JobOpeningListItem[]
  onNavigationCheck?: (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => void
  isLoadingJobs?: boolean
  viewTitle?: string
}

export function AllViewsCombinedView({ 
  selectedJobs, 
  onNavigationCheck,
  isLoadingJobs = false,
  viewTitle
}: AllViewsCombinedViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (selectedJobs.length === 0) {
    if (isLoadingJobs) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-gray-500" style={{ fontFamily }}>Loading jobs...</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Views</h3>
          <p className="text-gray-500">Select "All views" from the sidebar and choose jobs to view candidates across multiple positions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Content - Always show rounds view */}
      <div className="flex-1 overflow-hidden">
        <UnifiedRoundsView
          selectedJobs={selectedJobs}
          onNavigationCheck={onNavigationCheck}
        />
      </div>
    </div>
  )
}
