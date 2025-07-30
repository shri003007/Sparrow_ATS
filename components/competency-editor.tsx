"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical, AlertCircle, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types
interface RubricQuestion {
  id: string
  text: string
}

interface Competency {
  id: string
  name: string
  description: string
  rubric_scorecard: [string, string][] // [question_id, question_text]
}

interface CompetencyEditorProps {
  competencies: Competency[]
  onChange: (competencies: Competency[]) => void
  maxCompetencies?: number
  minQuestions?: number
  maxQuestions?: number
}

// Individual Question Editor Component
function QuestionEditor({ 
  question, 
  index, 
  onUpdate, 
  onRemove,
  canRemove 
}: {
  question: [string, string]
  index: number
  onUpdate: (index: number, question: [string, string]) => void
  onRemove: (index: number) => void
  canRemove: boolean
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 120);
      textarea.style.height = newHeight + 'px';
    }
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [question[1], adjustHeight]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(index, [question[0], e.target.value]);
    adjustHeight();
  };

  return (
    <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-2 flex-shrink-0">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
        <Badge variant="outline" className="text-xs min-w-[32px] justify-center">
          {String(index + 1).padStart(2, '0')}
        </Badge>
      </div>
      
      <div className="flex-1 space-y-2">
        <Input
          placeholder="Question ID (e.g., 01, 02, 03)"
          value={question[0]}
          onChange={(e) => onUpdate(index, [e.target.value, question[1]])}
          className="h-8 text-sm"
          maxLength={10}
        />
        <textarea
          ref={textareaRef}
          placeholder="Enter the evaluation question..."
          value={question[1]}
          onChange={handleTextareaChange}
          className="w-full min-h-[60px] max-h-[120px] p-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 overflow-hidden"
        />
      </div>
      
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

// Individual Competency Editor Component
function CompetencyCard({
  competency,
  index,
  onUpdate,
  onRemove,
  canRemove,
  minQuestions,
  maxQuestions
}: {
  competency: Competency
  index: number
  onUpdate: (index: number, competency: Competency) => void
  onRemove: (index: number) => void
  canRemove: boolean
  minQuestions: number
  maxQuestions: number
}) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const adjustDescriptionHeight = useCallback(() => {
    const textarea = descriptionRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 100);
      textarea.style.height = newHeight + 'px';
    }
  }, []);

  useEffect(() => {
    adjustDescriptionHeight();
  }, [competency.description, adjustDescriptionHeight]);

  const updateCompetencyField = (field: keyof Competency, value: any) => {
    onUpdate(index, { ...competency, [field]: value })
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCompetencyField('description', e.target.value);
    adjustDescriptionHeight();
  };

  const updateQuestion = (questionIndex: number, question: [string, string]) => {
    const newQuestions = [...competency.rubric_scorecard]
    newQuestions[questionIndex] = question
    updateCompetencyField('rubric_scorecard', newQuestions)
  }

  const addQuestion = () => {
    if (competency.rubric_scorecard.length < maxQuestions) {
      const nextId = String(competency.rubric_scorecard.length + 1).padStart(2, '0')
      updateCompetencyField('rubric_scorecard', [
        ...competency.rubric_scorecard,
        [nextId, '']
      ])
    }
  }

  const removeQuestion = (questionIndex: number) => {
    if (competency.rubric_scorecard.length > minQuestions) {
      const newQuestions = competency.rubric_scorecard.filter((_, i) => i !== questionIndex)
      updateCompetencyField('rubric_scorecard', newQuestions)
    }
  }

  const questionCount = competency.rubric_scorecard.length
  const isValidQuestionCount = questionCount >= minQuestions && questionCount <= maxQuestions

  return (
    <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
              <Badge variant="secondary" className="text-xs">
                Competency {index + 1}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isValidQuestionCount ? "default" : "destructive"} className="text-xs">
                {questionCount} question{questionCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
          
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          <Input
            placeholder="Competency name (e.g., Statistical Fundamentals)"
            value={competency.name}
            onChange={(e) => updateCompetencyField('name', e.target.value)}
            className="font-medium"
            maxLength={100}
          />
          <textarea
            ref={descriptionRef}
            placeholder="Describe what this competency evaluates..."
            value={competency.description}
            onChange={handleDescriptionChange}
            className="w-full min-h-[60px] max-h-[100px] p-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 overflow-hidden"
            maxLength={500}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Evaluation Questions</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {minQuestions}-{maxQuestions} questions required
            </span>
            {questionCount < maxQuestions && (
              <Button
                variant="outline"
                size="sm"
                onClick={addQuestion}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Question
              </Button>
            )}
          </div>
        </div>

        {!isValidQuestionCount && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Please add {minQuestions}-{maxQuestions} evaluation questions for this competency.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3">
          {competency.rubric_scorecard.map((question, qIndex) => (
            <QuestionEditor
              key={qIndex}
              question={question}
              index={qIndex}
              onUpdate={updateQuestion}
              onRemove={removeQuestion}
              canRemove={questionCount > minQuestions}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Competency Editor Component
export function CompetencyEditor({
  competencies,
  onChange,
  maxCompetencies = 6,
  minQuestions = 3,
  maxQuestions = 10
}: CompetencyEditorProps) {
  const generateId = () => `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const addCompetency = useCallback(() => {
    if (competencies.length < maxCompetencies) {
      const newCompetency: Competency = {
        id: generateId(),
        name: '',
        description: '',
        rubric_scorecard: [
          ['01', ''],
          ['02', ''],
          ['03', '']
        ]
      }
      onChange([...competencies, newCompetency])
    }
  }, [competencies, maxCompetencies, onChange])

  const updateCompetency = useCallback((index: number, competency: Competency) => {
    const newCompetencies = [...competencies]
    newCompetencies[index] = competency
    onChange(newCompetencies)
  }, [competencies, onChange])

  const removeCompetency = useCallback((index: number) => {
    if (competencies.length > 1) {
      onChange(competencies.filter((_, i) => i !== index))
    }
  }, [competencies, onChange])

  const isValid = competencies.every(comp => 
    comp.name.trim() && 
    comp.description.trim() && 
    comp.rubric_scorecard.length >= minQuestions &&
    comp.rubric_scorecard.length <= maxQuestions &&
    comp.rubric_scorecard.every(q => q[0].trim() && q[1].trim())
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-white py-2 z-10">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Competency Evaluation</h3>
          <p className="text-sm text-gray-600 mt-1">
            Define the competencies and evaluation criteria for this pipeline stage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isValid ? "default" : "secondary"} className="flex items-center gap-1">
            {isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {competencies.length}/{maxCompetencies} competencies
          </Badge>
        </div>
      </div>

      {/* Competencies */}
      <div className="space-y-4 pb-4">
        {competencies.map((competency, index) => (
          <CompetencyCard
            key={competency.id}
            competency={competency}
            index={index}
            onUpdate={updateCompetency}
            onRemove={removeCompetency}
            canRemove={competencies.length > 1}
            minQuestions={minQuestions}
            maxQuestions={maxQuestions}
          />
        ))}
      </div>

      {/* Add Competency Button */}
      {competencies.length < maxCompetencies && (
        <div className="sticky bottom-0 bg-white pt-4">
          <Button
            variant="outline"
            onClick={addCompetency}
            className="w-full border-dashed border-2 hover:border-solid transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Competency ({competencies.length + 1}/{maxCompetencies})
          </Button>
        </div>
      )}

      {/* Validation Summary */}
      {!isValid && (
        <div className="sticky bottom-0 bg-white pt-2">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm">
              Please complete all competency fields and ensure each competency has {minQuestions}-{maxQuestions} evaluation questions.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}

export type { Competency, RubricQuestion } 