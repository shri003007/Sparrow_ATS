import { API_CONFIG } from '../config'
import { apiDebugger } from '../utils/api-debug'

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

// Request deduplication - prevent multiple simultaneous requests for the same template
const pendingRequests = new Map<string, Promise<SparrowAssessmentMappingResponse>>()

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
  const callId = `mapping-${jobRoundTemplateId}-${Date.now()}`
  console.log(`🔵 [API CALL START] ${callId} - getSparrowAssessmentMapping(${jobRoundTemplateId}, forceRefresh: ${forceRefresh})`)
  apiDebugger.logCall(callId, 'SparrowAssessmentMapping', 'request', undefined, { templateId: jobRoundTemplateId })
  
  // Check for pending request first (deduplication)
  if (!forceRefresh && pendingRequests.has(jobRoundTemplateId)) {
    console.log(`🟡 [PENDING REQUEST] ${callId} - Waiting for existing request for template: ${jobRoundTemplateId}`)
    apiDebugger.logCall(callId, 'SparrowAssessmentMapping', 'cache', 0, { templateId: jobRoundTemplateId, reason: 'pending_request' })
    return pendingRequests.get(jobRoundTemplateId)!
  }
  
  // Check cache first (unless force refresh is requested)
  if (!forceRefresh) {
    const cachedData = getCachedAssessmentMapping(jobRoundTemplateId)
    if (cachedData) {
      console.log(`🟢 [CACHE HIT] ${callId} - Using cached sparrow assessment mapping for template: ${jobRoundTemplateId}`)
      apiDebugger.logCall(callId, 'SparrowAssessmentMapping', 'cache', 0, { templateId: jobRoundTemplateId })
      return cachedData
    }
  } else {
    console.log(`🟡 [FORCE REFRESH] ${callId} - Force refreshing sparrow assessment mapping for template: ${jobRoundTemplateId}`)
  }

  // Create and store the promise to prevent duplicate requests
  const requestPromise = (async (): Promise<SparrowAssessmentMappingResponse> => {
    try {
      // Check if API URL is configured
      if (!API_CONFIG.CANDIDATES_BASE_URL) {
        throw new Error('CANDIDATES_BASE_URL is not configured in environment variables')
      }

      console.log(`🔴 [API REQUEST] ${callId} - Fetching sparrow assessment mapping from API for template: ${jobRoundTemplateId}`)
      const startTime = performance.now()
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
      const endTime = performance.now()
      
      console.log(`✅ [API SUCCESS] ${callId} - Sparrow assessment mapping fetched in ${Math.round(endTime - startTime)}ms, found ${data.mappings?.length || 0} mappings`)
      apiDebugger.logCall(callId, 'SparrowAssessmentMapping', 'success', endTime - startTime, { templateId: jobRoundTemplateId, mappingsCount: data.mappings?.length || 0 })
      
      // Cache the data for future use
      setCachedAssessmentMapping(jobRoundTemplateId, data)
      
      return data
    } catch (error: any) {
      // Don't log AbortErrors as they're expected during navigation
      if (error.name !== 'AbortError') {
        console.error(`❌ [API ERROR] ${callId} - Error fetching sparrow assessment mapping:`, error)
        apiDebugger.logCall(callId, 'SparrowAssessmentMapping', 'error', undefined, { templateId: jobRoundTemplateId, error: error instanceof Error ? error.message : 'Unknown error' })
      } else {
        console.log(`🟠 [API ABORTED] ${callId} - Request was aborted (expected during navigation)`)
        apiDebugger.logCall(callId, 'SparrowAssessmentMapping', 'aborted', undefined, { templateId: jobRoundTemplateId })
      }
      throw error
    }
  })()

  // Store the promise to prevent duplicate requests
  pendingRequests.set(jobRoundTemplateId, requestPromise)

  try {
    const result = await requestPromise
    return result
  } finally {
    // Clean up the pending request
    pendingRequests.delete(jobRoundTemplateId)
  }
}
