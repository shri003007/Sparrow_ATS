"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { CompetencyRadarChart } from "./competency-radar-chart"
import { BarChart3, Users, TrendingUp } from "lucide-react"
import type { RoundCandidate } from "@/lib/round-candidate-types"

interface CompetencyMetricsModalProps {
  isOpen: boolean
  onClose: () => void
  candidates: RoundCandidate[]
  roundInfo?: any
}

interface CompetencyScore {
  competency: string
  score: number
  candidateName: string
  isGlobalAverage?: boolean
}

export function CompetencyMetricsModal({
  isOpen,
  onClose,
  candidates,
  roundInfo
}: CompetencyMetricsModalProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  // State for filters
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])

  // Get evaluated candidates (those with is_evaluation = true)
  const evaluatedCandidates = useMemo(() => {
    return candidates.filter(candidate =>
      candidate.candidate_rounds?.[0]?.is_evaluation === true &&
      candidate.candidate_rounds?.[0]?.evaluations?.[0]
    )
  }, [candidates])

  // Get available competencies from round info
  const availableCompetencies = useMemo(() => {
    if (!roundInfo?.competencies) return []
    return roundInfo.competencies.map((comp: any) => ({
      name: comp.name,
      description: comp.description
    }))
  }, [roundInfo])

  // Initialize all candidates selected when modal opens
  useEffect(() => {
    if (isOpen && evaluatedCandidates.length > 0) {
      setSelectedCandidates(evaluatedCandidates.map(c => c.id))
    }
  }, [isOpen, evaluatedCandidates])

  // Process competency scores for all selected candidates across all competencies
  const competencyData = useMemo(() => {
    if (!selectedCandidates.length || !availableCompetencies.length) return []

    const data: CompetencyScore[] = []

    evaluatedCandidates
      .filter(candidate => selectedCandidates.includes(candidate.id))
      .forEach(candidate => {
        availableCompetencies.forEach(comp => {
          const evaluation = candidate.candidate_rounds?.[0]?.evaluations?.[0]
          if (evaluation?.evaluation_result?.competency_evaluation?.competency_scores) {
            const competencyScore = evaluation.evaluation_result.competency_evaluation.competency_scores
              .find((compScore: any) => compScore.competency_name === comp.name)

            if (competencyScore) {
              data.push({
                competency: comp.name,
                score: Math.round(competencyScore.percentage_score || 0),
                candidateName: candidate.name,
                candidateId: candidate.id,
                isGlobalAverage: false
              })
            }
          }
        })
      })

    return data
  }, [selectedCandidates, availableCompetencies, evaluatedCandidates])

  const handleCandidateToggle = (candidateId: string, checked: boolean) => {
    if (checked) {
      setSelectedCandidates(prev => [...prev, candidateId])
    } else {
      setSelectedCandidates(prev => prev.filter(id => id !== candidateId))
    }
  }

  const handleSelectAllCandidates = (checked: boolean) => {
    if (checked) {
      setSelectedCandidates(evaluatedCandidates.map(c => c.id))
    } else {
      setSelectedCandidates([])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily }}>
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Competency Performance Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chart Section - Now at the top */}
          {selectedCandidates.length > 0 && competencyData.length > 0 ? (
            <div className="bg-white border rounded-lg p-6">
              <CompetencyRadarChart
                data={competencyData}
                selectedCandidates={selectedCandidates}
                competencies={availableCompetencies}
                evaluatedCandidates={evaluatedCandidates}
              />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily }}>
                Select Candidates to View Metrics
              </h3>
              <p className="text-gray-500" style={{ fontFamily }}>
                Choose candidates using the checkboxes below to compare their performance across all competencies
              </p>
            </div>
          )}

          {/* Candidate Selection Section - Now below the chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3" style={{ fontFamily }}>
              Select Candidates ({selectedCandidates.length}/{evaluatedCandidates.length})
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily }}>
                <Users className="w-4 h-4 inline mr-1" />
                Choose Candidates to Compare
              </label>
              <div className="bg-white border rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedCandidates.length === evaluatedCandidates.length}
                    onCheckedChange={handleSelectAllCandidates}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium text-gray-900 cursor-pointer"
                    style={{ fontFamily }}
                  >
                    Select All Candidates
                  </label>
                </div>
                <div className="space-y-2">
                  {evaluatedCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={candidate.id}
                        checked={selectedCandidates.includes(candidate.id)}
                        onCheckedChange={(checked) =>
                          handleCandidateToggle(candidate.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={candidate.id}
                        className="text-sm text-gray-700 cursor-pointer truncate"
                        style={{ fontFamily }}
                      >
                        {candidate.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} style={{ fontFamily }}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
