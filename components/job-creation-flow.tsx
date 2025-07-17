import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  Briefcase,
  FileText,
  Users,
  Settings,
  X,
  Save,
  Loader2,
  Plus,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Wand2
} from "lucide-react"

// Types
interface ApplicationQuestion {
  id?: string;
  job_id?: string;
  question_type: string;
  is_required: boolean;
  is_enabled: boolean;
  created_at?: string;
}

interface PipelineStage {
  id?: string;
  job_id?: string;
  stage_type: string;
  order_index: number;
  is_active: boolean;
  is_mandatory?: boolean;
  created_at?: string;
}

interface JobFormData {
  posting_title: string;
  employment_type: string;
  minimum_experience: string;
  compensation_type: string;
  compensation_value: string;
  compensation_currency: string;
  job_description: string;
  created_by: string;
  expires_at?: string;
}

interface JobBoard {
  name: string;
  enabled: boolean;
  icon: string;
}

type JobCreationStep = 'job-info' | 'application-details' | 'job-pipeline' | 'job-boards';

interface JobCreationFlowProps {
  showJobCreation: boolean
  currentStep: JobCreationStep
  jobFormData: JobFormData
  applicationQuestions: ApplicationQuestion[]
  pipelineStages: PipelineStage[]
  jobBoards: JobBoard[]
  completedSteps: Set<JobCreationStep>
  loading: boolean
  error: string | null
  successMessage: string | null
  onClose: () => void
  onStepChange: (step: JobCreationStep) => void
  onJobFormDataChange: (data: Partial<JobFormData>) => void
  onJobFormSubmit: (e: React.FormEvent) => void
  onApplicationQuestionsSubmit: () => void
  onPipelineStagesSubmit: () => void
  onCompleteJobCreation: () => void
  updateQuestionConfig: (index: number, field: keyof ApplicationQuestion, value: boolean) => void
  updateStageConfig: (index: number, field: keyof PipelineStage, value: boolean | string | number) => void
  addPipelineStage: () => void
  removePipelineStage: (index: number) => void
  movePipelineStage: (fromIndex: number, toIndex: number) => void
  updateJobBoardConfig: (index: number, enabled: boolean) => void
  onConfirmClose?: () => void
}

