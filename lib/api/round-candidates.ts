import type { RoundCandidateResponse, RoundCandidate } from '@/lib/round-candidate-types'
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
  static async getCandidatesByRoundTemplate(
    jobRoundTemplateId: string, 
    signal?: AbortSignal, 
    forceRefresh: boolean = false,
    page: number = 1,
    limit: number = 100
  ): Promise<RoundCandidateResponse> {
    // For paginated requests (page > 1), don't use cache
    const useCache = page === 1 && !forceRefresh
    
    // Check cache first (only for first page and unless force refresh is requested)
    if (useCache) {
      const cachedData = this.getCachedData(jobRoundTemplateId)
      if (cachedData) {
        return cachedData
      }
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        include_custom_fields: 'true',
        include_evaluations: 'true'
      })
      
      const url = `${API_CONFIG.CANDIDATES_BASE_URL}/candidates/by-job-round-template/${jobRoundTemplateId}?${params}`
      
      const response = await authenticatedApiService.get(url, { signal })

      if (!response.ok) {
        throw new Error(`Failed to fetch round candidates: ${response.status} ${response.statusText}`)
      }

      const data = await response.json() as RoundCandidateResponse
      
      // Cache the data for future use (only first page)
      if (page === 1) {
        this.setCachedData(jobRoundTemplateId, data)
      }
      
      return data
    } catch (error: any) {
      // Don't log AbortErrors as they're expected during navigation
      if (error.name !== 'AbortError') {
        console.error('Error fetching round candidates:', error)
      }
      throw error
    }
  }

  /**
   * Fetch all candidates across all pages for bulk operations
   */
  static async getAllCandidatesByRoundTemplate(
    jobRoundTemplateId: string,
    signal?: AbortSignal,
    onProgress?: (currentPage: number, totalPages: number, candidates: RoundCandidate[]) => void
  ): Promise<RoundCandidateResponse> {
    try {
      // First, get the first page to understand pagination
      const firstPageResponse = await this.getCandidatesByRoundTemplate(
        jobRoundTemplateId, 
        signal, 
        false, // don't force refresh for first page
        1, 
        100
      )

      if (!firstPageResponse.pagination || firstPageResponse.pagination.total_pages <= 1) {
        // No pagination or only one page, return as is
        onProgress?.(1, 1, firstPageResponse.candidates)
        return firstPageResponse
      }

      // Multiple pages exist, fetch all remaining pages
      const allCandidates = [...firstPageResponse.candidates]
      const totalPages = firstPageResponse.pagination.total_pages
      
      onProgress?.(1, totalPages, allCandidates)

      // Fetch remaining pages in parallel (but limit concurrency to avoid overwhelming the server)
      const remainingPagePromises: Promise<RoundCandidateResponse>[] = []
      
      for (let page = 2; page <= totalPages; page++) {
        remainingPagePromises.push(
          this.getCandidatesByRoundTemplate(jobRoundTemplateId, signal, false, page, 100)
        )
      }

      // Process pages in batches of 3 to avoid overwhelming the server
      const batchSize = 3
      for (let i = 0; i < remainingPagePromises.length; i += batchSize) {
        const batch = remainingPagePromises.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch)
        
        for (const pageResult of batchResults) {
          allCandidates.push(...pageResult.candidates)
          onProgress?.(
            pageResult.pagination?.current_page || (i + 2), 
            totalPages, 
            allCandidates
          )
        }
      }

      // Return combined response
      return {
        ...firstPageResponse,
        candidates: allCandidates,
        pagination: {
          ...firstPageResponse.pagination,
          current_page: 1,
          current_page_count: allCandidates.length,
          has_next: false,
          has_previous: false
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching all round candidates:', error)
      }
      throw error
    }
  }
}