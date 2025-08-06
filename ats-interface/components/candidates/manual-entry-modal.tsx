"use client"

import { useState } from "react"
import { X, Plus, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CandidateCreateRequest } from "@/lib/candidate-types"

interface CandidateFormData {
  name: string
  email: string
  mobilePhone: string
  resumeUrl: string
  experienceYears: string
  currentSalary: string
  currentSalaryCurrency: string
  expectedSalary: string
  expectedSalaryCurrency: string
  availableToJoinDays: string
  currentLocation: string
}

const emptyCandidateForm: CandidateFormData = {
  name: '',
  email: '',
  mobilePhone: '',
  resumeUrl: '',
  experienceYears: '',
  currentSalary: '',
  currentSalaryCurrency: 'USD',
  expectedSalary: '',
  expectedSalaryCurrency: 'USD',
  availableToJoinDays: '',
  currentLocation: ''
}

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  jobOpeningId: string
  onSave: (candidates: CandidateCreateRequest[]) => void
}

export function ManualEntryModal({ 
  isOpen, 
  onClose, 
  jobOpeningId, 
  onSave 
}: ManualEntryModalProps) {
  const [candidates, setCandidates] = useState<CandidateFormData[]>([{ ...emptyCandidateForm }])
  const [isSaving, setIsSaving] = useState(false)
  
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  if (!isOpen) return null

  const handleCandidateChange = (index: number, field: keyof CandidateFormData, value: string) => {
    setCandidates(prev => prev.map((candidate, i) => 
      i === index ? { ...candidate, [field]: value } : candidate
    ))
  }

  const addCandidate = () => {
    setCandidates(prev => [...prev, { ...emptyCandidateForm }])
  }

  const removeCandidate = (index: number) => {
    if (candidates.length > 1) {
      setCandidates(prev => prev.filter((_, i) => i !== index))
    }
  }

  const validateCandidate = (candidate: CandidateFormData): string[] => {
    const errors: string[] = []
    
    if (!candidate.name.trim()) errors.push('Name is required')
    if (!candidate.email.trim()) errors.push('Email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) errors.push('Invalid email format')
    if (!candidate.mobilePhone.trim()) errors.push('Mobile phone is required')
    
    return errors
  }

  const handleSave = async () => {
    const validCandidates: CandidateCreateRequest[] = []
    let hasErrors = false

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const errors = validateCandidate(candidate)
      
      if (errors.length > 0) {
        alert(`Candidate ${i + 1} has errors: ${errors.join(', ')}`)
        hasErrors = true
        break
      }

      validCandidates.push({
        job_opening_id: jobOpeningId,
        resume_url: candidate.resumeUrl || '',
        name: candidate.name,
        email: candidate.email,
        mobile_phone: candidate.mobilePhone,
        experience_months: candidate.experienceYears ? Math.round(parseFloat(candidate.experienceYears) * 12) : undefined,
        current_salary: candidate.currentSalary ? parseFloat(candidate.currentSalary) : undefined,
        current_salary_currency: candidate.currentSalaryCurrency,
        expected_salary: candidate.expectedSalary ? parseFloat(candidate.expectedSalary) : undefined,
        expected_salary_currency: candidate.expectedSalaryCurrency,
        available_to_join_days: candidate.availableToJoinDays ? parseInt(candidate.availableToJoinDays) : undefined,
        current_location: candidate.currentLocation || undefined,
        overall_status: 'active'
      })
    }

    if (!hasErrors && validCandidates.length > 0) {
      setIsSaving(true)
      try {
        await onSave(validCandidates)
        handleClose()
      } catch (error) {
        console.error('Failed to save candidates:', error)
        alert('Failed to save candidates. Please try again.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleClose = () => {
    setCandidates([{ ...emptyCandidateForm }])
    onClose()
  }

  const renderCandidateForm = (candidate: CandidateFormData, index: number) => (
    <div key={index} className="border border-gray-200 rounded-lg p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium" style={{ color: "#111827", fontFamily }}>
          Candidate {index + 1}
        </h3>
        {candidates.length > 1 && (
          <button
            onClick={() => removeCandidate(index)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Required Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={candidate.name}
            onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="Full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={candidate.email}
            onChange={(e) => handleCandidateChange(index, 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Mobile Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={candidate.mobilePhone}
            onChange={(e) => handleCandidateChange(index, 'mobilePhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="+1234567890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Resume URL
          </label>
          <input
            type="url"
            value={candidate.resumeUrl}
            onChange={(e) => handleCandidateChange(index, 'resumeUrl', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="https://example.com/resume.pdf"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Experience (Years)
          </label>
          <input
            type="number"
            value={candidate.experienceYears}
            onChange={(e) => handleCandidateChange(index, 'experienceYears', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="3.5"
            step="0.5"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Current Salary
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={candidate.currentSalary}
              onChange={(e) => handleCandidateChange(index, 'currentSalary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
              placeholder="50000"
              min="0"
            />
            <select
              value={candidate.currentSalaryCurrency}
              onChange={(e) => handleCandidateChange(index, 'currentSalaryCurrency', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Expected Salary
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={candidate.expectedSalary}
              onChange={(e) => handleCandidateChange(index, 'expectedSalary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
              placeholder="60000"
              min="0"
            />
            <select
              value={candidate.expectedSalaryCurrency}
              onChange={(e) => handleCandidateChange(index, 'expectedSalaryCurrency', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              style={{ fontFamily }}
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Available to Join (Days)
          </label>
          <input
            type="number"
            value={candidate.availableToJoinDays}
            onChange={(e) => handleCandidateChange(index, 'availableToJoinDays', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="30"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily }}>
            Current Location
          </label>
          <input
            type="text"
            value={candidate.currentLocation}
            onChange={(e) => handleCandidateChange(index, 'currentLocation', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            style={{ fontFamily }}
            placeholder="New York, NY"
          />
        </div>


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
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "#111827", fontFamily }}
          >
            Add Candidates Manually
          </h2>
          <p
            className="text-gray-600"
            style={{ fontSize: "14px", fontFamily }}
          >
            Enter candidate details manually. You can add multiple candidates at once.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {candidates.map((candidate, index) => renderCandidateForm(candidate, index))}
          </div>

          {/* Add Another Candidate */}
          <div className="mt-6 text-center">
            <button
              onClick={addCandidate}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span style={{ fontFamily }}>Add Another Candidate</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div className="text-sm text-gray-500" style={{ fontFamily }}>
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} to save
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSaving}
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontFamily,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || candidates.length === 0}
              style={{
                backgroundColor: !isSaving && candidates.length > 0 ? "#4F46E5" : "#9CA3AF",
                color: "#FFFFFF",
                fontFamily,
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : `Save ${candidates.length} Candidate${candidates.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}