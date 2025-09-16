import type { RoundCandidateResponse } from '@/lib/round-candidate-types'
import { API_CONFIG } from '@/lib/config'
import { authenticatedApiService } from './authenticated-api-service'

export class RoundCandidatesApi {
  // Cache configuration
  private static CACHE_KEY = 'ats_round_candidates_cache'
  private static CACHE_EXPIRY_KEY = 'ats_round_candidates_cache_expiry'
  private static CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Get cached round candidates data
   */
  private static getCachedData(jobRoundTemplateId: string): RoundCandidateResponse | null {
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
      return cacheData[jobRoundTemplateId] || null
    } catch (error) {
      console.warn('Failed to read round candidates cache:', error)
      return null
    }
  }

  /**
   * Cache round candidates data
   */
  private static setCachedData(jobRoundTemplateId: string, data: RoundCandidateResponse): void {
    try {
      const cache = localStorage.getItem(this.CACHE_KEY)
      const cacheData = cache ? JSON.parse(cache) : {}
      
      cacheData[jobRoundTemplateId] = data
      
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData))
      localStorage.setItem(this.CACHE_EXPIRY_KEY, (Date.now() + this.CACHE_DURATION).toString())
    } catch (error) {
      console.warn('Failed to cache round candidates data:', error)
    }
  }

  /**
   * Clear round candidates cache
   */
  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY)
      localStorage.removeItem(this.CACHE_EXPIRY_KEY)
    } catch (error) {
      console.warn('Failed to clear round candidates cache:', error)
    }
  }

  /**
   * Get candidates by job round template ID with caching
   */
  static async getCandidatesByRoundTemplate(jobRoundTemplateId: string, signal?: AbortSignal, forceRefresh: boolean = false): Promise<RoundCandidateResponse> {
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = this.getCachedData(jobRoundTemplateId)
      if (cachedData) {
        return cachedData
      }
    }

    try {
      const url = `${API_CONFIG.CANDIDATES_BASE_URL}/candidates/by-job-round-template/${jobRoundTemplateId}`
      
      const response = await authenticatedApiService.get(url, { signal })

      if (!response.ok) {
        throw new Error(`Failed to fetch round candidates: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as RoundCandidateResponse
      
      // Cache the data for future use
      this.setCachedData(jobRoundTemplateId, data)
      
      return data
    } catch (error: any) {
      // Don't log AbortErrors as they're expected during navigation
      if (error.name !== 'AbortError') {
        console.error('Error fetching round candidates:', error)
      }
      throw error
    }
  }
}