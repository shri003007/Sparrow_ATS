"use client"

import { useState } from "react"
import { X, Upload, FileText, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AddCandidatesModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadCSV: () => void
  onUploadResumes: () => void
  onManualEntry: () => void
}

export function AddCandidatesModal({ isOpen, onClose, onUploadCSV, onUploadResumes, onManualEntry }: AddCandidatesModalProps) {
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
          <h2
            className="text-2xl font-semibold mb-2"
            style={{ color: "#111827", fontFamily }}
          >
            Add Candidates
          </h2>
          <p
            className="text-gray-600"
            style={{ fontSize: "16px", fontFamily }}
          >
            How would you like to import candidates?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Upload CSV Option */}
          <button
            onClick={onUploadCSV}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <FileText className="w-8 h-8 text-amber-600" />
              </div>
              <div>
                <h3
                  className="text-lg font-medium mb-1"
                  style={{ color: "#111827", fontFamily }}
                >
                  Upload CSV
                </h3>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily }}
                >
                  Import candidate details from a CSV file
                </p>
              </div>
            </div>
          </button>

          {/* Upload Resumes Option */}
          <button
            onClick={onUploadResumes}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3
                  className="text-lg font-medium mb-1"
                  style={{ color: "#111827", fontFamily }}
                >
                  Upload Resumes
                </h3>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily }}
                >
                  Up to 20 resumes supported
                </p>
              </div>
            </div>
          </button>

          {/* Manual Entry Option */}
          <button
            onClick={onManualEntry}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-center group"
          >
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3
                  className="text-lg font-medium mb-1"
                  style={{ color: "#111827", fontFamily }}
                >
                  Enter Manually
                </h3>
                <p
                  className="text-sm text-gray-600"
                  style={{ fontFamily }}
                >
                  Add candidate details one by one
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}