export function JobCreationFlow({
  showJobCreation,
  currentStep,
  jobFormData,
  applicationQuestions,
  pipelineStages,
  jobBoards,
  completedSteps,
  loading,
  error,
  successMessage,
  onClose,
  onStepChange,
  onJobFormDataChange,
  onJobFormSubmit,
  onApplicationQuestionsSubmit,
  onPipelineStagesSubmit,
  onCompleteJobCreation,
  updateQuestionConfig,
  updateStageConfig,
  addPipelineStage,
  removePipelineStage,
  movePipelineStage,
  updateJobBoardConfig,
  onConfirmClose
}: JobCreationFlowProps) {
  // Job Description Generator states
  const [showJDGenerator, setShowJDGenerator] = useState(false)
  const [jdContext, setJdContext] = useState("")
  const [generatingJD, setGeneratingJD] = useState(false)
  const [jdError, setJdError] = useState<string | null>(null)
  
  // Confirmation dialog state
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false)

  // Job Description Generator API URL
  const JD_API_URL = "https://ozvuo5xvvt2nljug4ldwnslk4i0mvegd.lambda-url.us-west-2.on.aws"

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    return jobFormData.posting_title || 
           jobFormData.minimum_experience || 
           jobFormData.compensation_value || 
           jobFormData.job_description ||
           completedSteps.size > 0
  }

  // Handle close button click
  const handleCloseClick = () => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirmation(true)
    } else {
      onClose()
    }
  }

  // Handle confirmed close
  const handleConfirmClose = () => {
    setShowCloseConfirmation(false)
    if (onConfirmClose) {
      onConfirmClose()
    } else {
      onClose()
    }
  }

  // Generate Job Description function
  const generateJobDescription = async () => {
    if (!jobFormData.posting_title || !jobFormData.employment_type || !jobFormData.minimum_experience) {
      setJdError("Please fill in Job Title, Employment Type, and Minimum Experience first")
      return
    }

    setGeneratingJD(true)
    setJdError(null)

    try {
      const payload = {
        job_title: jobFormData.posting_title,
        employment_type: jobFormData.employment_type,
        minimum_experience: jobFormData.minimum_experience,
        compensation: {
          type: jobFormData.compensation_type,
          amount: jobFormData.compensation_value || "0",
          currency: jobFormData.compensation_currency
        },
        job_description_context: jdContext
      }

      const response = await fetch(`${JD_API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Update the job description in the form
      onJobFormDataChange({ job_description: result.job_description })
      
      // Close the context box after successful generation
      setShowJDGenerator(false)
      setJdContext("")
      
    } catch (err) {
      console.error('Error generating job description:', err)
      setJdError(err instanceof Error ? err.message : 'Failed to generate job description')
    } finally {
      setGeneratingJD(false)
    }
  }

  // Keyboard shortcut handler for Cmd+J
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j' && currentStep === 'job-info') {
        event.preventDefault()
        if (showJDGenerator) {
          // If already open, close it
          setShowJDGenerator(false)
          setJdContext("")
          setJdError(null)
        } else {
          // If closed, open it
          setShowJDGenerator(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStep, showJDGenerator])

  if (!showJobCreation) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* Header with Steps */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">Create Job Opening</h2>
          </div>
          <button 
            onClick={handleCloseClick}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Progress - Removed automated emails */}
        <div className="flex items-center justify-between max-w-4xl">
          {[
            { key: 'job-info', label: 'Job Information', icon: <Briefcase className="w-5 h-5" /> },
            { key: 'application-details', label: 'Application Details', icon: <FileText className="w-5 h-5" /> },
            { key: 'job-pipeline', label: 'Job Pipeline', icon: <Users className="w-5 h-5" /> },
            { key: 'job-boards', label: 'Job Boards', icon: <Settings className="w-5 h-5" /> }
          ].map((step, index) => {
            const isActive = step.key === currentStep;
            const isCompleted = completedSteps.has(step.key as JobCreationStep);
            
            return (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                  isActive ? 'bg-blue-600 border-blue-600 text-white scale-110' : 
                  isCompleted ? 'bg-green-600 border-green-600 text-white' : 
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <div className="text-white text-sm">✓</div>
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`ml-3 text-sm font-medium transition-colors ${
                  isActive ? 'text-blue-600' : 
                  isCompleted ? 'text-green-600' : 
                  'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < 3 && (
                  <div className={`w-16 h-0.5 mx-4 transition-colors duration-300 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-4xl">
            {currentStep === 'job-info' && (
              <form onSubmit={onJobFormSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <X className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Save className="w-5 h-5" />
                      <span className="font-medium">{successMessage}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Job Title */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Job Title *</label>
                    <Input
                      placeholder="e.g., Senior Software Engineer"
                      className="rounded-xl"
                      required
                      value={jobFormData.posting_title}
                      onChange={(e) => onJobFormDataChange({ posting_title: e.target.value })}
                    />
                  </div>

                  {/* Employment Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Employment Type *</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={jobFormData.employment_type}
                      onChange={(e) => onJobFormDataChange({ employment_type: e.target.value })}
                      required
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>

                  {/* Minimum Experience */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Minimum Experience *</label>
                    <Input
                      placeholder="e.g., 3+ years"
                      className="rounded-xl"
                      required
                      value={jobFormData.minimum_experience}
                      onChange={(e) => onJobFormDataChange({ minimum_experience: e.target.value })}
                    />
                  </div>

                  {/* Compensation */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Compensation *</label>
                    <div className="flex gap-2">
                      <select className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={jobFormData.compensation_type}
                        onChange={(e) => onJobFormDataChange({ compensation_type: e.target.value })}
                      >
                        <option value="Fixed">Fixed</option>
                        <option value="Range">Range</option>
                        <option value="Hourly">Hourly</option>
                      </select>
                      <Input
                        placeholder="80000"
                        className="flex-1 rounded-xl"
                        required
                        value={jobFormData.compensation_value}
                        onChange={(e) => onJobFormDataChange({ compensation_value: e.target.value })}
                      />
                      <select className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={jobFormData.compensation_currency}
                        onChange={(e) => onJobFormDataChange({ compensation_currency: e.target.value })}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Job Description *</label>
                  

                  {/* Job Description Textarea with AI Integration */}
                  <div className="relative">
                    {showJDGenerator ? (
                      /* AI Assistant Interface - White theme to match the form */
                      <div className="bg-white border-2 border-blue-500 rounded-xl p-6 min-h-32 shadow-sm">
                        {/* Search Bar */}
                        <div className="relative">
                          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors">
                            {/* Left Icon */}
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                              <Wand2 className="w-3 h-3 text-white" />
                            </div>
                            
                            {/* Search Input */}
                            <input
                              type="text"
                              placeholder="Ask AI to generate job description..."
                              className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none"
                              value={jdContext}
                              onChange={(e) => setJdContext(e.target.value)}
                            />
                            
                            {/* Right Icons */}
                            <div className="flex items-center gap-2 ml-3">
                              
                              
                              <Button
                                type="button"
                                onClick={generateJobDescription}
                                disabled={generatingJD}
                                className="w-6 h-6 bg-blue-600 hover:bg-blue-700 p-0 rounded"
                              >
                                {generatingJD ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                                ) : (
                                  <ChevronUp className="w-3 h-3 text-white" />
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          
                        </div>
                        
                        {/* Close Button */}
                        <div className="absolute top-4 right-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowJDGenerator(false)
                              setJdContext("")
                              setJdError(null)
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {jdError && (
                          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-800">
                              <X className="w-4 h-4" />
                              <span className="text-sm font-medium">Error</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">{jdError}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Normal Textarea State */
                      <Textarea
                        placeholder="Detailed job description... (Press ⌘J to generate with AI)"
                        className="min-h-32 rounded-xl border-gray-300"
                        required
                        value={jobFormData.job_description}
                        onChange={(e) => onJobFormDataChange({ job_description: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-6">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={handleCloseClick}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      'Next Step'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Application Details with Toggle Switches */}
            {currentStep === 'application-details' && (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <X className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Save className="w-5 h-5" />
                      <span className="font-medium">{successMessage}</span>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Questions</h3>
                  <p className="text-gray-600 mb-6">Configure what information candidates need to provide when applying.</p>
                </div>

                <div className="space-y-4">
                  {applicationQuestions.map((question, index) => (
                    <div key={question.question_type} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 capitalize">
                          {question.question_type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {question.question_type === 'resume' && 'Upload CV/Resume document'}
                          {question.question_type === 'cover_letter' && 'Write or upload cover letter'}
                          {question.question_type === 'portfolio' && 'Provide portfolio or work samples link'}
                          {question.question_type === 'github_profile' && 'Share GitHub profile URL'}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        {/* Enabled Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Enabled</span>
                          <Switch
                            checked={question.is_enabled}
                            onCheckedChange={(checked) => updateQuestionConfig(index, 'is_enabled', checked)}
                          />
                        </div>
                        {/* Required Toggle with Asterisk */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Required</span>
                          <div className="relative">
                            <Switch
                              checked={question.is_required}
                              onCheckedChange={(checked) => updateQuestionConfig(index, 'is_required', checked)}
                              disabled={!question.is_enabled}
                            />
                            {question.is_required && question.is_enabled && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-white text-xs font-bold">*</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={() => onStepChange('job-info')}
                  >
                    Previous
                  </Button>
                  <Button 
                    type="button" 
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                    onClick={onApplicationQuestionsSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Next Step'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Enhanced Job Pipeline */}
            {currentStep === 'job-pipeline' && (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <X className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Save className="w-5 h-5" />
                      <span className="font-medium">{successMessage}</span>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Pipeline</h3>
                  <p className="text-gray-600 mb-6">Choose and arrange the statuses you want to use for the steps in this job pipeline, and we'll group your candidates by them.</p>
                </div>

                {/* Add Step Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPipelineStage}
                  className="rounded-xl mb-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>

                {/* Fixed First Stage - Resume Screening */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-400 text-white rounded-full text-sm font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-900 font-medium">Resume Screening</span>
                      <p className="text-sm text-gray-500">Fixed first stage</p>
                    </div>
                  </div>
                </div>

                {/* Draggable Pipeline Stages */}
                <div className="space-y-3">
                  {pipelineStages
                    .filter(stage => !stage.is_mandatory)
                    .map((stage, index) => (
                    <div 
                      key={index} 
                      className="bg-white border border-gray-200 p-4 rounded-xl cursor-move hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                        e.currentTarget.style.opacity = '0.5';
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.backgroundColor = 'white';
                        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (draggedIndex !== index) {
                          movePipelineStage(draggedIndex, index);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                          <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-medium">
                            {index + 2}
                          </div>
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="e.g., Phone Screened, Technical Interview"
                            value={stage.stage_type}
                            onChange={(e) => updateStageConfig(index, 'stage_type', e.target.value)}
                            className="border-0 bg-transparent text-gray-900 focus:ring-0 focus:outline-none p-0 font-medium"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Move Up */}
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => movePipelineStage(index, index - 1)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Move Down */}
                          {index < pipelineStages.filter(s => !s.is_mandatory).length - 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => movePipelineStage(index, index + 1)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          )}
                          {/* Remove */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePipelineStage(index)}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fixed Last Stages - No longer mandatory, just fixed at end */}
                <div className="space-y-3">
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-400 text-white rounded-full text-sm font-medium">
                        {pipelineStages.filter(s => !s.is_mandatory).length + 2}
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">Offer</span>
                        <p className="text-sm text-gray-500">Fixed stage</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-400 text-white rounded-full text-sm font-medium">
                        {pipelineStages.filter(s => !s.is_mandatory).length + 3}
                      </div>
                      <div className="flex-1">
                        <span className="text-gray-900 font-medium">Hired</span>
                        <p className="text-sm text-gray-500">Fixed final stage</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={() => onStepChange('application-details')}
                  >
                    Previous
                  </Button>
                  <Button 
                    type="button" 
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                    onClick={onPipelineStagesSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Next Step'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Job Boards Step */}
            {currentStep === 'job-boards' && (
              <div className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <X className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-red-700 mt-1">{error}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <Save className="w-5 h-5" />
                      <span className="font-medium">{successMessage}</span>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Job Boards</h3>
                  <p className="text-gray-600 mb-6">Choose where to post this job opening to attract candidates.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobBoards.map((board, index) => (
                    <div 
                      key={board.name} 
                      className={`border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        board.enabled 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => updateJobBoardConfig(index, !board.enabled)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{board.icon}</div>
                          <div>
                            <h4 className="font-medium text-gray-900">{board.name}</h4>
                            <p className="text-sm text-gray-500">
                              {board.name === 'LinkedIn' 
                                ? 'Professional networking platform' 
                                : 'Comprehensive HR platform'
                              }
                            </p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          board.enabled 
                            ? 'border-green-500 bg-green-500' 
                            : 'border-gray-300'
                        }`}>
                          {board.enabled && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                      {board.enabled && (
                        <div className="mt-4 text-sm text-green-700 bg-green-100 p-3 rounded-lg">
                          ✓ This job will be posted to {board.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-xl"
                    onClick={() => onStepChange('job-pipeline')}
                  >
                    Previous
                  </Button>
                  <Button 
                    type="button" 
                    className="bg-green-600 hover:bg-green-700 rounded-xl"
                    onClick={onCompleteJobCreation}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Job...
                      </>
                    ) : (
                      'Complete Job Creation'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
                </div>
      </div>

      {/* Confirmation Dialog for Closing */}
      <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close this form? All your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClose}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </div>
  )
} 