"use client"

import React from "react"
import { Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type RoundStatus = 'selected' | 'rejected' | 'action_pending'
type RoundType = 'INTERVIEW' | 'RAPID_FIRE' | 'TALK_ON_A_TOPIC' | 'GAMES_ARENA' | 'PROJECT' | 'SCREENING'

interface RoundSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  roundType: RoundType
  roundName: string
  
  // Common settings
  primaryId: string
  setPrimaryId: (value: string) => void
  secondaryId?: string
  setSecondaryId?: (value: string) => void
  
  // Bulk operations
  candidatesCount: number
  candidatesWithoutEvaluations: number
  isBulkEvaluating: boolean
  bulkEvaluationProgress: { completed: number; total: number }
  bulkEvaluationError: string | null
  onBulkEvaluation: () => void
  
  // Bulk status update
  selectedBulkStatus: RoundStatus | ''
  setSelectedBulkStatus: (status: RoundStatus | '') => void
  isBulkStatusUpdate: boolean
  bulkStatusError: string | null
  onBulkStatusUpdate: () => void
  
  // Save/Cancel
  onSave: () => void
  onCancel: () => void
  
  // Validation
  hasValidConfiguration: () => boolean
}

const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export function RoundSettingsModal({
  isOpen,
  onClose,
  roundType,
  roundName,
  primaryId,
  setPrimaryId,
  secondaryId,
  setSecondaryId,
  candidatesCount,
  candidatesWithoutEvaluations,
  isBulkEvaluating,
  bulkEvaluationProgress,
  bulkEvaluationError,
  onBulkEvaluation,
  selectedBulkStatus,
  setSelectedBulkStatus,
  isBulkStatusUpdate,
  bulkStatusError,
  onBulkStatusUpdate,
  onSave,
  onCancel,
  hasValidConfiguration
}: RoundSettingsModalProps) {

  const getSettingsTitle = () => {
    switch (roundType) {
      case 'INTERVIEW':
        return `Sparrow Interviewer Settings - ${roundName}`
      case 'RAPID_FIRE':
      case 'TALK_ON_A_TOPIC':
      case 'GAMES_ARENA':
        return `Sales Assessment Settings - ${roundName}`
      default:
        return `Round Settings - ${roundName}`
    }
  }

  const getSettingsDescription = () => {
    switch (roundType) {
      case 'INTERVIEW':
        return `Configure the round ID that will be sent to Sparrow Interviewer for all candidates in this specific round (${roundName}).`
      case 'RAPID_FIRE':
      case 'TALK_ON_A_TOPIC':
      case 'GAMES_ARENA':
        return `Configure sales assessment settings and manage bulk operations for all candidates in this round.`
      default:
        return `Configure settings and manage bulk operations for all candidates in this round.`
    }
  }

  const getPrimaryIdLabel = () => {
    switch (roundType) {
      case 'INTERVIEW':
        return 'Round ID'
      case 'RAPID_FIRE':
      case 'TALK_ON_A_TOPIC':
      case 'GAMES_ARENA':
        return 'Sales Assessment ID'
      default:
        return 'Assessment ID'
    }
  }

  const getPrimaryIdPlaceholder = () => {
    switch (roundType) {
      case 'INTERVIEW':
        return 'Enter Sparrow Interviewer round ID'
      case 'RAPID_FIRE':
      case 'TALK_ON_A_TOPIC':
      case 'GAMES_ARENA':
        return 'e.g., ice-breaker-001, TS-triple-step'
      default:
        return 'Enter assessment ID'
    }
  }

  const getPrimaryIdDescription = () => {
    switch (roundType) {
      case 'INTERVIEW':
        return `This round ID will be used instead of the job_round_template_id when making API calls to Sparrow Interviewer for this specific round (${roundName}). Each round can have its own unique round ID.`
      case 'RAPID_FIRE':
      case 'TALK_ON_A_TOPIC':
      case 'GAMES_ARENA':
        return 'The assessment ID used for Sparrow Sales Assessment API calls'
      default:
        return 'The assessment ID used for API calls'
    }
  }

  const getBulkEvaluationButtonText = () => {
    switch (roundType) {
      case 'INTERVIEW':
        return 'Evaluate All via Sparrow Interviewer'
      case 'RAPID_FIRE':
      case 'TALK_ON_A_TOPIC':
      case 'GAMES_ARENA':
        return 'Bulk Evaluate'
      default:
        return 'Bulk Evaluate'
    }
  }

  const showSecondaryId = roundType === 'RAPID_FIRE' || roundType === 'TALK_ON_A_TOPIC' || roundType === 'GAMES_ARENA'

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isBulkStatusUpdate) {
          if (!open) {
            onClose()
          }
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle style={{ fontFamily }}>{getSettingsTitle()}</DialogTitle>
          <DialogDescription style={{ fontFamily }}>
            {getSettingsDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Configuration Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily }}>
              {roundType === 'INTERVIEW' ? 'Round Configuration' : 'Assessment Configuration'}
            </h4>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="primary-id" style={{ fontFamily }}>{getPrimaryIdLabel()}</Label>
                <Input
                  id="primary-id"
                  value={primaryId}
                  onChange={(e) => setPrimaryId(e.target.value)}
                  placeholder={getPrimaryIdPlaceholder()}
                  className="mt-1"
                  disabled={isBulkStatusUpdate}
                />
                <p className="text-xs text-gray-500 mt-1" style={{ fontFamily }}>
                  {getPrimaryIdDescription()}
                </p>
              </div>
              
              {showSecondaryId && secondaryId !== undefined && setSecondaryId && (
                <div>
                  <Label htmlFor="brand-id" style={{ fontFamily }}>Brand ID</Label>
                  <Select value={secondaryId} onValueChange={setSecondaryId} disabled={isBulkStatusUpdate}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="surveysparrow">SurveySparrow</SelectItem>
                      <SelectItem value="thrivesparrow">ThriveSparrow</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1" style={{ fontFamily }}>
                    The brand identifier for the assessment
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Operations */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily }}>Bulk Operations</h4>
            
            {/* Bulk Evaluation */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium" style={{ fontFamily }}>Bulk Evaluation</h5>
                {isBulkEvaluating && (
                  <div className="text-xs text-blue-600" style={{ fontFamily }}>
                    {bulkEvaluationProgress.completed} / {bulkEvaluationProgress.total}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3" style={{ fontFamily }}>
                Evaluate all candidates who don't have evaluations yet ({candidatesWithoutEvaluations} candidates)
              </p>
              
              {/* Progress bar for bulk evaluation */}
              {isBulkEvaluating && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${bulkEvaluationProgress.total > 0 ? (bulkEvaluationProgress.completed / bulkEvaluationProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              )}
              
              <Button 
                onClick={onBulkEvaluation}
                disabled={isBulkEvaluating || isBulkStatusUpdate || !hasValidConfiguration() || candidatesWithoutEvaluations === 0}
                className="w-full"
                size="sm"
                style={{
                  backgroundColor: "#10B981",
                  color: "#FFFFFF",
                  fontFamily
                }}
              >
                {isBulkEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    {getBulkEvaluationButtonText()}
                  </>
                )}
              </Button>
              {bulkEvaluationError && (
                <div className={`mt-2 text-xs p-3 rounded border ${
                  bulkEvaluationError.includes('successful') || bulkEvaluationError.includes('Successfully')
                    ? 'text-green-700 bg-green-50 border-green-200' 
                    : 'text-red-700 bg-red-50 border-red-200'
                }`} style={{ fontFamily }}>
                  {bulkEvaluationError}
                </div>
              )}
            </div>

            {/* Bulk Status Update */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium mb-2" style={{ fontFamily }}>Bulk Status Update</h5>
              <p className="text-xs text-gray-500 mb-3" style={{ fontFamily }}>
                Set the same status for all candidates in this round ({candidatesCount} candidates)
              </p>
              <div className="space-y-3">
                <Select value={selectedBulkStatus} onValueChange={(value) => setSelectedBulkStatus(value as RoundStatus | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status for all candidates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selected">Hire</SelectItem>
                    <SelectItem value="rejected">Reject</SelectItem>
                    <SelectItem value="action_pending">On Hold</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={onBulkStatusUpdate}
                  disabled={isBulkStatusUpdate || isBulkEvaluating || !selectedBulkStatus || candidatesCount === 0}
                  className="w-full"
                  size="sm"
                  variant="outline"
                  style={{ fontFamily }}
                >
                  {isBulkStatusUpdate ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update All Statuses'
                  )}
                </Button>
              </div>
              {bulkStatusError && (
                <div className={`mt-2 text-xs p-3 rounded border ${
                  bulkStatusError.includes('Successfully') || bulkStatusError.includes('successful')
                    ? 'text-green-700 bg-green-50 border-green-200' 
                    : 'text-red-700 bg-red-50 border-red-200'
                }`} style={{ fontFamily }}>
                  {bulkStatusError}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isBulkStatusUpdate}
            style={{ fontFamily }}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isBulkStatusUpdate}
            style={{
              backgroundColor: "#10B981",
              color: "#FFFFFF",
              fontFamily
            }}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
