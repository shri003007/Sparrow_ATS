import { API_CONFIG } from '../config'

export interface SparrowAssessmentMapping {
  id: number
  sparrow_assessment_id: string
  job_round_templat_id: string
  filter_column: string | null
}

export interface SparrowAssessmentMappingResponse {
  job_round_template_id: string
  template_info: {
    round_name: string
    round_type: string
  }
  mappings_count: number
  mappings: SparrowAssessmentMapping[]
}

// Cache configuration
const CACHE_KEY = 'ats_sparrow_assessment_mapping_cache'
const CACHE_EXPIRY_KEY = 'ats_sparrow_assessment_mapping_cache_expiry'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

/**
 * Get cached sparrow assessment mapping data
 */
function getCachedAssessmentMapping(jobRoundTemplateId: string): SparrowAssessmentMappingResponse | null {
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    const expiry = localStorage.getItem(CACHE_EXPIRY_KEY)
    
    if (!cache || !expiry) return null
    
    const now = Date.now()
    const expiryTime = parseInt(expiry)
    
    if (now > expiryTime) {
      // Cache expired, clear it
      localStorage.removeItem(CACHE_KEY)
      localStorage.removeItem(CACHE_EXPIRY_KEY)
      return null
    }
    
    const cacheData = JSON.parse(cache)
    return cacheData[jobRoundTemplateId] || null
  } catch (error) {
    console.warn('Failed to read sparrow assessment mapping cache:', error)
    return null
  }
}

/**
 * Cache sparrow assessment mapping data
 */
function setCachedAssessmentMapping(jobRoundTemplateId: string, data: SparrowAssessmentMappingResponse): void {
  try {
    const cache = localStorage.getItem(CACHE_KEY)
    const cacheData = cache ? JSON.parse(cache) : {}
    
    cacheData[jobRoundTemplateId] = data
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    localStorage.setItem(CACHE_EXPIRY_KEY, (Date.now() + CACHE_DURATION).toString())
  } catch (error) {
    console.warn('Failed to cache sparrow assessment mapping data:', error)
  }
}

/**
 * Clear sparrow assessment mapping cache
 */
export function clearSparrowAssessmentMappingCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(CACHE_EXPIRY_KEY)
    console.log('Sparrow assessment mapping cache cleared')
  } catch (error) {
    console.warn('Failed to clear sparrow assessment mapping cache:', error)
  }
}

/**
 * Fetch sparrow assessment mapping for a job round template with caching
 */
export async function getSparrowAssessmentMapping(
  jobRoundTemplateId: string,
  signal?: AbortSignal,
  forceRefresh: boolean = false
): Promise<SparrowAssessmentMappingResponse> {
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cachedData = getCachedAssessmentMapping(jobRoundTemplateId)
    if (cachedData) {
      console.log(`Using cached sparrow assessment mapping for template: ${jobRoundTemplateId}`)
      return cachedData
    }
  } else {
    console.log(`Force refreshing sparrow assessment mapping for template: ${jobRoundTemplateId}`)
  }

  try {
    // Check if API URL is configured
    if (!API_CONFIG.CANDIDATES_BASE_URL) {
      throw new Error('CANDIDATES_BASE_URL is not configured in environment variables')
    }

    console.log(`Fetching sparrow assessment mapping from API for template: ${jobRoundTemplateId}`)
    const url = `${API_CONFIG.CANDIDATES_BASE_URL}/sparrow-assessment-mapping/job-round-template/${jobRoundTemplateId}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to fetch sparrow assessment mapping: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`)
    }

    const data = await response.json() as SparrowAssessmentMappingResponse
    
    // Cache the data for future use
    setCachedAssessmentMapping(jobRoundTemplateId, data)
    
    return data
  } catch (error: any) {
    // Don't log AbortErrors as they're expected during navigation
    if (error.name !== 'AbortError') {
      console.error('Error fetching sparrow assessment mapping:', error)
    }
    throw error
  }
}
