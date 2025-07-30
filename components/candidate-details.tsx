import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { 
  Upload, Download, FileText, Clock, User, Mail, Phone, MapPin, X, CheckCircle, AlertCircle, 
  Loader2, Edit3, Save, RotateCcw, ChevronDown, XCircle, File, Bookmark 
} from "lucide-react"
import { toast } from "sonner"
import { EvaluationRenderer, EnhancedEvaluationRenderer, EvaluationSummaryRenderer } from "./evaluation-parser"
import { formatName } from "@/lib/utils"

// Types
interface OverallData {
  name: string;
  email: string;
  phone: string;
  resume_url: string;
  score: number;
  recommendation_category: string;
}

interface IndividualData {
  professional_overview: string;
  key_qualifications: string;
  career_progression: string;
  justification: string;
  evaluation_summary?: string;
}

interface Candidate {
  overall_data: OverallData;
  individual_data: IndividualData;
  candidate_id?: string; // Add candidate ID for API calls
  status?: string; // Add status field
  current_status?: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    order_index: number;
    candidate_id: string;
    is_evaluation: boolean;
    job_pipeline_id: string;
  };
  evaluation_data?: {
    available: boolean;
    total_evaluations: number;
    by_pipeline: { [key: string]: any };
    current_status: any;
  };
}

interface PipelineStage {
  id?: string;
  job_id?: string;
  stage_type: string;
  order_index: number;
  is_active: boolean;
  is_mandatory?: boolean;
  created_at?: string;
  evaluation_criteria?: string;
  round_id?: string;
}

interface CandidateDetailsProps {
  selectedCandidate: Candidate | null
  jobRole: string
  candidateDetailTab: string
  onClose: () => void
  onTabChange: (tab: string) => void
  getRecommendationDisplay: (candidate: Candidate) => {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    text: string;
  }
  jobPipelineId?: string // Add job pipeline ID for API calls
  onStatusUpdate?: (candidateId: string, status: string, pipelineData?: { pipeline_id?: string; pipeline_info?: any; candidates?: any[]; total_count?: number }) => void // Callback for status updates
  // New props for dynamic tabs
  pipelineStages?: PipelineStage[]
  currentRound?: string
}

// Status options with their display properties
const STATUS_OPTIONS = [
  {
    value: 'selected',
    label: 'Selected',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    dotColor: 'bg-green-500'
  },
  {
    value: 'waitlisted',
    label: 'Waitlisted',
    icon: <AlertCircle className="w-4 h-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    dotColor: 'bg-yellow-500'
  },
  {
    value: 'action_pending',
    label: 'Action pending',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    dotColor: 'bg-blue-500'
  },
  {
    value: 'rejected',
    label: 'Rejected',
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    dotColor: 'bg-red-500'
  }
];

