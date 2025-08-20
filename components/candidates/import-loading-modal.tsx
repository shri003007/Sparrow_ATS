"use client"

import { X } from "lucide-react"

interface ImportLoadingModalProps {
  isOpen: boolean
  onClose: () => void
  step: 'processing' | 'matching' | 'importing'
}

export function ImportLoadingModal({ isOpen, onClose, step }: ImportLoadingModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  const getContent = () => {
    switch (step) {
      case 'processing':
        return {
          title: "Processing CSV",
          description: "Please wait while we process your CSV file...",
          icon: (
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          )
        }
      case 'matching':
        return {
          title: "Matching records...",
          description: "Depending on the size of your spreadsheet, this might take a second.",
          icon: (
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          )
        }
      case 'importing':
        return {
          title: "Importing your data",
          description: "Depending on the size of your spreadsheet, this might take a second.",
          icon: (
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          )
        }
      default:
        return {
          title: "Processing...",
          description: "Please wait...",
          icon: (
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          )
        }
    }
  }

  const content = getContent()

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

        {/* Loading Icon */}
        <div className="mb-6">
          {content.icon}
        </div>

        {/* Content */}
        <h2
          className="text-xl font-semibold mb-3"
          style={{ color: "#111827", fontFamily }}
        >
          {content.title}
        </h2>
        <p
          className="text-gray-600"
          style={{ fontSize: "14px", fontFamily }}
        >
          {content.description}
        </p>
      </div>
    </div>
  )
}