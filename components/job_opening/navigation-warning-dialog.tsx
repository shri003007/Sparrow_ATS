"use client"

import { X, AlertTriangle, Loader2 } from "lucide-react"

interface NavigationWarningDialogProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  isDeleting?: boolean
  hasJobToDelete?: boolean
  isReloadAttempt?: boolean
}

export function NavigationWarningDialog({ 
  isOpen, 
  onCancel, 
  onConfirm, 
  isDeleting = false,
  hasJobToDelete = false,
  isReloadAttempt = false
}: NavigationWarningDialogProps) {
  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#FEF3C7" }}
            >
              <AlertTriangle className="w-6 h-6" style={{ color: "#F59E0B" }} />
            </div>
            <div>
              <h2
                className="text-xl font-semibold"
                style={{
                  color: "#111827",
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                Unsaved Changes
              </h2>
              <p
                className="text-sm mt-1"
                style={{
                  color: "#6B7280",
                  fontSize: "14px",
                }}
              >
                You have unsaved progress
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            disabled={isDeleting}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" style={{ color: "#6B7280" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "#FEF2F2",
              borderColor: "#FECACA",
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ backgroundColor: "#DC2626" }}
              >
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <h5
                  className="font-medium mb-2"
                  style={{
                    color: "#991B1B",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {hasJobToDelete ? "Warning: Your job opening will be deleted" : "Warning: You will lose your progress"}
                </h5>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "#991B1B",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}
                >
                  {hasJobToDelete 
                    ? `If you ${isReloadAttempt ? 'reload' : 'leave'} this page now, your job opening will be permanently deleted and you'll lose all your progress. This action cannot be undone.`
                    : `If you ${isReloadAttempt ? 'reload' : 'leave'} this page now, you'll lose all the information you've entered. You'll need to start over if you want to create this job opening.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{
            borderColor: "#E5E7EB",
            backgroundColor: "#F9FAFB",
          }}
        >
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: "#E5E7EB",
              color: "#374151",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Stay on Page
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isDeleting ? "#9CA3AF" : "#DC2626",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {hasJobToDelete ? "Deleting..." : "Leaving..."}
              </>
            ) : (
              hasJobToDelete 
                ? (isReloadAttempt ? "Delete & Reload" : "Delete & Leave")
                : (isReloadAttempt ? "Reload Page" : "Leave Page")
            )}
          </button>
        </div>
      </div>
    </div>
  )
}