"use client"

import { useState } from "react"
import { X, Search, Check, Clock, BarChart2, FileText } from "lucide-react"
import type { HiringRound } from "@/lib/hiring-types"
import { presetRounds } from "@/lib/hiring-types"

interface HiringRoundsModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: (selectedRounds: HiringRound[]) => void
}

export function HiringRoundsModal({ isOpen, onClose, onContinue }: HiringRoundsModalProps) {
  const [selectedRoundIds, setSelectedRoundIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")
  const [previewRound, setPreviewRound] = useState<HiringRound | null>(null)

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
    const roundToPreview = presetRounds.find((r) => r.id === roundId)
    setPreviewRound(roundToPreview || null)
  }

  const handleContinue = () => {
    const selected = presetRounds.filter((round) => selectedRoundIds.has(round.id))
    onContinue(selected)
  }

  const filteredRounds = presetRounds.filter((round) => round.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[70vh] flex shadow-2xl"
        style={{ fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Panel - Rounds List & Actions */}
        <div className="w-1/2 border-r p-6 flex flex-col" style={{ borderColor: "#E5E7EB" }}>
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
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{
                borderColor: "#E5E7EB",
                fontSize: "14px",
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto -mr-3 pr-3 space-y-2">
            {filteredRounds.map((round) => {
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
                    <div className="font-medium" style={{ color: "#111827", fontSize: "14px", fontWeight: 500 }}>
                      {round.name}
                    </div>
                    <p className="text-sm mt-1" style={{ color: "#6B7280", fontSize: "13px" }}>
                      {round.description}
                    </p>
                  </div>
                </div>
              )
            })}
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
        <div className="w-1/2 p-6 bg-gray-50">
          <div className="h-full overflow-y-auto">
            {previewRound ? (
              <div className="animate-fade-in">
                <h3 className="font-semibold mb-2" style={{ color: "#111827", fontSize: "16px", fontWeight: 600 }}>
                  {previewRound.name}
                </h3>
                <p className="text-sm mb-6" style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.6 }}>
                  {previewRound.description}
                </p>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#6B7280" }}>
                    <Clock className="w-4 h-4" />
                    <span>{previewRound.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#6B7280" }}>
                    <BarChart2 className="w-4 h-4" />
                    <span>{previewRound.difficulty}</span>
                  </div>
                </div>

                <h4
                  className="font-semibold mb-4 border-t pt-4"
                  style={{ color: "#111827", fontSize: "14px", fontWeight: 600, borderColor: "#E5E7EB" }}
                >
                  Competencies ({previewRound.competencies.length})
                </h4>

                <div className="space-y-4">
                  {previewRound.competencies.map((comp) => (
                    <div key={comp.id}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium" style={{ color: "#374151", fontSize: "14px", fontWeight: 500 }}>
                          {comp.name}
                        </div>
                        <span className="text-xs" style={{ color: "#6B7280" }}>
                          {comp.questions.length} question{comp.questions.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {comp.questions.length > 0 && (
                        <ul className="mt-2 space-y-2 pl-1">
                          {comp.questions.map((question) => (
                            <li key={question.id} className="flex items-start">
                              <span className="mr-2 mt-1 text-gray-400">•</span>
                              <span className="text-sm" style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.5 }}>
                                {question.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
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