export function CandidateDetails({
  selectedCandidate,
  jobRole,
  candidateDetailTab,
  onClose,
  onTabChange,
  getRecommendationDisplay,
  jobPipelineId,
  onStatusUpdate,
  pipelineStages = [],
  currentRound = "Resume Screening"
}: CandidateDetailsProps) {
  // API Base URLs
  const EVALUATION_API_BASE_URL = process.env.NEXT_PUBLIC_EVALUATION_API_BASE_URL!
  const PIPELINE_API_BASE_URL = process.env.NEXT_PUBLIC_PIPELINE_API_BASE_URL!
  const CANDIDATE_STATUS_API_BASE_URL = process.env.NEXT_PUBLIC_CANDIDATE_STATUS_API_BASE_URL!
  const [currentStatus, setCurrentStatus] = useState(selectedCandidate?.status || 'action_pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // State for file uploads and text input
  const [uploadedFiles, setUploadedFiles] = useState<{ [roundName: string]: File[] }>({});
  const [textInputs, setTextInputs] = useState<{ [roundName: string]: string }>({});
  
  // State for evaluation results
  const [evaluationResults, setEvaluationResults] = useState<{ [roundName: string]: any }>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // State for edit mode and confirmation dialog
  const [editMode, setEditMode] = useState<{ [roundName: string]: boolean }>({});
  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [pendingEditRound, setPendingEditRound] = useState<string>('');

  // Load existing evaluation results from candidate data when component mounts or candidate changes
  useEffect(() => {
    if (selectedCandidate?.evaluation_data?.by_pipeline) {
      const existingResults: { [roundName: string]: any } = {};
      
      // Extract evaluation results from candidate data
      Object.entries(selectedCandidate.evaluation_data.by_pipeline).forEach(([pipelineId, pipelineData]: [string, any]) => {
        if (pipelineData?.evaluation_result) {
          // Find the stage type for this pipeline
          const stage = pipelineStages.find(s => s.id === pipelineId);
          if (stage) {
            const result = pipelineData.evaluation_result;
            
            const evaluationData = {
              // New API format fields
              evaluation_summary: result.evaluation_summary,
              competency_evaluation: result.competency_evaluation,
              interviewer_evaluation_summary: result.interviewer_evaluation_summary,
              overall_percentage_score: result.overall_percentage_score,
              round_type: result.round_type,
              
              // Legacy fields for backward compatibility
              score: result.score,
              recommendation_category: result.recommendation_category,
              summary: result.summary, // fallback for old format
              
              // Metadata
              created_at: pipelineData.created_at,
              round_name: stage.stage_type,
              pipeline_id: pipelineId,
              success: true
            };
            
            existingResults[stage.stage_type] = evaluationData;
          }
        }
      });
      
      setEvaluationResults(existingResults);
    }
  }, [selectedCandidate?.candidate_id, pipelineStages]);

  // REMOVED: fetchCandidateStatus function and useEffect
  // The candidate status is already available in selectedCandidate.status prop
  // Making additional API calls is unnecessary and causes performance issues
  // The status is updated through the onStatusUpdate callback when changes are made

  // Update current status when selected candidate changes
  useEffect(() => {
    if (selectedCandidate?.status) {
      setCurrentStatus(selectedCandidate.status);
    }
  }, [selectedCandidate?.status]);

  // REMOVED: useEffect that was calling fetchCandidateStatus
  // This was causing excessive API calls since the status is already available in props

  if (!selectedCandidate) return null;

  const recommendation = getRecommendationDisplay(selectedCandidate);

  // Check if status updates are available
  const canUpdateStatus = selectedCandidate.candidate_id && jobPipelineId;
  


  // Get current status display properties
  const getCurrentStatusDisplay = () => {
    return STATUS_OPTIONS.find(option => option.value === currentStatus) || STATUS_OPTIONS[2]; // Default to action_pending
  };

  const currentStatusDisplay = getCurrentStatusDisplay();

  // Generate dynamic tabs based on current round and pipeline stages
  const generateTabs = () => {
    const tabs = [];
    
    // Always add Summary tab
    tabs.push({ id: "overview", label: "Summary" });
    
    // Add Resume Scoring tab
    tabs.push({ id: "assessment", label: "Resume Scoring" });
    
    // Find current round index
    const currentRoundIndex = pipelineStages.findIndex(stage => stage.stage_type === currentRound);
    
    // Add tabs for current round and previous rounds in correct order
    if (currentRoundIndex >= 0) {
      // Add previous rounds first (excluding Resume Screening as it's already covered by Resume Scoring)
      for (let i = 0; i < currentRoundIndex; i++) {
        const stage = pipelineStages[i];
        if (stage.stage_type !== "Resume Screening") {
          tabs.push({ 
            id: stage.stage_type.toLowerCase().replace(/\s+/g, '-'), 
            label: stage.stage_type 
          });
        }
      }
      
      // Add current round tab last (but exclude Resume Screening and Offer Rollout & Negotiation)
      if (currentRound !== "Resume Screening" && currentRound !== "Offer Rollout & Negotiation") {
        tabs.push({ id: currentRound.toLowerCase().replace(/\s+/g, '-'), label: currentRound });
      }
    }
    
    return tabs;
  };

  const tabs = generateTabs();

  // Handle file upload
  const handleFileUpload = (roundName: string, files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    setUploadedFiles(prev => ({
      ...prev,
      [roundName]: [...(prev[roundName] || []), ...fileArray]
    }));
  };

  // Remove file
  const removeFile = (roundName: string, fileIndex: number) => {
    setUploadedFiles(prev => ({
      ...prev,
      [roundName]: prev[roundName]?.filter((_, index) => index !== fileIndex) || []
    }));
  };

  // Handle text input change
  const handleTextChange = (roundName: string, text: string) => {
    setTextInputs(prev => ({
      ...prev,
      [roundName]: text
    }));
  };

  // Check if this is the current round tab and should show upload functionality
  const isCurrentRound = (tabLabel: string) => {
    // Don't show upload functionality for Resume Screening (as it uses Resume Scoring) 
    // and Offer Rollout & Negotiation (final round)
    if (tabLabel === "Resume Screening" || tabLabel === "Offer Rollout & Negotiation") {
      return false;
    }
    return tabLabel === currentRound;
  };

  // Check if evaluation results exist for a specific round
  const hasEvaluationResults = (roundName: string) => {
    return !!evaluationResults[roundName];
  };

  // Check if a round is a previous round (not current)
  const isPreviousRound = (tabLabel: string) => {
    if (tabLabel === "Resume Screening" || tabLabel === "Offer Rollout & Negotiation") {
      return false;
    }
    return tabLabel !== currentRound;
  };

  // Simple check: if is_evaluation is true, hide upload interface
  const isRoundLocked = () => {
    return selectedCandidate?.current_status?.is_evaluation === true;
  };

  // Handle edit mode toggle for previous rounds
  const handleEditToggle = (roundName: string) => {
    if (isPreviousRound(roundName)) {
      // Show confirmation dialog for previous rounds
      setPendingEditRound(roundName);
      setShowEditConfirmation(true);
    } else {
      // Direct toggle for current round
      setEditMode(prev => ({
        ...prev,
        [roundName]: !prev[roundName]
      }));
    }
  };

  // Confirm edit mode for previous round
  const confirmEditMode = () => {
    setEditMode(prev => ({
      ...prev,
      [pendingEditRound]: true
    }));
    
    setShowEditConfirmation(false);
    setPendingEditRound('');
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setShowEditConfirmation(false);
    setPendingEditRound('');
  };



  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Submit evaluation to API
  const submitEvaluation = async (roundName: string) => {
    if (!selectedCandidate?.candidate_id || !jobPipelineId) {
      return;
    }

    const hasFiles = uploadedFiles[roundName] && uploadedFiles[roundName].length > 0;
    const hasText = textInputs[roundName] && textInputs[roundName].trim();

    if (!hasFiles && !hasText) {
      return;
    }

    setIsEvaluating(true);
    try {
      let requestBody: any = {
        candidate_id: selectedCandidate.candidate_id,
        job_pipeline_id: jobPipelineId,
      };

      if (hasText) {
        // Submit text content
        requestBody.text_content = textInputs[roundName];
        requestBody.file_type = "text";
      } else if (hasFiles) {
        // Submit file content (use first file for now)
        const file = uploadedFiles[roundName][0];
        const base64Content = await fileToBase64(file);
        requestBody.file_content = base64Content;
        requestBody.file_type = file.name.endsWith('.pdf') ? 'pdf' : 'txt';
      }

      const response = await fetch(`${EVALUATION_API_BASE_URL}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Structure the evaluation result to match our expected format
        const evaluationData = {
          // New API format fields
          evaluation_summary: result.evaluation_summary,
          competency_evaluation: result.competency_evaluation,
          interviewer_evaluation_summary: result.interviewer_evaluation_summary,
          overall_percentage_score: result.overall_percentage_score,
          round_type: result.round_type,
          
          // Legacy fields for backward compatibility
          score: result.score, // for Resume Screening rounds
          recommendation_category: result.recommendation_category,
          
          // Metadata from API response
          candidate_id: result.candidate_id,
          job_id: result.job_id,
          round_id: result.round_id,
          job_pipeline_id: result.job_pipeline_id,
          round_name: result.round_name,
          file_stored: result.file_stored,
          file_s3_path: result.file_s3_path,
          created_at: new Date().toISOString(),
          success: true
        };
        
        setEvaluationResults(prev => ({
          ...prev,
          [roundName]: evaluationData
        }));
        
        console.log(`✅ Evaluation submitted for ${roundName}:`, evaluationData);
        
        // Show success toast with appropriate message
        if (result.round_type === 'INTERVIEW' && result.overall_percentage_score !== undefined) {
          toast.success(`Interview evaluation completed with ${result.overall_percentage_score.toFixed(1)}% competency score`);
        } else if (result.score) {
          toast.success(`Assessment evaluation completed with score ${result.score}/5`);
        } else {
          toast.success(`Evaluation completed for ${roundName}`);
        }
      } else {
        throw new Error(result.error_message || 'Evaluation failed');
      }
    } catch (error) {
      console.error('Evaluation error:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Function to update candidate status
  const updateCandidateStatus = async (status: string) => {
    if (!canUpdateStatus) {
      console.warn('Status updates not available - missing candidate_id or jobPipelineId');
      return;
    }

    console.log(`🔄 Updating candidate status to: ${status}`);

    setIsUpdatingStatus(true);
    try {
      let response;
      let data;

      // Use different endpoints based on status
      if (status === 'confirm_for_next_round') {
        // Use confirm endpoint for next round confirmation
        response = await fetch(`${PIPELINE_API_BASE_URL}/api/pipeline/${jobPipelineId}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidate_id: selectedCandidate.candidate_id,
            status: status
          })
        });
      } else {
        // Use update endpoint for other status changes (selected, waitlisted, rejected, action_pending)
        response = await fetch(`${CANDIDATE_STATUS_API_BASE_URL}/candidate-status/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            candidate_id: selectedCandidate.candidate_id,
            job_pipeline_id: jobPipelineId,
            status: status
          })
        });
      }



      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Status update API error:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      data = await response.json();
      console.log('✅ Status updated successfully');
      
      // Check if this is a next round response (contains pipeline_info and candidates)
      if (data.pipeline_info && data.candidates) {
        console.log('🎯 Next round pipeline created');
      }
      
      setCurrentStatus(status);
      
      // Call the callback to notify parent component with additional data
      if (onStatusUpdate) {
        // Pass the pipeline data if it exists (for next round creation)
        const pipelineData = data.pipeline_info && data.candidates ? {
          pipeline_id: data.pipeline_id,
          pipeline_info: data.pipeline_info,
          candidates: data.candidates,
          total_count: data.total_count
        } : undefined;
        
        onStatusUpdate(selectedCandidate.candidate_id!, status, pipelineData);
      }
    } catch (error) {
      console.error('❌ Error updating candidate status:', error);
      // Revert the status change on error
      setCurrentStatus(currentStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };



  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />
      
      {/* Slide-out Panel */}
      <div className="fixed top-4 right-4 bottom-4 w-2/3 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">All roles</div>
            <ChevronDown className="w-4 h-4 text-gray-400 rotate-90" />
            <div className="text-sm text-gray-900 font-medium">{jobRole}</div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-xl"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Candidate Info Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                              <h2 className="text-xl font-semibold text-gray-900">{formatName(selectedCandidate.overall_data.name)}</h2>
              {selectedCandidate.overall_data.resume_url && (
                <button
                  onClick={() => {
                    window.open(selectedCandidate.overall_data.resume_url, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Download Resume"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Contact
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl">
                  <DropdownMenuItem className="rounded-lg">
                    <a href={`mailto:${selectedCandidate.overall_data.email}`}>Send Email</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">
                    <a href={`tel:${selectedCandidate.overall_data.phone}`}>Call</a>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-lg">Send Message</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    className={`rounded-xl ${currentStatusDisplay.bgColor} ${currentStatusDisplay.color} hover:opacity-80 ${!canUpdateStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isUpdatingStatus || !canUpdateStatus}
                    title={!canUpdateStatus ? 'Status updates only available when viewing a specific job round' : ''}
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      currentStatusDisplay.icon
                    )}
                    {currentStatusDisplay.label}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-xl">
                  {canUpdateStatus ? (
                    STATUS_OPTIONS.map((option) => (
                      <DropdownMenuItem 
                        key={option.value}
                        className={`rounded-lg ${option.color} ${option.value === currentStatus ? 'bg-gray-50' : ''}`}
                        onClick={() => updateCandidateStatus(option.value)}
                      >
                        <div className={`w-2 h-2 ${option.dotColor} rounded-full mr-2`} />
                        {option.label}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      Status updates only available when viewing a specific job round
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div>{selectedCandidate.overall_data.email}</div>
            <div>{selectedCandidate.overall_data.phone}</div>
          </div>
          
          {/* Show warning if status updates are not available */}
          {!canUpdateStatus && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Status updates are only available when viewing candidates from a specific job round. 
                  {!selectedCandidate.candidate_id && ' Missing candidate ID. '}
                  {!jobPipelineId && ' Missing job pipeline ID. '}
                  Please select a job and round to enable status updates.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                candidateDetailTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`${candidateDetailTab === tab.id ? 'block' : 'hidden'}`}
            >
              {tab.id === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Professional Overview</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedCandidate.individual_data.professional_overview}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Qualifications</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedCandidate.individual_data.key_qualifications}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Career Progression</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedCandidate.individual_data.career_progression}
                    </p>
                  </div>
                </div>
              )}

              {tab.id === "assessment" && (
                <div className="space-y-6">
                  {/* Score Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                      {selectedCandidate.overall_data.score}<span className="text-2xl text-gray-500">/5</span>
                    </div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                  </div>

                  {/* Recommendation */}
                  <div className={`${recommendation.bgColor} rounded-2xl p-6`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={recommendation.color}>{recommendation.icon}</div>
                      <h3 className={`text-lg font-semibold ${recommendation.color}`}>
                        {recommendation.text.split(' (')[0]}
                      </h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedCandidate.individual_data.justification}
                    </p>
                  </div>
                </div>
              )}

                            {/* Content for current round with file upload and text input */}
              {isCurrentRound(tab.label) && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    
                    {/* Input Options - Show only if not locked and no evaluation results */}
                    {!isRoundLocked() && !hasEvaluationResults(tab.label) && (
                      <div className="space-y-6">
                        {/* Enter Text Option */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Enter Text to Evaluate
                          </label>
                          <Textarea
                            placeholder={`Enter your ${tab.label} evaluation text here...`}
                            value={textInputs[tab.label] || ''}
                            onChange={(e) => handleTextChange(tab.label, e.target.value)}
                            className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Add evaluation text that can be used for scoring
                          </p>
                        </div>

                        {/* Upload Files Option */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Upload Files (PDF or TXT)
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition-colors">
                            <div className="text-center">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                              <p className="text-sm text-gray-600 mb-2">
                                Drop files here or click to browse
                              </p>
                              <Input
                                type="file"
                                multiple
                                accept=".pdf,.txt"
                                onChange={(e) => handleFileUpload(tab.label, e.target.files)}
                                className="cursor-pointer text-xs max-w-xs mx-auto"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    


                    {/* Content Preview */}
                    {(uploadedFiles[tab.label]?.length > 0 || (textInputs[tab.label] && textInputs[tab.label].trim())) && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Preview</h4>
                        
                        {/* Text Preview */}
                        {textInputs[tab.label] && textInputs[tab.label].trim() && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <File className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">Evaluation Text</span>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {textInputs[tab.label]}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Files Preview */}
                        {uploadedFiles[tab.label] && uploadedFiles[tab.label].length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Upload className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedFiles[tab.label].length})</span>
                            </div>
                            <div className="space-y-2">
                              {uploadedFiles[tab.label].map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
                                  <div className="flex items-center gap-3">
                                    <File className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-700">{file.name}</span>
                                    <span className="text-xs text-gray-500">
                                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => removeFile(tab.label, index)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded"
                                    title="Remove file"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons - Hide for locked rounds or rounds with evaluation results */}
                    {!isRoundLocked() && !hasEvaluationResults(tab.label) && (
                      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                      <Button
                        onClick={() => {
                          const hasFiles = uploadedFiles[tab.label] && uploadedFiles[tab.label].length > 0;
                          const hasText = textInputs[tab.label] && textInputs[tab.label].trim();
                          
                          if (!hasFiles && !hasText) {
                            return;
                          }
                        }}
                        variant="outline"
                        className="px-6"
                      >
                        Save Draft
                      </Button>
                      <Button
                        onClick={() => submitEvaluation(tab.label)}
                        disabled={isEvaluating}
                        className="bg-blue-600 hover:bg-blue-700 px-6"
                      >
                        {isEvaluating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          'Evaluate with AI'
                        )}
                      </Button>
                    </div>
                    )}

                    {/* Evaluation Results */}
                    {evaluationResults[tab.label] && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">
                              AI Evaluation Results
                            </h4>
                            <p className="text-sm text-gray-500">
                              Round: {evaluationResults[tab.label].round_name} • {evaluationResults[tab.label].round_type || 'Assessment'}
                            </p>
                          </div>
                        </div>
                        
                        
                        
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-5 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white">
                                  Evaluation Report
                                </h3>
                                <p className="text-blue-100 text-sm mt-1">
                                  AI-powered assessment of candidate performance
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-6">
                            {/* Use enhanced renderer if we have the new format */}
                            {evaluationResults[tab.label].evaluation_summary ? (
                              <EnhancedEvaluationRenderer 
                                evaluationResult={{
                                  evaluation_summary: evaluationResults[tab.label].evaluation_summary,
                                  competency_evaluation: evaluationResults[tab.label].competency_evaluation,
                                  interviewer_evaluation_summary: evaluationResults[tab.label].interviewer_evaluation_summary,
                                  overall_percentage_score: evaluationResults[tab.label].overall_percentage_score,
                                  round_type: evaluationResults[tab.label].round_type || (tab.label.toLowerCase().includes('interview') ? 'INTERVIEW' : 'ASSESSMENT'),
                                  success: true
                                }}
                                showMetrics={false}
                              />
                            ) : (
                              /* Fallback to old renderer for legacy format */
                            <EvaluationRenderer 
                                content={evaluationResults[tab.label].summary || 'No evaluation content available.'}
                              showMetrics={true}
                            />
                            )}
                          </div>
                        </div>


                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Previous round evaluation results */}
              {tab.id !== "overview" && tab.id !== "assessment" && !isCurrentRound(tab.label) && (() => {
                // Find the pipeline stage for this tab
                const pipelineStage = pipelineStages.find(stage => stage.stage_type === tab.label);
                
                if (pipelineStage?.id && selectedCandidate.evaluation_data?.by_pipeline) {
                  // Get evaluation result for this specific pipeline
                  const pipelineId = pipelineStage.id;
                  const evaluationResult = selectedCandidate.evaluation_data.by_pipeline[pipelineId];
                  
                  if (evaluationResult?.evaluation_result) {
                    const result = evaluationResult.evaluation_result;
                    
                    // Check if this is a Resume Screening round (uses old scoring format)
                    const isResumeScreening = tab.label === "Resume Screening";
                    
                    return (
                      <div className="space-y-6">
                        {/* Evaluation Header */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {tab.label} Evaluation Results
                              </h3>
                              <p className="text-sm text-gray-500">
                                Completed on {new Date(evaluationResult.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {/* Resume Screening: Show traditional score display */}
                          {isResumeScreening && (result.score || result.recommendation_category) && (
                          <div className="grid grid-cols-2 gap-4 mb-6">
                              {result.score && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                    {result.score}<span className="text-lg text-gray-500">/5</span>
                                </div>
                                <div className="text-sm text-gray-600">Overall Score</div>
                              </div>
                            )}
                              {result.recommendation_category && (
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 text-center">
                                <div className="text-lg font-semibold text-gray-900 mb-1 capitalize">
                                    {result.recommendation_category.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-gray-600">Recommendation</div>
                              </div>
                            )}
                          </div>
                          )}
                          
                          {/* Other Rounds: Show percentage score if available */}
                          {!isResumeScreening && result.overall_percentage_score !== undefined && result.overall_percentage_score !== null && (
                            <div className="mb-6">
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
                                <div className="text-2xl font-bold text-gray-900 mb-1">
                                  {result.overall_percentage_score.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Overall Competency Score</div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Enhanced Evaluation Display */}
                        {result.evaluation_summary && (
                          <EnhancedEvaluationRenderer 
                            evaluationResult={{
                              evaluation_summary: result.evaluation_summary,
                              competency_evaluation: result.competency_evaluation,
                              interviewer_evaluation_summary: result.interviewer_evaluation_summary,
                              overall_percentage_score: result.overall_percentage_score,
                              round_type: result.round_type || (tab.label.toLowerCase().includes('interview') ? 'INTERVIEW' : 'ASSESSMENT'),
                              success: true
                            }}
                            showMetrics={false}
                          />
                        )}
                        
                        {/* Fallback to old renderer for legacy format */}
                        {!result.evaluation_summary && result.summary && (
                          <EvaluationRenderer 
                            content={result.summary}
                            showMetrics={true}
                          />
                        )}
                      </div>
                    );
                  }
                }
                
                // Fallback: No evaluation data available
                return (
                  <div className="space-y-6">
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <Clock className="w-12 h-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {tab.label} Evaluation
                      </h3>
                      <p className="text-gray-500">
                        No evaluation data available for {tab.label} round.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Confirmation Dialog */}
      <Dialog open={showEditConfirmation} onOpenChange={setShowEditConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Confirm Edit Mode
            </DialogTitle>
            <DialogDescription>
              You are about to enable edit mode for the <strong>{pendingEditRound}</strong> round. 
              This round has already been completed. Are you sure you want to make changes to the evaluation?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelEditMode}>
              Cancel
            </Button>
            <Button onClick={confirmEditMode} className="bg-yellow-600 hover:bg-yellow-700">
              Yes, Enable Edit Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 