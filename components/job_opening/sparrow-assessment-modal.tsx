"use client"

import React, { useState, useEffect } from "react"
import { X, Loader2, AlertCircle, ChevronRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SparrowAssessmentTestsApi, type SparrowTest, type SparrowAssessment } from "@/lib/api/sparrow-assessment-tests"
import { toast } from "@/hooks/use-toast"

interface SparrowAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (assessmentId: string, testName: string, assessmentName: string) => void
  selectedAssessmentId?: string
}

export function SparrowAssessmentModal({
  isOpen,
  onClose,
  onSelect,
  selectedAssessmentId
}: SparrowAssessmentModalProps) {
  const [tests, setTests] = useState<SparrowTest[]>([])
  const [assessments, setAssessments] = useState<SparrowAssessment[]>([])
  const [selectedTestId, setSelectedTestId] = useState<string>("")
  const [selectedTestName, setSelectedTestName] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [assessmentsLoading, setAssessmentsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'tests' | 'assessments'>('tests')

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // Load tests when modal opens
  useEffect(() => {
    if (isOpen && tests.length === 0) {
      loadTests()
    }
  }, [isOpen, tests.length])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('tests')
      setSelectedTestId("")
      setSelectedTestName("")
      setAssessments([])
      setError(null)
    }
  }, [isOpen])

  const loadTests = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await SparrowAssessmentTestsApi.getAllTests()
      setTests(response.tests)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load tests"
      setError(errorMessage)
      toast({
        title: "Error Loading Tests",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAssessments = async (testId: string, testName: string) => {
    setAssessmentsLoading(true)
    setError(null)
    
    try {
      const response = await SparrowAssessmentTestsApi.getAssessmentsByTestId(testId)
      setAssessments(response.assessments)
      setSelectedTestId(testId)
      setSelectedTestName(testName)
      setStep('assessments')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load assessments"
      setError(errorMessage)
      toast({
        title: "Error Loading Assessments",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setAssessmentsLoading(false)
    }
  }

  const handleTestSelect = (test: SparrowTest) => {
    loadAssessments(test.test_id, test.test_name)
  }

  const handleAssessmentSelect = (assessment: SparrowAssessment) => {
    onSelect(assessment.assessment_id, selectedTestName, assessment.assessment_name)
    onClose()
  }

  const handleBack = () => {
    setStep('tests')
    setSelectedTestId("")
    setSelectedTestName("")
    setAssessments([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" style={{ fontFamily }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {step === 'assessments' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-1 h-8 w-8"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {step === 'tests' ? 'Select Test' : 'Select Assessment'}
              </h2>
              {step === 'assessments' && (
                <p className="text-sm text-gray-600 mt-1">{selectedTestName}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Error Display */}
          {error && (
            <div className="m-6 flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {(loading || assessmentsLoading) && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-gray-600">
                  {loading ? "Loading tests..." : "Loading assessments..."}
                </span>
              </div>
            </div>
          )}

          {/* Tests List */}
          {step === 'tests' && !loading && !error && (
            <div className="p-6">
              <div className="space-y-3">
                {tests.map((test) => (
                  <div
                    key={test.test_id}
                    onClick={() => handleTestSelect(test)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-700">
                          {test.test_name}
                        </h3>
                        {test.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {test.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>

              {tests.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No tests available</p>
                </div>
              )}
            </div>
          )}

          {/* Assessments List */}
          {step === 'assessments' && !assessmentsLoading && !error && (
            <div className="p-6">
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <div
                    key={assessment.assessment_id}
                    onClick={() => handleAssessmentSelect(assessment)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 group ${
                      selectedAssessmentId === assessment.assessment_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${
                            selectedAssessmentId === assessment.assessment_id
                              ? 'text-blue-700'
                              : 'text-gray-900 group-hover:text-blue-700'
                          }`}>
                            {assessment.assessment_name}
                          </h3>
                          {selectedAssessmentId === assessment.assessment_id && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        {assessment.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {assessment.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{assessment.type}</span>
                          {assessment.no_of_ques && (
                            <span>{assessment.no_of_ques} questions</span>
                          )}
                          {assessment.time_limit && (
                            <span>{Math.round(assessment.time_limit / 60)} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {assessments.length === 0 && !assessmentsLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No assessments available for this test</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
