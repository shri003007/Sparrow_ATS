"use client"

import { X, Settings, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CustomFieldsConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onContinueWithoutCustomFields: () => void
  onSetupCustomFields: () => void
}

export function CustomFieldsConfirmationModal({ 
  isOpen, 
  onClose, 
  onContinueWithoutCustomFields,
  onSetupCustomFields
}: CustomFieldsConfirmationModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative"
        style={{ fontFamily }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-blue-600" />
          </div>
          <h2
            className="text-2xl font-semibold mb-2"
            style={{ color: "#111827", fontFamily }}
          >
            Custom Fields Setup
          </h2>
          <p
            className="text-gray-600"
            style={{ fontSize: "16px", fontFamily }}
          >
            Would you like to set up custom fields for candidate data collection for this job?
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-8 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Job-specific fields</p>
              <p className="text-xs text-gray-600">Add fields relevant to this specific role</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Better data collection</p>
              <p className="text-xs text-gray-600">Collect exactly the information you need</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Flexible field types</p>
              <p className="text-xs text-gray-600">Text, numbers, dropdowns, dates, and more</p>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Setup Custom Fields */}
          <button
            onClick={onSetupCustomFields}
            className="w-full p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-300 hover:bg-blue-100 transition-all text-center group"
          >
            <div className="flex items-center justify-center space-x-3">
              <Settings className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <h3
                  className="text-sm font-medium text-blue-900"
                  style={{ fontFamily }}
                >
                  Set Up Custom Fields
                </h3>
                <p
                  className="text-xs text-blue-700"
                  style={{ fontFamily }}
                >
                  Define custom fields for this job (Recommended)
                </p>
              </div>
            </div>
          </button>

          {/* Continue Without Custom Fields */}
          <button
            onClick={onContinueWithoutCustomFields}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-center group"
          >
            <div className="flex items-center justify-center space-x-3">
              <FileText className="w-5 h-5 text-gray-600" />
              <div className="text-left">
                <h3
                  className="text-sm font-medium text-gray-900"
                  style={{ fontFamily }}
                >
                  Use Standard Fields Only
                </h3>
                <p
                  className="text-xs text-gray-600"
                  style={{ fontFamily }}
                >
                  Continue with name, email, phone, and basic info
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Note */}
        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800" style={{ fontFamily }}>
            <strong>Note:</strong> You can always add custom fields later, but setting them up now will make data collection more consistent from the start.
          </p>
        </div>
      </div>
    </div>
  )
}