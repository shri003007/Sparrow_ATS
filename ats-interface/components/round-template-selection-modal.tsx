"use client"

import { useState } from "react"
import { X, Search, FileText, Clock, BarChart2 } from "lucide-react"
import type { HiringRound } from "@/lib/hiring-types"
import { presetRounds } from "@/lib/hiring-types"

interface RoundTemplateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: HiringRound) => void
}

export function RoundTemplateSelectionModal({ isOpen, onClose, onSelect }: RoundTemplateSelectionModalProps) {
  const [hoveredTemplate, setHoveredTemplate] = useState<HiringRound | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  if (!isOpen) return null

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const filteredTemplates = presetRounds.filter((template) =>
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
            {filteredTemplates.map((template) => (
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
            ))}
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

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#6B7280" }}>
                    <Clock className="w-4 h-4" />
                    <span>{hoveredTemplate.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#6B7280" }}>
                    <BarChart2 className="w-4 h-4" />
                    <span>{hoveredTemplate.difficulty}</span>
                  </div>
                </div>

                <h4
                  className="font-semibold mb-4 border-t pt-4"
                  style={{ color: "#111827", fontSize: "14px", fontWeight: 600, borderColor: "#E5E7EB" }}
                >
                  Competencies ({hoveredTemplate.competencies.length})
                </h4>

                <div className="space-y-4">
                  {hoveredTemplate.competencies.map((comp) => (
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
