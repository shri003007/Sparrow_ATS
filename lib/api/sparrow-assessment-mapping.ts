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

/**
 * Fetch sparrow assessment mapping for a job round template
 */
export async function getSparrowAssessmentMapping(
  jobRoundTemplateId: string,
  signal?: AbortSignal
): Promise<SparrowAssessmentMappingResponse> {
  try {
    // Check if API URL is configured
    if (!API_CONFIG.CANDIDATES_BASE_URL) {
      throw new Error('CANDIDATES_BASE_URL is not configured in environment variables')
    }

    const url = `${API_CONFIG.CANDIDATES_BASE_URL}/sparrow-assessment-mapping/job-round-template/${jobRoundTemplateId}`
    console.log('Fetching sparrow assessment mapping from:', url)

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

    const data = await response.json()
    return data
  } catch (error: any) {
    // Don't log AbortErrors as they're expected during navigation
    if (error.name !== 'AbortError') {
      console.error('Error fetching sparrow assessment mapping:', error)
    }
    throw error
  }
}
