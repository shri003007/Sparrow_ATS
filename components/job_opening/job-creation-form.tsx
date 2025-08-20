"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { ChevronDown, Bold, Italic, Underline, List, Upload, Loader2 } from "lucide-react"
import type { JobFormData } from "@/lib/job-types"
import { JobDescriptionTemplatesModal } from "./job-description-templates-modal"

interface JobCreationFormProps {
  initialData?: Partial<JobFormData>
  onSubmit: (data: JobFormData) => void
  onBack?: () => void
  hasRoundsConfigured: boolean
  isExistingJob?: boolean
  isSaving?: boolean
}

export function JobCreationForm({ initialData, onSubmit, onBack, hasRoundsConfigured, isExistingJob = false, isSaving = false }: JobCreationFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    title: initialData?.title || "",
    employmentType: initialData?.employmentType || "Full-time",
    minExperience: initialData?.minExperience || "5+ years",
    compensationType: initialData?.compensationType || "Fixed Salary",
    compensationAmount: initialData?.compensationAmount || "",
    currency: initialData?.currency || "INR",
    description: initialData?.description || "",
  })

  const [isDirty, setIsDirty] = useState(false)
  const [initialState] = useState(JSON.stringify(initialData))

  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== initialState)
  }, [formData, initialState])

  const [showJDTemplatesModal, setShowJDTemplatesModal] = useState(false)

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Create a copy of form data to avoid mutating the original
    const submitData = { ...formData }
    // Only append "+ years" if it doesn't already end with "years"
    if (!submitData.minExperience.endsWith("years")) {
      submitData.minExperience = submitData.minExperience + "+ years"
    }
    onSubmit(submitData)
  }

  const handleJDTemplateSelect = (description: string) => {
    setFormData({ ...formData, description })
    setShowJDTemplatesModal(false)
  }

  const getButtonText = () => {
    if (hasRoundsConfigured) {
      return isDirty ? "Update & View Process" : "Next"
    }
    return isExistingJob && isDirty ? "Update & Continue" : "Save & Continue"
  }

  let compensationOptions = [
    { label: "Fixed Salary", value: "Fixed Salary" },
    { label: "Hourly Rate", value: "Hourly Rate" },
    { label: "Confidential", value: "Confidential" },
  ]

  return (
    <>
      <div className="max-w-4xl mx-auto p-8" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-2xl font-bold"
            style={{
              color: "#111827",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            Create a new job
          </h1>
          <div className="flex items-center gap-4">
            {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: "#E5E7EB",
                    color: "#374151",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  ← Back
                </button>
              )}
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isSaving ? "#9CA3AF" : "#6366F1",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                getButtonText()
              )}
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: "#6366F1" }}
            >
              1
            </div>
            <span
              className="ml-3 font-medium"
              style={{
                color: "#6366F1",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Job Information
            </span>
          </div>
          <div className="flex items-center ml-8">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2"
              style={{
                borderColor: "#E5E7EB",
                color: "#9CA3AF",
              }}
            >
              2
            </div>
            <span
              className="ml-3"
              style={{
                color: "#9CA3AF",
                fontSize: "14px",
              }}
            >
              Hiring Process
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Title */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{
                color: "#374151",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Job Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Product Manager"
              className="w-full px-4 py-3 rounded-lg"
              style={{
                fontSize: "14px",
              }}
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Employment Type */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Employment Type
              </label>
              <div className="relative">
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg appearance-none"
                  style={{
                    fontSize: "14px",
                  }}
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Freelance</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "#9CA3AF" }}
                />
              </div>
            </div>

            {/* Minimum Experience */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Minimum Experience
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.minExperience}
                  onChange={(e) => setFormData({ ...formData, minExperience: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg appearance-none"
                  style={{
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Compensation Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Compensation Type */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Compensation Type
              </label>
              <div className="relative">
                <select
                  value={formData.compensationType}
                  onChange={(e) => setFormData({ ...formData, compensationType: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg appearance-none"
                  style={{
                    fontSize: "14px",
                  }}
                >
                  {compensationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "#9CA3AF" }}
                />
              </div>
            </div>

            {/* Compensation Amount */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Compensation Amount
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={formData.compensationAmount}
                  onChange={(e) => setFormData({ ...formData, compensationAmount: e.target.value })}
                  placeholder="e.g., 12,00,000 - 15,00,000"
                  className="flex-1 px-4 py-3 rounded-l-lg"
                  style={{
                    fontSize: "14px",
                  }}
                />
                <div className="relative">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="px-3 py-3 rounded-r-lg appearance-none"
                    style={{
                      fontSize: "14px",
                    }}
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: "#9CA3AF" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="block text-sm font-medium"
                style={{
                  color: "#374151",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Job Description
              </label>
              <button
                type="button"
                onClick={() => setShowJDTemplatesModal(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                style={{ fontSize: "14px" }}
              >
                <Upload className="w-4 h-4" />
                Import a job description
              </button>
            </div>

            {/* Rich Text Editor Toolbar */}
            <div
              className="flex items-center gap-2 p-2 border border-b-0 rounded-t-lg"
              style={{
                borderColor: "#E5E7EB",
                backgroundColor: "#F9FAFB",
              }}
            >
              <button type="button" className="p-1 hover:bg-gray-200 rounded">
                <Bold className="w-4 h-4" style={{ color: "#6B7280" }} />
              </button>
              <button type="button" className="p-1 hover:bg-gray-200 rounded">
                <Italic className="w-4 h-4" style={{ color: "#6B7280" }} />
              </button>
              <button type="button" className="p-1 hover:bg-gray-200 rounded">
                <Underline className="w-4 h-4" style={{ color: "#6B7280" }} />
              </button>
              <button type="button" className="p-1 hover:bg-gray-200 rounded">
                <List className="w-4 h-4" style={{ color: "#6B7280" }} />
              </button>
            </div>

            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Start writing or paste the job description here..."
              rows={12}
              className="w-full px-4 py-3 rounded-b-lg resize-none"
              style={{
                fontSize: "14px",
              }}
            />
          </div>
        </form>
      </div>

      {/* Job Description Templates Modal */}
      <JobDescriptionTemplatesModal
        isOpen={showJDTemplatesModal}
        onClose={() => setShowJDTemplatesModal(false)}
        onSelect={handleJDTemplateSelect}
      />
    </>
  )
}
