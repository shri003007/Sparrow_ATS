import { API_CONFIG } from '@/lib/config'
import type { 
  CandidatesByJobResponse,
  CandidateCreateRequest,
  CandidateCreateResponse,
  CandidateBulkCreateRequest,
  CandidateBulkCreateResponse
} from '@/lib/candidate-types'
import { authenticatedApiService } from './authenticated-api-service'

export class CandidatesApi {
  private static baseUrl = API_CONFIG.CANDIDATES_BASE_URL

  /**
   * Get all candidates for a specific job opening
   */
  static async getCandidatesByJob(jobOpeningId: string): Promise<CandidatesByJobResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANDIDATES_BY_JOB}/${jobOpeningId}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching candidates by job:', error)
      throw error
    }
  }

  /**
   * Create a single candidate
   */
  static async createCandidate(candidateData: CandidateCreateRequest): Promise<CandidateCreateResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANDIDATE_CREATE}`
      const response = await authenticatedApiService.post(url, candidateData)

      if (!response.ok) {
        throw new Error(`Failed to create candidate: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating candidate:', error)
      throw error
    }
  }

  /**
   * Create multiple candidates in bulk
   */
  static async createCandidatesBulk(candidatesData: CandidateBulkCreateRequest): Promise<CandidateBulkCreateResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANDIDATES_BULK_CREATE}`
      const response = await authenticatedApiService.post(url, candidatesData)

      // For bulk operations, we want to handle partial successes
      // The API might return 400 for validation errors but still process some candidates
      if (response.status === 400) {
        // Try to parse the response to see if it contains partial results
        const responseData = await response.json()
        if (responseData.successful_count !== undefined) {
          // This is a partial success response, return it
          return responseData
        } else {
          // This is a true error, throw it
          throw new Error(`Failed to create candidates in bulk: ${response.status} - ${JSON.stringify(responseData)}`)
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to create candidates in bulk: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating candidates in bulk:', error)
      throw error
    }
  }
}