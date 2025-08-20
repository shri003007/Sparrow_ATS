"use client"

import { useState, useEffect } from "react"
import { X, Search, FileText, Loader2, AlertCircle } from "lucide-react"
import type { HiringRound } from "@/lib/hiring-types"
import { RecruitmentRoundsApi } from "@/lib/api/recruitment-rounds"
import { RecruitmentRoundsTransformer } from "@/lib/transformers/recruitment-rounds-transformer"

interface RoundTemplateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: HiringRound) => void
}

export function RoundTemplateSelectionModal({ isOpen, onClose, onSelect }: RoundTemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<HiringRound[]>([])
  const [hoveredTemplate, setHoveredTemplate] = useState<HiringRound | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates()
    }
  }, [isOpen, templates.length])

  const fetchTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const apiResponse = await RecruitmentRoundsApi.getRecruitmentRounds()
      const transformedTemplates = RecruitmentRoundsTransformer.transformApiListToUi(apiResponse.recruitment_rounds)
      setTemplates(transformedTemplates)
    } catch (err) {
      setError('Failed to load round templates. Please try again.')
      console.error('Error fetching templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[70vh] flex shadow-2xl"
        style={{ fontFamily }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Panel - Template List */}
        <div className="w-1/2 border-r p-6 flex flex-col" style={{ borderColor: "#E5E7EB" }}>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{
                color: "#111827",
                fontSize: "18px",
                fontWeight: 600,
              }}
            >
              Select a Round Template
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" style={{ color: "#6B7280" }} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
              style={{ color: "#9CA3AF" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{
                borderColor: "#E5E7EB",
                fontSize: "14px",
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto -mr-3 pr-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#6366F1" }} />
                <span className="ml-2" style={{ color: "#6B7280", fontSize: "14px" }}>
                  Loading templates...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-6 h-6 mb-2" style={{ color: "#EF4444" }} />
                <p style={{ color: "#EF4444", fontSize: "14px" }}>{error}</p>
                <button
                  onClick={fetchTemplates}
                  className="mt-2 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p style={{ color: "#6B7280", fontSize: "14px" }}>
                  {searchQuery ? "No templates match your search." : "No templates available."}
                </p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onSelect(template)}
                  onMouseEnter={() => setHoveredTemplate(template)}
                  className="p-4 border rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                  style={{ borderColor: "#E5E7EB" }}
                >
                  <div className="font-medium" style={{ color: "#111827", fontSize: "14px", fontWeight: 500 }}>
                    {template.name}
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#6B7280", fontSize: "13px" }}>
                    {template.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Template Preview */}
        <div className="w-1/2 p-6 bg-gray-50">
          <div className="h-full overflow-y-auto">
            {hoveredTemplate ? (
              <div className="animate-fade-in">
                <h3 className="font-semibold mb-2" style={{ color: "#111827", fontSize: "16px", fontWeight: 600 }}>
                  {hoveredTemplate.name}
                </h3>
                <p className="text-sm mb-6" style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.6 }}>
                  {hoveredTemplate.description}
                </p>

                <h4
                  className="font-semibold mb-4 border-t pt-4"
                  style={{ color: "#111827", fontSize: "14px", fontWeight: 600, borderColor: "#E5E7EB" }}
                >
                  Competencies ({hoveredTemplate.competencies.length})
                </h4>

                <div className="space-y-4">
                  {hoveredTemplate.competencies.map((comp, index) => (
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

                {hoveredTemplate.evaluationCriteria && (
                  <div className="border-t pt-4 mt-6" style={{ borderColor: "#E5E7EB" }}>
                    <h4
                      className="font-semibold mb-3"
                      style={{ color: "#111827", fontSize: "14px", fontWeight: 600 }}
                    >
                      Evaluation Criteria
                    </h4>
                    <p className="text-sm" style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.6 }}>
                      {hoveredTemplate.evaluationCriteria}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div style={{ color: "#9CA3AF" }}>
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <h4 className="font-medium" style={{ color: "#6B7280" }}>
                    Hover over a template
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
