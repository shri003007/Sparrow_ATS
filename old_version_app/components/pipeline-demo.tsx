"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PipelineCriteriaModal } from "./pipeline-criteria-modal"
import { Settings, Users, CheckCircle, FileText, Target } from "lucide-react"
import type { Competency } from "./competency-editor"

// Demo component showing the pipeline with edit criteria functionality
export function PipelineDemo() {
  const [showModal, setShowModal] = useState(false)
  const [currentStage, setCurrentStage] = useState("Technical Interview")
  const [savedData, setSavedData] = useState<{
    criteria: string
    competencies: Competency[]
  }>({
    criteria: "",
    competencies: []
  })

  const handleSave = (criteria: string, competencies: Competency[]) => {
    setSavedData({ criteria, competencies })
    console.log("Saved:", { criteria, competencies })
  }

  const sampleStages = [
    { name: "Resume Screening", candidates: 15, status: "completed" },
    { name: "Technical Interview", candidates: 8, status: "active" },
    { name: "Team Interview", candidates: 0, status: "locked" },
    { name: "Final Interview", candidates: 0, status: "locked" }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Competency Management Demo</h1>
        <p className="text-gray-600">Enhanced pipeline configuration with competencies and evaluation criteria</p>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Deep Learning Engineer Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sampleStages.map((stage, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    stage.status === 'completed' ? 'bg-green-100 text-green-700' :
                    stage.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {stage.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : index + 1}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{stage.name}</h3>
                    <p className="text-sm text-gray-600">{stage.candidates} candidates</p>
                  </div>
                </div>
                
                {stage.status === 'active' && (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Active Round
                    </Badge>
                    <Button
                      onClick={() => {
                        setCurrentStage(stage.name)
                        setShowModal(true)
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Pipeline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved Configuration Display */}
      {(savedData.criteria || savedData.competencies.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Saved Configuration for {currentStage}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedData.criteria && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-700">Evaluation Criteria:</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border">
                  {savedData.criteria}
                </div>
              </div>
            )}
            
            {savedData.competencies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-gray-700">Competencies ({savedData.competencies.length}):</span>
                </div>
                <div className="space-y-3">
                  {savedData.competencies.map((comp, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{comp.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {comp.rubric_scorecard.length} questions
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{comp.description}</p>
                      <div className="space-y-1">
                        {comp.rubric_scorecard.slice(0, 2).map((question, qIndex) => (
                          <div key={qIndex} className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <span className="font-mono">{question[0]}:</span> {question[1]}
                          </div>
                        ))}
                        {comp.rubric_scorecard.length > 2 && (
                          <div className="text-xs text-gray-400 italic">
                            +{comp.rubric_scorecard.length - 2} more questions...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <PipelineCriteriaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        stageName={currentStage}
        initialCriteria={savedData.criteria}
        initialCompetencies={savedData.competencies}
      />
    </div>
  )
} 