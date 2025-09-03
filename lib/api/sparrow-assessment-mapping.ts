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
    const response = await fetch(`${API_CONFIG.CANDIDATES_BASE_URL}/sparrow-assessment-mapping/job-round-template/${jobRoundTemplateId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch sparrow assessment mapping: ${response.statusText}`)
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
