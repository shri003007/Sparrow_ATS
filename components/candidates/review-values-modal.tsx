"use client"

import { useState } from "react"
import { X, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CandidatePreview {
  name: string
  email: string
  mobilePhone?: string
  experience?: string
  currentSalary?: string
  expectedSalary?: string
  location?: string
  source?: string
  notes?: string
  isValid: boolean
  issues: string[]
}

interface ReviewValuesModalProps {
  isOpen: boolean
  onClose: () => void
  candidates: CandidatePreview[]
  onConfirm: () => void
  onPrevious: () => void
  isImporting: boolean
}

export function ReviewValuesModal({ 
  isOpen, 
  onClose, 
  candidates, 
  onConfirm,
  onPrevious,
  isImporting 
}: ReviewValuesModalProps) {
  const [currentStep] = useState("2 of 3")
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  const validCandidates = candidates.filter(c => c.isValid)
  const invalidCandidates = candidates.filter(c => !c.isValid)

  const renderCandidateRow = (candidate: CandidatePreview, index: number) => (
    <div 
      key={index} 
      className={`p-4 border rounded-lg ${
        candidate.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {candidate.isValid ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-medium" style={{ color: "#111827", fontSize: "14px", fontFamily }}>
              {candidate.name}
            </div>
            <div className="text-sm text-gray-600" style={{ fontFamily }}>
              {candidate.email}
            </div>
            {candidate.mobilePhone && (
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                📞 {candidate.mobilePhone}
              </div>
            )}
            {candidate.experience && (
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                💼 {candidate.experience} experience
              </div>
            )}
            {candidate.location && (
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                📍 {candidate.location}
              </div>
            )}
          </div>
        </div>
        {!candidate.isValid && candidate.issues.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-red-600 space-y-1" style={{ fontFamily }}>
              {candidate.issues.map((issue, idx) => (
                <div key={idx}>{issue}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg max-w-4xl w-full mx-4 relative max-h-[90vh] flex flex-col"
        style={{ fontFamily }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-xl font-semibold"
              style={{ color: "#111827", fontFamily }}
            >
              Review values
            </h2>
            <span
              className="text-sm text-gray-500"
              style={{ fontFamily }}
            >
              {currentStep}
            </span>
          </div>
          <p
            className="text-gray-600"
            style={{ fontSize: "14px", fontFamily }}
          >
            We've created the values we found in your data. Check that the values are correct and resolve any that are invalid.
          </p>
          <div className="mt-2">
            <span className="text-sm text-gray-500">Need help? </span>
            <button className="text-sm text-blue-600 hover:underline">
              Read more about our import tool
            </button>
            <span className="text-sm text-gray-500"> or </span>
            <button className="text-sm text-blue-600 hover:underline">
              get in touch with the team
            </button>
            <span className="text-sm text-gray-500">.</span>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600" style={{ fontFamily }}>
                {validCandidates.length}
              </div>
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                Valid candidates
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600" style={{ fontFamily }}>
                {invalidCandidates.length}
              </div>
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                Invalid candidates
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600" style={{ fontFamily }}>
                {candidates.length}
              </div>
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                Total candidates
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Valid Candidates */}
          {validCandidates.length > 0 && (
            <div className="mb-8">
              <h3
                className="text-lg font-semibold text-green-700 mb-4 flex items-center"
                style={{ fontFamily }}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Valid Candidates ({validCandidates.length})
              </h3>
              <div className="space-y-3">
                {validCandidates.slice(0, 5).map(renderCandidateRow)}
                {validCandidates.length > 5 && (
                  <div className="text-sm text-gray-500 text-center py-2" style={{ fontFamily }}>
                    ... and {validCandidates.length - 5} more valid candidates
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invalid Candidates */}
          {invalidCandidates.length > 0 && (
            <div>
              <h3
                className="text-lg font-semibold text-red-700 mb-4 flex items-center"
                style={{ fontFamily }}
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Invalid Candidates ({invalidCandidates.length})
              </h3>
              <div className="space-y-3">
                {invalidCandidates.map(renderCandidateRow)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={isImporting}
            style={{
              borderColor: "#E5E7EB",
              color: "#374151",
              fontFamily,
            }}
          >
            Previous
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isImporting}
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontFamily,
              }}
            >
              Continue without resolving
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isImporting || validCandidates.length === 0}
              style={{
                backgroundColor: validCandidates.length > 0 && !isImporting ? "#4F46E5" : "#9CA3AF",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              {isImporting 
                ? "Importing..." 
                : invalidCandidates.length > 0 
                  ? "Resolve issues" 
                  : "Import Candidates"
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}