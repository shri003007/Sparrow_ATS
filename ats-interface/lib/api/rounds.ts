import { API_CONFIG } from '@/lib/config'
import type {
  JobRoundTemplatesResponse,
  BulkCandidateRoundStatusRequest,
  BulkCandidateRoundStatusResponse,
  StartRoundsResponse,
  BulkCandidateRoundsCreateRequest,
  BulkCandidateRoundsCreateResponse,
  UpdateCandidateRoundStatusRequest,
  UpdateCandidateRoundStatusResponse,
} from '@/lib/round-types'

/**
 * API service for job round templates management
 */
export class JobRoundTemplatesApi {
  private static baseUrl = API_CONFIG.BASE_URL

  /**
   * Get round templates for a specific job opening
   */
  static async getJobRoundTemplates(jobOpeningId: string): Promise<JobRoundTemplatesResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.JOB_ROUND_TEMPLATES_GET}/${jobOpeningId}/round-templates`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch job round templates: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching job round templates:', error)
      throw error
    }
  }

  /**
   * Start rounds for a job opening
   */
  static async startRounds(jobOpeningId: string): Promise<StartRoundsResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.START_ROUNDS}/${jobOpeningId}/start-rounds`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to start rounds: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error starting rounds:', error)
      throw error
    }
  }

  /**
   * Confirm/activate a job round template
   */
  static async confirmJobRoundTemplate(jobRoundTemplateId: string): Promise<any> {
    try {
      const url = `${API_CONFIG.CANDIDATES_BASE_URL}/job-round-template/${jobRoundTemplateId}/confirm`
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to confirm job round template: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error confirming job round template:', error)
      throw error
    }
  }
}

/**
 * API service for candidate rounds management
 */
export class CandidateRoundsApi {
  private static baseUrl = API_CONFIG.CANDIDATES_BASE_URL

  /**
   * Update round status for multiple candidates
   */
  static async bulkUpdateRoundStatus(request: BulkCandidateRoundStatusRequest): Promise<BulkCandidateRoundStatusResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANDIDATES_BULK_ROUND_STATUS_UPDATE}`
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      // Handle partial success responses (like in bulk create)
      if (response.status === 400) {
        const responseData = await response.json()
        if (responseData.successful_count !== undefined) {
          return responseData
        } else {
          throw new Error(`Failed to update candidate round status: ${response.status} - ${JSON.stringify(responseData)}`)
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to update candidate round status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating candidate round status:', error)
      throw error
    }
  }

  /**
   * Create candidate rounds in bulk
   */
  static async bulkCreateCandidateRounds(request: BulkCandidateRoundsCreateRequest): Promise<BulkCandidateRoundsCreateResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANDIDATE_ROUNDS_BULK_CREATE}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      // Handle partial success responses
      if (response.status === 400) {
        const responseData = await response.json()
        if (responseData.successful_count !== undefined) {
          return responseData
        } else {
          throw new Error(`Failed to create candidate rounds: ${response.status} - ${JSON.stringify(responseData)}`)
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to create candidate rounds: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating candidate rounds:', error)
      throw error
    }
  }

  /**
   * Update per-round status for a specific job_round_template_id (round-to-round)
   */
  static async updateCandidateRoundStatus(request: UpdateCandidateRoundStatusRequest): Promise<UpdateCandidateRoundStatusResponse> {
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.UPDATE_CANDIDATE_ROUND_STATUS}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to update per-round candidate status: ${response.status} ${text}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating per-round candidate status:', error)
      throw error
    }
  }
}