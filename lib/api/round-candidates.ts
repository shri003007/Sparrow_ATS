import type { RoundCandidateResponse } from '@/lib/round-candidate-types'
import { API_CONFIG } from '@/lib/config'

export class RoundCandidatesApi {
  /**
   * Get candidates by job round template ID
   */
  static async getCandidatesByRoundTemplate(jobRoundTemplateId: string, signal?: AbortSignal): Promise<RoundCandidateResponse> {
    try {
      const url = `${API_CONFIG.CANDIDATES_BASE_URL}/candidates/by-job-round-template/${jobRoundTemplateId}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch round candidates: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data as RoundCandidateResponse
    } catch (error: any) {
      // Don't log AbortErrors as they're expected during navigation
      if (error.name !== 'AbortError') {
        console.error('Error fetching round candidates:', error)
      }
      throw error
    }
  }
}