"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompetencyEditor, type Competency } from "./competency-editor"
import { Settings, FileText, Target, Save, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PipelineCriteriaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (criteria: string, competencies: Competency[]) => void
  stageName: string
  initialCriteria?: string
  initialCompetencies?: Competency[]
}

type EditMode = 'criteria' | 'competencies' | 'both'

export function PipelineCriteriaModal({
  isOpen,
  onClose,
  onSave,
  stageName,
  initialCriteria = '',
  initialCompetencies = []
}: PipelineCriteriaModalProps) {
  const [editMode, setEditMode] = useState<EditMode>('both')
  const [criteria, setCriteria] = useState(initialCriteria)
  const [competencies, setCompetencies] = useState<Competency[]>(
    initialCompetencies.length > 0 ? initialCompetencies : [
      {
        id: `comp_${Date.now()}_1`,
        name: '',
        description: '',
        rubric_scorecard: [
          ['01', ''],
          ['02', ''],
          ['03', '']
        ]
      }
    ]
  )

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCriteria(initialCriteria)
      setCompetencies(
        initialCompetencies.length > 0 ? initialCompetencies : [
          {
            id: `comp_${Date.now()}_1`,
            name: '',
            description: '',
            rubric_scorecard: [
              ['01', ''],
              ['02', ''],
              ['03', '']
            ]
          }
        ]
      )
    }
  }, [isOpen, initialCriteria, initialCompetencies])

  const handleSave = () => {
    onSave(criteria, competencies)
    onClose()
  }

  const handleCancel = () => {
    // Reset to initial values
    setCriteria(initialCriteria)
    setCompetencies(initialCompetencies)
    onClose()
  }

  const isCompetenciesValid = competencies.every(comp => 
    comp.name.trim() && 
    comp.description.trim() && 
    comp.rubric_scorecard.length >= 3 &&
    comp.rubric_scorecard.every(q => q[0].trim() && q[1].trim())
  )

  const canSave = editMode === 'criteria' ? true : 
                  editMode === 'competencies' ? isCompetenciesValid :
                  isCompetenciesValid

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Edit Pipeline Configuration
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configure evaluation criteria and competencies for <span className="font-medium">{stageName}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 py-4">
          {/* Mode Selection */}
          <div className="flex-shrink-0 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Configuration Mode
            </label>
            <Select value={editMode} onValueChange={(value: EditMode) => setEditMode(value)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>Criteria & Competencies</span>
                  </div>
                </SelectItem>
                <SelectItem value="criteria">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Evaluation Criteria Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="competencies">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Competencies Only</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto pr-2">
            {editMode === 'both' ? (
              <Tabs defaultValue="criteria" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sticky top-0 z-10 bg-white">
                  <TabsTrigger value="criteria" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Evaluation Criteria
                  </TabsTrigger>
                  <TabsTrigger value="competencies" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Competencies
                    <Badge variant={isCompetenciesValid ? "default" : "destructive"} className="ml-1 text-xs">
                      {competencies.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="criteria" className="mt-6">
                  <CriteriaEditor 
                    criteria={criteria} 
                    onChange={setCriteria}
                    stageName={stageName}
                  />
                </TabsContent>
                
                <TabsContent value="competencies" className="mt-6">
                  <CompetencyEditor
                    competencies={competencies}
                    onChange={setCompetencies}
                    maxCompetencies={6}
                    minQuestions={3}
                    maxQuestions={10}
                  />
                </TabsContent>
              </Tabs>
            ) : editMode === 'criteria' ? (
              <CriteriaEditor 
                criteria={criteria} 
                onChange={setCriteria}
                stageName={stageName}
              />
            ) : (
              <CompetencyEditor
                competencies={competencies}
                onChange={setCompetencies}
                maxCompetencies={6}
                minQuestions={3}
                maxQuestions={10}
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {!canSave && (
              <Alert variant="destructive" className="py-2 px-3">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Please complete all required fields
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Criteria Editor Component
function CriteriaEditor({ 
  criteria, 
  onChange, 
  stageName 
}: { 
  criteria: string
  onChange: (criteria: string) => void
  stageName: string 
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 200), 500);
      textarea.style.height = newHeight + 'px';
    }
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [criteria, adjustHeight]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    adjustHeight();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Evaluation Instructions for {stageName}
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Provide detailed instructions for evaluating candidates in this pipeline stage. 
          This will guide AI evaluation and human reviewers.
        </p>
        <textarea
          ref={textareaRef}
          value={criteria}
          onChange={handleTextareaChange}
          placeholder={`Enter detailed evaluation criteria for ${stageName}...

Examples:
• What specific skills should be assessed?
• What are the key evaluation points?
• What should reviewers focus on?
• Any specific requirements or standards?`}
          className="w-full min-h-[200px] max-h-[500px] p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 overflow-hidden"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            Character count: {criteria.length}
          </div>
          <div className="text-xs text-gray-400">
            Auto-expanding • Max height: 500px
          </div>
        </div>
      </div>
    </div>
  )
} 