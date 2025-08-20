"use client"

import { useState, useEffect } from "react"
import { X, Search, Check, Clock, BarChart2, FileText, Loader2, AlertCircle } from "lucide-react"
import type { HiringRound } from "@/lib/hiring-types"
import { RecruitmentRoundsApi } from "@/lib/api/recruitment-rounds"
import { RecruitmentRoundsTransformer } from "@/lib/transformers/recruitment-rounds-transformer"

interface HiringRoundsModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: (selectedRounds: HiringRound[], originalTemplates: any[]) => void
}

export function HiringRoundsModal({ isOpen, onClose, onContinue }: HiringRoundsModalProps) {
  const [rounds, setRounds] = useState<HiringRound[]>([])
  const [selectedRoundIds, setSelectedRoundIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [previewRound, setPreviewRound] = useState<HiringRound | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalApiRounds, setOriginalApiRounds] = useState<any[]>([])

  // Fetch rounds when modal opens
  useEffect(() => {
    if (isOpen && rounds.length === 0) {
      fetchRounds()
    }
  }, [isOpen, rounds.length])

  const fetchRounds = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const apiResponse = await RecruitmentRoundsApi.getRecruitmentRounds()
      const transformedRounds = RecruitmentRoundsTransformer.transformApiListToUi(apiResponse.recruitment_rounds)
      setRounds(transformedRounds)
      setOriginalApiRounds(apiResponse.recruitment_rounds) // Store original API data
      
      // Auto-select default rounds
      const defaultRoundIds = new Set(
        transformedRounds
          .filter(round => round.isSelected)
          .map(round => round.id)
      )
      setSelectedRoundIds(defaultRoundIds)
    } catch (err) {
      setError('Failed to load recruitment rounds. Please try again.')
      console.error('Error fetching rounds:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const handleToggleRound = (roundId: string) => {
    const newSelection = new Set(selectedRoundIds)
    if (newSelection.has(roundId)) {
      newSelection.delete(roundId)
    } else {
      newSelection.add(roundId)
    }
    setSelectedRoundIds(newSelection)

    // Also set the clicked round as the preview
    const roundToPreview = rounds.find((r) => r.id === roundId)
    setPreviewRound(roundToPreview || null)
  }

  const handleContinue = () => {
    const selected = rounds.filter((round) => selectedRoundIds.has(round.id))
    const selectedOriginalTemplates = originalApiRounds.filter((apiRound) => 
      selectedRoundIds.has(apiRound.id)
    )
    onContinue(selected, selectedOriginalTemplates)
  }

  const filteredRounds = rounds.filter((round) => round.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[70vh] flex shadow-2xl"
        style={{ fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Panel - Rounds List & Actions */}
        <div className="w-1/2 border-r p-6 flex flex-col bg-gray-50" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-center justify-between mb-2">
            <h2
              className="text-lg font-semibold"
              style={{
                color: "#111827",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Set Up Hiring Rounds
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" style={{ color: "#6B7280" }} />
            </button>
          </div>
          <p className="text-sm mb-4" style={{ color: "#6B7280", fontSize: "14px" }}>
            Select the stages for this role. You can customize them later.
          </p>

          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: "#9CA3AF" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rounds..."
              className="w-full pl-10 pr-4 py-2 rounded-lg"
              style={{
                fontSize: "14px",
              }}
              autoFocus={true}
            />
          </div>

          <div className="flex-1 overflow-y-auto -mr-3 pr-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#6366F1" }} />
                <span className="ml-2" style={{ color: "#6B7280", fontSize: "14px" }}>
                  Loading rounds...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-6 h-6 mb-2" style={{ color: "#EF4444" }} />
                <p style={{ color: "#EF4444", fontSize: "14px" }}>{error}</p>
                <button
                  onClick={fetchRounds}
                  className="mt-2 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredRounds.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: "#6B7280", fontSize: "14px" }}>
                  {searchQuery ? "No rounds match your search." : "No rounds available."}
                </p>
              </div>
            ) : (
              filteredRounds.map((round) => {
                const isSelected = selectedRoundIds.has(round.id)
                const isPreviewed = previewRound?.id === round.id
                return (
                  <div
                    key={round.id}
                    onClick={() => handleToggleRound(round.id)}
                    onMouseEnter={() => setPreviewRound(round)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center gap-4 ${
                      isPreviewed ? "border-blue-300 bg-blue-50" : "hover:border-blue-300 hover:bg-blue-50"
                    }`}
                    style={{ borderColor: isPreviewed ? "#93C5FD" : "#E5E7EB" }}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium" style={{ color: "#111827", fontSize: "14px", fontWeight: 500 }}>
                          {round.name}
                        </div>
                        {round.type.toLowerCase() === 'interview' && round.competencies.length === 0 && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 border border-red-200 rounded text-xs">
                            <AlertCircle className="w-2.5 h-2.5 text-red-500" />
                            <span className="text-red-600 text-xs">Empty</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm mt-1" style={{ color: "#6B7280", fontSize: "13px" }}>
                        {round.description}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="mt-auto pt-6 flex items-center justify-end gap-3 border-t" style={{ borderColor: "#E5E7EB" }}>
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              style={{
                borderColor: "#D1D5DB",
                color: "#374151",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={selectedRoundIds.size === 0}
              className="px-6 py-2 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Continue ({selectedRoundIds.size})
            </button>
          </div>
        </div>

        {/* Right Panel - Round Preview */}
        <div className="w-1/2 p-6 bg-white">
          <div className="h-full overflow-y-auto">
            {previewRound ? (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold" style={{ color: "#111827", fontSize: "16px", fontWeight: 600 }}>
                    {previewRound.name}
                  </h3>
                  {previewRound.type.toLowerCase() === 'interview' && previewRound.competencies.length === 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span className="text-red-600">Needs competencies</span>
                    </div>
                  )}
                </div>
                <p className="text-sm mb-6" style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.6 }}>
                  {previewRound.description}
                </p>

                <h4
                  className="font-semibold mb-4 border-t pt-4"
                  style={{ color: "#111827", fontSize: "14px", fontWeight: 600, borderColor: "#E5E7EB" }}
                >
                  Competencies ({previewRound.competencies.length})
                </h4>

                <div className="space-y-4">
                  {previewRound.competencies.map((comp, index) => (
                    <div key={`comp-${index}`}>
                      <div className="font-medium mb-2" style={{ color: "#374151", fontSize: "14px", fontWeight: 500 }}>
                        {comp.name}
                      </div>
                      {comp.description && (
                        <p className="text-sm mb-3" style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.5 }}>
                          {comp.description}
                        </p>
                      )}
                      {comp.rubricScorecard && Object.keys(comp.rubricScorecard).length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium mb-2" style={{ color: "#6B7280" }}>
                            Evaluation Questions:
                          </div>
                          <ul className="space-y-1 pl-1">
                            {Object.entries(comp.rubricScorecard).map(([key, question]) => (
                              <li key={key} className="flex items-start">
                                <span className="mr-2 mt-1 text-gray-400">•</span>
                                <span className="text-sm" style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.5 }}>
                                  {question}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {previewRound.evaluationCriteria && (
                  <div className="border-t pt-4 mt-6" style={{ borderColor: "#E5E7EB" }}>
                    <h4
                      className="font-semibold mb-3"
                      style={{ color: "#111827", fontSize: "14px", fontWeight: 600 }}
                    >
                      Evaluation Criteria
                    </h4>
                    <p className="text-sm" style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.6 }}>
                      {previewRound.evaluationCriteria}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div style={{ color: "#9CA3AF" }}>
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <h4 className="font-medium" style={{ color: "#6B7280" }}>
                    Hover over or select a round
                  </h4>
                  <p className="text-sm">to see its detailed information here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
