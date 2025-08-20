"use client"

import React, { useState, useEffect } from "react"
import { X, Plus, Edit2, Trash2, Info, Loader2, Check, AlertCircle, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CandidateRoundsApi } from "@/lib/api/rounds"
import type { RoundCandidate } from "@/lib/round-candidate-types"

interface Competency {
  id: string
  name: string
  description: string
  rubric_scorecard: Record<string, string>
}

interface CompetencyEditModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: RoundCandidate | null
  onSave: (updatedCandidate: RoundCandidate) => void
}

export function CompetencyEditModal({ 
  isOpen, 
  onClose, 
  candidate,
  onSave 
}: CompetencyEditModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [evaluationCriteria, setEvaluationCriteria] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [showJsonView, setShowJsonView] = useState<boolean>(false)
  const [jsonText, setJsonText] = useState<string>('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Initialize data when modal opens or candidate data changes
  useEffect(() => {
    if (isOpen && candidate?.candidate_rounds?.[0]) {
      const candidateRound = candidate.candidate_rounds[0]
      
      // Convert competencies to have IDs for editing
      const competenciesWithIds = candidateRound.competencies?.map((comp, index) => ({
        id: `comp-${index}-${Date.now()}`,
        name: comp.name,
        description: comp.description,
        rubric_scorecard: comp.rubric_scorecard || {}
      })) || []
      
      setCompetencies(competenciesWithIds)
      setEvaluationCriteria(candidateRound.evaluation_criteria || '')
      setError(null)
      setShowJsonView(false) // Reset JSON view when reopening
      setJsonError(null)
    }
  }, [isOpen, candidate?.candidate_rounds?.[0]?.competencies, candidate?.candidate_rounds?.[0]?.evaluation_criteria])

  const handleClose = () => {
    if (!saving) {
      setEditingId(null)
      setShowJsonView(false)
      setJsonError(null)
      onClose()
    }
  }

  const handleShowJson = () => {
    // Convert current competencies to JSON format (excluding id)
    const jsonCompetencies = competencies.map(comp => ({
      name: comp.name,
      description: comp.description,
      rubric_scorecard: comp.rubric_scorecard
    }))
    
    setJsonText(JSON.stringify(jsonCompetencies, null, 2))
    setJsonError(null)
    setShowJsonView(true)
  }

  const handleJsonSave = () => {
    try {
      setJsonError(null)
      const parsedCompetencies = JSON.parse(jsonText)
      
      // Validate JSON structure
      if (!Array.isArray(parsedCompetencies)) {
        throw new Error('JSON must be an array of competencies')
      }
      
      // Convert JSON back to internal format with IDs
      const competenciesWithIds = parsedCompetencies.map((comp, index) => {
        if (!comp.name || typeof comp.name !== 'string') {
          throw new Error(`Competency ${index + 1}: name is required and must be a string`)
        }
        
        if (comp.description !== undefined && typeof comp.description !== 'string') {
          throw new Error(`Competency ${index + 1}: description must be a string`)
        }
        
        if (!comp.rubric_scorecard || typeof comp.rubric_scorecard !== 'object') {
          throw new Error(`Competency ${index + 1}: rubric_scorecard is required and must be an object`)
        }
        
        // Validate that rubric_scorecard has at least one question
        const questions = Object.entries(comp.rubric_scorecard)
        if (questions.length === 0) {
          throw new Error(`Competency ${index + 1}: must have at least one question in rubric_scorecard`)
        }
        
        // Validate all questions are strings
        questions.forEach(([key, value]) => {
          if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Competency ${index + 1}: question "${key}" must be a non-empty string`)
          }
        })
        
        return {
          id: `comp-json-${index}-${Date.now()}`,
          name: comp.name,
          description: comp.description || '',
          rubric_scorecard: comp.rubric_scorecard
        }
      })
      
      setCompetencies(competenciesWithIds)
      setShowJsonView(false)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON format')
    }
  }

  const handleAddCompetency = () => {
    const newCompetencyId = `comp-${Date.now()}`
    const newCompetency: Competency = {
      id: newCompetencyId,
      name: "",
      description: "",
      rubric_scorecard: {}
    }
    setCompetencies(prev => [...prev, newCompetency])
    setEditingId(`comp-name-${newCompetencyId}`)
  }

  const handleUpdateCompetency = (competencyId: string, field: keyof Competency, value: string) => {
    setCompetencies(prev => prev.map(comp => 
      comp.id === competencyId 
        ? { ...comp, [field]: value }
        : comp
    ))
  }

  const handleDeleteCompetency = (competencyId: string) => {
    setCompetencies(prev => prev.filter(comp => comp.id !== competencyId))
  }

  const handleAddQuestion = (competencyId: string) => {
    setCompetencies(prev => prev.map(comp => {
      if (comp.id === competencyId) {
        const questionKeys = Object.keys(comp.rubric_scorecard)
        const nextQuestionNumber = Math.max(
          0, 
          ...questionKeys.map(key => parseInt(key) || 0)
        ) + 1
        
        return {
          ...comp,
          rubric_scorecard: {
            ...comp.rubric_scorecard,
            [nextQuestionNumber.toString()]: ""
          }
        }
      }
      return comp
    }))
    
    // Find the competency and set editing for the new question
    const comp = competencies.find(c => c.id === competencyId)
    if (comp) {
      const questionKeys = Object.keys(comp.rubric_scorecard)
      const nextQuestionNumber = Math.max(
        0, 
        ...questionKeys.map(key => parseInt(key) || 0)
      ) + 1
      setEditingId(`q-text-${competencyId}-${nextQuestionNumber}`)
    }
  }

  const handleUpdateQuestion = (competencyId: string, questionKey: string, value: string) => {
    setCompetencies(prev => prev.map(comp => 
      comp.id === competencyId 
        ? { 
            ...comp, 
            rubric_scorecard: {
              ...comp.rubric_scorecard,
              [questionKey]: value
            }
          }
        : comp
    ))
  }

  const handleDeleteQuestion = (competencyId: string, questionKey: string) => {
    setCompetencies(prev => prev.map(comp => {
      if (comp.id === competencyId) {
        const newRubric = { ...comp.rubric_scorecard }
        delete newRubric[questionKey]
        return { ...comp, rubric_scorecard: newRubric }
      }
      return comp
    }))
  }

  const validateData = () => {
    const errors: string[] = []
    
    // Evaluation criteria cannot be empty
    if (!evaluationCriteria.trim()) {
      errors.push("Evaluation criteria is required and cannot be empty")
    }
    
    // Must have at least one competency
    if (competencies.length === 0) {
      errors.push("At least one competency is required")
    }
    
    // Filter out completely empty competencies first
    const validCompetencies = competencies.filter(comp => 
      comp.name.trim() || 
      comp.description.trim() || 
      Object.keys(comp.rubric_scorecard).length > 0
    )
    
    if (validCompetencies.length === 0) {
      errors.push("At least one competency with content is required")
    }
    
    validCompetencies.forEach((comp, index) => {
      if (!comp.name.trim()) {
        errors.push(`Competency ${index + 1} name is required`)
      }
      // Description is optional, so no validation needed
      if (Object.keys(comp.rubric_scorecard).length === 0) {
        errors.push(`Competency ${index + 1} must have at least one question`)
      } else {
        // Check that all questions have content
        const emptyQuestions = Object.entries(comp.rubric_scorecard).filter(([_, value]) => !value.trim())
        if (emptyQuestions.length > 0) {
          errors.push(`Competency ${index + 1} has empty questions that must be filled or removed`)
        }
      }
    })
    
    return errors
  }

  const handleSave = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setError(errors.join('. '))
      return
    }

    if (!candidate?.candidate_rounds?.[0]?.id) {
      setError('No candidate round found')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Clean up competencies for API
      const cleanedCompetencies = competencies
        .filter(comp => comp.name.trim()) // Only filter by name since description is optional
        .map(comp => ({
          name: comp.name.trim(),
          description: comp.description.trim(), // Can be empty since it's optional
          rubric_scorecard: Object.fromEntries(
            Object.entries(comp.rubric_scorecard)
              .filter(([_, value]) => value.trim())
              .map(([key, value]) => [key, value.trim()])
          )
        }))

      await CandidateRoundsApi.updateCandidateRoundCompetencies(
        candidate.candidate_rounds[0].id,
        {
          evaluation_criteria: evaluationCriteria.trim(),
          competencies: cleanedCompetencies
        }
      )

      // Update the candidate object with new data
      const updatedCandidate: RoundCandidate = {
        ...candidate,
        candidate_rounds: candidate.candidate_rounds.map(round => ({
          ...round,
          evaluation_criteria: evaluationCriteria.trim(),
          competencies: cleanedCompetencies
        }))
      }

      onSave(updatedCandidate)
      handleClose()
    } catch (err) {
      console.error('Failed to save competencies:', err)
      setError(err instanceof Error ? err.message : 'Failed to save competencies')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !candidate) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily }}>
                Edit Competencies - {candidate.name}
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily }}>
                Customize evaluation criteria and competencies for this candidate
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowJson}
                disabled={saving}
                className="flex items-center gap-2"
                title="View/Edit as JSON"
              >
                <Code2 className="w-4 h-4" />
                JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={saving}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            {showJsonView ? (
              /* JSON View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily }}>
                    JSON Editor - Competencies
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowJsonView(false)}
                  >
                    Back to Form View
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block" style={{ fontFamily }}>
                      Competencies JSON <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500 mb-2" style={{ fontFamily }}>
                      Edit the competencies in JSON format. Description field is optional.
                    </p>
                    <Textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      rows={20}
                      className="font-mono text-sm"
                      placeholder="Paste or edit competencies JSON here..."
                      disabled={saving}
                    />
                  </div>
                  
                  {jsonError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="text-sm text-red-600" style={{ fontFamily }}>
                        {jsonError}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={handleJsonSave}
                      disabled={saving}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Apply JSON Changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Form View */
              <div className="space-y-6">
                {/* Evaluation Criteria */}
                <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily }}>
                  Evaluation Criteria
                </h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">
                        Define the overall evaluation guidelines and rubric for this candidate's assessment.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Textarea
                value={evaluationCriteria}
                onChange={(e) => setEvaluationCriteria(e.target.value)}
                rows={6}
                className="w-full"
                placeholder="Enter evaluation criteria and guidelines..."
                disabled={saving}
              />
            </div>

            {/* Competencies */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800" style={{ fontFamily }}>
                    Competencies
                  </h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-2">
                          <p className="font-medium">How to structure competencies and questions</p>
                          <div className="text-sm space-y-1">
                            <p><strong>Competencies:</strong> Key skills or areas you want to evaluate</p>
                            <p><strong>Questions:</strong> Specific questions to assess each competency</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  onClick={handleAddCompetency}
                  className="flex items-center gap-2"
                  size="sm"
                  disabled={saving}
                >
                  <Plus className="w-4 h-4" />
                  Add Competency
                </Button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                {competencies.map((competency, compIndex) => (
                  <div key={competency.id} className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    {/* Competency Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700" style={{ fontFamily }}>
                            Competency Name
                          </label>
                          <Input
                            value={competency.name}
                            onChange={(e) => handleUpdateCompetency(competency.id, 'name', e.target.value)}
                            placeholder="Enter competency name..."
                            disabled={saving}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700" style={{ fontFamily }}>
                            Description <span className="text-gray-400">(optional)</span>
                          </label>
                          <Textarea
                            value={competency.description}
                            onChange={(e) => handleUpdateCompetency(competency.id, 'description', e.target.value)}
                            placeholder="Describe what this competency evaluates..."
                            rows={2}
                            disabled={saving}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteCompetency(competency.id)}
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Questions */}
                    {competency.name && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700" style={{ fontFamily }}>
                            Evaluation Questions
                          </label>
                          <Button
                            onClick={() => handleAddQuestion(competency.id)}
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Question
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {Object.entries(competency.rubric_scorecard).map(([questionKey, questionText]) => (
                            <div key={questionKey} className="flex items-start gap-3 group">
                              <div
                                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mt-1"
                                style={{
                                  backgroundColor: "#F0F9FF",
                                  color: "#0369A1",
                                  border: "1px solid #BAE6FD",
                                }}
                              >
                                Q{questionKey}
                              </div>
                              <div className="flex-1">
                                <Input
                                  value={questionText}
                                  onChange={(e) => handleUpdateQuestion(competency.id, questionKey, e.target.value)}
                                  placeholder="Enter evaluation question..."
                                  disabled={saving}
                                />
                              </div>
                              <Button
                                onClick={() => handleDeleteQuestion(competency.id, questionKey)}
                                variant="ghost"
                                size="sm"
                                disabled={saving}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600" style={{ fontFamily }}>
                  {error}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
