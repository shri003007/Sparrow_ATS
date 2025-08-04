"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { GripVertical, Trash2, Plus, Edit2, Check, ArrowLeft, Sparkles, ChevronDown } from "lucide-react"
import type { HiringRound, Competency, Question } from "@/lib/hiring-types"
import { RoundTemplateSelectionModal } from "./round-template-selection-modal"
import { RoundAICreationModal } from "./round-ai-creation-modal"
import { RoundAILoadingModal } from "./round-ai-loading-modal"

interface HiringProcessCanvasProps {
  rounds: HiringRound[]
  onUpdateRounds: (rounds: HiringRound[]) => void
  onPublish: () => void
  onBack: () => void
  jobTitle: string
}

export function HiringProcessCanvas({ rounds, onUpdateRounds, onPublish, onBack, jobTitle }: HiringProcessCanvasProps) {
  const [activeRoundId, setActiveRoundId] = useState<string>(rounds[0]?.id || "")
  const [draggedRoundId, setDraggedRoundId] = useState<string | null>(null)
  const [hoveredInsertIndex, setHoveredInsertIndex] = useState<number | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showRoundAIModal, setShowRoundAIModal] = useState(false)
  const [showRoundAILoading, setShowRoundAILoading] = useState(false)
  const [insertIndex, setInsertIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

  const activeRound = rounds.find((round) => round.id === activeRoundId)

  // Effect to ensure a valid round is always selected if the list changes
  useEffect(() => {
    if (!activeRoundId && rounds.length > 0) {
      setActiveRoundId(rounds[0].id)
    } else if (rounds.length > 0 && !rounds.find((r) => r.id === activeRoundId)) {
      setActiveRoundId(rounds[0].id)
    } else if (rounds.length === 0) {
      setActiveRoundId("")
    }
  }, [rounds, activeRoundId])

  const handleDragStart = (e: React.DragEvent, roundId: string) => {
    setDraggedRoundId(roundId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetRoundId: string) => {
    e.preventDefault()
    if (!draggedRoundId || draggedRoundId === targetRoundId) return

    const draggedIndex = rounds.findIndex((round) => round.id === draggedRoundId)
    const targetIndex = rounds.findIndex((round) => round.id === targetRoundId)

    const newRounds = [...rounds]
    const [draggedRound] = newRounds.splice(draggedIndex, 1)
    newRounds.splice(targetIndex, 0, draggedRound)

    onUpdateRounds(newRounds)
    setDraggedRoundId(null)
  }

  const handleDeleteRound = (roundId: string) => {
    const updatedRounds = rounds.filter((round) => round.id !== roundId)
    onUpdateRounds(updatedRounds)
    // The useEffect will handle resetting the activeRoundId
  }

  const addRound = (newRound: HiringRound, index: number) => {
    const newRounds = [...rounds]
    newRounds.splice(index, 0, newRound)
    onUpdateRounds(newRounds)
    setActiveRoundId(newRound.id)
  }

  const handleAddBlankRound = (index: number) => {
    const newRound: HiringRound = {
      id: `custom-${Date.now()}`,
      name: "New Custom Round",
      type: "custom",
      isSelected: true,
      order: index,
      competencies: [],
      description: "A custom round for your specific needs.",
      duration: "N/A",
      difficulty: "Intermediate",
      evaluationCriteria: "Define the rubric for this custom round.",
    }
    addRound(newRound, index)
  }

  const handleAddRoundFromTemplate = (template: HiringRound) => {
    const newRound = {
      ...template,
      id: `preset-${Date.now()}`,
      order: insertIndex!,
    }
    addRound(newRound, insertIndex!)
    setShowTemplateModal(false)
    setInsertIndex(null)
  }

  const openTemplateModal = (index: number) => {
    setInsertIndex(index)
    setShowTemplateModal(true)
  }

  const openAIModal = (index: number) => {
    setInsertIndex(index)
    setShowRoundAIModal(true)
  }

  const handleAIGenerateRound = (prompt: string) => {
    setShowRoundAIModal(false)
    setShowRoundAILoading(true)

    setTimeout(() => {
      const newRound: HiringRound = {
        id: `ai-${Date.now()}`,
        name: "AI Generated: Culture Fit",
        type: "custom",
        isSelected: true,
        order: insertIndex!,
        description: `An AI-generated round to assess candidate alignment with company culture for the ${jobTitle} role.`,
        duration: "45 min",
        difficulty: "Intermediate",
        evaluationCriteria:
          "Assess candidate's alignment with company values (e.g., collaboration, innovation, ownership). Evaluate their long-term career aspirations and how they align with the company's growth. Look for genuine enthusiasm and proactive communication.",
        competencies: [
          {
            id: `comp-ai-${Date.now()}-1`,
            name: "Team Collaboration",
            questions: [
              {
                id: `q-ai-${Date.now()}-1`,
                text: "Describe a time you had a disagreement with a coworker. How did you handle it?",
              },
              { id: `q-ai-${Date.now()}-2`, text: "How do you prefer to receive feedback?" },
            ],
          },
          {
            id: `comp-ai-${Date.now()}-2`,
            name: "Value Alignment",
            questions: [
              { id: `q-ai-${Date.now()}-3`, text: "What kind of work environment helps you do your best work?" },
              {
                id: `q-ai-${Date.now()}-4`,
                text: "What are your long-term career goals and how does this role fit into them?",
              },
            ],
          },
        ],
      }

      addRound(newRound, insertIndex!)

      setShowRoundAILoading(false)
      setInsertIndex(null)
    }, 2500)
  }

  const handleUpdateRoundField = (roundId: string, field: keyof HiringRound, value: string) => {
    const updatedRounds = rounds.map((r) => (r.id === roundId ? { ...r, [field]: value } : r))
    onUpdateRounds(updatedRounds)
  }

  const handleAddCompetency = () => {
    if (!activeRound) return
    const newCompetencyId = `comp-${Date.now()}`
    const newCompetency: Competency = {
      id: newCompetencyId,
      name: "",
      questions: [],
    }
    const updatedRounds = rounds.map((r) =>
      r.id === activeRoundId ? { ...r, competencies: [...r.competencies, newCompetency] } : r,
    )
    onUpdateRounds(updatedRounds)
    setEditingId(`comp-name-${newCompetencyId}`)
  }

  const handleUpdateCompetency = (competencyId: string, newName: string) => {
    const updatedRounds = rounds.map((r) =>
      r.id === activeRoundId
        ? {
            ...r,
            competencies: r.competencies.map((c) => (c.id === competencyId ? { ...c, name: newName } : c)),
          }
        : r,
    )
    onUpdateRounds(updatedRounds)
  }

  const handleDeleteCompetency = (competencyId: string) => {
    const updatedRounds = rounds.map((r) =>
      r.id === activeRoundId ? { ...r, competencies: r.competencies.filter((c) => c.id !== competencyId) } : r,
    )
    onUpdateRounds(updatedRounds)
  }

  const handleAddQuestion = (competencyId: string) => {
    const newQuestionId = `q-${Date.now()}`
    const newQuestion: Question = { id: newQuestionId, text: "" }
    const updatedRounds = rounds.map((r) =>
      r.id === activeRoundId
        ? {
            ...r,
            competencies: r.competencies.map((c) =>
              c.id === competencyId ? { ...c, questions: [...c.questions, newQuestion] } : c,
            ),
          }
        : r,
    )
    onUpdateRounds(updatedRounds)
    setEditingId(`q-text-${newQuestionId}`)
  }

  const handleUpdateQuestion = (competencyId: string, questionId: string, newText: string) => {
    const updatedRounds = rounds.map((r) =>
      r.id === activeRoundId
        ? {
            ...r,
            competencies: r.competencies.map((c) =>
              c.id === competencyId
                ? { ...c, questions: c.questions.map((q) => (q.id === questionId ? { ...q, text: newText } : q)) }
                : c,
            ),
          }
        : r,
    )
    onUpdateRounds(updatedRounds)
  }

  const handleDeleteQuestion = (competencyId: string, questionId: string) => {
    const updatedRounds = rounds.map((r) =>
      r.id === activeRoundId
        ? {
            ...r,
            competencies: r.competencies.map((c) =>
              c.id === competencyId ? { ...c, questions: c.questions.filter((q) => q.id !== questionId) } : c,
            ),
          }
        : r,
    )
    onUpdateRounds(updatedRounds)
  }

  const cleanupEmptyItems = () => {
    const updatedRounds = rounds.map((r) => {
      if (r.id === activeRoundId) {
        return {
          ...r,
          competencies: r.competencies
            .filter((c) => c.name.trim())
            .map((c) => ({
              ...c,
              questions: c.questions.filter((q) => q.text.trim()),
            })),
        }
      }
      return r
    })
    onUpdateRounds(updatedRounds)
  }

  useEffect(() => {
    const handler = () => {
      if (editingId) {
        cleanupEmptyItems()
        setEditingId(null)
      }
    }
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [editingId])

  return (
    <>
      <div
        className="max-w-7xl mx-auto p-8 bg-gray-50 min-h-full"
        style={{ fontFamily }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".col-span-7") === null) {
            if (editingId) {
              cleanupEmptyItems()
              setEditingId(null)
            }
          }
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
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
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
              style={{
                borderColor: "#E5E7EB",
                color: "#374151",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={onPublish}
              className="px-6 py-2 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors"
              style={{
                backgroundColor: "#6366F1",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Publish Job
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: "#10B981" }}
            >
              <Check className="w-4 h-4" />
            </div>
            <span
              className="ml-3 font-medium"
              style={{
                color: "#10B981",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Job Information
            </span>
          </div>
          <div className="flex items-center ml-8">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: "#6366F1" }}
            >
              2
            </div>
            <span
              className="ml-3 font-medium"
              style={{
                color: "#6366F1",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Hiring Process
            </span>
          </div>
        </div>

        {/* Two-Pane Layout */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Pane - Rounds */}
          <div className="col-span-5">
            <div className="space-y-1 h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {rounds.map((round, index) => (
                <div
                  key={round.id}
                  className="group relative"
                  onMouseEnter={() => setHoveredInsertIndex(index + 1)}
                  onMouseLeave={() => setHoveredInsertIndex(null)}
                >
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, round.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, round.id)}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (editingId) {
                        cleanupEmptyItems()
                        setEditingId(null)
                      }
                      setActiveRoundId(round.id)
                    }}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all bg-white ${
                      activeRoundId === round.id ? "border-blue-500 shadow-sm" : "border-gray-200 hover:border-gray-300"
                    } ${draggedRoundId === round.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 cursor-grab text-gray-400" />
                      <div>
                        <div className="font-medium" style={{ color: "#111827", fontSize: "14px" }}>
                          {round.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{round.competencies.length} competencies</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRound(round.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>

                  {/* Floating Action Buttons */}
                  <div
                    className={`absolute left-1/2 -bottom-3 -translate-x-1/2 z-10 transition-opacity duration-200 ${
                      index === rounds.length - 1
                        ? "opacity-100"
                        : hoveredInsertIndex === index + 1
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="flex items-center bg-white rounded-lg shadow-md border border-gray-200">
                      <button
                        onClick={() => handleAddBlankRound(index + 1)}
                        className="p-2 hover:bg-gray-100 rounded-l-md"
                        title="Add Blank Round"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="w-px h-4 bg-gray-200" />
                      <button
                        onClick={() => openAIModal(index + 1)}
                        className="p-2 hover:bg-gray-100"
                        title="Create with AI"
                      >
                        <Sparkles className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="w-px h-4 bg-gray-200" />
                      <button
                        onClick={() => openTemplateModal(index + 1)}
                        className="p-2 hover:bg-gray-100 rounded-r-md"
                        title="Add from Template"
                      >
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Pane - Round Details */}
          <div
            className="col-span-7"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {activeRound ? (
              <div className="bg-white rounded-lg border border-gray-200 h-[calc(100vh-280px)] flex flex-col">
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Round Header */}
                <div>
                  <EditableField
                    id={`round-name-${activeRound.id}`}
                    value={activeRound.name}
                    onSave={(value) => handleUpdateRoundField(activeRound.id, "name", value)}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    className="text-xl font-semibold text-gray-800 mb-2"
                    inputClassName="text-xl font-semibold"
                  />
                  <p className="text-sm text-gray-500">{activeRound.description}</p>
                </div>

                {/* Competencies Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Competencies</h3>
                    <button
                      onClick={handleAddCompetency}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Competency
                    </button>
                  </div>

                  <div className="space-y-6">
                    {activeRound.competencies.map((competency) => (
                      <div key={competency.id} className="space-y-3 group/competency">
                        {/* Competency Header */}
                        <div className="flex items-center justify-between">
                          <EditableField
                            id={`comp-name-${competency.id}`}
                            value={competency.name}
                            onSave={(value) => handleUpdateCompetency(competency.id, value)}
                            editingId={editingId}
                            setEditingId={setEditingId}
                            className="text-lg font-medium text-gray-800"
                            inputClassName="text-lg font-medium"
                            placeholder="Enter competency name..."
                            onDelete={() => handleDeleteCompetency(competency.id)}
                          />
                          <button
                            onClick={() => handleDeleteCompetency(competency.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors opacity-0 group-hover/competency:opacity-100"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>

                        {competency.name && (
                          <>
                            <div className="space-y-3">
                              {competency.questions.map((question, qIndex) => (
                                <div key={question.id} className="flex items-start gap-3 group/question">
                                  <div
                                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mt-0.5"
                                    style={{
                                      backgroundColor: "#F0F9FF",
                                      color: "#0369A1",
                                      border: "1px solid #BAE6FD",
                                    }}
                                  >
                                    Q{qIndex + 1}
                                  </div>
                                  <div className="flex-1 pt-1">
                                    <EditableField
                                      id={`q-text-${question.id}`}
                                      value={question.text}
                                      onSave={(value) => handleUpdateQuestion(competency.id, question.id, value)}
                                      editingId={editingId}
                                      setEditingId={setEditingId}
                                      className="text-gray-700 leading-relaxed"
                                      inputClassName="text-gray-700"
                                      placeholder="Enter your question..."
                                      onDelete={() => handleDeleteQuestion(competency.id, question.id)}
                                    />
                                  </div>
                                  <button
                                    onClick={() => handleDeleteQuestion(competency.id, question.id)}
                                    className="p-1 hover:bg-red-100 rounded opacity-0 group-hover/question:opacity-100 transition-all"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-500" />
                                  </button>
                                </div>
                              ))}

                              <button
                                onClick={() => handleAddQuestion(competency.id)}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium ml-10"
                              >
                                <Plus className="w-4 h-4" />
                                Add Question
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evaluation Criteria Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Evaluation Criteria</h3>
                  <textarea
                    value={activeRound.evaluationCriteria}
                    onChange={(e) => handleUpdateRoundField(activeRound.id, "evaluationCriteria", e.target.value)}
                    rows={4}
                    className="w-full p-4 border rounded-lg text-sm text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Define the rubric for this round..."
                    style={{ borderColor: "#E5E7EB" }}
                  />
                </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[calc(100vh-280px)] text-center bg-white rounded-lg border border-gray-200">
                <div className="text-gray-400">
                  <p>Select a round to configure its details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <RoundTemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleAddRoundFromTemplate}
      />
      <RoundAICreationModal
        isOpen={showRoundAIModal}
        onClose={() => setShowRoundAIModal(false)}
        onGenerate={handleAIGenerateRound}
      />
      <RoundAILoadingModal isOpen={showRoundAILoading} />
    </>
  )
}

function EditableField({
  id,
  value,
  onSave,
  editingId,
  setEditingId,
  className,
  inputClassName,
  placeholder = "Enter text...",
  onDelete,
}: {
  id: string
  value: string
  onSave: (value: string) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  className?: string
  inputClassName?: string
  placeholder?: string
  onDelete?: () => void
}) {
  const handleSave = (inputValue: string) => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue) {
      onSave(trimmedValue)
    } else if (!value) {
      onDelete?.()
    }
    setEditingId(null)
  }

  if (editingId === id) {
    return (
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        className={`w-full border-b-2 border-blue-500 focus:outline-none bg-transparent ${inputClassName}`}
        autoFocus
        onBlur={(e) => handleSave(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSave(e.currentTarget.value)
          } else if (e.key === "Escape") {
            setEditingId(null)
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  if (!value && !editingId) {
    return null
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        setEditingId(id)
      }}
      className={`cursor-pointer group flex items-center gap-2 ${className}`}
    >
      <span>{value}</span>
      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}
