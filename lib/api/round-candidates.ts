import type { RoundCandidateResponse } from '@/lib/round-candidate-types'
import { API_CONFIG } from '@/lib/config'

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
      console.log('Round candidates cache cleared')
    } catch (error) {
      console.warn('Failed to clear round candidates cache:', error)
    }
  }

  /**
   * Get candidates by job round template ID with caching
   */
  static async getCandidatesByRoundTemplate(jobRoundTemplateId: string, signal?: AbortSignal, forceRefresh: boolean = false): Promise<RoundCandidateResponse> {
    const callId = `candidates-${jobRoundTemplateId}-${Date.now()}`
    console.log(`🔵 [API CALL START] ${callId} - RoundCandidatesApi.getCandidatesByRoundTemplate(${jobRoundTemplateId}, forceRefresh: ${forceRefresh})`)
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = this.getCachedData(jobRoundTemplateId)
      if (cachedData) {
        console.log(`🟢 [CACHE HIT] ${callId} - Using cached round candidates for template: ${jobRoundTemplateId}`)
        return cachedData
      }
    } else {
      console.log(`🟡 [FORCE REFRESH] ${callId} - Force refreshing round candidates for template: ${jobRoundTemplateId}`)
    }

    try {
      console.log(`🔴 [API REQUEST] ${callId} - Fetching round candidates from API for template: ${jobRoundTemplateId}`)
      const startTime = performance.now()
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

      const data = await response.json() as RoundCandidateResponse
      const endTime = performance.now()
      
      console.log(`✅ [API SUCCESS] ${callId} - Round candidates fetched in ${Math.round(endTime - startTime)}ms, found ${data.candidates?.length || 0} candidates`)
      
      // Cache the data for future use
      this.setCachedData(jobRoundTemplateId, data)
      
      return data
    } catch (error: any) {
      // Don't log AbortErrors as they're expected during navigation
      if (error.name !== 'AbortError') {
        console.error(`❌ [API ERROR] ${callId} - Error fetching round candidates:`, error)
      } else {
        console.log(`🟠 [API ABORTED] ${callId} - Request was aborted (expected during navigation)`)
      }
      throw error
    }
  }
}