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
  
  // Cache configuration
  private static CACHE_KEY = 'ats_candidates_by_job_cache'
  private static CACHE_EXPIRY_KEY = 'ats_candidates_by_job_cache_expiry'
  private static CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Get cached candidates data
   */
  private static getCachedData(jobOpeningId: string): CandidatesByJobResponse | null {
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
      console.warn('Failed to read candidates cache:', error)
      return null
    }
  }

  /**
   * Cache candidates data
   */
  private static setCachedData(jobOpeningId: string, data: CandidatesByJobResponse): void {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY)
      const cacheData = cache ? JSON.parse(cache) : {}
      
      cacheData[jobOpeningId] = data
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
      localStorage.setItem(this.CACHE_EXPIRY_KEY, (Date.now() + this.CACHE_DURATION).toString())
    } catch (error) {
      console.warn('Failed to cache candidates data:', error)
    }
  }

  /**
   * Clear candidates cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY)
      localStorage.removeItem(this.CACHE_EXPIRY_KEY)
    } catch (error) {
      console.warn('Failed to clear candidates cache:', error)
    }
  }

  /**
   * Get all candidates for a specific job opening with caching
   */
  static async getCandidatesByJob(jobOpeningId: string, forceRefresh: boolean = false): Promise<CandidatesByJobResponse> {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = this.getCachedData(jobOpeningId)
      if (cachedData) {
        console.log(`🔍 [CACHE HIT] Using cached candidates for job ${jobOpeningId}`)
        return cachedData
      }
    }

    console.log(`🔍 [API CALL] Fetching candidates for job ${jobOpeningId}`)
    try {
      const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.CANDIDATES_BY_JOB}/${jobOpeningId}`
      const response = await authenticatedApiService.get(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`)
      }

      const data = await response.json()
      
      // Cache the data for future use
      this.setCachedData(jobOpeningId, data)
      
      return data
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