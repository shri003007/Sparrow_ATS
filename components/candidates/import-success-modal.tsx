"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImportSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  importedCount: number
  onGoToList: () => void
}

export function ImportSuccessModal({ 
  isOpen, 
  onClose, 
  importedCount, 
  onGoToList 
}: ImportSuccessModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative text-center"
        style={{ fontFamily }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h2
          className="text-xl font-semibold mb-3"
          style={{ color: "#111827", fontFamily }}
        >
          That's a wrap! 🎉
        </h2>
        <p
          className="text-gray-600 mb-2"
          style={{ fontSize: "14px", fontFamily }}
        >
          Your CSV file has been imported successfully.
        </p>
        <p
          className="text-gray-600 mb-6"
          style={{ fontSize: "14px", fontFamily }}
        >
          You will see {importedCount} candidate{importedCount !== 1 ? 's' : ''} being added and updated immediately.
        </p>

        {/* Action Button */}
        <Button
          onClick={onGoToList}
          style={{
            backgroundColor: "#4F46E5",
            color: "#FFFFFF",
            fontFamily,
            width: "100%",
          }}
        >
          Go to list
        </Button>
      </div>
    </div>
  )
}