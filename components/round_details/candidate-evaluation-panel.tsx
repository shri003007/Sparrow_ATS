"use client"

import React, { useState } from "react"
import { X, ChevronDown, Check, AlertCircle, Mail, Phone, Settings, Calendar, FileText, Award, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EvaluationScoreChart } from "@/components/round_details/evaluation-score-chart"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { Spinner } from "@/components/ui/spinner"
import type { RoundCandidate } from "@/lib/round-candidate-types"
import { evaluateInterviewCandidateFromFile, evaluateInterviewCandidateFromSparrowInterviewer, type InterviewEvaluationRequest, type SparrowInterviewerEvaluationRequest } from "@/lib/api/evaluation"
import { AssetManagementTable } from "./asset-management-table"
import { AssetUploadModal } from "./asset-upload-modal"
import { CompetencyEditModal } from "./competency-edit-modal"
import { AssetEvaluationModal } from "./asset-evaluation-modal"

type RoundStatus = 'selected' | 'rejected' | 'action_pending'

interface CompetencyQuestion {
  question: string
  explanation: string
  score: number
  question_id?: string
}

interface CompetencyScore {
  competency_name: string
  percentage_score: number
  questions?: CompetencyQuestion[]
}

interface CompetencyEvaluation {
  competency_scores: CompetencyScore[]
}

const ROUND_STATUS_CONFIG = {
  selected: {
    label: 'Selected',
    color: '#10B981',
    bgColor: '#DCFCE7'
  },
  rejected: {
    label: 'Rejected', 
    color: '#EF4444',
    bgColor: '#FEE2E2'
  },
  action_pending: {
    label: 'Action Pending',
    color: '#F59E0B', 
    bgColor: '#FEF3C7'
  }
} as const

interface CandidateEvaluationPanelProps {
  candidate: RoundCandidate | null
  isOpen: boolean
  onClose: () => void
  roundType: string
  onStatusChange?: (candidateId: string, newStatus: RoundStatus) => void
  isEvaluating?: boolean
  onCandidateUpdated?: (updatedCandidate: RoundCandidate) => void
}

