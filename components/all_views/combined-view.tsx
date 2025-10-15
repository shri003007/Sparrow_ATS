"use client"

import { useState } from "react"
import { Users, Eye, ArrowLeft, Target, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UnifiedRoundsView } from "./unified-rounds-view"
import { AllViewsCandidatesTable } from "./all-views-candidates-table"
import { AllViewsApi } from "@/lib/api/all-views"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { JobOpeningListItem } from "@/lib/job-types"
import type { CandidateUIStatus } from "@/lib/candidate-types"

type ViewMode = 'candidates' | 'rounds'

interface AllViewsCombinedViewProps {
  selectedJobs: JobOpeningListItem[]
  onNavigationCheck?: (hasUnsavedChanges: boolean, checkFunction: (callback: () => void) => void) => void
  isLoadingJobs?: boolean
  viewTitle?: string
  viewId?: string
  onBack?: () => void
}

export function AllViewsCombinedView({ 
  selectedJobs, 
  onNavigationCheck,
  isLoadingJobs = false,
  viewTitle,
  viewId,
  onBack
}: AllViewsCombinedViewProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const [currentView, setCurrentView] = useState<ViewMode>('candidates')
  const { toast } = useToast()
  const { apiUser } = useAuth()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if user is admin
  const isAdmin = apiUser?.role === 'admin'

  const handleStatusChange = (candidateId: string, newStatus: CandidateUIStatus) => {
    // TODO: Implement status change API call
    console.log('Status change:', candidateId, newStatus)
  }

  const handleViewRounds = () => {
    setCurrentView('rounds')
  }

  const handleBackToCandidates = () => {
    setCurrentView('candidates')
  }

  const handleDeleteView = () => {
    if (!viewId) {
      toast({
        title: "Error",
        description: "View ID not found. Cannot delete view.",
        variant: "destructive"
      })
      return
    }
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!viewId) return

    setIsDeleting(true)

    try {
      console.log('🗑️ [DELETE] Deleting view:', viewId)
      const response = await AllViewsApi.deleteAllView(viewId)

      if (response.success) {
        console.log('✅ [DELETE] View deleted successfully:', viewId)
        toast({
          title: "Success",
          description: "View deleted successfully"
        })

        setShowDeleteDialog(false)

        // Navigate back to the views listing or main app
        if (onBack) {
          onBack()
        }
      } else {
        throw new Error(response.message || 'Failed to delete view')
      }
    } catch (error: any) {
      console.error('❌ [DELETE] Failed to delete view:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete view. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Show loading state immediately when switching views or loading jobs
  if (isLoadingJobs || selectedJobs.length === 0) {
    if (isLoadingJobs) {
      return (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
              {viewTitle ? `Loading ${viewTitle}...` : 'Loading view...'}
            </h3>
            <p className="text-gray-500" style={{ fontFamily }}>
              Fetching jobs and preparing view
            </p>
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
      {currentView === 'candidates' ? (
        <>
          {/* Header for Candidates View */}
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily }}>
                    {viewTitle || 'All Views'} 
                  </h1>
                  <p className="text-sm text-gray-500" style={{ fontFamily }}>
                    {selectedJobs.length} job{selectedJobs.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {viewId && isAdmin && (
                  <Button
                    onClick={handleDeleteView}
                    variant="outline"
                    className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                    style={{ fontFamily }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete View
                  </Button>
                )}
                <Button
                  onClick={handleViewRounds}
                  className="flex items-center gap-2"
                  style={{
                    backgroundColor: "#10B981",
                    color: "#FFFFFF",
                    fontFamily
                  }}
                >
                  <Target className="w-4 h-4" />
                  View Rounds
                </Button>
              </div>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="flex-1 overflow-hidden p-6">
            <AllViewsCandidatesTable
              selectedJobs={selectedJobs}
              onStatusChange={handleStatusChange}
              hasRoundsStarted={true} // TODO: Determine this based on actual round status
              viewId={viewId}
              forceRefresh={false}
            />
          </div>
        </>
      ) : (
        /* Rounds View */
        <div className="flex-1 overflow-hidden">
          <UnifiedRoundsView
            selectedJobs={selectedJobs}
            onNavigationCheck={onNavigationCheck}
            viewId={viewId}
            onBackToCandidates={handleBackToCandidates}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={isDeleting ? undefined : setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle style={{ fontFamily }}>Delete View</DialogTitle>
            <DialogDescription style={{ fontFamily }}>
              Are you sure you want to delete the view "{viewTitle}"? This action cannot be undone and will permanently remove the view and all its associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              style={{ fontFamily }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              style={{ fontFamily }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete View"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
