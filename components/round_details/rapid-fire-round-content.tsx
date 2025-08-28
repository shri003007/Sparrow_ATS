"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, Users, ArrowRight } from "lucide-react"
import { RapidFireCandidatesTable } from "./rapid-fire-candidates-table"
import { RoundCandidatesApi } from "@/lib/api/round-candidates"
import { CandidateRoundsApi, JobRoundTemplatesApi } from "@/lib/api/rounds"
import type { JobRoundTemplate } from "@/lib/round-types"
import type { RoundCandidateResponse } from "@/lib/round-candidate-types"
import { Button } from "@/components/ui/button"

interface RapidFireRoundContentProps {
  currentRound: JobRoundTemplate | null
  rounds: JobRoundTemplate[]
  currentStepIndex: number
  onNextRound: () => void
  createdBy?: string
}

export function RapidFireRoundContent({ 
  currentRound, 
  rounds, 
  currentStepIndex,
  onNextRound,
  createdBy
}: RapidFireRoundContentProps) {
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  
  const [roundData, setRoundData] = useState<RoundCandidateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProgressingCandidates, setIsProgressingCandidates] = useState(false)
  type RoundStatus = 'selected' | 'rejected' | 'action_pending'
  const [originalStatusById, setOriginalStatusById] = useState<Record<string, RoundStatus>>({})
  const [currentStatusById, setCurrentStatusById] = useState<Record<string, RoundStatus>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, RoundStatus>>({})

  // Fetch round candidates data when current round changes
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!currentRound?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
        setRoundData(response)
        // Initialize status maps from API response
        const initialOriginal: Record<string, RoundStatus> = {}
        const initialCurrent: Record<string, RoundStatus> = {}
        
        response.candidates.forEach(candidate => {
          const status = candidate.round_status as RoundStatus
          initialOriginal[candidate.id] = status
          initialCurrent[candidate.id] = status
        })
        
        setOriginalStatusById(initialOriginal)
        setCurrentStatusById(initialCurrent)
        setPendingChanges({})
      } catch (error) {
        console.error('Error fetching round candidates:', error)
        setError('Failed to load round candidates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoundData()
  }, [currentRound?.id])

  const handleStatusChange = (candidateId: string, newStatus: RoundStatus) => {
    setCurrentStatusById(prev => ({
      ...prev,
      [candidateId]: newStatus
    }))

    // Track changes compared to original state
    const originalStatus = originalStatusById[candidateId]
    if (originalStatus === newStatus) {
      // Remove from pending changes if reverting to original
      setPendingChanges(prev => {
        const newPending = { ...prev }
        delete newPending[candidateId]
        return newPending
      })
    } else {
      // Add/update pending change
      setPendingChanges(prev => ({
        ...prev,
        [candidateId]: newStatus
      }))
    }
  }

  const handleSaveChanges = async () => {
    if (!currentRound?.id || Object.keys(pendingChanges).length === 0) return

    setIsProgressingCandidates(true)
    setError(null)

    try {
      const candidateUpdates = Object.entries(pendingChanges).map(([candidateId, status]) => ({
        candidate_id: candidateId,
        status
      }))

      const response = await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: candidateUpdates
      })

      console.log('Candidate status update response:', response)

      // Update original status to match current status for successful updates
      setOriginalStatusById(prev => ({
        ...prev,
        ...currentStatusById
      }))
      setPendingChanges({})

      // Refresh the data to get updated counts
      const refreshResponse = await RoundCandidatesApi.getCandidatesByRoundTemplate(currentRound.id)
      setRoundData(refreshResponse)

    } catch (error) {
      console.error('Error updating candidate statuses:', error)
      setError('Failed to update candidate statuses')
    } finally {
      setIsProgressingCandidates(false)
    }
  }

  const handleProgressToNextRound = async () => {
    if (!currentRound?.id || !roundData) return

    setIsProgressingCandidates(true)
    try {
      // 1) Persist ALL statuses for CURRENT round (not just changed)
      const currentRoundUpdates = (roundData.candidates || []).map(c => ({
        candidate_id: c.id,
        status: (currentStatusById[c.id] || 'action_pending') as RoundStatus,
      }))
      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: currentRound.id,
        candidate_updates: currentRoundUpdates,
      })

      // 2) Build full candidate list for the NEXT round using current statuses
      const allCandidateIds = (roundData.candidates || []).map(c => c.id)

      const nextRound = rounds[currentStepIndex + 1]
      if (!nextRound) {
        alert('No next round available.')
        return
      }

      // 3) Progress candidates to next round using the same status from the current round, for ALL candidates
      const candidate_updates = allCandidateIds.map(candidate_id => ({
        candidate_id,
        status: (currentStatusById[candidate_id] || 'action_pending') as 'selected' | 'rejected' | 'action_pending'
      }))

      await CandidateRoundsApi.updateCandidateRoundStatus({
        job_round_template_id: nextRound.id,
        candidate_updates
      })

      // Confirm/activate the next round template so the UI can navigate
      await JobRoundTemplatesApi.confirmJobRoundTemplate(nextRound.id)

      // Create/update candidate_rounds for the next round with ALL candidates and individual statuses
      await CandidateRoundsApi.bulkCreateCandidateRounds({
        job_round_template_id: nextRound.id,
        candidates: candidate_updates,
        created_by: createdBy || 'system'
      })

      // Navigate to next round immediately
      onNextRound()
      
    } catch (error) {
      console.error('Error progressing candidates:', error)
      setError('Failed to progress candidates to next round')
    } finally {
      setIsProgressingCandidates(false)
    }
  }

  const selectedCount = Object.values(currentStatusById).filter(status => status === 'selected').length
  const rejectedCount = Object.values(currentStatusById).filter(status => status === 'rejected').length
  const pendingCount = Object.values(currentStatusById).filter(status => status === 'action_pending').length
  const hasChanges = Object.keys(pendingChanges).length > 0
  const isLastRound = currentStepIndex === rounds.length - 1

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <div className="text-red-600 mb-2" style={{ fontFamily }}>
            {error}
          </div>
          <Button 
            onClick={() => setError(null)}
            variant="outline"
            style={{ fontFamily }}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily }}>
                {currentRound?.round_name || 'Rapid Fire Round'}
              </h2>
              <p className="text-sm text-gray-500" style={{ fontFamily }}>
                Rapid Fire assessment for candidates
              </p>
            </div>
          </div>

          {/* Status Summary */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600" style={{ fontFamily }}>
                {selectedCount}
              </div>
              <div className="text-xs text-gray-500 uppercase" style={{ fontFamily }}>
                Selected
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600" style={{ fontFamily }}>
                {rejectedCount}
              </div>
              <div className="text-xs text-gray-500 uppercase" style={{ fontFamily }}>
                Rejected
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600" style={{ fontFamily }}>
                {pendingCount}
              </div>
              <div className="text-xs text-gray-500 uppercase" style={{ fontFamily }}>
                Pending
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleSaveChanges}
              disabled={isProgressingCandidates}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              style={{ fontFamily }}
            >
              {isProgressingCandidates ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <div className="text-sm text-blue-600" style={{ fontFamily }}>
              {Object.keys(pendingChanges).length} unsaved change(s)
            </div>
          </div>
        )}

        {!isLastRound && !hasChanges && (
          <div className="mt-4">
            <div className="flex flex-col items-end gap-2">
              <div className="text-sm text-gray-600" style={{ fontFamily }}>
                {selectedCount} selected for next round
              </div>
              <Button
                onClick={handleProgressToNextRound}
                disabled={isProgressingCandidates}
                className="flex items-center gap-2"
                style={{
                  backgroundColor: "#FF6B35",
                  color: "#FFFFFF",
                  fontFamily
                }}
              >
                {isProgressingCandidates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Next round...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Next round
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Candidates Table */}
      <div className="flex-1 p-8">
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <RapidFireCandidatesTable
              candidates={roundData?.candidates || []}
              customFieldDefinitions={roundData?.custom_field_definitions || []}
              isLoading={isLoading}
              roundInfo={roundData?.template_info}
              jobOpeningId={roundData?.candidates?.[0]?.job_opening_id}
              onStatusChange={handleStatusChange}
              currentStatusById={currentStatusById}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