export function CandidateEvaluationPanel({ 
  candidate, 
  isOpen, 
  onClose, 
  roundType,
  onStatusChange = () => {},
  isEvaluating = false,
  onCandidateUpdated = () => {}
}: CandidateEvaluationPanelProps) {
  const [selectedCompetency, setSelectedCompetency] = useState<string>('')
  const [uploadingFile, setUploadingFile] = useState<boolean>(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [showAssetUploadModal, setShowAssetUploadModal] = useState<boolean>(false)
  const [assetRefreshTrigger, setAssetRefreshTrigger] = useState<number>(0)
  const [showCompetencyEditModal, setShowCompetencyEditModal] = useState<boolean>(false)
  const [showAssetEvaluationModal, setShowAssetEvaluationModal] = useState<boolean>(false)
  const [loadingSparrowEvaluation, setLoadingSparrowEvaluation] = useState<boolean>(false)
  const [sparrowError, setSparrowError] = useState<string | null>(null)
  const [showReEvaluationOptions, setShowReEvaluationOptions] = useState<boolean>(false)

  // Get evaluation data
  const hasEvaluation = candidate?.candidate_rounds?.[0]?.is_evaluation
  const evaluation = candidate?.candidate_rounds?.[0]?.evaluations?.[0]?.evaluation_result
  
  // Initialize selected competency with first competency
  React.useEffect(() => {
    if (evaluation?.competency_evaluation?.competency_scores?.length > 0 && !selectedCompetency) {
      setSelectedCompetency(evaluation.competency_evaluation.competency_scores[0].competency_name)
    }
  }, [evaluation, selectedCompetency])

  if (!candidate) return null

  const getCurrentCandidateStatus = (): RoundStatus => {
    if (candidate.candidate_rounds && candidate.candidate_rounds.length > 0) {
      return candidate.candidate_rounds[0].status as RoundStatus
    }
    return candidate.round_status as RoundStatus
  }

  const handleStatusChange = (newStatus: RoundStatus) => {
    onStatusChange(candidate.id, newStatus)
  }

  const handleFileUpload = async (file: File) => {
    if (!candidate?.candidate_rounds?.[0]?.id || !candidate?.job_opening_id) {
      setFileError('Missing candidate or job information')
      return
    }

    try {
      setUploadingFile(true)
      setFileError(null)

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer()
      const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      
      // Determine file type
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'txt'
      
      const request: InterviewEvaluationRequest = {
        candidate_round_id: candidate.candidate_rounds[0].id,
        job_opening_id: candidate.job_opening_id,
        file_type: fileType,
        file_content: base64String
      }

      const result = await evaluateInterviewCandidateFromFile(request)
      
      if (result.success) {
        // Create updated candidate with evaluation
        const updatedCandidate: RoundCandidate = {
          ...candidate,
          candidate_rounds: candidate.candidate_rounds.map(round => ({
            ...round,
            is_evaluation: true,
            evaluations: [{
              id: result.result_id || '',
              candidate_round_id: round.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              evaluation_result: {
                evaluation_summary: result.evaluation_summary || '',
                competency_evaluation: result.competency_evaluation || {
                  competency_scores: [],
                  overall_percentage_score: 0
                },
                overall_percentage_score: result.competency_evaluation?.overall_percentage_score || 0,
                interviewer_evaluation_summary: result.interviewer_evaluation_summary || ''
              }
            }]
          }))
        }
        
        onCandidateUpdated(updatedCandidate)
      } else {
        setFileError(result.error_message || 'Evaluation failed')
      }
    } catch (error) {
      console.error('File upload error:', error)
      setFileError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleAssetUpload = () => {
    setShowAssetUploadModal(true)
  }

  const handleAssetUploaded = () => {
    setAssetRefreshTrigger(prev => prev + 1)
    setShowAssetUploadModal(false)
  }

  const handleEditCompetencies = () => {
    setShowCompetencyEditModal(true)
  }

  const handleCompetenciesSaved = (updatedCandidate: RoundCandidate) => {
    onCandidateUpdated(updatedCandidate)
    setShowCompetencyEditModal(false)
  }

  const handleProjectEvaluate = () => {
    setShowAssetEvaluationModal(true)
  }

  const handleProjectReEvaluate = () => {
    setShowAssetEvaluationModal(true)
  }

  const handleEvaluationComplete = (updatedCandidate: RoundCandidate) => {
    onCandidateUpdated(updatedCandidate)
    setShowAssetEvaluationModal(false)
  }

  const handleSparrowInterviewerEvaluation = async () => {
    if (!candidate?.candidate_rounds?.[0]?.id || !candidate?.job_opening_id || !candidate?.candidate_rounds?.[0]?.job_round_template_id) {
      setSparrowError('Missing candidate information required for evaluation')
      return
    }

    try {
      setLoadingSparrowEvaluation(true)
      setSparrowError(null)
      
      const request: SparrowInterviewerEvaluationRequest = {
        email: candidate.email,
        job_round_template_id: candidate.candidate_rounds[0].job_round_template_id,
        candidate_round_id: candidate.candidate_rounds[0].id,
        job_opening_id: candidate.job_opening_id
      }

      const result = await evaluateInterviewCandidateFromSparrowInterviewer(request)
      
      if (result.success) {
        // Create updated candidate with evaluation
        const updatedCandidate: RoundCandidate = {
          ...candidate,
          candidate_rounds: candidate.candidate_rounds.map(round => ({
            ...round,
            is_evaluation: true,
            evaluations: [{
              id: result.result_id || `eval-${Date.now()}`,
              candidate_round_id: round.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              evaluation_result: {
                evaluation_summary: result.evaluation_summary || '',
                competency_evaluation: result.competency_evaluation || {
                  competency_scores: [],
                  overall_percentage_score: 0
                },
                overall_percentage_score: result.overall_percentage_score || 0,
                interviewer_evaluation_summary: result.interviewer_evaluation_summary || ''
              }
            }]
          }))
        }
        
        onCandidateUpdated(updatedCandidate)
      } else {
        setSparrowError(result.error_message || 'Sparrow Interviewer evaluation failed')
      }
    } catch (error) {
      console.error('Sparrow Interviewer evaluation error:', error)
      setSparrowError(error instanceof Error ? error.message : 'Evaluation failed')
    } finally {
      setLoadingSparrowEvaluation(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981" // green-500
    if (score >= 60) return "#f59e0b" // amber-500
    return "#ef4444" // red-500
  }

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-amber-600"
    return "text-red-600"
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-700 border-green-200"
    if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200"
    return "bg-red-50 text-red-700 border-red-200"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    return "Needs Improvement"
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={`
        fixed right-0 top-0 h-full w-[1000px] bg-white border-l border-gray-200 z-50 
        transform transition-transform duration-300 ease-in-out shadow-xl
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{candidate.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {candidate.email}
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {candidate.mobile_phone}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: ROUND_STATUS_CONFIG[getCurrentCandidateStatus()].bgColor,
                      color: ROUND_STATUS_CONFIG[getCurrentCandidateStatus()].color,
                      borderColor: ROUND_STATUS_CONFIG[getCurrentCandidateStatus()].color + '40'
                    }}
                  >
                    {ROUND_STATUS_CONFIG[getCurrentCandidateStatus()].label}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.entries(ROUND_STATUS_CONFIG).map(([status, config]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => handleStatusChange(status as RoundStatus)}
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: config.color }}
                      />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {/* TODO: Implement edit candidate */}}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Candidate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleEditCompetencies}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Edit Competencies
                  </DropdownMenuItem>
                  {roundType === 'PROJECT' && hasEvaluation && (
                    <DropdownMenuItem
                      onClick={handleProjectReEvaluate}
                      className="flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      Re-evaluate Project
                    </DropdownMenuItem>
                  )}
                  {roundType === 'INTERVIEW' && hasEvaluation && (
                    <DropdownMenuItem
                      onClick={() => setShowReEvaluationOptions(true)}
                      className="flex items-center gap-2"
                    >
                      <Award className="w-4 h-4" />
                      Re-evaluate Interview
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close Button */}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col px-8 py-6 gap-6">
              {/* Custom Fields Section */}
              {candidate.custom_field_values?.length > 0 && (
                <div className="w-full max-w-4xl mx-auto">
                  <div className="bg-white border border-gray-100 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Additional Information</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {candidate.custom_field_values.map((field) => (
                        <div key={field.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                          <div className="text-sm text-gray-500 mb-1">{field.field_definition.field_label}</div>
                          <div className="text-lg font-semibold text-gray-900">{field.field_value || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Evaluation Results or Loading State */}
              {showReEvaluationOptions && roundType === 'INTERVIEW' ? (
                /* Re-evaluation Options for INTERVIEW rounds */
                <div className="w-full max-w-2xl mx-auto space-y-6">
                  <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Re-evaluate Interview</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                      Choose your preferred method to re-evaluate this candidate's interview.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Option 1: Sparrow Interviewer Evaluation */}
                      <div className="border border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                            <Award className="w-6 h-6 text-blue-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Sparrow Interviewer</h4>
                          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            Automatically fetch updated evaluation results from Sparrow Interviewer assessment platform.
                          </p>
                          
                          <Button 
                            onClick={() => {
                              setShowReEvaluationOptions(false)
                              handleSparrowInterviewerEvaluation()
                            }}
                            disabled={loadingSparrowEvaluation || uploadingFile}
                            className="w-full"
                            style={{
                              backgroundColor: "#4F46E5",
                              color: "#FFFFFF"
                            }}
                          >
                            {loadingSparrowEvaluation ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Fetching...
                              </>
                            ) : (
                              <>
                                <Award className="w-4 h-4 mr-2" />
                                Get New Evaluation
                              </>
                            )}
                          </Button>
                          
                          {sparrowError && (
                            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 w-full">
                              {sparrowError}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Option 2: File Upload */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                        <div className="flex flex-col items-center text-center">
                          <Upload className="w-8 h-8 text-gray-400 mb-3" />
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Upload New Transcript</h4>
                          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                            Upload a new PDF or TXT file containing the interview transcript for AI re-evaluation.
                          </p>
                          
                          <div className="relative w-full">
                            <input
                              type="file"
                              accept=".pdf,.txt,application/pdf,text/plain"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setShowReEvaluationOptions(false)
                                  handleFileUpload(file)
                                  e.currentTarget.value = ''
                                }
                              }}
                              disabled={uploadingFile || loadingSparrowEvaluation}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <Button 
                              className="w-full"
                              disabled={uploadingFile || loadingSparrowEvaluation}
                              variant="outline"
                            >
                              {uploadingFile ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Choose New File
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {fileError && (
                            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 w-full">
                              {fileError}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-6">
                      <Button
                        onClick={() => setShowReEvaluationOptions(false)}
                        variant="ghost"
                        className="text-gray-500"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : isEvaluating ? (
                <div className="w-full max-w-4xl mx-auto">
                  <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Spinner variant="circle" size={32} className="text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          AI Resume Evaluation in Progress
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Our AI is analyzing the candidate's resume and generating an evaluation report. This may take a moment.
                        </p>

                      </div>
                    </div>
                  </div>
                </div>
              ) : hasEvaluation && evaluation ? (
                <>
                  {/* Overall Score Section */}
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6">
                      <div className="flex items-center justify-center mb-6">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-4">
                            <div className="relative">
                              <EvaluationScoreChart 
                                score={evaluation.overall_percentage_score} 
                                size="large"
                              />
                            </div>
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-2">Overall Assessment Score</h3>
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getScoreBadgeColor(evaluation.overall_percentage_score)}`}>
                            <Award className="w-4 h-4" />
                            <span className="font-medium">{getScoreLabel(evaluation.overall_percentage_score)}</span>
                            <span className="font-bold">{evaluation.overall_percentage_score}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Scores */}
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="bg-white border border-gray-100 rounded-2xl">
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Competency Breakdown</h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                          {evaluation.competency_evaluation?.competency_scores?.map((competency: CompetencyScore) => (
                            <div key={competency.competency_name} className="bg-gray-50 border border-gray-100 rounded-xl p-4 transition-all hover:shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">{competency.competency_name}</h4>
                                <span className={`font-bold text-sm ${getScoreTextColor(competency.percentage_score)}`}>
                                  {competency.percentage_score}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="h-2 rounded-full transition-all duration-1000 ease-out"
                                  style={{ 
                                    width: `${competency.percentage_score}%`,
                                    backgroundColor: getScoreColor(competency.percentage_score)
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-600">
                                {competency.questions?.length || 0} criteria evaluated
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Evaluation */}
                  <div className="w-full max-w-4xl mx-auto">
                    <div className="bg-white border border-gray-100 rounded-2xl">
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-gray-900">Detailed Evaluation</h3>
                          <div className="w-64">
                            <Select value={selectedCompetency} onValueChange={setSelectedCompetency}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Competency" />
                              </SelectTrigger>
                              <SelectContent>
                                {evaluation.competency_evaluation?.competency_scores?.map((competency: CompetencyScore) => (
                                  <SelectItem key={competency.competency_name} value={competency.competency_name}>
                                    {competency.competency_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      {selectedCompetency && (() => {
                        const competency = evaluation.competency_evaluation?.competency_scores?.find(
                          (c: CompetencyScore) => c.competency_name === selectedCompetency
                        )
                        if (!competency) return null
                        
                        return (
                          <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                              <div className="flex-shrink-0">
                                <EvaluationScoreChart 
                                  score={competency.percentage_score} 
                                  size="small"
                                />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 text-lg">{competency.competency_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBadgeColor(competency.percentage_score)}`}>
                                    {competency.percentage_score}% • {getScoreLabel(competency.percentage_score)}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {competency.questions?.length || 0} criteria
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                              {competency.questions?.map((question: CompetencyQuestion, qIndex: number) => (
                                <div key={qIndex} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      question.score === 1 
                                        ? 'bg-green-100 text-green-600' 
                                        : 'bg-red-100 text-red-600'
                                    }`}>
                                      {question.score === 1 ? (
                                        <Check className="w-4 h-4" />
                                      ) : (
                                        <AlertCircle className="w-4 h-4" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 mb-2">{question.question}</h5>
                                    <p className="text-sm text-gray-600 leading-relaxed">{question.explanation}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* AI Evaluation Summary - Last */}
                  {evaluation.evaluation_summary && (
                    <div className="w-full max-w-4xl mx-auto">
                      <div className="bg-white border border-gray-100 rounded-2xl">
                        <div className="p-6 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">AI Evaluation Summary</h3>
                          </div>
                        </div>
                        <div className="p-6">
                          <MarkdownRenderer 
                            content={evaluation.evaluation_summary.replace(/\\n/g, '\n')}
                            className="prose prose-sm max-w-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full max-w-4xl mx-auto">
                  <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Evaluation Available</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                      This candidate has not been evaluated yet for this round.
                    </p>
                    
                    {/* Evaluation Options for INTERVIEW rounds */}
                    {roundType === 'INTERVIEW' && (
                      <div className="max-w-2xl mx-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Option 1: Sparrow Interviewer Evaluation */}
                          <div className="border border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors bg-gradient-to-br from-blue-50 to-indigo-50">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                                <Award className="w-6 h-6 text-blue-600" />
                              </div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Sparrow Interviewer</h4>
                              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                                Automatically fetch evaluation results from Sparrow Interviewer assessment platform.
                              </p>
                              
                              <Button 
                                onClick={handleSparrowInterviewerEvaluation}
                                disabled={loadingSparrowEvaluation || uploadingFile}
                                className="w-full"
                                style={{
                                  backgroundColor: "#4F46E5",
                                  color: "#FFFFFF"
                                }}
                              >
                                {loadingSparrowEvaluation ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Fetching...
                                  </>
                                ) : (
                                  <>
                                    <Award className="w-4 h-4 mr-2" />
                                    Get Evaluation
                                  </>
                                )}
                              </Button>
                              
                              {sparrowError && (
                                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 w-full">
                                  {sparrowError}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Option 2: File Upload */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                            <div className="flex flex-col items-center text-center">
                              <Upload className="w-8 h-8 text-gray-400 mb-3" />
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">Upload Transcript</h4>
                              <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                                Upload a PDF or TXT file containing the interview transcript for AI evaluation.
                              </p>
                              
                              <div className="relative w-full">
                                <input
                                  type="file"
                                  accept=".pdf,.txt,application/pdf,text/plain"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                      handleFileUpload(file)
                                      e.currentTarget.value = ''
                                    }
                                  }}
                                  disabled={uploadingFile || loadingSparrowEvaluation}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                                <Button 
                                  className="w-full"
                                  disabled={uploadingFile || loadingSparrowEvaluation}
                                  variant="outline"
                                >
                                  {uploadingFile ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Choose File
                                    </>
                                  )}
                                </Button>
                              </div>
                              
                              {fileError && (
                                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 w-full">
                                  {fileError}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-gray-400">
                            Choose your preferred evaluation method above
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            File uploads support: PDF, TXT • Maximum file size: 10MB
                          </p>
                        </div>
                      </div>
                    )}

                                      {/* Asset Management for PROJECT rounds */}
                  {roundType === 'PROJECT' && candidate?.candidate_rounds?.[0]?.job_round_template_id && (
                    <div className="max-w-4xl mx-auto space-y-6">
                      <AssetManagementTable
                        candidateId={candidate.id}
                        jobRoundTemplateId={candidate.candidate_rounds[0].job_round_template_id}
                        onAddAsset={handleAssetUpload}
                        refreshTrigger={assetRefreshTrigger}
                      />
                      
                      {/* Evaluate Candidate Button */}
                      <div className="flex justify-center">
                        <Button 
                          onClick={handleProjectEvaluate}
                          className="flex items-center gap-2"
                          size="lg"
                        >
                          <Award className="w-5 h-5" />
                          Evaluate Candidate
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Upload Modal */}
      {candidate?.candidate_rounds?.[0]?.job_round_template_id && (
        <AssetUploadModal
          isOpen={showAssetUploadModal}
          onClose={() => setShowAssetUploadModal(false)}
          candidateId={candidate.id}
          jobRoundTemplateId={candidate.candidate_rounds[0].job_round_template_id}
          onAssetUploaded={handleAssetUploaded}
        />
      )}

      {/* Competency Edit Modal */}
      <CompetencyEditModal
        isOpen={showCompetencyEditModal}
        onClose={() => setShowCompetencyEditModal(false)}
        candidate={candidate}
        onSave={handleCompetenciesSaved}
      />

      {/* Asset Evaluation Modal */}
      <AssetEvaluationModal
        isOpen={showAssetEvaluationModal}
        onClose={() => setShowAssetEvaluationModal(false)}
        candidate={candidate}
        onEvaluationComplete={handleEvaluationComplete}
      />
    </>
  )
}