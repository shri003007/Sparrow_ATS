import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Search,
  Users,
  MessageCircle,
  Bookmark,
  Clock,
  Star,
  ThumbsUp,
  MessageSquare,
  ArrowRight,
  X,
  Download,
  ChevronDown,
  Loader2,
  Lock,
  CheckCircle,
  Calendar,
  Settings
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatName } from "@/lib/utils"
import { PipelineCriteriaModal } from "@/components/pipeline-criteria-modal"
import type { Competency } from "@/components/competency-editor"

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
}

interface Candidate {
  overall_data: OverallData;
  individual_data: IndividualData;
  status?: string;
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
  competencies?: Competency[]; // Add competencies support
}



interface OtherRoundsDashboardProps {
  jobRole: string
  candidates: Candidate[]
  filteredCandidates: Candidate[]
  loading: boolean
  error: string | null
  showMoreApplicants: boolean
  onCandidateClick: (candidate: Candidate) => void
  onShowMoreClick: () => void
  getRecommendationDisplay: (candidate: Candidate) => {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    text: string;
  }
  // Rounds functionality props
  pipelineStages?: PipelineStage[]
  selectedRound?: string
  onRoundChange?: (round: string) => void
  loadingRounds?: boolean
  // Progressive unlocking props
  unlockedRounds?: Set<string>
  onUnlockNextRound?: () => void
  loadingNextRound?: boolean
  nextRoundName?: string | null
  // Filtering props
  statusFilter?: string
  onStatusFilterChange?: (status: string) => void
  // Evaluation criteria props
  currentPipelineId?: string
  onSaveEvaluationCriteria?: (pipelineId: string, criteria: string) => Promise<any>
  onFetchEvaluationCriteria?: (pipelineId: string) => Promise<any>
}

