"use client"

import React, { createContext, useContext, useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

export interface JobBulkEvaluationState {
  isEvaluating: boolean
  currentStep: 'idle' | 'fetching-rounds' | 'fetching-candidates' | 'fetching-mappings' | 'evaluating' | 'completed' | 'error'
  progress: {
    roundsProcessed: number
    totalRounds: number
    candidatesEvaluated: number
    totalCandidates: number
  }
  error: string | null
  jobId?: string
  jobTitle?: string
  results?: {
    successCount: number
    failedCount: number
    missedRoundCount: number
  }
}

interface BulkEvaluationContextType {
  evaluations: Record<string, JobBulkEvaluationState>
  updateEvaluationState: (jobId: string, state: Partial<JobBulkEvaluationState>) => void
  getEvaluationState: (jobId: string) => JobBulkEvaluationState
  clearEvaluationState: (jobId: string) => void
}

const defaultEvaluationState: JobBulkEvaluationState = {
  isEvaluating: false,
  currentStep: 'idle',
  progress: {
    roundsProcessed: 0,
    totalRounds: 0,
    candidatesEvaluated: 0,
    totalCandidates: 0
  },
  error: null
}

const BulkEvaluationContext = createContext<BulkEvaluationContextType | undefined>(undefined)

export function BulkEvaluationProvider({ children }: { children: React.ReactNode }) {
  const [evaluations, setEvaluations] = useState<Record<string, JobBulkEvaluationState>>({})
  const { toast } = useToast()

  const updateEvaluationState = (jobId: string, stateUpdate: Partial<JobBulkEvaluationState>) => {
    setEvaluations(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId] || defaultEvaluationState,
        ...stateUpdate,
        jobId
      }
    }))

    // Show completion toast when evaluation finishes
    if (stateUpdate.currentStep === 'completed' && stateUpdate.isEvaluating === false) {
      const state = { ...evaluations[jobId] || defaultEvaluationState, ...stateUpdate }
      
      if (state.results) {
        const { successCount, failedCount, missedRoundCount } = state.results
        let description = `Evaluated ${successCount} candidates successfully`
        if (missedRoundCount > 0) {
          description += `, ${missedRoundCount} candidates missed their rounds`
        }
        if (failedCount > 0) {
          description += `, ${failedCount} failed`
        }

        toast({
          title: `Job "${state.jobTitle || 'Unknown'}" Bulk Evaluation Complete`,
          description: description,
          duration: 10000,
        })
      } else {
        // Fallback for backward compatibility
        const successCount = state.progress.candidatesEvaluated
        const totalCount = state.progress.totalCandidates
        const failedCount = totalCount - successCount

        let description = `Evaluated ${successCount} candidates successfully`
        if (failedCount > 0) {
          description += `, ${failedCount} failed`
        }

        toast({
          title: `Job "${state.jobTitle || 'Unknown'}" Bulk Evaluation Complete`,
          description: description,
          duration: 10000,
        })
      }
    }
  }

  const getEvaluationState = (jobId: string): JobBulkEvaluationState => {
    return evaluations[jobId] || defaultEvaluationState
  }

  const clearEvaluationState = (jobId: string) => {
    setEvaluations(prev => {
      const newState = { ...prev }
      delete newState[jobId]
      return newState
    })
  }

  return (
    <BulkEvaluationContext.Provider value={{
      evaluations,
      updateEvaluationState,
      getEvaluationState,
      clearEvaluationState
    }}>
      {children}
    </BulkEvaluationContext.Provider>
  )
}

export function useBulkEvaluation() {
  const context = useContext(BulkEvaluationContext)
  if (context === undefined) {
    throw new Error('useBulkEvaluation must be used within a BulkEvaluationProvider')
  }
  return context
}
