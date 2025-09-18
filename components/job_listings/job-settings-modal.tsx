"use client"

import React from "react"
import { Loader2, Zap, Users, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { JobBulkEvaluationState } from "@/contexts/bulk-evaluation-context"

interface JobSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  jobTitle: string
  hasRoundsStarted: boolean
  candidatesCount: number
  
  // Bulk evaluation
  bulkEvaluationState: JobBulkEvaluationState
  onBulkEvaluation: () => void
}

const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export function JobSettingsModal({
  isOpen,
  onClose,
  jobTitle,
  hasRoundsStarted,
  candidatesCount,
  bulkEvaluationState,
  onBulkEvaluation
}: JobSettingsModalProps) {

  const getBulkEvaluationLoadingText = (step: JobBulkEvaluationState['currentStep']): string => {
    switch (step) {
      case 'fetching-rounds':
        return 'Fetching rounds...'
      case 'fetching-candidates':
        return 'Loading candidates...'
      case 'fetching-mappings':
        return 'Loading mappings...'
      case 'evaluating':
        return 'Evaluating candidates...'
      case 'completed':
        return 'Completed!'
      case 'error':
        return 'Error occurred'
      default:
        return 'Processing...'
    }
  }

  const canBulkEvaluate = hasRoundsStarted && candidatesCount > 0 && !bulkEvaluationState.isEvaluating

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily }}>
            Job Settings - {jobTitle}
          </DialogTitle>
          <DialogDescription style={{ fontFamily }}>
            Manage job-level operations and bulk evaluation across all rounds.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Job Status Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
              Job Status
            </h4>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700" style={{ fontFamily }}>
                    Total Candidates
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
                  {candidatesCount}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${hasRoundsStarted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm text-gray-700" style={{ fontFamily }}>
                    Rounds Status
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
                  {hasRoundsStarted ? 'Started' : 'Not Started'}
                </span>
              </div>
            </div>
          </div>

          {/* Bulk Operations Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
              Bulk Operations
            </h4>
            
            <div className="space-y-3">
              {/* Bulk Evaluation */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-1" style={{ fontFamily }}>
                      Bulk Evaluate All Rounds
                    </h5>
                  </div>
                </div>

                {/* Progress Display */}
                {bulkEvaluationState.isEvaluating && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily }}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {getBulkEvaluationLoadingText(bulkEvaluationState.currentStep)}
                    </div>
                    
                    {bulkEvaluationState.progress.totalRounds > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1" style={{ fontFamily }}>
                          <span>Rounds: {bulkEvaluationState.progress.roundsProcessed}/{bulkEvaluationState.progress.totalRounds}</span>
                          <span>{bulkEvaluationState.progress.totalRounds > 0 ? Math.round((bulkEvaluationState.progress.roundsProcessed / bulkEvaluationState.progress.totalRounds) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${bulkEvaluationState.progress.totalRounds > 0 ? (bulkEvaluationState.progress.roundsProcessed / bulkEvaluationState.progress.totalRounds) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {bulkEvaluationState.progress.totalCandidates > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1" style={{ fontFamily }}>
                          <span>Candidates: {bulkEvaluationState.progress.candidatesEvaluated}/{bulkEvaluationState.progress.totalCandidates}</span>
                          <span>{bulkEvaluationState.progress.totalCandidates > 0 ? Math.round((bulkEvaluationState.progress.candidatesEvaluated / bulkEvaluationState.progress.totalCandidates) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-green-600 h-1.5 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${bulkEvaluationState.progress.totalCandidates > 0 ? (bulkEvaluationState.progress.candidatesEvaluated / bulkEvaluationState.progress.totalCandidates) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Display */}
                {bulkEvaluationState.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800" style={{ fontFamily }}>
                          Bulk Evaluation Error
                        </p>
                        <p className="text-xs text-red-600 mt-1" style={{ fontFamily }}>
                          {bulkEvaluationState.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={onBulkEvaluation}
                  disabled={!canBulkEvaluate}
                  className="w-full"
                  style={{
                    backgroundColor: canBulkEvaluate ? "#10B981" : "#6B7280",
                    color: "#FFFFFF",
                    fontFamily,
                  }}
                >
                  {bulkEvaluationState.isEvaluating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {getBulkEvaluationLoadingText(bulkEvaluationState.currentStep)}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Bulk Evaluate All Rounds
                    </>
                  )}
                </Button>

                {/* Helper Text */}
                {!hasRoundsStarted && (
                  <p className="text-xs text-amber-600 mt-2" style={{ fontFamily }}>
                    ⚠️ Rounds must be started before bulk evaluation can begin.
                  </p>
                )}
                {candidatesCount === 0 && (
                  <p className="text-xs text-gray-500 mt-2" style={{ fontFamily }}>
                    No candidates found in this job.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            style={{
              borderColor: "#E5E7EB",
              color: "#374151",
              fontFamily,
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