export function OtherRoundsDashboard({
  jobRole,
  candidates,
  filteredCandidates,
  loading,
  error,
  showMoreApplicants,
  onCandidateClick,
  onShowMoreClick,
  getRecommendationDisplay,
  pipelineStages = [],
  selectedRound,
  onRoundChange,
  loadingRounds = false,
  unlockedRounds = new Set(),
  onUnlockNextRound,
  loadingNextRound = false,
  nextRoundName,
  statusFilter = 'all',
  onStatusFilterChange,
  currentPipelineId,
  onSaveEvaluationCriteria,
  onFetchEvaluationCriteria
}: OtherRoundsDashboardProps) {
  const [showEvaluationCriteriaEditor, setShowEvaluationCriteriaEditor] = useState(false);

  console.log(`📋 OtherRoundsDashboard: ${filteredCandidates?.length || 0} candidates for ${selectedRound}`);

  const handleEditEvaluationCriteria = () => {
    setShowEvaluationCriteriaEditor(true);
  };

  const handleSaveCriteriaAndCompetencies = async (criteria: string, competencies: Competency[]) => {
    if (currentPipelineId && onSaveEvaluationCriteria) {
      try {
        // For now, just save the criteria. In a full implementation, you'd extend the API to handle competencies too
        await onSaveEvaluationCriteria(currentPipelineId, criteria);
        
        // TODO: Add API call to save competencies
        console.log('Competencies to be saved:', competencies);
        
        // Close the modal
        setShowEvaluationCriteriaEditor(false);
      } catch (error) {
        console.error('Failed to save criteria and competencies:', error);
        // Handle error (show toast, etc.)
      }
    }
  };

  // Get current stage data for the modal
  const currentStage = pipelineStages.find(stage => stage.stage_type === selectedRound);
  const currentCriteria = currentStage?.evaluation_criteria || '';
  const currentCompetencies = currentStage?.competencies || [];


  return (
    <div className="flex-1 bg-gray-50 p-6">
      
      
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">All roles</div>
              <div className="w-1 h-1 bg-gray-300 rounded-full" />
              <div className="text-sm text-gray-900 font-medium">{jobRole}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{filteredCandidates?.length || 0} candidates found</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Round: {selectedRound}</span>
              </div>
            </div>
          </div>

          {/* Rounds Section with Progressive Unlocking */}
          {pipelineStages.length > 0 && (
            <div className="space-y-4">
              {/* Round Status Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Rounds:</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl min-w-[160px] justify-between"
                        disabled={loadingRounds}
                      >
                        {loadingRounds ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <>
                            <span>{selectedRound || "Select Round"}</span>
                            <ChevronDown className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="rounded-xl min-w-[200px]">
                      {pipelineStages.map((stage, index) => {
                        const isUnlocked = unlockedRounds.has(stage.stage_type);
                        const isSelected = selectedRound === stage.stage_type;
                        
                        return (
                          <DropdownMenuItem 
                            key={stage.id || index}
                            className={`rounded-lg cursor-pointer ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''} ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => isUnlocked && onRoundChange?.(stage.stage_type)}
                            disabled={!isUnlocked}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                                isUnlocked 
                                  ? 'bg-blue-100 text-blue-600' 
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                {isUnlocked ? stage.order_index : <Lock className="w-3 h-3" />}
                              </div>
                              <span className="flex-1">{stage.stage_type}</span>
                              {!isUnlocked && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  Locked
                                </span>
                              )}
                              {stage.is_mandatory && isUnlocked && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  Required
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Evaluation Criteria Edit Button */}
                  {selectedRound && 
                   selectedRound !== "Resume Screening" && 
                   selectedRound !== "Offer Rollout & Negotiation" &&
                   currentPipelineId && (
                                         <Button
                       onClick={handleEditEvaluationCriteria}
                       variant="outline"
                       size="sm"
                       className="rounded-xl"
                     >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Pipeline
                    </Button>
                  )}
                  
                  {/* Unlock Next Round Button */}
                  {nextRoundName && (
                    <Button
                      onClick={onUnlockNextRound}
                      disabled={loadingNextRound}
                      className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                      size="sm"
                    >
                      {loadingNextRound ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Unlocking...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm for next round
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Round Progress Indicator */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Progress:</span>
                <span className="font-medium">{unlockedRounds.size}</span>
                <span>of</span>
                <span className="font-medium">{pipelineStages.length}</span>
                <span>rounds unlocked</span>
                {nextRoundName && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 font-medium">Next: {nextRoundName}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Filters and Sorting */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2">
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => onStatusFilterChange?.('all')}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">All applicants</span>
              </button>
              
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  statusFilter === 'selected' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => onStatusFilterChange?.('selected')}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Selected</span>
              </button>
              
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  statusFilter === 'waitlisted' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => onStatusFilterChange?.('waitlisted')}
              >
                <Bookmark className="w-4 h-4" />
                <span className="text-sm font-medium">Wait listed</span>
              </button>
              
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  statusFilter === 'action_pending' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => onStatusFilterChange?.('action_pending')}
              >
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Action pending</span>
              </button>
              
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  statusFilter === 'rejected' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
                onClick={() => onStatusFilterChange?.('rejected')}
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Rejected</span>
              </button>
            </div>
            

          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading candidates...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <X className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          ) : !filteredCandidates || filteredCandidates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {candidates.length === 0 ? 
                    `No candidates found for ${selectedRound} round. Please check if data is being loaded correctly.` : 
                    'No candidates match the current filters.'
                  }
                </p>
                {candidates.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Debug: candidates.length = {candidates.length}, filteredCandidates.length = {filteredCandidates?.length || 0}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Table - Other rounds without recommendation column */}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      APPLICANT'S NAME
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      EMAIL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PHONE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RESUME
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(showMoreApplicants ? filteredCandidates : filteredCandidates?.slice(0, 8) || []).map((candidate, index) => {
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors text-left"
                            onClick={() => onCandidateClick(candidate)}
                          >
                            {formatName(candidate.overall_data.name)}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            candidate.status === 'selected' ? 'bg-green-100 text-green-800' :
                            candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            candidate.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {candidate.status === 'selected' ? 'Selected' :
                             candidate.status === 'rejected' ? 'Rejected' :
                             candidate.status === 'waitlisted' ? 'Waitlisted' :
                             candidate.status === 'action_pending' ? 'Action Pending' :
                             'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{candidate.overall_data.email}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{candidate.overall_data.phone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {candidate.overall_data.resume_url ? (
                            <button
                              onClick={() => window.open(candidate.overall_data.resume_url, '_blank')}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span className="text-sm">Download Resume</span>
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">No resume</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Show More Button */}
              {filteredCandidates && filteredCandidates.length > 8 && (
                <div className="p-6 border-t border-gray-200">
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    onClick={onShowMoreClick}
                  >
                    {showMoreApplicants ? (
                      <>
                        Show fewer applicants
                        <ArrowRight className="w-4 h-4 rotate-180 transition-transform ml-2" />
                      </>
                    ) : (
                      <>
                        See {filteredCandidates.length - 8} more applicants
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Evaluation Criteria Editor Dialog */}
      {selectedRound && 
       selectedRound !== "Resume Screening" && 
       selectedRound !== "Offer Rollout & Negotiation" &&
       currentPipelineId && 
       onSaveEvaluationCriteria && 
       onFetchEvaluationCriteria && (
        <PipelineCriteriaModal
          isOpen={showEvaluationCriteriaEditor}
          onClose={() => setShowEvaluationCriteriaEditor(false)}
          onSave={handleSaveCriteriaAndCompetencies}
          stageName={selectedRound}
          initialCriteria={currentCriteria}
          initialCompetencies={currentCompetencies}
        />
      )}


    </div>
  )
} 