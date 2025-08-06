"use client"

import { AlertTriangle, Save, X, FileX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
  pendingChangesCount: number
}

export function UnsavedChangesDialog({ 
  isOpen, 
  onSave, 
  onDiscard, 
  onCancel, 
  pendingChangesCount 
}: UnsavedChangesDialogProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" />
      
      {/* Dialog Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div 
          className="bg-white rounded-lg shadow-xl w-full max-w-md"
          style={{ fontFamily }}
        >
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Unsaved Changes
                </h3>
                <p className="text-sm text-gray-600">
                  {pendingChangesCount} change{pendingChangesCount !== 1 ? 's' : ''} pending
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            <p className="text-gray-700 mb-6">
              Your changes will be lost if you navigate away. Would you like to save them first?
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={onCancel}
                className="w-full sm:w-auto order-3 sm:order-1"
                style={{
                  borderColor: "#E5E7EB",
                  color: "#374151",
                  fontFamily,
                }}
              >
                Stay Here
              </Button>
              
              <Button
                variant="outline"
                onClick={onDiscard}
                className="w-full sm:w-auto order-2"
                style={{
                  borderColor: "#FCA5A5",
                  color: "#DC2626",
                  fontFamily,
                }}
              >
                Discard Changes
              </Button>
              
              <Button
                onClick={onSave}
                className="w-full sm:w-auto order-1 sm:order-3"
                style={{
                  backgroundColor: "#059669",
                  color: "#FFFFFF",
                  fontFamily,
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                Save & Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}