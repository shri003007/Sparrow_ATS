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
  
  // Cache configuration
  private static CACHE_KEY = 'ats_job_round_templates_cache'
  private static CACHE_EXPIRY_KEY = 'ats_job_round_templates_cache_expiry'
  private static CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Get cached job round templates data
   */
  private static getCachedData(jobOpeningId: string): JobRoundTemplatesResponse | null {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY)
      const expiry = localStorage.getItem(this.CACHE_EXPIRY_KEY)
      
      if (!cache || !expiry) return null
      
      const now = Date.now()
      const expiryTime = parseInt(expiry)
      
      if (now > expiryTime) {
        // Cache expired, clear it
        localStorage.removeItem(this.CACHE_KEY)
        localStorage.removeItem(this.CACHE_EXPIRY_KEY)
        return null
      }
      
      const cacheData = JSON.parse(cache)
      return cacheData[jobOpeningId] || null
    } catch (error) {
      console.warn('Failed to read job round templates cache:', error)
      return null
    }
  }

  /**
   * Cache job round templates data
   */
  private static setCachedData(jobOpeningId: string, data: JobRoundTemplatesResponse): void {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY)
      const cacheData = cache ? JSON.parse(cache) : {}
      
      cacheData[jobOpeningId] = data
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
      localStorage.setItem(this.CACHE_EXPIRY_KEY, (Date.now() + this.CACHE_DURATION).toString())
    } catch (error) {
      console.warn('Failed to cache job round templates data:', error)
    }
  }

  /**
   * Clear job round templates cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY)
      localStorage.removeItem(this.CACHE_EXPIRY_KEY)
      console.log('Job round templates cache cleared')
    } catch (error) {
      console.warn('Failed to clear job round templates cache:', error)
    }
  }

  /**
   * Get round templates for a specific job opening with caching
   */
  static async getJobRoundTemplates(jobOpeningId: string): Promise<JobRoundTemplatesResponse> {
    // Check cache first
    const cachedData = this.getCachedData(jobOpeningId)
    if (cachedData) {
      console.log(`Using cached job round templates for job: ${jobOpeningId}`)
      return cachedData
    }

    try {
      console.log(`Fetching job round templates from API for job: ${jobOpeningId}`)
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

      const data = await response.json() as JobRoundTemplatesResponse
      
      // Cache the data for future use
      this.setCachedData(jobOpeningId, data)
      
      return data
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

  /**
   * Update candidate round competencies and evaluation criteria
   */
  static async updateCandidateRoundCompetencies(
    candidateRoundId: string,
    data: {
      evaluation_criteria: string
      competencies: Array<{
        name: string
        description: string
        rubric_scorecard: Record<string, string>
      }>
    }
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/candidate-round/${candidateRoundId}/update`
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to update candidate round competencies: ${response.status} ${text}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating candidate round competencies:', error)
      throw error
    }
  }
}